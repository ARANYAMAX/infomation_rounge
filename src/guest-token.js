const langs=['ko','en','zh','ja','de','fr','es','it','pt','ru'];
const enc=new TextEncoder();
export function validateGuest(input){
 const g=Array.isArray(input)?Object.fromEntries(['n','ci','co','cit','cot','a','c','l'].map((k,i)=>[k,input[i]])):input;
 if(!g||typeof g!=='object')throw Error('예약 정보를 확인해주세요.');
 const validDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 const validTime=v=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
 if(typeof g.n!=='string'||!g.n.trim()||g.n.length>100||!validDate(g.ci)||!validDate(g.co)||g.co<g.ci||!validTime(g.cit)||!validTime(g.cot)||!Number.isInteger(g.a)||g.a<1||g.a>30||!Number.isInteger(g.c)||g.c<0||g.c>30)throw Error('이름·날짜·시간·인원을 확인해주세요.');
 const result={n:g.n.trim(),ci:g.ci,co:g.co,cit:g.cit,cot:g.cot,a:g.a,c:g.c,l:langs.includes(g.l)?g.l:'ko'};
 if(g.pin!==undefined&&g.pin!==''){
  if(typeof g.pin!=='string'||!/^\d{4,12}$/.test(g.pin))throw Error('도어록 비밀번호는 숫자 4~12자리로 입력해주세요.');
  result.pin=g.pin;
 }
 if(g.doorNote!==undefined){
  if(!g.doorNote||typeof g.doorNote!=='object'||Array.isArray(g.doorNote))throw Error('안내 문구 형식 오류');
  result.doorNote={};for(const [l,text]of Object.entries(g.doorNote)){
   if(!langs.includes(l)||typeof text!=='string'||text.length>900)throw Error('안내 문구 길이를 확인해주세요.');
   result.doorNote[l]=text;
  }
 }
 if(checkout(result)<=Date.parse(result.ci+'T'+result.cit+':00+09:00'))throw Error('체크아웃은 체크인 이후여야 합니다.');
 return result;
}
export const checkout=g=>Date.parse(g.co+'T'+g.cot+':00+09:00');
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function decode(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(secret){if(!secret)throw Error('Guest token secret unavailable');return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',enc.encode('aranya-guest-v1:'+secret)),'AES-GCM',false,['encrypt','decrypt']);}
export async function issueGuest(input,secret,now=Date.now()){
 const guest=validateGuest(input);if(checkout(guest)<=now)throw Error('이미 체크아웃한 예약입니다.');
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('aranya-guest-v1')},await key(secret),enc.encode(JSON.stringify(guest)));
 const token='v1.'+encode(iv)+'.'+encode(new Uint8Array(encrypted));
 if(token.length>8192)throw Error('안내 문구를 줄여주세요.');return token;
}
export async function readGuest(token,secret,{allowLegacy=true,now=Date.now()}={}){
 try{
  if(typeof token!=='string'||!token||token.length>8192)throw Error();
  let value;
  if(token.startsWith('v1.')){
   if(!/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/.test(token))throw Error();
   const [,iv,data]=token.split('.');
   value=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:enc.encode('aranya-guest-v1')},await key(secret),decode(data))));
  }else{
   if(!allowLegacy)throw Error();
   try{value=JSON.parse(new TextDecoder().decode(decode(token)));}catch{value=JSON.parse(decodeURIComponent(token));}
  }
  const guest=validateGuest(value);
  return {guest,expired:checkout(guest)<=now,language:guest.l,legacy:!token.startsWith('v1.')};
 }catch{return {expired:true,invalid:true,language:'ko'};}
}
