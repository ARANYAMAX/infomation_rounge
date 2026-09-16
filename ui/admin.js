'use strict';
const $=id=>document.getElementById(id),languages={en:'영어',zh:'중국어',ja:'일본어',de:'독일어',fr:'프랑스어',es:'스페인어',it:'이탈리아어',pt:'포르투갈어',ru:'러시아어'};
const sections={home:'체크인 · 첫 화면',rules:'숙소 안내',manuals:'기기 안내',amenities:'편의시설',around:'주변 여행',food:'맛집 · 카페',tips:'여행 팁',contact:'문의 · 기타',images:'사진'};
let translationPending=[];
let photoTargetKey='',photoTargetSection='',lists=[],photoGroups=[],catalog=[],draft={},revision=0,active='home',dirty=false,busy=false,ai=false,images=false,selectedId=null,browseMode=false,guideObserver=null,guideTimer=null,guideAliases={},guideMatches=new Map(),livePreviewTimer=null,guidePosition=null,guideNavigation=null;
function message(text){$('status').textContent=text;}
async function api(path,body){const response=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok){if(response.status===401){$('login').hidden=false;$('manager').hidden=true;}throw Error(data.error||'연결에 실패했습니다.');}return data;}
function accept(data){if(data.catalog)catalog=data.catalog;if(data.lists)lists=data.lists;if(data.photos)photoGroups=data.photos;translationPending=data.pending||[];for(const id of Object.keys(draft))if(!(id in data.draft))delete draft[id];for(const [id,entry] of Object.entries(data.draft)){if(!entry.translationProgress&&draft[id])delete draft[id].translationProgress;if(draft[id]?.values&&entry.values)Object.assign(draft[id],entry);else draft[id]=entry;}revision=data.revision;dirty=false;}
function group(field){if(field.block==='AIRPORT')return 'home';if(field.block==='TRAVEL_TIPS'||field.id==='I18N:travel_tips_tab')return 'tips';if(field.block==='CHECKIN')return 'home';if(field.block==='AMENITIES')return 'amenities';if(field.itemKey&&listSection(field.block))return listSection(field.block);if(field.type==='image')return 'images';if(field.block==='HOUSE_NOTES')return 'rules';if(field.block==='MANUALS')return 'manuals';if(field.block==='food'||field.block==='ARANYA_DINING_LABELS')return 'food';if(field.block.includes('CURATED')||field.block.includes('AROUND'))return 'around';if(field.block==='aranya-essentials-data')return 'amenities';const key=field.path.join('.');if(/house|rule|notice/.test(key))return 'rules';if(/manual/.test(key))return 'manuals';if(/amen|^a_/.test(key))return 'amenities';if(/around|travel/.test(key))return 'around';if(/food|chip|dining/.test(key))return 'food';if(/host|contact|response|gen_|footer|copied/.test(key))return 'contact';return 'home';}
function changed(){badgeOnlyDirty=false;dirty=true;$('saveState').textContent='수정 중 · 아직 저장하지 않았어요';message('수정 중 · 초안 저장 후 번역과 미리보기를 진행하세요.');updateGuideSelection();clearTimeout(livePreviewTimer);livePreviewTimer=setTimeout(refreshGuide,600);}
function plain(value){const doc=new DOMParser().parseFromString(String(value),'text/html');return doc.body.textContent.replace(/\s+/g,' ').trim();}
function fieldName(field){
 if(field.type==='image'&&field.path.at(-2)==='posters')return (field.block==='AIRPORT'?'인천공항 포스터':'언어별 포스터')+' · '+({ko:'한국어',...languages}[field.path.at(-1)]);
 if(field.block==='food'&&field.path.at(-1)==='badge')return plain(draft['food:'+field.path[0]+'.name']?.values.ko||'맛집')+' · 추천 배지';
 const aroundRoles={around_title:'전체 · 제목',around_sub:'전체 · 설명',around_walk_title:'도보 여행 · 제목',around_walk_sub:'도보 여행 · 설명',around_pick_title:'추천 여행 · 제목',around_pick_sub:'추천 여행 · 설명'};
 if(field.block==='ARANYA_CURATED_UI'&&aroundRoles[field.path[0]])return aroundRoles[field.path[0]]+' · '+plain(draft[field.id]?.values.ko||'');
 if(field.id==='I18N:greet_tag')return '숙소 주소 · 지도 검색 주소';
 if(field.path.slice(-2).join('.')==='tonginGuide.search')return '통인시장 안내 · 지도 검색 주소';
 if(field.type==='url')return field.label;
 if(field.type==='plain'&&['search','naverSearch','address'].includes(field.path.at(-1)))return field.label;
 if(field.type==='icon'||field.type==='choice')return field.label+' · '+(({none:'없음',pick:'ARANYA PICK',walk:'NEARBY WALK',food:'식사',cafe:'카페',store:'편의점',pharmacy:'약국'})[draft[field.id]?.values.ko]||window.amenityIcons?.[draft[field.id]?.values.ko]?.label||'선택');
 if(field.type==='image'&&field.itemKey){const item=lists.flatMap(l=>l.items).find(i=>i.key===field.itemKey),photo=photoGroups.find(p=>p.fieldIds.includes(field.id));return (item?itemTitle(item)+' · ':'')+(photo?'추가 사진 '+(photo.fieldIds.indexOf(field.id)+1):'대표 사진');}
 if(field.block==='hero')return '첫 화면 대표 사진';
 if(field.type==='image'&&field.block==='amenityPhotos')return '편의시설 · '+field.label+' · 사진';
 if(field.type==='image'&&['food','ARANYA_CURATED_PLACES'].includes(field.block)){const name=draft[field.block+':'+field.path[0]+'.name'];return (field.block==='food'?'맛집·카페':'주변여행')+' · '+plain(name?.values.ko||'장소')+' · 사진';}
 const prefix=field.path.slice(0,1).join('.'),title=catalog.find(f=>f.block===field.block&&f.path.join('.')===prefix+'.title');
 const roles={description:'설명',linkLabel:'링크 버튼 문구',linkUrl:'안내 링크',title:'제목',lead:'소개 문구',body:'설명',image:'사진',category:'분류',quick:'버튼 안내',steps:'사용 순서',desc:'설명',name:'이름'};
 if(title){const parts=field.path.slice(1).map(p=>/^\d+$/.test(p)?`${Number(p)+1}번`:roles[p]||'안내');return plain(draft[title.id].values.ko)+' · '+parts.join(' · ');}
 return field.type==='image'?'안내 사진':plain(draft[field.id]?.values.ko||field.label).slice(0,90);
}
function selectField(id){selectedId=id;const field=catalog.find(f=>f.id===id);if(!field)return;active=group(field);$('search').value='';render();$('editorPanel').classList.add('is-open');highlightGuide();const input=$('fields').querySelector('textarea');const focusTarget=input||$('fields').querySelector('select,input');if(focusTarget){focusTarget.focus({preventScroll:true});focusTarget.scrollIntoView({block:'center',behavior:'instant'});}}
let badgeOnlyDirty=false;
function toggleTravelGroup(id){const entry=draft[id];if(!entry)return;if(!dirty)badgeOnlyDirty=true;entry.values.ko=entry.values.ko==='pick'?'walk':'pick';guideObserver?.disconnect();clearTimeout(guideTimer);clearTimeout(livePreviewTimer);updateTravelBadge(id);guideAliases[id]=entry.values.ko;const label=entry.values.ko==='pick'?'ARANYA PICK':'NEARBY WALK';for(const b of document.querySelectorAll('[data-field-id]'))if(b.dataset.fieldId===id)b.textContent='분류 · '+label;for(const b of document.querySelectorAll('[data-travel-group-id]'))if(b.dataset.travelGroupId===id)b.textContent=entry.values.ko==='pick'?'ARANYA PICK → NEARBY WALK으로 변경':'NEARBY WALK → ARANYA PICK으로 변경';dirty=true;$('saveState').textContent='수정 중 · 아직 저장하지 않았어요';message('분류를 '+label+'으로 바꿨어요. 초안 저장 후 공개해주세요.');const doc=$('guideFrame').contentDocument;if(doc?.body)guideObserver?.observe(doc.body,{childList:true,subtree:true,characterData:true});}
function visibleField(field){if(field.block==='AIRPORT'&&!['button','posters'].includes(field.path[0]))return false;return (field.type!=='url'||['AIRPORT','TRAVEL_TIPS'].includes(field.block))&&field.path.at(-1)!=='naverSearch';}
function addListItem(list){if(list.block!=='AMENITIES')return run(()=>structure({type:'add',key:list.key},listSection(list.block)));openIconPicker(null,value=>run(()=>structure({type:'add',key:list.key,icon:value},'amenities')));}
$('cancelIcon').onclick=()=>$('iconDialog').close();
function syncEditorSection(section){if(!sections[section]||active===section)return;active=section;selectedId=null;$('search').value='';render();$('fieldBrowser').open=true;}
function updateTravelBadge(id){const walk=draft[id].values.ko==='walk',doc=$('guideFrame').contentDocument;doc.defaultView.aranyaSetTravelGroup?.(id.slice(0,-6),walk?'walk':'pick');for(const badge of doc.querySelectorAll('[data-cms-field]'))if(badge.dataset.cmsField===id){badge.textContent=walk?'NEARBY WALK':'ARANYA PICK';badge.classList.toggle('walk',walk);badge.closest('.place-card')?.classList.toggle('featured',!walk);}}
function openIconPicker(selected,onSelect){
 const search=$('iconSearch'),picker=$('newIconPicker'),more=$('moreIcons'),count=$('iconCount');let limit=120;
 const aliases={'침대':'bed','욕실':'bath shower','주방':'cooking kitchen utensils','와이파이':'wifi','세탁':'washing','에어컨':'air vent','가방':'luggage baggage','안전':'shield lock','자동차':'car','음식':'food','커피':'coffee','산':'mountain','집':'house home','꽃':'flower','나무':'tree','불':'flame','수영':'pool waves','운동':'sport dumbbell','쓰레기':'trash','전기':'plug battery','문':'door','열쇠':'key','전화':'phone','지도':'map','시계':'clock','욕조':'bath','자전거':'bike'};
 function draw(){const query=search.value.trim().toLowerCase(),terms=(aliases[query]||query).split(/\s+/),entries=Object.entries(window.amenityIcons||{}).filter(([key,icon])=>!query||[key,icon.label,...(icon.tags||[])].join(' ').toLowerCase().includes(query)||terms.some(t=>[key,icon.label,...(icon.tags||[])].join(' ').toLowerCase().includes(t)));picker.replaceChildren();for(const [key,icon] of entries.slice(0,limit)){const b=document.createElement('button');b.type='button';b.innerHTML=icon.svg;b.title=icon.label;b.setAttribute('aria-label',icon.label);b.setAttribute('aria-pressed',String(key===selected));b.onclick=()=>{$('iconDialog').close();onSelect(key);};picker.append(b);}count.textContent=entries.length+'개 아이콘 · '+Math.min(limit,entries.length)+'개 표시';more.hidden=entries.length<=limit;}
 search.value='';search.oninput=()=>{limit=120;draw();};more.onclick=()=>{limit+=120;draw();};draw();$('iconDialog').showModal();search.focus();
}
function fieldGroup(field){
 if(field.block==='AIRPORT')return '인천공항 안내';
 if(field.block==='hero')return '첫 화면';
 if(field.itemKey){const candidates=lists.flatMap(l=>l.items).filter(i=>field.itemKey===i.key||field.itemKey.startsWith(i.key+'.')).sort((a,b)=>a.key.length-b.key.length);if(candidates.length)return itemTitle(candidates[0]);}
 const key=field.path.join('.');
 if(field.block==='I18N'){
  if(/^(step_addr|greet_tag)/.test(key))return '위치 확인';
  if(/^(step_lock)/.test(key))return '도어록';
  if(/^(step_wifi)/.test(key))return '와이파이';
  if(/^(step_co|tab_checkout)/.test(key))return '체크아웃';
  if(/^(welcome|stay_|greet_|hero|checkin|checkout|guest|adult|child)/.test(key))return '첫 화면';
  if(/^(tab_|nav_|lang)/.test(key))return '메뉴 · 언어 선택';
 }
 return ({ARANYA_CURATED_UI:'주변 여행 · 제목과 안내',ARANYA_DINING_LABELS:'맛집 · 공통 안내',ARANYA_UI:'공통 안내',ARANYA_AROUND_UI:'주변 여행 · 공통 안내',I18N:'공통 문구'})[field.block]||sections[group(field)]||'공통 문구';
}
function render(preserveEditor=false){
 const retained=preserveEditor&&draft[selectedId]?[...$('fields').childNodes]:null;
 $('sectionTitle').textContent=sections[active];$('fields').replaceChildren();
 document.querySelectorAll('#sections button').forEach(b=>b.classList.toggle('active',b.dataset.section===active));
 const query=$('search').value.toLowerCase();const groupOpen=new Map([...$('fieldChoices').querySelectorAll('[data-field-group]')].map(el=>[el.dataset.fieldGroup,el.open]));$('fieldChoices').replaceChildren();
 const available=catalog.filter(f=>visibleField(f)&&(active==='images'?f.type==='image':group(f)===active)&&(!query||(draft[f.id].values.ko+' '+fieldName(f)+' '+fieldGroup(f)).toLowerCase().includes(query)));
 const fieldGroups=new Map();for(const field of available){if(field.path.at(-2)==='posters'&&field.path.at(-1)!=='ko')continue;const choice=document.createElement('button');choice.type='button';choice.textContent=field.path.at(-2)==='posters'?'언어별 포스터 관리':fieldName(field);choice.className='field-choice';choice.dataset.fieldId=field.id;choice.onclick=()=>selectField(field.id);const label=fieldGroup(field);let bucket=fieldGroups.get(label);if(!bucket){bucket=document.createElement('details');bucket.dataset.fieldGroup=label;bucket.className='field-group';bucket.open=!!query||groupOpen.get(label)||available.some(f=>f.id===selectedId&&fieldGroup(f)===label);const heading=document.createElement('summary');heading.textContent=label;bucket.append(heading);fieldGroups.set(label,bucket);$('fieldChoices').append(bucket);}bucket.append(choice);const ownerList=lists.find(l=>l.items.some(i=>i.titleId===field.id));if(ownerList&&ownerList.block!=='AIRPORT'){const item=ownerList.items.find(i=>i.titleId===field.id);const controls=document.createElement('div');controls.className='item-fields';const add=document.createElement('button');add.type='button';add.textContent='+ 같은 목록에 항목 추가';add.onclick=()=>addListItem(ownerList);controls.append(add,actionButton('이 항목 삭제',{type:'remove',key:ownerList.key,id:item.id}));bucket.append(controls);}}
 const chosen=catalog.find(f=>f.id===selectedId);$('selectionPath').textContent=chosen?sections[group(chosen)]+' → '+fieldName(chosen):'왼쪽에서 수정할 위치를 선택해주세요.';
 for(const field of catalog.filter(f=>f.id===selectedId)){
  const entry=draft[field.id],card=document.createElement('article');card.className='card';
  const label=document.createElement('label');label.textContent=field.type==='image'?fieldName(field):'한국어 문구';card.append(label);
  if(field.type==='image'){
   const img=document.createElement('img');if(entry.values.ko)img.src=entry.values.ko;img.hidden=!entry.values.ko;img.alt=label.textContent;const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.disabled=!images;file.setAttribute('aria-label',label.textContent+' 교체');
   if(field.path.at(-2)==='posters'){const language=document.createElement('select');language.setAttribute('aria-label','포스터 언어');for(const [l,n]of Object.entries({ko:'한국어',...languages})){const o=document.createElement('option');o.value=l;o.textContent=n;language.append(o);}language.value=field.path.at(-1);language.onchange=()=>selectField(field.block+':'+[...field.path.slice(0,-1),language.value].join('.'));card.append(language);}
   const hint=document.createElement('p');hint.className='hint';hint.textContent=images?'JPG · PNG · WebP / 최대 25MB. 초안을 공개하면 반영됩니다.':'이미지 저장소 연결 후 사진을 교체할 수 있습니다.';
   file.onchange=()=>run(async()=>{const selected=file.files[0];if(!selected)return;if(selected.size>25*1024*1024)throw Error('사진은 25MB 이하로 선택해주세요.');const response=await fetch('/api/image',{method:'POST',body:selected,headers:{'Content-Type':selected.type}}),data=await response.json();if(!response.ok)throw Error(data.error);entry.values.ko=data.url;img.src=data.url;img.hidden=false;changed();});const remove=document.createElement('button');remove.type='button';remove.textContent='사진 제거';remove.onclick=()=>{entry.values.ko='';img.removeAttribute('src');img.hidden=true;changed();};card.append(img,file,remove,hint);
  }else if(['AMENITIES','AIRPORT','TRAVEL_TIPS'].includes(field.block)&&field.path.at(-1)==='icon'){
   label.textContent='아이콘 선택';const button=document.createElement('button');button.type='button';button.className='chosen-icon';button.innerHTML=window.amenityIcons?.[entry.values.ko]?.svg||'';button.setAttribute('aria-label','아이콘 변경');button.title='아이콘 변경';button.onclick=()=>openIconPicker(entry.values.ko,value=>{entry.values.ko=value;render();changed();});card.append(button);

  }else if(field.block==='ARANYA_CURATED_PLACES'&&field.path.at(-1)==='group'){
   label.textContent='여행 분류';const b=document.createElement('button');b.textContent=entry.values.ko==='pick'?'ARANYA PICK → NEARBY WALK으로 변경':'NEARBY WALK → ARANYA PICK으로 변경';b.dataset.travelGroupId=field.id;b.onclick=()=>toggleTravelGroup(field.id);card.append(b);
  }else if(field.type==='url'){
   label.textContent=field.label;const input=document.createElement('input');input.type='url';input.placeholder='https://…';input.value=entry.values.ko;input.setAttribute('aria-label',field.label);input.oninput=()=>{entry.values.ko=input.value.trim();changed();};const hint=document.createElement('p');hint.className='hint';hint.textContent=field.path.at(-1)==='linkUrl'?'https://로 시작하는 안내 링크를 입력하세요. 비워두면 링크를 표시하지 않습니다.':'지도 앱의 공유 링크를 붙여 넣으세요. 비워두면 지도 검색 주소를 사용합니다.';card.append(input,hint);
  }else if(field.type==='plain'||field.type==='choice'){
   const input=document.createElement(field.type==='choice'?'select':'input');label.textContent=field.label;input.setAttribute('aria-label',field.label);if(field.options)for(const v of field.options){const o=document.createElement('option');o.value=v;o.textContent=({food:'식사',cafe:'카페',none:'없음',pick:'ARANYA PICK',walk:'NEARBY WALK',store:'편의점',pharmacy:'약국'})[v]||v;input.append(o);}input.value=entry.values.ko;input.oninput=()=>{entry.values.ko=input.value;changed();};card.append(input);
  }else{
   const input=document.createElement('textarea');input.value=entry.values.ko;input.placeholder=['title','name','nameI18n'].includes(field.path.at(-1))?'제목 수정':'내용 수정';input.maxLength=12000;label.htmlFor=input.id='field-'+catalog.indexOf(field);input.oninput=()=>{entry.values.ko=input.value;changed();};card.append(input);
   if(entry.values.ko!==entry.translatedFrom){const badge=document.createElement('span');badge.className='badge';badge.textContent='번역 필요';card.append(badge);}
   const retry=document.createElement('button');retry.type='button';retry.textContent='이 문구 다시 번역';retry.onclick=()=>run(async()=>{const id=field.id;if(!ai)throw Error('Cloudflare AI 연결이 필요합니다.');if(dirty)await save();message('선택한 문구를 9개 언어로 다시 번역 중입니다. 잠시 기다려주세요.');await translateField(id,true);render();refreshGuide();$('saveState').textContent='번역 저장됨 · 공개 전';message('선택한 문구의 번역을 다시 저장했습니다. 번역 확인 후 공개해주세요.');});const retryHint=document.createElement('p');retryHint.className='hint';retryHint.textContent='번역이 빠졌다면 다시 번역하세요. 이 문구의 다른 언어 번역을 새 결과로 교체합니다.';card.append(retry,retryHint);
   const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='다국어 번역 확인 · 직접 수정';details.append(summary);
   for(const [lang,name] of Object.entries(languages)){const l=document.createElement('label');l.textContent=name;const translated=document.createElement('textarea');translated.value=entry.values[lang];translated.setAttribute('aria-label',name+' 번역');translated.oninput=()=>{entry.values[lang]=translated.value;changed();};l.append(translated);details.append(l);}card.append(details);
  }$('fields').append(card);
 }
 if(!$('fields').children.length){const empty=document.createElement('p');empty.className='empty-editor';empty.textContent='문구와 사진을 누르면 이곳에서 수정할 수 있어요. 찾기 어려운 항목은 아래 목록을 펼쳐주세요.';$('fields').append(empty);}
 if(retained)$('fields').replaceChildren(...retained);
 renderLists();
 if(busy)$('editorPanel').querySelectorAll('button,input,textarea,select').forEach(input=>input.disabled=true);
}
async function run(task){if(busy)return;busy=true;document.querySelectorAll('button,input,textarea,select').forEach(b=>b.disabled=true);try{await task();}catch(error){message(error.message);}finally{busy=false;document.querySelectorAll('button,input,textarea,select').forEach(b=>b.disabled=false);if(!images)document.querySelectorAll('input[type=file]').forEach(b=>b.disabled=true);renderLists();}}
async function load(){const data=await api('content');catalog=data.catalog;ai=data.translationAvailable;images=data.imagesAvailable;accept(data);$('login').hidden=true;$('manager').hidden=false;$('logout').hidden=false;render();refreshGuide();$('saveState').textContent='저장된 초안';message('초안을 불러왔습니다. 저장한 내용은 공개하기 전까지 손님에게 보이지 않습니다.');}
async function save(){clearTimeout(livePreviewTimer);const inline=badgeOnlyDirty;accept(await api('draft',{revision,draft}));render(true);if(!inline)await refreshGuide();badgeOnlyDirty=false;$('saveState').textContent='초안 저장됨 · 공개 전';message('초안을 저장했습니다.');}
$('loginForm').onsubmit=event=>{event.preventDefault();run(async()=>{await api('login',{password:$('password').value});$('password').value='';sessionStorage.setItem('aranya_admin','1');await load();});};
$('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('저장하지 않은 내용을 두고 로그아웃할까요?'))return;await api('logout',{});sessionStorage.removeItem('aranya_admin');dirty=false;busy=false;location.reload();});
for(const [key,name] of Object.entries(sections)){const b=document.createElement('button');b.textContent=name;b.dataset.section=key;b.onclick=()=>{active=key;guideNavigation=key==='images'?'home':key;selectedId=null;render();navigateGuide(guideNavigation);$('fieldBrowser').open=true;};$('sections').append(b);}
$('search').oninput=render;
$('save').onclick=()=>run(async()=>{await save();});
async function translateField(id,force=false){
 const entry=draft[id],progress=entry.translationProgress;
 const completed=!force&&progress?.source===entry.values.ko?progress.done:[];
 for(const [lang,name]of Object.entries(languages)){if(completed.includes(lang))continue;message('번역 중 · '+fieldName(catalog.find(f=>f.id===id))+' · '+name);accept(await api('translate',{revision,id,lang}));}
}
$('translate').onclick=()=>run(async()=>{
 if(dirty)await save();const ids=[...translationPending],failed=[];
 if(ids.length&&!ai)throw Error('Cloudflare AI 연결이 필요합니다. 초안은 저장되었습니다.');
 for(const id of ids){try{await translateField(id);}catch(error){failed.push({id,message:error.message});if(/다른 창|로그인|연결에 실패/.test(error.message))break;}}
 render();refreshGuide();
 if(failed.length){const first=failed[0];selectField(first.id);message('번역 미완료 '+failed.length+'개 · '+fieldName(catalog.find(f=>f.id===first.id))+' · '+first.message+' 다시 누르면 저장된 언어 다음부터 이어갑니다.');}
 else message(ids.length?'번역 완료 · 다국어 문구 확인 후 공개해주세요.':'번역할 변경 사항이 없습니다.');
});
$('preview').onclick=()=>run(async()=>{if(dirty)await save();const guest=btoa(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko']));$('previewFrame').src='/preview?g='+encodeURIComponent(guest);$('previewDialog').showModal();});
$('closePreview').onclick=()=>$('previewDialog').close();
$('publish').onclick=()=>run(async()=>{if(dirty)await save();if(translationPending.length){const id=translationPending[0];selectField(id);throw Error('번역이 필요한 문구: '+fieldName(catalog.find(f=>f.id===id))+' · 오른쪽에서 확인해주세요.');}$('reviewed').checked=false;$('publishDialog').showModal();});
$('cancelPublish').onclick=()=>$('publishDialog').close();
$('confirmPublish').onclick=()=>run(async()=>{if(!$('reviewed').checked)throw Error('미리보기와 번역 확인에 체크해주세요.');accept(await api('publish',{revision,reviewed:true}));$('publishDialog').close();render();$('saveState').textContent='공개 완료 · 손님 화면에 반영됐어요';message('공개 완료 · 손님이 안내를 새로 열면 수정 내용이 표시됩니다.');});
let previewRequest=0;
async function refreshGuide(section){
 clearTimeout(livePreviewTimer);
 const frame=$('guideFrame'),doc=frame.contentDocument;
 if(doc?.defaultView?.aranyaApplyPreview){
  const request=++previewRequest,sent=JSON.stringify(draft);
  try{const data=await api('preview',{revision,draft:JSON.parse(sent)});if(request!==previewRequest||sent!==JSON.stringify(draft)||frame.contentDocument!==doc)return;
   guideObserver?.disconnect();clearTimeout(guideTimer);doc.defaultView.aranyaApplyPreview(data);guideAliases=Object.fromEntries(catalog.map(f=>[f.id,draft[f.id].values.ko]));indexGuide();
  }catch(error){if(request===previewRequest)message('미리보기 반영 실패: '+error.message+' 저장된 초안은 유지됩니다.');}
  return;
 }
 guidePosition=doc?.querySelector('#homeBrand')?{page:doc.querySelector('.page.active')?.dataset.page||'home',scroll:frame.contentWindow.scrollY,lang:doc.documentElement.lang,open:[...doc.querySelectorAll('details[open]')].map(el=>[...doc.querySelectorAll('details')].indexOf(el))}:null;
 if(typeof section==='string')guideNavigation=section;
 if(guideNavigation)guidePosition={page:guideNavigation,scroll:0,lang:guidePosition?.lang||'ko',open:[]};
 guideObserver?.disconnect();guideMatches.clear();guideAliases=Object.fromEntries(catalog.map(f=>[f.id,draft[f.id].values.ko]));
 const guest=btoa(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,guidePosition?.lang||'ko']));
 const url='/preview?g='+encodeURIComponent(guest)+'&revision='+revision;
 if(!dirty){frame.src=url;return;}
 frame.name='aranya-live-preview';frame.contentWindow.name=frame.name;
 const form=document.createElement('form');form.method='POST';form.action=url;form.target=frame.name;form.hidden=true;
 const input=document.createElement('input');input.name='draft';input.value=JSON.stringify(draft);form.append(input);document.body.append(form);form.submit();form.remove();
}

let guideNavigating=false;
function navigateGuide(key){const doc=$('guideFrame').contentDocument;if(!doc)return;const button=key==='home'||key==='images'?doc.getElementById('homeBrand'):doc.querySelector('[data-page="'+key+'"]');if(button){const previous=browseMode;browseMode=true;guideNavigating=true;button.click();doc.defaultView.scrollTo({top:0,behavior:'instant'});browseMode=previous;guideNavigating=false;}}
function highlightGuide(){for(const [el,ids] of guideMatches)el.classList.toggle('aranya-edit-selected',ids.includes(selectedId));}
function indexGuide(){
 const doc=$('guideFrame').contentDocument;if(!doc?.body)return;guideObserver?.disconnect();guideMatches.clear();
 for(const el of doc.body.querySelectorAll('*')){
  el.classList.remove('aranya-editable','aranya-edit-selected');if(el.closest('script,style,svg,select,textarea,dialog:not([open])'))continue;
  let ids;const direct=el.getAttribute('data-cms-field'),key=el.getAttribute('data-i18n');if(direct&&draft[direct])ids=[direct];else if(key&&draft['I18N:'+key])ids=['I18N:'+key];
  if(ids){guideMatches.set(el,ids);el.classList.add('aranya-editable');}
 }
 highlightGuide();guideObserver?.observe(doc.body,{childList:true,subtree:true,characterData:true});
}
function updateGuideSelection(){if($('guideFrame').contentDocument?.documentElement.lang!=='ko')return;const field=catalog.find(f=>f.id===selectedId);if(!field||field.type==='url')return;guideObserver?.disconnect();for(const [el,ids] of guideMatches){if(ids.length!==1||ids[0]!==selectedId)continue;if(field.type==='image'){if(el.tagName==='IMG')el.src=draft[field.id].values.ko;}else if(!el.querySelector('button,input,a'))el.textContent=field.path.at(-1)==='group'?(draft[field.id].values.ko==='pick'?'ARANYA PICK':'NEARBY WALK'):plain(draft[field.id].values.ko);}guideAliases[field.id]=draft[field.id].values.ko;const doc=$('guideFrame').contentDocument;if(doc?.body)guideObserver?.observe(doc.body,{childList:true,subtree:true,characterData:true});}
$('guideFrame').onload=()=>{
 const doc=$('guideFrame').contentDocument;if(!doc?.body)return;
 if(!doc.querySelector('#homeBrand')){$('guideHint').textContent='미리보기를 불러오지 못했습니다. 로그인 상태와 연결을 확인해주세요.';return;}
 const style=doc.createElement('style');style.textContent='html{scroll-behavior:auto!important;scroll-padding-top:160px}.aranya-editable{cursor:pointer!important;scroll-margin-top:160px}.aranya-editable:hover{outline:2px dashed #a65b45!important;outline-offset:3px}.aranya-edit-selected{outline:3px solid #a65b45!important;outline-offset:3px}';doc.head.append(style);
 doc.addEventListener('click',event=>{if(busy&&!browseMode){event.preventDefault();event.stopImmediatePropagation();return;}const target=event.target.closest('a,button');if(target?.matches('a')){event.preventDefault();event.stopImmediatePropagation();if(!browseMode&&draft[target.dataset.cmsField])selectField(target.dataset.cmsField);return;}if(target?.matches('[data-page],#homeBrand')){guideNavigation=target.id==='homeBrand'?'home':target.dataset.page;if(!guideNavigating)syncEditorSection(guideNavigation);}if(browseMode)return;if(target?.matches('[data-guide-photo]')){let id=target.dataset.cmsField;if(!id){const owner=target.closest('[data-cms-item]')?.dataset.cmsItem;id=catalog.find(f=>f.type==='image'&&(!owner||f.itemKey===owner)&&draft[f.id]?.values.ko===target.dataset.guidePhoto)?.id;}if(id&&draft[id]){event.preventDefault();event.stopImmediatePropagation();selectField(id);return;}}if(target?.matches('[data-page],#homeBrand,summary,[data-guide-photo],.guide-lightbox button'))return;let el=event.target;while(el&&!guideMatches.has(el))el=el.parentElement;if(!el)return;event.preventDefault();event.stopImmediatePropagation();const ids=guideMatches.get(el);if(ids.length===1){const f=catalog.find(f=>f.id===ids[0]);if(f?.block==='ARANYA_CURATED_PLACES'&&f.path.at(-1)==='group')toggleTravelGroup(f.id);else selectField(ids[0]);}else{$('fieldChoices').replaceChildren();for(const id of ids){const f=catalog.find(f=>f.id===id),b=document.createElement('button');b.className='field-choice';b.textContent=sections[group(f)]+' → '+fieldName(f);b.onclick=()=>selectField(id);$('fieldChoices').append(b);}$('fieldBrowser').open=true;$('editorPanel').classList.add('is-open');message('같은 문구가 여러 곳에 있습니다. 오른쪽에서 수정할 위치를 선택해주세요.');}},true);
 guideObserver=new MutationObserver(()=>{clearTimeout(guideTimer);guideTimer=setTimeout(indexGuide,100);});indexGuide();navigateGuide(guideNavigation||guidePosition?.page||active);if(guidePosition){const details=doc.querySelectorAll('details');for(const i of guidePosition.open)if(details[i])details[i].open=true;$('guideFrame').contentWindow.scrollTo(0,guidePosition.scroll);}guidePosition=null;guideNavigation=null;
};
$('browseMode').onclick=()=>{browseMode=!browseMode;$('browseMode').setAttribute('aria-pressed',String(browseMode));$('browseMode').textContent=browseMode?'수정할 위치 선택':'화면 둘러보기';$('guideHint').textContent=browseMode?'화면의 버튼을 눌러 안내를 둘러보세요. 수정하려면 위치 선택으로 돌아오세요.':'수정할 문구·사진을 누르세요. 탭과 펼치기 버튼은 그대로 사용할 수 있어요.';};
$('closeEditor').onclick=()=>$('editorPanel').classList.remove('is-open');
window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
load().catch(error=>{message(error.message);if(!$('login').hidden)$('password').focus();});

function listSection(block){return ({AIRPORT:'home',TRAVEL_TIPS:'tips',CHECKIN:'home',AMENITIES:'amenities',HOUSE_NOTES:'rules',MANUALS:'manuals',food:'food',ARANYA_CURATED_PLACES:'around','aranya-essentials-data':'amenities'})[block];}
function itemTitle(item){return plain(draft[item.titleId]?.values.ko||'새 항목');}
async function structure(action,navigateTo){clearTimeout(livePreviewTimer);++previewRequest;if(dirty)await save();const before=new Set(catalog.map(f=>f.id)),previous=selectedId;accept(await api('structure',{revision,action}));if(!draft[selectedId])selectedId=null;if(action.type==='add'||action.type==='photoAdd')selectedId=catalog.find(f=>!before.has(f.id)&&(action.type==='photoAdd'?f.type==='image':f.type==='text'))?.id||null;render(selectedId===previous);await refreshGuide();$('saveState').textContent='목록 초안 저장됨 · 공개 전';message('목록 변경을 초안에 저장했습니다. 미리보기 확인 후 공개해주세요.');}
function actionButton(text,action,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;b.onclick=()=>run(async()=>{if((action.type==='remove'||action.type==='photoRemove')&&!confirm('이 항목을 초안에서 삭제할까요? 공개 전까지 손님 화면은 유지됩니다.'))return;await structure(action);});return b;}
function amenityOrder(list){if(list.block==='aranya-essentials-data')return 3;return ({hanok:0,ess:1,kit:2})[list.path?.[0]]??4;}
function renderLists(){
 const root=$('listManager'),open=new Map([...root.querySelectorAll('[data-list-key]')].map(el=>[el.dataset.listKey,el.open]));root.replaceChildren();if(active==='images')renderPhotoDestination(root);const selected=catalog.find(f=>f.id===selectedId),owner=selected?.itemKey;
 const orderedLists=active==='amenities'?[...lists].sort((a,b)=>amenityOrder(a)-amenityOrder(b)):lists;
 for(const list of orderedLists.filter(l=>l.block!=='AIRPORT'&&listSection(l.block)===active)){
  const box=document.createElement('details');box.className='managed-list';box.dataset.listKey=list.key;box.open=open.get(list.key)??!list.parentKey;const heading=document.createElement('summary');heading.textContent=(list.parentKey?(itemTitle(lists.flatMap(l=>l.items).find(i=>i.key===list.parentKey))+' · '):'')+(active==='amenities'?({'AMENITIES:hanok':'한옥만의 공간','AMENITIES:ess':'필수 시설','AMENITIES:kit':'주방·안전','aranya-essentials-data:places':'생활 편의(편의점·약국)'}[list.key]||list.label):(list.block==='TRAVEL_TIPS'&&list.path.at(-1)==='steps'?'세부 안내':list.label))+' · '+list.items.length+'개';box.append(heading);
  for(const [i,item] of list.items.entries()){
   const row=document.createElement('div');row.className='managed-row';row.dataset.itemId=item.id;const title=document.createElement('button');title.className='managed-title';title.textContent=itemTitle(item);title.onclick=()=>selectField(item.titleId);row.append(title,actionButton('↑',{type:'move',key:list.key,id:item.id,direction:-1},i===0),actionButton('↓',{type:'move',key:list.key,id:item.id,direction:1},i===list.items.length-1),actionButton('삭제',{type:'remove',key:list.key,id:item.id}));box.append(row);
   if(owner===item.key||owner?.startsWith(item.key+'.')){const fields=document.createElement('div');fields.className='item-fields';const hidePhotos=['food','ARANYA_CURATED_PLACES'].includes(list.block);for(const id of item.fieldIds){const f=catalog.find(f=>f.id===id);if(!visibleField(f)||hidePhotos&&f.type==='image'||f.path.at(-2)==='posters'&&f.path.at(-1)!=='ko')continue;const b=document.createElement('button');b.textContent=f.path.at(-2)==='posters'?'언어별 포스터 관리':f.type==='image'?'사진':fieldName(f);b.dataset.fieldId=id;b.onclick=()=>selectField(id);fields.append(b);}if(!hidePhotos&&photoGroups.some(p=>p.key===item.key))fields.append(actionButton('사진 추가',{type:'photoAdd',key:item.key}));box.append(fields);}
  }
  const add=document.createElement('div');add.className='managed-add';const b=document.createElement('button');b.type='button';b.textContent='+ 항목 추가';b.onclick=()=>addListItem(list);add.append(b);box.append(add);root.append(box);
 }
 if(active==='home'){const panel=document.createElement('div');panel.className='item-fields';for(const [id,label]of [['hero:image','첫 화면 대표 사진'],['AIRPORT:button','인천공항 버튼 제목'],['AIRPORT:posters.ko','인천공항 · 언어별 포스터 관리']]){if(!draft[id])continue;const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>selectField(id);panel.append(b);}root.prepend(panel);}if(selected?.type==='image'){const photo=photoGroups.find(p=>p.fieldIds.includes(selectedId));if(photo)root.prepend(actionButton('이 사진 칸 삭제',{type:'photoRemove',key:photo.key,id:selected.path.at(-1)}));}
}

function photoDestinationLabel(key){
 const parts=[];let current=key,section='';
 while(current){const list=lists.find(l=>l.items.some(i=>i.key===current));if(!list)break;const index=list.items.findIndex(i=>i.key===current),item=list.items[index];parts.unshift(list.label+' '+(index+1)+' · '+itemTitle(item));section=sections[listSection(list.block)]||'';current=list.parentKey;}
 return section+' → '+parts.join(' / ');
}
function renderPhotoDestination(root){
 const box=document.createElement('section');box.className='photo-destination';box.id='photoDestination';
 const heading=document.createElement('h3');heading.textContent='사진을 어디에 추가할까요?';
 const hint=document.createElement('p');hint.className='hint';hint.textContent='메뉴와 항목을 선택하세요. 새로 만든 항목에도 사진을 추가할 수 있어요.';
 const menu=document.createElement('select');menu.id='photoTargetSection';menu.setAttribute('aria-label','사진을 추가할 메뉴');
 const menuPlaceholder=document.createElement('option');menuPlaceholder.value='';menuPlaceholder.textContent='메뉴 선택';menu.append(menuPlaceholder);
 const available=new Set(photoGroups.map(p=>listSection(p.block)));
 for(const [key,name] of Object.entries(sections))if(available.has(key)){const option=document.createElement('option');option.value=key;option.textContent=name;menu.append(option);}
 const target=document.createElement('select');target.id='photoTargetItem';target.setAttribute('aria-label','사진을 추가할 항목');
 const add=document.createElement('button');add.id='addPhotoToItem';add.type='button';add.className='primary';add.textContent='선택한 항목에 사진 추가';
 const populate=()=>{target.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='항목 선택';target.append(placeholder);for(const photo of photoGroups.filter(p=>listSection(p.block)===photoTargetSection)){const option=document.createElement('option');option.value=photo.key;option.textContent=photoDestinationLabel(photo.key)+(photo.slots.length>=12?' (추가 사진 12장)':'');option.disabled=photo.slots.length>=12;target.append(option);}target.value=photoTargetKey;if(target.selectedIndex<0)target.value='';photoTargetKey=target.value;if(photoGroups.find(p=>p.key===photoTargetKey)?.slots.length>=12){target.value='';photoTargetKey='';}target.disabled=!photoTargetSection||busy;add.disabled=!photoTargetKey||busy;};
 menu.value=photoTargetSection;menu.onchange=()=>{photoTargetSection=menu.value;photoTargetKey='';populate();};target.onchange=()=>{photoTargetKey=target.value;add.disabled=!photoTargetKey||busy;};
 add.onclick=()=>run(async()=>{const key=photoTargetKey;if(!key)return;await structure({type:'photoAdd',key},listSection(photoGroups.find(p=>p.key===key).block));$('editorPanel').classList.add('is-open');const chosenNew=selectedId===photoGroups.find(p=>p.key===key)?.fieldIds.at(-1);message('사진 위치: '+photoDestinationLabel(key)+(chosenNew?' · 파일을 선택해주세요.':' · 사진 칸을 추가했습니다. 사진 목록에서 새 사진을 선택해 업로드해주세요.'));});
 populate();box.append(heading,hint,menu,target,add);root.append(box);
}
