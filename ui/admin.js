'use strict';
const $=id=>document.getElementById(id),languages={en:'영어',zh:'중국어',ja:'일본어',de:'독일어',fr:'프랑스어',es:'스페인어',it:'이탈리아어',pt:'포르투갈어',ru:'러시아어'};
const sections={home:'체크인 · 첫 화면',rules:'숙소 안내',manuals:'기기 안내',amenities:'편의시설',around:'주변 여행',food:'맛집 · 카페',contact:'문의 · 기타',images:'사진'};
let catalog=[],draft={},revision=0,active='home',dirty=false,busy=false,ai=false,images=false;
function message(text){$('status').textContent=text;}
async function api(path,body){const response=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok){if(response.status===401){$('login').hidden=false;$('manager').hidden=true;}throw Error(data.error||'연결에 실패했습니다.');}return data;}
function accept(data){draft=data.draft;revision=data.revision;dirty=false;}
function group(field){if(field.type==='image')return 'images';if(field.block==='HOUSE_NOTES')return 'rules';if(field.block==='MANUALS')return 'manuals';if(field.block==='food'||field.block==='ARANYA_DINING_LABELS')return 'food';if(field.block.includes('CURATED')||field.block.includes('AROUND'))return 'around';if(field.block==='aranya-essentials-data')return 'amenities';const key=field.path.join('.');if(/house|rule|notice/.test(key))return 'rules';if(/manual/.test(key))return 'manuals';if(/amen|^a_/.test(key))return 'amenities';if(/around|travel/.test(key))return 'around';if(/food|chip|dining/.test(key))return 'food';if(/host|contact|response|gen_|footer|copied/.test(key))return 'contact';return 'home';}
function changed(){dirty=true;message('수정 중 · 초안 저장 후 번역과 미리보기를 진행하세요.');}
function render(){
 $('sectionTitle').textContent=sections[active];$('fields').replaceChildren();
 document.querySelectorAll('#sections button').forEach(b=>b.classList.toggle('active',b.dataset.section===active));
 const query=$('search').value.toLowerCase();
 for(const field of catalog.filter(f=>group(f)===active&&(!query||(draft[f.id].values.ko+' '+f.label).toLowerCase().includes(query)))){
  const entry=draft[field.id],card=document.createElement('article');card.className='card';
  const label=document.createElement('label');label.textContent=field.type==='image'?(field.block==='hero'?'첫 화면 대표 사진':'기기 사진 · '+field.path[0]):field.label.replace(/<[^>]*>/g,'').slice(0,75);card.append(label);
  if(field.type==='image'){
   const img=document.createElement('img');img.src=entry.values.ko;img.alt=label.textContent;const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.disabled=!images;file.setAttribute('aria-label',label.textContent+' 교체');
   const hint=document.createElement('p');hint.className='hint';hint.textContent=images?'JPG · PNG · WebP / 최대 2MB. 초안을 공개하면 반영됩니다.':'이미지 저장소 연결 후 사진을 교체할 수 있습니다.';
   file.onchange=()=>run(async()=>{const selected=file.files[0];if(!selected)return;if(selected.size>2*1024*1024)throw Error('사진은 2MB 이하로 선택해주세요.');const response=await fetch('/api/image',{method:'POST',body:selected,headers:{'Content-Type':selected.type}}),data=await response.json();if(!response.ok)throw Error(data.error);entry.values.ko=data.url;img.src=data.url;changed();});card.append(img,file,hint);
  }else{
   const input=document.createElement('textarea');input.value=entry.values.ko;input.maxLength=12000;label.htmlFor=input.id='field-'+catalog.indexOf(field);input.oninput=()=>{entry.values.ko=input.value;changed();};card.append(input);
   if(entry.values.ko!==entry.translatedFrom){const badge=document.createElement('span');badge.className='badge';badge.textContent='번역 필요';card.append(badge);}
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='다국어 번역 확인 · 직접 수정';details.append(summary);
   for(const [lang,name] of Object.entries(languages)){const l=document.createElement('label');l.textContent=name;const translated=document.createElement('textarea');translated.value=entry.values[lang];translated.setAttribute('aria-label',name+' 번역');translated.oninput=()=>{entry.values[lang]=translated.value;changed();};l.append(translated);details.append(l);}card.append(details);
  }$('fields').append(card);
 }
 if(!$('fields').children.length)$('fields').textContent='표시할 항목이 없습니다.';
 if(busy)$('fields').querySelectorAll('input,textarea').forEach(input=>input.disabled=true);
}
async function run(task){if(busy)return;busy=true;document.querySelectorAll('button,input,textarea').forEach(b=>b.disabled=true);try{await task();}catch(error){message(error.message);}finally{busy=false;document.querySelectorAll('button,input,textarea').forEach(b=>b.disabled=false);if(!images)document.querySelectorAll('input[type=file]').forEach(b=>b.disabled=true);}}
async function load(){const data=await api('content');catalog=data.catalog;ai=data.translationAvailable;images=data.imagesAvailable;accept(data);$('login').hidden=true;$('manager').hidden=false;$('logout').hidden=false;render();message('초안을 불러왔습니다. 저장한 내용은 공개하기 전까지 손님에게 보이지 않습니다.');}
async function save(){accept(await api('draft',{revision,draft}));render();message('초안을 저장했습니다.');}
$('loginForm').onsubmit=event=>{event.preventDefault();run(async()=>{await api('login',{password:$('password').value});$('password').value='';sessionStorage.setItem('aranya_admin','1');await load();});};
$('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('저장하지 않은 내용을 두고 로그아웃할까요?'))return;await api('logout',{});sessionStorage.removeItem('aranya_admin');dirty=false;busy=false;location.reload();});
for(const [key,name] of Object.entries(sections)){const b=document.createElement('button');b.textContent=name;b.dataset.section=key;b.onclick=()=>{active=key;render();};$('sections').append(b);}
$('search').oninput=render;
$('save').onclick=()=>run(async()=>{await save();render();});
$('translate').onclick=()=>run(async()=>{
 if(!ai)throw Error('Cloudflare AI 연결이 필요합니다. 초안을 먼저 저장해주세요.');if(dirty)await save();
 const ids=catalog.filter(f=>f.type==='text'&&draft[f.id].values.ko!==draft[f.id].translatedFrom).map(f=>f.id);
 try{for(let i=0;i<ids.length;i++){message(`자동 번역 중 ${i+1}/${ids.length} · 창을 닫지 마세요.`);accept(await api('translate',{revision,id:ids[i]}));}}finally{render();}
 message(ids.length?'번역 완료 · 각 항목의 다국어 번역과 미리보기를 확인해주세요.':'번역할 변경 사항이 없습니다.');
});
$('preview').onclick=()=>run(async()=>{if(dirty)await save();const guest=btoa(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko']));$('previewFrame').src='/preview?g='+encodeURIComponent(guest);$('previewDialog').showModal();});
$('closePreview').onclick=()=>$('previewDialog').close();
$('publish').onclick=()=>run(async()=>{if(dirty)await save();if(catalog.some(f=>f.type==='text'&&draft[f.id].values.ko!==draft[f.id].translatedFrom))throw Error('한국어 변경 항목을 먼저 자동 번역해주세요.');$('reviewed').checked=false;$('publishDialog').showModal();});
$('cancelPublish').onclick=()=>$('publishDialog').close();
$('confirmPublish').onclick=()=>run(async()=>{if(!$('reviewed').checked)throw Error('미리보기와 번역 확인에 체크해주세요.');accept(await api('publish',{revision,reviewed:true}));$('publishDialog').close();render();message('공개 완료 · 손님이 안내를 새로 열면 수정 내용이 표시됩니다.');});
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
load().catch(error=>message(error.message));
