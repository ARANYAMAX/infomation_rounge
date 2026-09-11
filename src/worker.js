import {template,blocks,catalog,seed} from './generated.js';
import {validateDraft,pending,renderGuide,languages,translationFragments} from './content.js';
const encoder=new TextEncoder();
const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
async function digest(value){return hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));}
async function signature(value,secret){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));}
function equal(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function authenticated(request,env){if(!env.SESSION_SECRET)return false;const raw=request.headers.get('Cookie')?.match(/(?:^|;\s*)aranya_session=([^;]+)/)?.[1]||'';const [expiry,sig]=raw.split('.');if(!/^\d+$/.test(expiry)||Number(expiry)<Date.now()||!sig)return false;return equal(sig,await signature(expiry,env.SESSION_SECRET));}
function hydrate(value){return Object.fromEntries(catalog.map(f=>[f.id,value[f.id]||seed[f.id]]));}
async function state(env){let row=await env.DB.prepare('SELECT * FROM content_state WHERE id=1').first();if(!row){await env.DB.prepare('INSERT OR IGNORE INTO content_state(id,revision,draft,published) VALUES(1,0,?,?)').bind(JSON.stringify(seed),JSON.stringify(seed)).run();row=await env.DB.prepare('SELECT * FROM content_state WHERE id=1').first();}return {revision:row.revision,draft:hydrate(JSON.parse(row.draft)),published:hydrate(JSON.parse(row.published))};}
let renderedRevision=-1,renderedHTML='';
async function publishedGuide(env){if(!env.DB)return renderGuide(template,blocks,catalog,seed);const current=await env.DB.prepare('SELECT revision FROM content_state WHERE id=1').first();if(current&&current.revision===renderedRevision)return renderedHTML;const s=await state(env);renderedHTML=renderGuide(template,blocks,catalog,s.published);renderedRevision=s.revision;return renderedHTML;}
async function save(env,s,draft,published=s.published){const result=await env.DB.prepare('UPDATE content_state SET revision=revision+1,draft=?,published=? WHERE id=1 AND revision=?').bind(JSON.stringify(draft),JSON.stringify(published),s.revision).run();if(result.meta.changes!==1)return false;return true;}
function fail(message,status=400){throw Object.assign(Error(message),{status});}
async function body(request){const text=await request.text();if(text.length>1500000)fail('내용이 너무 큽니다.',413);try{return JSON.parse(text);}catch{fail('요청 형식 오류');}}
function responseState(s){return {revision:s.revision,draft:s.draft,pending:pending(s.draft,catalog)};}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname;
 try{
  if(path.startsWith('/.'))return new Response('Not found',{status:404});
  if(path.startsWith('/api/')&&request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'같은 사이트에서 요청해주세요.'},403);
  if(path==='/api/login'&&request.method==='POST'){
   if(!env.DB||!env.HOST_PASSWORD||!env.SESSION_SECRET)return json({error:'호스트 로그인 설정이 필요합니다.'},503);
   const ip=await digest(request.headers.get('CF-Connecting-IP')||'local'),now=Date.now();
   await env.DB.prepare('DELETE FROM login_attempts WHERE expires<?').bind(now).run();
   await env.DB.prepare('INSERT INTO login_attempts(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1').bind(ip,now+900000).run();
   const attempt=await env.DB.prepare('SELECT count FROM login_attempts WHERE id=?').bind(ip).first();
   if(attempt.count>10)return json({error:'로그인 시도가 많습니다. 15분 뒤 다시 시도해주세요.'},429);
   const input=await body(request);if(typeof input.password!=='string'||!equal(await digest(input.password),await digest(env.HOST_PASSWORD)))return json({error:'비밀번호가 맞지 않습니다.'},401);
   const expiry=String(now+8*3600000),token=expiry+'.'+await signature(expiry,env.SESSION_SECRET);
   return json({ok:true},200,{'Set-Cookie':`aranya_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`});
  }
  if(path==='/api/logout'&&request.method==='POST')return json({ok:true},200,{'Set-Cookie':'aranya_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
  if(path.startsWith('/api/')||path==='/preview'){
   if(!await authenticated(request,env))return json({error:'호스트 로그인이 필요합니다.'},401);
   if(!env.DB)return json({error:'DB 연결이 필요합니다.'},503);
   if(path==='/api/content'&&request.method==='GET'){const s=await state(env);return json({...responseState(s),catalog,translationAvailable:!!env.AI,imagesAvailable:!!env.IMAGES});}
   if(path==='/api/image'&&request.method==='POST'){
    if(!env.IMAGES)fail('이미지 저장소 연결이 필요합니다.',503);
    if(Number(request.headers.get('Content-Length'))>2*1024*1024)fail('사진은 2MB 이하로 선택해주세요.',413);
    const bytes=new Uint8Array(await request.arrayBuffer());if(bytes.length>2*1024*1024)fail('사진은 2MB 이하로 선택해주세요.',413);
    let type,ext;if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71){type='image/png';ext='png';}else if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255){type='image/jpeg';ext='jpg';}else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){type='image/webp';ext='webp';}else fail('JPG·PNG·WebP 사진만 지원합니다.');
    const key=crypto.randomUUID()+'.'+ext;await env.IMAGES.put(key,bytes,{httpMetadata:{contentType:type}});return json({url:'/media/'+key});
   }
   const s=await state(env);
   if(path==='/preview'&&request.method==='GET')return new Response(renderGuide(template,blocks,catalog,s.draft),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
   if(request.method==='POST'&&['/api/draft','/api/translate','/api/publish'].includes(path)){
    const input=await body(request);if(input.revision!==s.revision)fail('다른 창에서 내용이 바뀌었습니다. 새로고침 후 다시 확인해주세요.',409);
    let draft=s.draft,published=s.published;
    if(path==='/api/draft'){try{draft=validateDraft(input.draft,catalog,s.draft);}catch(error){fail(error.message);}if(encoder.encode(JSON.stringify(draft)).length>750000)fail('안내 전체 용량이 너무 큽니다. 문구를 줄여주세요.',413);}
    if(path==='/api/translate'){
     if(!env.AI)fail('자동 번역 연결이 필요합니다. 초안은 보관되어 있습니다.',503);
     const field=catalog.find(f=>f.id===input.id&&f.type==='text');if(!field)fail('번역 항목 오류');
     const text=draft[field.id].values.ko;
     if(text.length>2000)fail('자동 번역은 항목당 2,000자까지 지원합니다. 문구를 나눠주세요.');
     const translated={ko:text};
     // Preserve markup and substitutions by translating only text fragments.
     const fragments=translationFragments(text);
     for(const l of languages.filter(l=>l!=='ko')){
      let output='';for(const fragment of fragments){if(!fragment.trim()||/^(?:<|\{|https?:\/\/|\d)/.test(fragment)){output+=fragment;continue;}
       const answer=await env.AI.run('@cf/meta/m2m100-1.2b',{text:fragment,source_lang:'ko',target_lang:l});
       if(typeof answer.translated_text!=='string'||!answer.translated_text.trim())fail('번역 응답을 확인할 수 없습니다. 다시 시도해주세요.',502);
       output+=(fragment.match(/^\s*/)?.[0]||'')+answer.translated_text.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')+(fragment.match(/\s*$/)?.[0]||'');
      }translated[l]=output;
     }
     draft[field.id]={values:translated,translatedFrom:text,reviewed:false};
    }
    if(path==='/api/publish'){
     if(pending(draft,catalog).length)fail('한국어가 변경된 항목의 번역을 먼저 완료해주세요.');
     if(input.reviewed!==true)fail('미리보기와 번역 확인이 필요합니다.');
     published=structuredClone(draft);for(const entry of Object.values(published))entry.reviewed=true;draft=structuredClone(published);
    }
    if(!await save(env,s,draft,published))fail('다른 수정 사항이 먼저 저장되었습니다. 새로고침해주세요.',409);
    return json(responseState({revision:s.revision+1,draft,published}));
   }
   return json({error:'요청을 찾을 수 없습니다.'},404);
  }
  if(path.startsWith('/media/')){
   if(!/^\/media\/[a-f0-9-]{36}\.(png|jpg|webp)$/.test(path)||!env.IMAGES)return new Response('Not found',{status:404});
   const object=await env.IMAGES.get(path.slice(7));if(!object)return new Response('Not found',{status:404});
   return new Response(object.body,{headers:{'Content-Type':object.httpMetadata.contentType,'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff'}});
  }
  if(path==='/'||path==='/index.html'){
   return new Response(await publishedGuide(env),{headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store'}});
  }
  if(path==='/admin')return env.ASSETS.fetch(request);
  return env.ASSETS.fetch(request);
 }catch(error){return json({error:error.status?error.message:'처리 중 오류가 발생했습니다. 기존 공개 내용은 유지됩니다.'},error.status||500);}
}};
