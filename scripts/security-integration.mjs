// Isolated D1 only. Never calls production or uses production credentials.
import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import fs from 'node:fs';import assert from 'node:assert/strict';
const output=await build({stdin:{contents:`import worker from './src/worker.js';export default {fetch(r,e){return worker.fetch(r,{...e,AI:{run:async(m,p)=>{if(p.text.includes('FAIL'))throw Error('test failure');if(p.text.includes('001234'))throw Error('PIN must not be translated');return {translated_text:'TRANSLATED '+p.target_lang+' '+p.text};}}});}}`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false,platform:'browser'});
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-09-10',d1Databases:['DB'],bindings:{HOST_PASSWORD:'local-test-password',SESSION_SECRET:'local-test-secret',DISABLE_LEGACY_GUEST_LINKS:'true'}}]}));
try{
 const db=await mf.getD1Database('DB');for(const sql of fs.readFileSync('migrations/0001_content.sql','utf8').split(';').filter(x=>x.trim()))await db.prepare(sql).run();
 let cookie='';const request=(path,body,extra={})=>mf.dispatchFetch('https://aranya.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://aranya.test',Cookie:cookie,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});
 const guest={n:'<b>Local test</b>',ci:'2099-01-01',co:'2099-01-03',cit:'15:00',cot:'11:00',a:2,c:0,l:'en'};
 assert.equal((await request('/api/guest-link',guest)).status,401);assert.equal((await request('/preview')).status,401);
 const login=await request('/api/login',{password:'local-test-password'});cookie=login.headers.get('set-cookie').split(';')[0];assert(/HttpOnly.*Secure.*SameSite=Strict/.test(login.headers.get('set-cookie')));
 const response=await request('/api/guest-link',guest);assert.equal(response.status,200);const link=(await response.json()).url;assert(link.includes('?g=v1.'));
 assert.equal((await request('/api/guest-link',{...guest,co:'2000-01-01'})).status,400);assert.equal((await request('/api/guest-link',guest,{Origin:'https://other.test'})).status,403);
 const noteLink=await request('/api/guest-link',{...guest,pin:'001234',doorNoteKo:'게스트님 안녕하세요.'});assert.equal(noteLink.status,200);
 const noteUrl=new URL((await noteLink.json()).url),noteResponse=await request(noteUrl.pathname+noteUrl.search),noteHtml=await noteResponse.text();assert(noteHtml.includes('001234'));assert(noteHtml.includes('TRANSLATED en'));assert(noteHtml.includes('게스트님 안녕하세요.'));
 assert.equal((await request('/api/guest-link',{...guest,doorNoteKo:'FAIL'})).status,502);
 assert.equal((await request('/api/guest-link',{...guest,doorNoteKo:'a'.repeat(301)})).status,400);
 cookie='';const page=await request(new URL(link).pathname+new URL(link).search);assert.equal(page.status,200);const html=await page.text();assert(html.includes('window.ARANYA_GUEST'));assert(!html.includes('<b>Local test</b>'));assert(html.includes('\\u003cb>Local test'));
 assert.equal((await request('/?g='+Buffer.from(JSON.stringify(guest)).toString('base64url'))).status,410);
 assert.equal(page.headers.get('cache-control'),'no-store');assert.equal(page.headers.get('referrer-policy'),'no-referrer');assert.equal(page.headers.get('x-frame-options'),'SAMEORIGIN');assert(page.headers.get('content-security-policy').includes("frame-ancestors 'self'"));assert(page.headers.get('x-robots-tag').includes('noindex'));
 for(const value of ['','malformed','v1.bad.token',Buffer.from(JSON.stringify({...guest,cit:'<img src=x onerror=alert(1)>'})).toString('base64url'),Buffer.from(JSON.stringify({...guest,ci:'2000-01-01',co:'2000-01-03'})).toString('base64url')]){const result=await request('/?g='+encodeURIComponent(value));assert.equal(result.status,410);assert(!(await result.text()).includes('const food'));}
 const anonymous=await (await request('/')).text();assert(!anonymous.includes('Local test'));assert(!anonymous.includes('window.ARANYA_GUEST='));
 for(let i=0;i<11;i++){const r=await request('/api/login',{password:'wrong'},{'CF-Connecting-IP':'192.0.2.1'});assert.equal(r.status,i<10?401:429);}
 cookie='aranya_session=1.invalid';assert.equal((await request('/api/content')).status,401);
 console.log('PASS: authenticated link issuance, encrypted guest HTML, invalid/expired links, XSS text handling, CSRF, headers, cache isolation, rate limit, invalid session');
}finally{await mf.dispose();}
