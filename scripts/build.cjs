const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.join(__dirname,'..');process.chdir(root);
let html=fs.readFileSync('index.html','utf8');
fs.mkdirSync('dist/assets',{recursive:true});fs.mkdirSync('src',{recursive:true});
// Only explicitly copied files enter the public directory; .git is never an asset.
const imageMap=new Map();
html=html.replace(/data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+/g,(value,format)=>{
 if(!imageMap.has(value)){const bytes=Buffer.from(value.split(',')[1],'base64'),name=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,24)+'.'+format;fs.writeFileSync('dist/assets/'+name,bytes);imageMap.set(value,'/assets/'+name);}return imageMap.get(value);
});
const names=['I18N','ARANYA_CURATED_UI','ARANYA_CURATED_PLACES','ARANYA_DINING_LABELS','ARANYA_UI','ARANYA_AROUND_UI','HOUSE_NOTES','MANUALS','food'];
const blocks=[];
for(const name of names){const m=new RegExp('const\\s+'+name+'\\s*=\\s*').exec(html);if(!m)continue;let start=m.index+m[0].length,end=start,depth=0,q=false,esc=false;for(;end<html.length;end++){const c=html[end];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')q=false;}else if(c==='"')q=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']'){if(--depth===0){end++;break;}}}blocks.push({name,start,end,value:JSON.parse(html.slice(start,end))});}
for(const m of html.matchAll(/<script\b[^>]*id="(aranya-essentials-data)"[^>]*>([\s\S]*?)<\/script>/g)){const start=m.index+m[0].indexOf('>')+1;blocks.push({name:m[1],start,end:start+m[2].length,value:JSON.parse(m[2])});}
const languages=['ko','en','zh','ja','de','fr','es','it','pt','ru'];
const catalog=[],seed={};
function add(block,path,type,values,paths){const id=block+':'+path.join('.');catalog.push({id,block,path,type,label:values.ko||'사진',paths});seed[id]={values,translatedFrom:values.ko||'',reviewed:true};}
function walk(value,block,path=[]){
 if(!value||typeof value!=='object')return;
 if(typeof value.ko==='string'){add(block,path,'text',Object.fromEntries(languages.map(l=>[l,value[l]||value.en||value.ko])),Object.fromEntries(languages.map(l=>[l,[...path,l]])));return;}
 if(block==='I18N'&&path.length===0){for(const key of Object.keys(value.ko)){if(typeof value.ko[key]!=='string')continue;add(block,[key],'text',Object.fromEntries(languages.map(l=>[l,value[l]?.[key]||value.en?.[key]||value.ko[key]])),Object.fromEntries(languages.map(l=>[l,[l,key]])));}return;}
 for(const [key,item] of Object.entries(value)){
   if(key==='image'&&typeof item==='string')add(block,[...path,key],'image',{ko:item},{ko:[...path,key]});
   else walk(item,block,[...path,key]);
 }
}
for(const b of blocks)walk(b.value,b.name);
for(const b of [...blocks].sort((a,b)=>b.start-a.start))html=html.slice(0,b.start)+'__ARANYA_BLOCK_'+b.name+'__'+html.slice(b.end);
// Main photograph is outside the data objects.
const hero=/<img\b[^>]*src="(\/assets\/[^"]+)"[^>]*>/i.exec(html);
if(hero){add('hero',['image'],'image',{ko:hero[1]},{ko:[]});html=html.replace(hero[0],hero[0].replace(hero[1],'__ARANYA_HERO__'));}
html=html.replace(/const ADMIN_HASH='[^']+';/g,'');
html=html.replace('const hash=await sha256(password.value);','const allowed=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:password.value})}).then(r=>r.ok);').replace('if(hash===ADMIN_HASH)','if(allowed)');
html=html.replace('const hash=await sha256(input.value);','const allowed=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:input.value})}).then(r=>r.ok);').replace('if(hash!==ADMIN_HASH)','if(!allowed)');
html=html.replace('</body>',`<script>if(!new URLSearchParams(location.search).has('g')&&sessionStorage.getItem('aranya_admin')==='1'){const nav=document.querySelector('.nav-tabs');if(nav){const a=document.createElement('a');a.className='tab';a.href='/admin';a.textContent='내용 관리';nav.append(a);}}document.addEventListener('click',async e=>{const button=e.target.closest('#hostLogoutBtn,#adminLockBtn');if(!button)return;e.preventDefault();e.stopImmediatePropagation();button.disabled=true;try{const response=await fetch('/api/logout',{method:'POST'});if(!response.ok)throw Error();sessionStorage.removeItem('aranya_admin');sessionStorage.removeItem('aranya_host_entry');document.documentElement.classList.add('v33-logging-out','v33-host-locked','host-base-locked');location.replace(location.origin+location.pathname);}catch{button.disabled=false;alert('로그아웃하지 못했습니다. 연결을 확인한 후 다시 시도해주세요.');}},true);</script></body>`);
fs.writeFileSync('src/generated.js','export const template='+JSON.stringify(html)+';\nexport const blocks='+JSON.stringify(Object.fromEntries(blocks.map(b=>[b.name,b.value])))+';\nexport const catalog='+JSON.stringify(catalog)+';\nexport const seed='+JSON.stringify(seed)+';');
for(const f of ['admin.html','admin.js','admin.css'])fs.copyFileSync('ui/'+f,'dist/'+f);
if(fs.existsSync('favicon.ico'))fs.copyFileSync('favicon.ico','dist/favicon.ico');
console.log(`Built ${catalog.length} editable fields and ${imageMap.size} images. Public assets: dist only.`);
