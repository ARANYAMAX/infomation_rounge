export function guestLinkStatus(value,now=Date.now()){
 if(value===null)return {expired:false};
 let guest;
 try{let encoded=value.replace(/-/g,'+').replace(/_/g,'/');encoded+='='.repeat((4-encoded.length%4)%4);guest=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))));}
 catch{try{guest=JSON.parse(decodeURIComponent(value));}catch{return {expired:true,language:'ko'};}}
 if(Array.isArray(guest))guest={co:guest[2],cot:guest[4],l:guest[7]};
 const language=typeof guest?.l==='string'?guest.l.slice(0,2):'ko';
 if(!guest||typeof guest.co!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(guest.co))return {expired:true,language};
 const time=/^\d{2}:\d{2}$/.test(guest.cot||'')?guest.cot:'11:00';
 const expiry=Date.parse(guest.co+'T'+time+':00+09:00');
 return {expired:!Number.isFinite(expiry)||now>=expiry,language};
}
