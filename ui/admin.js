'use strict';
const $=id=>document.getElementById(id),languages={en:'영어',zh:'중국어',ja:'일본어',de:'독일어',fr:'프랑스어',es:'스페인어',it:'이탈리아어',pt:'포르투갈어',ru:'러시아어'};
const sections={home:'체크인 · 첫 화면',rules:'숙소 안내',manuals:'기기 안내',amenities:'편의시설',around:'주변 여행',food:'맛집 · 카페',contact:'문의 · 기타',images:'사진'};
let catalog=[],draft={},revision=0,active='home',dirty=false,busy=false,ai=false,images=false,selectedId=null,browseMode=false,guideObserver=null,guideTimer=null,guideAliases={},guideMatches=new Map();
function message(text){$('status').textContent=text;}
async function api(path,body){const response=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok){if(response.status===401){$('login').hidden=false;$('manager').hidden=true;}throw Error(data.error||'연결에 실패했습니다.');}return data;}
function accept(data){draft=data.draft;revision=data.revision;dirty=false;}
function group(field){if(field.type==='image')return 'images';if(field.block==='HOUSE_NOTES')return 'rules';if(field.block==='MANUALS')return 'manuals';if(field.block==='food'||field.block==='ARANYA_DINING_LABELS')return 'food';if(field.block.includes('CURATED')||field.block.includes('AROUND'))return 'around';if(field.block==='aranya-essentials-data')return 'amenities';const key=field.path.join('.');if(/house|rule|notice/.test(key))return 'rules';if(/manual/.test(key))return 'manuals';if(/amen|^a_/.test(key))return 'amenities';if(/around|travel/.test(key))return 'around';if(/food|chip|dining/.test(key))return 'food';if(/host|contact|response|gen_|footer|copied/.test(key))return 'contact';return 'home';}
function changed(){dirty=true;$('saveState').textContent='수정 중 · 아직 저장하지 않았어요';message('수정 중 · 초안 저장 후 번역과 미리보기를 진행하세요.');updateGuideSelection();}
function plain(value){const doc=new DOMParser().parseFromString(String(value),'text/html');return doc.body.textContent.replace(/\s+/g,' ').trim();}
function fieldName(field){
 if(field.block==='hero')return '첫 화면 대표 사진';
 if(field.type==='image'&&field.block==='amenityPhotos')return '편의시설 · '+field.label+' · 사진';
 if(field.type==='image'&&['food','ARANYA_CURATED_PLACES'].includes(field.block)){const name=draft[field.block+':'+field.path[0]+'.name'];return (field.block==='food'?'맛집·카페':'주변여행')+' · '+plain(name?.values.ko||'장소')+' · 사진';}
 const prefix=field.path.slice(0,1).join('.'),title=catalog.find(f=>f.block===field.block&&f.path.join('.')===prefix+'.title');
 const roles={title:'제목',lead:'소개 문구',body:'설명',image:'사진',category:'분류',quick:'버튼 안내',steps:'사용 순서',desc:'설명',name:'이름'};
 if(title){const parts=field.path.slice(1).map(p=>/^\d+$/.test(p)?`${Number(p)+1}번`:roles[p]||'안내');return plain(draft[title.id].values.ko)+' · '+parts.join(' · ');}
 return field.type==='image'?'안내 사진':plain(field.label).slice(0,90);
}
function selectField(id){selectedId=id;const field=catalog.find(f=>f.id===id);if(!field)return;active=group(field);$('search').value='';render();$('editorPanel').classList.add('is-open');highlightGuide();}
function render(){
 $('sectionTitle').textContent=sections[active];$('fields').replaceChildren();
 document.querySelectorAll('#sections button').forEach(b=>b.classList.toggle('active',b.dataset.section===active));
 const query=$('search').value.toLowerCase();$('fieldChoices').replaceChildren();
 const available=catalog.filter(f=>group(f)===active&&(!query||(draft[f.id].values.ko+' '+fieldName(f)).toLowerCase().includes(query)));
 for(const field of available){const choice=document.createElement('button');choice.type='button';choice.textContent=fieldName(field);choice.className='field-choice';choice.onclick=()=>selectField(field.id);$('fieldChoices').append(choice);}
 const chosen=catalog.find(f=>f.id===selectedId);$('selectionPath').textContent=chosen?sections[group(chosen)]+' → '+fieldName(chosen):'왼쪽에서 수정할 위치를 선택해주세요.';
 for(const field of catalog.filter(f=>f.id===selectedId)){
  const entry=draft[field.id],card=document.createElement('article');card.className='card';
  const label=document.createElement('label');label.textContent=field.type==='image'?fieldName(field):'한국어 문구';card.append(label);
  if(field.type==='image'){
   const img=document.createElement('img');if(entry.values.ko)img.src=entry.values.ko;img.hidden=!entry.values.ko;img.alt=label.textContent;const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.disabled=!images;file.setAttribute('aria-label',label.textContent+' 교체');
   const hint=document.createElement('p');hint.className='hint';hint.textContent=images?'JPG · PNG · WebP / 최대 2MB. 초안을 공개하면 반영됩니다.':'이미지 저장소 연결 후 사진을 교체할 수 있습니다.';
   file.onchange=()=>run(async()=>{const selected=file.files[0];if(!selected)return;if(selected.size>2*1024*1024)throw Error('사진은 2MB 이하로 선택해주세요.');const response=await fetch('/api/image',{method:'POST',body:selected,headers:{'Content-Type':selected.type}}),data=await response.json();if(!response.ok)throw Error(data.error);entry.values.ko=data.url;img.src=data.url;img.hidden=false;changed();});card.append(img,file,hint);
  }else{
   const input=document.createElement('textarea');input.value=entry.values.ko;input.maxLength=12000;label.htmlFor=input.id='field-'+catalog.indexOf(field);input.oninput=()=>{entry.values.ko=input.value;changed();};card.append(input);
   if(entry.values.ko!==entry.translatedFrom){const badge=document.createElement('span');badge.className='badge';badge.textContent='번역 필요';card.append(badge);}
   const retry=document.createElement('button');retry.type='button';retry.textContent='이 문구 다시 번역';retry.onclick=()=>run(async()=>{const id=field.id;if(!ai)throw Error('Cloudflare AI 연결이 필요합니다.');if(dirty)await save();message('선택한 문구를 9개 언어로 다시 번역 중입니다. 잠시 기다려주세요.');accept(await api('translate',{revision,id}));render();refreshGuide();$('saveState').textContent='번역 저장됨 · 공개 전';message('선택한 문구의 번역을 다시 저장했습니다. 번역 확인 후 공개해주세요.');});const retryHint=document.createElement('p');retryHint.className='hint';retryHint.textContent='번역이 빠졌다면 다시 번역하세요. 이 문구의 다른 언어 번역을 새 결과로 교체합니다.';card.append(retry,retryHint);
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='다국어 번역 확인 · 직접 수정';details.append(summary);
   for(const [lang,name] of Object.entries(languages)){const l=document.createElement('label');l.textContent=name;const translated=document.createElement('textarea');translated.value=entry.values[lang];translated.setAttribute('aria-label',name+' 번역');translated.oninput=()=>{entry.values[lang]=translated.value;changed();};l.append(translated);details.append(l);}card.append(details);
  }$('fields').append(card);
 }
 if(!$('fields').children.length){const empty=document.createElement('p');empty.className='empty-editor';empty.textContent='문구와 사진을 누르면 이곳에서 수정할 수 있어요. 찾기 어려운 항목은 아래 목록을 펼쳐주세요.';$('fields').append(empty);}
 if(busy)$('editorPanel').querySelectorAll('button,input,textarea').forEach(input=>input.disabled=true);
}
async function run(task){if(busy)return;busy=true;document.querySelectorAll('button,input,textarea').forEach(b=>b.disabled=true);try{await task();}catch(error){message(error.message);}finally{busy=false;document.querySelectorAll('button,input,textarea').forEach(b=>b.disabled=false);if(!images)document.querySelectorAll('input[type=file]').forEach(b=>b.disabled=true);}}
async function load(){const data=await api('content');catalog=data.catalog;ai=data.translationAvailable;images=data.imagesAvailable;accept(data);$('login').hidden=true;$('manager').hidden=false;$('logout').hidden=false;render();refreshGuide();$('saveState').textContent='저장된 초안';message('초안을 불러왔습니다. 저장한 내용은 공개하기 전까지 손님에게 보이지 않습니다.');}
async function save(){accept(await api('draft',{revision,draft}));render();refreshGuide();$('saveState').textContent='초안 저장됨 · 공개 전';message('초안을 저장했습니다.');}
$('loginForm').onsubmit=event=>{event.preventDefault();run(async()=>{await api('login',{password:$('password').value});$('password').value='';sessionStorage.setItem('aranya_admin','1');await load();});};
$('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('저장하지 않은 내용을 두고 로그아웃할까요?'))return;await api('logout',{});sessionStorage.removeItem('aranya_admin');dirty=false;busy=false;location.reload();});
for(const [key,name] of Object.entries(sections)){const b=document.createElement('button');b.textContent=name;b.dataset.section=key;b.onclick=()=>{active=key;selectedId=null;render();navigateGuide(key);$('fieldBrowser').open=true;};$('sections').append(b);}
$('search').oninput=render;
$('save').onclick=()=>run(async()=>{await save();render();});
$('translate').onclick=()=>run(async()=>{
 if(!ai)throw Error('Cloudflare AI 연결이 필요합니다. 초안을 먼저 저장해주세요.');if(dirty)await save();
 const ids=catalog.filter(f=>f.type==='text'&&draft[f.id].values.ko!==draft[f.id].translatedFrom).map(f=>f.id);
 try{for(let i=0;i<ids.length;i++){message(`자동 번역 중 ${i+1}/${ids.length} · 창을 닫지 마세요.`);accept(await api('translate',{revision,id:ids[i]}));}}finally{render();}
 refreshGuide();message(ids.length?'번역 완료 · 각 항목의 다국어 번역과 미리보기를 확인해주세요.':'번역할 변경 사항이 없습니다.');
});
$('preview').onclick=()=>run(async()=>{if(dirty)await save();const guest=btoa(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko']));$('previewFrame').src='/preview?g='+encodeURIComponent(guest);$('previewDialog').showModal();});
$('closePreview').onclick=()=>$('previewDialog').close();
$('publish').onclick=()=>run(async()=>{if(dirty)await save();if(catalog.some(f=>f.type==='text'&&draft[f.id].values.ko!==draft[f.id].translatedFrom))throw Error('한국어 변경 항목을 먼저 자동 번역해주세요.');$('reviewed').checked=false;$('publishDialog').showModal();});
$('cancelPublish').onclick=()=>$('publishDialog').close();
$('confirmPublish').onclick=()=>run(async()=>{if(!$('reviewed').checked)throw Error('미리보기와 번역 확인에 체크해주세요.');accept(await api('publish',{revision,reviewed:true}));$('publishDialog').close();render();$('saveState').textContent='공개 완료 · 손님 화면에 반영됐어요';message('공개 완료 · 손님이 안내를 새로 열면 수정 내용이 표시됩니다.');});
function refreshGuide(){guideObserver?.disconnect();guideMatches.clear();guideAliases=Object.fromEntries(catalog.map(f=>[f.id,draft[f.id].values.ko]));const guest=btoa(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko']));$('guideFrame').src='/preview?g='+encodeURIComponent(guest)+'&revision='+revision;}
function navigateGuide(key){const doc=$('guideFrame').contentDocument;if(!doc)return;const button=key==='home'||key==='images'?doc.getElementById('homeBrand'):doc.querySelector('[data-page="'+key+'"]');if(button){const previous=browseMode;browseMode=true;button.click();browseMode=previous;}}
function highlightGuide(){for(const [el,ids] of guideMatches)el.classList.toggle('aranya-edit-selected',ids.includes(selectedId));}
function indexGuide(){
 const doc=$('guideFrame').contentDocument;if(!doc?.body)return;guideObserver?.disconnect();guideMatches.clear();
 const lookup=new Map();for(const field of catalog){const value=field.type==='image'?guideAliases[field.id]:plain(guideAliases[field.id]);if(!value)continue;const key=field.type+':'+value;if(!lookup.has(key))lookup.set(key,[]);lookup.get(key).push(field.id);}
 for(const el of doc.body.querySelectorAll('*')){
  el.classList.remove('aranya-editable','aranya-edit-selected');if(el.closest('script,style,svg,select,textarea,dialog:not([open])'))continue;
  let ids;const key=el.getAttribute('data-i18n');if(key&&draft['I18N:'+key])ids=['I18N:'+key];
  else if(el.tagName==='IMG')ids=lookup.get('image:'+el.getAttribute('src'));
  else if(el.children.length===0||['P','H1','H2','H3','LABEL','LI'].includes(el.tagName))ids=lookup.get('text:'+plain(el.innerHTML));
  if(ids){guideMatches.set(el,ids);el.classList.add('aranya-editable');}
 }
 highlightGuide();guideObserver?.observe(doc.body,{childList:true,subtree:true,characterData:true});
}
function updateGuideSelection(){const field=catalog.find(f=>f.id===selectedId);if(!field)return;guideObserver?.disconnect();for(const [el,ids] of guideMatches){if(ids.length!==1||ids[0]!==selectedId)continue;if(field.type==='image')el.src=draft[field.id].values.ko;else if(!el.querySelector('button,input,a'))el.textContent=plain(draft[field.id].values.ko);}guideAliases[field.id]=draft[field.id].values.ko;const doc=$('guideFrame').contentDocument;if(doc?.body)guideObserver?.observe(doc.body,{childList:true,subtree:true,characterData:true});}
$('guideFrame').onload=()=>{
 const doc=$('guideFrame').contentDocument;if(!doc?.body)return;
 if(!doc.querySelector('#homeBrand')){$('guideHint').textContent='미리보기를 불러오지 못했습니다. 로그인 상태와 연결을 확인해주세요.';return;}
 const style=doc.createElement('style');style.textContent='.aranya-editable{cursor:pointer!important}.aranya-editable:hover{outline:2px dashed #a65b45!important;outline-offset:3px}.aranya-edit-selected{outline:3px solid #a65b45!important;outline-offset:3px}';doc.head.append(style);
 doc.addEventListener('click',event=>{if(busy){event.preventDefault();event.stopImmediatePropagation();return;}const target=event.target.closest('a,button');if(target?.matches('a')){event.preventDefault();event.stopImmediatePropagation();return;}if(browseMode||target?.matches('[data-page],#homeBrand,summary,[data-guide-photo],.guide-lightbox button'))return;let el=event.target;while(el&&!guideMatches.has(el))el=el.parentElement;if(!el)return;event.preventDefault();event.stopImmediatePropagation();const ids=guideMatches.get(el);if(ids.length===1)selectField(ids[0]);else{$('fieldChoices').replaceChildren();for(const id of ids){const f=catalog.find(f=>f.id===id),b=document.createElement('button');b.className='field-choice';b.textContent=sections[group(f)]+' → '+fieldName(f);b.onclick=()=>selectField(id);$('fieldChoices').append(b);}$('fieldBrowser').open=true;$('editorPanel').classList.add('is-open');message('같은 문구가 여러 곳에 있습니다. 오른쪽에서 수정할 위치를 선택해주세요.');}},true);
 guideObserver=new MutationObserver(()=>{clearTimeout(guideTimer);guideTimer=setTimeout(indexGuide,100);});indexGuide();navigateGuide(active);
};
$('browseMode').onclick=()=>{browseMode=!browseMode;$('browseMode').setAttribute('aria-pressed',String(browseMode));$('browseMode').textContent=browseMode?'수정할 위치 선택':'화면 둘러보기';$('guideHint').textContent=browseMode?'화면의 버튼을 눌러 안내를 둘러보세요. 수정하려면 위치 선택으로 돌아오세요.':'수정할 문구·사진을 누르세요. 탭과 펼치기 버튼은 그대로 사용할 수 있어요.';};
$('closeEditor').onclick=()=>$('editorPanel').classList.remove('is-open');
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
load().catch(error=>message(error.message));
