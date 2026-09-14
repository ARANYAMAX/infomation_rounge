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
const tabLabels={ko:['숙소 안내','기기 안내'],en:['House Guide','Appliance Guide'],zh:['住宿指南','设备指南'],ja:['宿泊案内','設備の使い方'],de:['Unterkunft','Geräteanleitung'],fr:['Guide du logement','Guide des appareils'],es:['Guía del alojamiento','Guía de aparatos'],it:['Guida all’alloggio','Guida agli apparecchi'],pt:['Guia da acomodação','Guia dos aparelhos'],ru:['Информация о доме','Инструкции к приборам']};
const i18n=blocks.find(b=>b.name==='I18N').value;for(const [l,labels] of Object.entries(tabLabels)){i18n[l]||={};for(const [i,key] of ['tab_house','tab_manuals'].entries())if(!i18n[l][key]||i18n[l][key]===key)i18n[l][key]=labels[i];}
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
for(const b of blocks){if(['food','ARANYA_CURATED_PLACES'].includes(b.name))for(const place of b.value)place.image=place.image||'';walk(b.value,b.name);}
for(const b of [...blocks].sort((a,b)=>b.start-a.start))html=html.slice(0,b.start)+'__ARANYA_BLOCK_'+b.name+'__'+html.slice(b.end);
html=html.replace('<span>TV</span>','<span data-photo-key="a_tv">TV</span>');
html=html.replace(/<div class="amen">((?:(?!<\/div>)[\s\S])*?<span (?:data-i18n|data-photo-key)="(a_[^"]+)">([^<]+)<\/span>)<\/div>/g,(_,body,key,label)=>{add('amenityPhotos',[key],'image',{ko:''},{});catalog.at(-1).label=label;return '<div class="amen" style="flex-wrap:wrap">'+body+'__AMEN_PHOTO_'+key+'__</div>';});
// Main photograph is outside the data objects.
const hero=/<img\b[^>]*src="(\/assets\/[^"]+)"[^>]*>/i.exec(html);
if(hero){add('hero',['image'],'image',{ko:hero[1]},{ko:[]});html=html.replace(hero[0],hero[0].replace(hero[1],'__ARANYA_HERO__'));}
html=html.replace(/const ADMIN_HASH='[^']+';/g,'');
html=html.replace('const hash=await sha256(password.value);','const allowed=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:password.value})}).then(r=>r.ok);').replace('if(hash===ADMIN_HASH)','if(allowed)');
html=html.replace('const hash=await sha256(input.value);','const allowed=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:input.value})}).then(r=>r.ok);').replace('if(hash!==ADMIN_HASH)','if(!allowed)');
html=html.replace('</head>',`<script src="/language-controls.js" defer></script><script>function aranyaEscape(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}function aranyaPhotos(item){return [item.image,...(item.photos||[])].filter(Boolean).map((url,i)=>'<button type="button" class="place-photo-button" data-guide-photo="'+url+'">PHOTO '+(i+1)+'</button>').join('');}</script></head>`);
html=html.replace('</body>',`<script>if(!new URLSearchParams(location.search).has('g')&&sessionStorage.getItem('aranya_admin')==='1'){const nav=document.querySelector('.nav-tabs');if(nav){const a=document.createElement('a');a.className='tab';a.href='/admin';a.textContent='내용 관리';nav.append(a);}}document.addEventListener('click',async e=>{const button=e.target.closest('#hostLogoutBtn,#adminLockBtn');if(!button)return;e.preventDefault();e.stopImmediatePropagation();button.disabled=true;try{const response=await fetch('/api/logout',{method:'POST'});if(!response.ok)throw Error();sessionStorage.removeItem('aranya_admin');sessionStorage.removeItem('aranya_host_entry');document.documentElement.classList.add('v33-logging-out','v33-host-locked','host-base-locked');location.replace(location.origin+location.pathname);}catch{button.disabled=false;alert('로그아웃하지 못했습니다. 연결을 확인한 후 다시 시도해주세요.');}},true);</script></body>`);

// Preview rendering shares the guest templates; only the editor installs DOM reconciliation.
html=html.replace('const _applyLang=applyLang;',`window.aranyaPreviewInstall?.();
window.aranyaPreviewData=(next)=>{
 const targets={I18N,ARANYA_CURATED_UI,ARANYA_CURATED_PLACES,ARANYA_DINING_LABELS,ARANYA_UI,ARANYA_AROUND_UI,HOUSE_NOTES,MANUALS,food};
 const changed=new Set();for(const [key,value] of Object.entries(targets))if(next[key]&&JSON.stringify(value)!==JSON.stringify(next[key])){changed.add(key);if(Array.isArray(value))value.splice(0,value.length,...next[key]);else{for(const k of Object.keys(value))delete value[k];Object.assign(value,next[key]);}}
 if([...changed].some(key=>!['food','ARANYA_CURATED_PLACES','HOUSE_NOTES','MANUALS'].includes(key)))applyLang();
 else{if(changed.has('food')||changed.has('ARANYA_CURATED_PLACES'))renderPlaces();if(changed.has('HOUSE_NOTES'))renderHouseNotes();if(changed.has('MANUALS'))renderManuals();}
 window.aranyaPreviewEssentials?.(next['aranya-essentials-data']);
};
const _applyLang=applyLang;`);
html=html.replace("const source=JSON.parse(document.getElementById('aranya-essentials-data').textContent);",`const source=JSON.parse(document.getElementById('aranya-essentials-data').textContent);
 window.aranyaPreviewInstall?.();window.aranyaPreviewEssentials=next=>{Object.assign(source,next);render();};`);
