import {renderTravelExtras} from './travel-content.js';
import {collectionModel,validImage,validMapUrl,validAmenityIcon} from './collections.js';
import {amenityIconSvg} from './generated.js';
import {blocks as sourceBlocks,catalog as sourceCatalog,seed as sourceSeed} from './generated.js';
export const languages=['ko','en','zh','ja','de','fr','es','it','pt','ru'];
// Keep each sentence separate: M2M100 can omit trailing sentences in a paragraph.
export function translationFragments(text){
 return text.split(/(<[^>]+>|\{[^}]+\}|https?:\/\/[^\s<]+|\d+(?:[.:/-]\d+)*)/g).flatMap(part=>
  /^(?:<|\{|https?:\/\/|\d)/.test(part)?[part]:part.split(/(?<=[.!?。！？])(?=\s)|(?<=\n)/u));
}
export function validateDraft(input,catalog,previous){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('초안 형식이 올바르지 않습니다.');
 if(Object.keys(input).filter(k=>!k.startsWith('__')).length!==catalog.length)throw Error('항목이 누락되었습니다. 새로고침해주세요.');
 const result={};
 for(const k of ['__lists','__photos']){if(JSON.stringify(input[k]||{})!==JSON.stringify(previous[k]||{}))throw Error('목록 변경은 항목 관리 버튼을 이용해주세요.');if(previous[k]!==undefined||input[k]!==undefined)result[k]=structuredClone(previous[k]||{});}
 for(const field of catalog){
  const entry=input[field.id],old=previous[field.id];if(!entry?.values)throw Error('항목 누락');
  const values={};for(const l of field.type==='text'?languages:['ko']){const v=entry.values[l];if(typeof v!=='string'||v.length>12000)throw Error('문구 길이나 언어를 확인해주세요.');if(v!==old.values[l]&&/<(?!\/?(?:b|strong|em|i|small|br)\s*\/?>)[^>]*>/i.test(v))throw Error('문구에는 일반 텍스트와 기본 강조 태그만 사용할 수 있습니다.');values[l]=v;}
  if(field.type==='image'&&!validImage(values.ko))throw Error('사진을 업로드해 선택해주세요.');
  if(field.type==='url'&&!validMapUrl(values.ko))throw Error('지도 링크는 https://로 시작하는 올바른 주소를 입력해주세요.');
  if(field.type==='icon'&&!validAmenityIcon(values.ko))throw Error('목록에서 아이콘을 선택해주세요.');
  if(field.type==='choice'&&!field.options.includes(values.ko))throw Error('올바른 분류를 선택해주세요.');
  if(field.type==='plain'&&/[<>]/.test(values.ko))throw Error('주소·전화번호·아이콘에는 일반 문자만 입력해주세요.');
  // Translation status comes only from the server, never from the browser.
  result[field.id]={values,translatedFrom:old.translatedFrom,reviewed:old.reviewed&&JSON.stringify(values)===JSON.stringify(old.values),...(old.translationProgress?{translationProgress:old.translationProgress}:{})};
 }
 return result;
}
// A comma at a line break is formatting; preserve number punctuation and wording.
const translationText=value=>String(value??'').replace(/\r\n/g,'\n').replace(/,[ \t]*\n/g,'\n').trim();
export function pending(draft,catalog){return catalog.filter(f=>{if(f.type!=='text'||f.block==='AIRPORT'&&f.path[0]!=='button')return false;const e=draft[f.id];return translationText(e.values.ko)!==translationText(e.translatedFrom)||!!e.values.ko.trim()&&languages.some(l=>l!=='ko'&&!e.values[l]?.trim());}).map(f=>f.id);}
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderGuide(template,blocks,catalog,content,{editing=false,snapshot=false}={}){
 const model=collectionModel(blocks,catalog,sourceSeed,content),copy=structuredClone(model.blocks);
 if(editing){
  const placeholders=(value,path=[])=>{
   if(path.at(-1)==='posters')return;
   if(!value||typeof value!=='object')return;
   if(typeof value.ko==='string'){
    const label=['title','name','nameI18n'].includes(path.at(-1))?'제목 수정':'내용 수정';
    for(const l of languages)if(!value[l]?.trim())value[l]=label;
    return;
   }
   for(const [key,child] of Object.entries(value))placeholders(child,[...path,key]);
  };
  for(const [key,value] of Object.entries(copy))if(key!=='I18N')placeholders(value,[key]);
 }
 const photos=item=>[item.image,...(item.photos||[])].filter(Boolean).map((url,i)=>'<button type="button" class="place-photo-button" data-guide-photo="'+escape(url)+'">PHOTO '+(i+1)+'</button>').join('');
 const text=(value,id)=>{
  const key='cms_'+id.replace(/[^a-zA-Z0-9_]/g,'_');for(const l of languages)copy.I18N[l][key]=value[l]||'';
  return 'data-cms-field="'+escape(id)+'" data-i18n="'+key+'"';
 };
 const extras=renderTravelExtras(copy,model,text,photos,escape,amenityIconSvg);
 template=template.replace('__TRAVEL_TIPS_CONTENT__',extras.tips);
 const arrival=copy.CHECKIN.map(item=>{
  const ids=model.catalog.filter(f=>f.itemKey===item._cmsKey),title=ids.find(f=>f.path.at(-1)==='title'),body=ids.find(f=>f.path.at(-1)==='body');
  return '<div class="step" data-cms-item="'+item._cmsKey+'"><div><h3 '+text(item.title,title.id)+'>'+escape(item.title.ko)+'</h3><p '+text(item.body,body.id)+'>'+escape(item.body.ko)+'</p>'+photos(item)+(item._map?'<div class="links" id="stationMaps"></div>'+extras.airport:'')+'</div></div>';
 }).join('');
 const start=template.indexOf('<div class="steps">'),end=template.indexOf('</section>',start);
 if(start>=0&&end>=0)template=template.slice(0,start)+'<div class="steps">'+arrival+'</div></div>\n'+template.slice(end);
 const icons=new Map([...template.matchAll(/<div class="amen"[^>]*>(<svg[\s\S]*?<\/svg>)<span (?:data-i18n|data-photo-key)="([^"]+)"/g)].map(m=>[m[2],m[1]]));
 let groupIndex=0;const groups=Object.values(copy.AMENITIES);
 template=template.replace(/<div class="amen-grid">[\s\S]*?\n<\/div>/g,()=>'<div class="amen-grid">'+(groups[groupIndex++]||[]).map(item=>{
  const title=model.catalog.find(f=>f.itemKey===item._cmsKey&&f.path.at(-1)==='title');return '<div class="amen" style="flex-wrap:wrap" data-cms-item="'+item._cmsKey+'">'+(amenityIconSvg[item.icon]||icons.get(item.icon)||icons.get(item._legacy)||'<span aria-hidden="true">◇</span>')+'<span '+text(item.title,title.id)+'>'+escape(item.title.ko)+'</span>'+photos(item)+'</div>';
 }).join('')+'</div>');
 const hero=content['hero:image']?.values.ko??sourceSeed['hero:image'].values.ko;
 template=template.replace('<div class="masthead-visual">','<div class="masthead-visual" data-cms-field="hero:image">').replace('__ARANYA_HERO__',hero).replace('alt="Aranya hanok window"','data-cms-field="hero:image" alt="Aranya hanok window"');
 if(!hero){template=template.replace(/<img\b[^>]*src=""[^>]*alt="Aranya hanok window"[^>]*>/,'');template=template.replace('</head>','<style>.masthead-visual{display:none!important}.home-masthead{grid-template-columns:1fr!important}</style></head>');}
 // Remove obsolete fixed photo placeholders if a legacy template is passed.
 template=template.replace(/__AMEN_PHOTO_[^_]+__/g,'');
 if(snapshot)return {blocks:copy,html:template,hero};
 if(editing)template=template.replace('</head>','<script src="/preview.js"></script></head>');
 return template.replace(/__ARANYA_BLOCK_([\w-]+)__/g,(_,name)=>JSON.stringify(copy[name]).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'));
}