html=html.replace('<div class="place-card ${p.group', '<div data-cms-item="${p._cmsKey||\'\'}" class="place-card ${p.group')
 .replace('<div class="place-card" data-cat="${p.cat}">','<div class="place-card" data-cms-item="${p._cmsKey||\'\'}" data-cat="${p.cat}">')
 .replace('<article class="notice-card">','<article class="notice-card" data-cms-item="${n._cmsKey||\'\'}">')
 .replace('<article class="manual-card" id=', '<article class="manual-card" data-cms-item="${m._cmsKey||\'\'}" id=')
 .replace('m.steps.map((s,i)=>`<details>','m.steps.map((s,i)=>`<details data-cms-item="${s._cmsKey||\'\'}">')
 .replace('<div class="market-stop">','<div class="market-stop" data-cms-item="${stop._cmsKey||\'\'}">')
 .replace("'<article class=\"essentials-card\"><h4>'","'<article class=\"essentials-card\" data-cms-item=\"'+esc(p._cmsKey||'')+'\"><h4>'");
html=html.replace('const update=()=>{if(label)label.textContent=labels[details.open?1:0];};','const update=()=>{if(label)label.textContent=(ARANYA_CARD_DETAIL_LABELS[lang]||ARANYA_CARD_DETAIL_LABELS.en)[details.open?1:0];};')
 .replace("details.addEventListener('toggle',update);","details.ontoggle=update;");
fs.writeFileSync('src/generated.js','export const template='+JSON.stringify(html)+';\nexport const blocks='+JSON.stringify(Object.fromEntries(blocks.map(b=>[b.name,b.value])))+';\nexport const catalog='+JSON.stringify(catalog)+';\nexport const seed='+JSON.stringify(seed)+';');
const expiredStart=html.indexOf('function renderExpiredGuest(g)'),expiredEnd=html.indexOf('function detectLang()',expiredStart);
if(expiredStart<0||expiredEnd<0)throw Error('Missing expiration screen');
const expiredTemplate='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ARANYA · Expired link</title><style>*{box-sizing:border-box}body{margin:0;font-family:sans-serif}</style></head><body><noscript>안내 링크가 만료되었습니다. This guest link has expired.</noscript><script>const lang="__EXPIRED_LANGUAGE__";'+html.slice(expiredStart,expiredEnd)+'renderExpiredGuest({l:lang});</script></body></html>';
fs.appendFileSync('src/generated.js','\nexport const expiredTemplate='+JSON.stringify(expiredTemplate.replace('</head>','<script src="/language-controls.js" defer></script></head>'))+';');
for(const f of ['admin.html','admin.js','admin.css','language-controls.js','preview.js'])fs.copyFileSync('ui/'+f,'dist/'+f);
const amenityIcons=Object.fromEntries([...html.matchAll(/<div class="amen"[^>]*>(<svg[\s\S]*?<\/svg>)<span (?:data-i18n|data-photo-key)="([^"]+)"/g)].map(m=>[m[2],{svg:m[1],label:seed['I18N:'+m[2]]?.values.ko||'TV'}]));
const lucideRoot=path.join(root,'node_modules/lucide-static'),iconTags=JSON.parse(fs.readFileSync(path.join(lucideRoot,'tags.json'),'utf8'));
for(const file of fs.readdirSync(path.join(lucideRoot,'icons')).filter(f=>f.endsWith('.svg')).sort()){
 const name=file.slice(0,-4),svg=fs.readFileSync(path.join(lucideRoot,'icons',file),'utf8').replace(/<!--[\s\S]*?-->/g,'').trim().replace('stroke-width="2"','stroke-width="1.6"');
 amenityIcons['lucide:'+name]={svg,label:name.replaceAll('-',' '),tags:iconTags[name]||[]};
}
fs.appendFileSync('src/generated.js','\nexport const amenityIconSvg='+JSON.stringify(Object.fromEntries(Object.entries(amenityIcons).map(([key,v])=>[key,v.svg])))+';');
fs.writeFileSync('dist/admin.js','window.amenityIcons='+JSON.stringify(amenityIcons)+';\n'+fs.readFileSync('ui/admin.js','utf8'));
fs.copyFileSync(path.join(lucideRoot,'LICENSE'),'dist/lucide-LICENSE.txt');
console.log('Available amenity icons: '+Object.keys(amenityIcons).length);
if(fs.existsSync('favicon.ico'))fs.copyFileSync('favicon.ico','dist/favicon.ico');
console.log(`Built ${catalog.length} editable fields and ${imageMap.size} images. Public assets: dist only.`);
