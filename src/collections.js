// Stable list item keys retain all existing flat content IDs during migration.
import {amenityIconSvg} from './generated.js';
export const validAmenityIcon=value=>Object.hasOwn(amenityIconSvg,value);
const langs=['ko','en','zh','ja','de','fr','es','it','pt','ru'];
const titles={AIRPORT:'인천공항에서 오는 법',TRAVEL_TIPS:'여행 팁 카드',methods:'이동 방법',button:'버튼 제목',description:'섹션 설명',linkUrl:'안내 링크',linkLabel:'링크 문구',CHECKIN:'체크인 안내',AMENITIES:'편의시설',HOUSE_NOTES:'숙소 안내',MANUALS:'기기 안내',food:'맛집 · 카페',ARANYA_CURATED_PLACES:'주변 여행','aranya-essentials-data':'편의점 · 약국',items:'안내 문장',quick:'빠른 사용 순서',steps:'사용 순서',notes:'주의사항',stops:'추천 가게',places:'장소',hanok:'한옥 공간',ess:'생활 편의',kit:'주방 · 안전',photos:'사진',title:'제목',name:'이름',nameI18n:'장소 이름',addressI18n:'주소 안내',body:'설명',lead:'소개 문구',category:'기기 분류',dist:'거리 · 위치',desc:'소개',tip:'추천 안내',use:'이용 방법',menu:'추천 메뉴',eatHow:'먹는 방법',image:'사진',spicy:'매운맛 안내',statusNote:'영업 안내'};
const rawFields={badge:'추천 배지',search:'지도 검색 주소',naverSearch:'네이버지도 검색어',icon:'아이콘',cat:'분류',group:'분류',kind:'분류',phone:'전화번호',address:'지도 검색 주소',name:'지도용 장소 이름'};
const options={badge:['pick','none'],cat:['food','cafe'],group:['pick','walk'],kind:['store','pharmacy']};
const mapFields={naverUrl:'네이버지도 링크',kakaoUrl:'카카오맵 링크',googleUrl:'구글맵 링크'};
Object.assign(rawFields,mapFields);
export function validMapUrl(value){if(value==='')return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!/[\s<>"']/.test(value);}catch{return false;}}
const media=/^\/(?:assets\/[a-f0-9]{24}\.(?:png|jpeg|webp|gif)|media\/[a-f0-9-]{36}\.(?:png|jpg|webp))$/;
export const validImage=value=>value===''||media.test(value);
const entry=(value,type='text')=>({values:type==='text'?Object.fromEntries(langs.map(l=>[l,value[l]??value.en??value.ko??''])):{ko:value??''},translatedFrom:type==='text'?value.ko||'':'',reviewed:true});
const keyFor=(block,path)=>block+':'+path.join('.');
const safeKey=s=>typeof s==='string'&&/^(?:\d+|n_[a-f0-9-]{36})$/.test(s);
export function collectionModel(original,baseCatalog,seed,content={}){
 const source=structuredClone(original),catalog=[],defaults={},lists=[],photos=[],fieldMap=new Map(),seenLists=new Set(),seenPhotos=new Set();
 for(const place of source.food||[])place.badge='none';
 const prepareMaps=value=>{if(!value||typeof value!=='object')return;if(value.tonginGuide)value.tonginGuide.search||='통인시장 서울 종로구 자하문로15길 18';if(typeof value.search==='string')for(const key of Object.keys(mapFields))value[key]||='';for(const child of Object.values(value))if(child&&typeof child==='object')prepareMaps(child);};
 prepareMaps(source.food);prepareMaps(source.ARANYA_CURATED_PLACES);
 const structure=content.__lists||{},galleries=content.__photos||{};
 if(!structure||Array.isArray(structure)||typeof structure!=='object'||!galleries||Array.isArray(galleries)||typeof galleries!=='object')throw Error('목록 형식이 올바르지 않습니다.');
 const base=new Map(baseCatalog.map(f=>[f.id,f]));
 const amenityGroups={hanok:['a_med','a_jac','a_yard','a_bed','a_bath','a_house'],ess:['a_wifi','a_tv','a_wash','a_ac','a_bag','a_dry'],kit:['a_mw','a_cook','a_cam']};
 source.CHECKIN=[['step_addr','step_addr_p'],['step_lock','step_lock_p'],['step_wifi','step_wifi_p'],['tab_checkout','step_co_p']].map(([title,body],i)=>({title:seed['I18N:'+title].values,body:seed['I18N:'+body].values,_legacy:[title,body],_map:i===0}));
 source.AMENITIES=Object.fromEntries(Object.entries(amenityGroups).map(([group,keys])=>[group,keys.map(key=>({title:seed['I18N:'+key]?.values||Object.fromEntries(langs.map(l=>[l,'TV'])),icon:key,image:seed['amenityPhotos:'+key]?.values.ko||'',_legacy:key}))]));
 const moved=new Set([...source.CHECKIN.flatMap(v=>v._legacy),...Object.values(amenityGroups).flat()]);
 function field(block,path,value,type,fresh,item,override){
  const id=override||keyFor(block,path);if(fieldMap.has(id))return content[id]?.values||defaults[id]?.values;
  const originalField=base.get(id),label=originalField?.label||rawFields[path.at(-1)]||titles[path.at(-1)]||path.at(-1);
  const f={...originalField,id,block,path,type,label,paths:{},itemKey:item?.key,options:options[path.at(-1)]};
  let def=entry(value,type);if(fresh){def=entry(type==='text'?Object.fromEntries(langs.map(l=>[l,''])):['choice','icon'].includes(type)?value:type==='plain'&&path.at(-1)==='icon'?'•':'',type);def.reviewed=false;}
  defaults[id]=seed[id]||def;catalog.push(f);fieldMap.set(id,f);if(item)item.fieldIds.push(id);
  return (content[id]||defaults[id]).values;
 }
 function walk(value,block,path=[],fresh=false,item=null){
  if(Array.isArray(value)){
   const key=keyFor(block,path),configured=structure[key];seenLists.add(key);
   const order=configured===undefined?value.map((_,i)=>({id:String(i),source:i})):configured;
   if(!Array.isArray(order)||order.length>80||!value.length&&order.length)throw Error('목록 항목은 최대 80개까지 추가할 수 있습니다.');
   const list={key,block,path,label:titles[path.at(-1)]||titles[block]||'세부 목록',parentKey:item?.key,items:[],templates:value.map((v,i)=>({source:i,label:v?.title?.ko||v?.name?.ko||v?.nameI18n?.ko||v?.ko||'기본 항목'}))};lists.push(list);
   const ids=new Set();return order.map(row=>{
    if(!row||!safeKey(row.id)||ids.has(row.id)||!Number.isInteger(row.source)||row.source<0||row.source>=value.length||/^\d+$/.test(row.id)&&String(row.source)!==row.id)throw Error('목록 항목 연결이 올바르지 않습니다.');ids.add(row.id);
    const itemPath=[...path,row.id],record={id:row.id,source:row.source,key:keyFor(block,itemPath),fieldIds:[]};list.items.push(record);
    const isNew=fresh||row.id.startsWith('n_'),result=walk(value[row.source],block,itemPath,isNew,record);
    if(result&&typeof result==='object'&&!Array.isArray(result)&&typeof result.ko!=='string'){
     const photoKey=record.key,slots=galleries[photoKey]||[];seenPhotos.add(photoKey);
     if(!Array.isArray(slots)||slots.length>12||new Set(slots).size!==slots.length||slots.some(s=>!/^n_[a-f0-9-]{36}$/.test(s)))throw Error('항목당 추가 사진은 최대 12장입니다.');
     const photoRecord={key:photoKey,block,itemKey:record.key,slots,fieldIds:[]};photos.push(photoRecord);
     result.photos=slots.map(slot=>{const p=[...itemPath,'photos',slot],id=keyFor(block,p);photoRecord.fieldIds.push(id);return field(block,p,'','image',false,record).ko;}).filter(Boolean);
     if(result.slug&&isNew)result.slug='item-'+row.id+'-'+path.join('-');
     result._cmsKey=record.key;
    }
    record.titleId=record.fieldIds.find(id=>/\.(?:title|name|nameI18n)$/.test(id))||record.fieldIds.find(id=>fieldMap.get(id)?.type==='text')||record.fieldIds[0];
    return result;
   });
  }
  if(value&&typeof value==='object'){
   if(typeof value.ko==='string')return field(block,path,value,'text',fresh,item);
   const out={};for(const [k,v] of Object.entries(value)){
    if(k.startsWith('_')){out[k]=v;continue;}
    let override;
    if(!fresh&&block==='CHECKIN'&&['title','body'].includes(k))override='I18N:'+value._legacy[k==='title'?0:1];
    if(!fresh&&block==='AMENITIES'&&k==='title'&&seed['I18N:'+value._legacy])override='I18N:'+value._legacy;
    if(!fresh&&block==='AMENITIES'&&k==='image')override='amenityPhotos:'+value._legacy;
    if(override)out[k]=field(block,[...path,k],v,k==='image'?'image':'text',false,item,override);
    else if(k==='posters'&&['AIRPORT','TRAVEL_TIPS'].includes(block)){out[k]=Object.fromEntries(langs.map(l=>[l,field(block,[...path,k,l],v[l]||'','image',fresh,item).ko]));}
    else if(k==='image')out[k]=field(block,[...path,k],v,'image',fresh,item).ko;
    else if(Object.hasOwn(mapFields,k)||k==='linkUrl')out[k]=field(block,[...path,k],v,'url',fresh,item).ko;
    else if(['AMENITIES','AIRPORT','TRAVEL_TIPS'].includes(block)&&k==='icon')out[k]=field(block,[...path,k],v,'icon',fresh,item).ko;
    else if(item&&Object.hasOwn(rawFields,k)&&(typeof v==='string'||v===null))out[k]=field(block,[...path,k],v,options[k]?'choice':'plain',fresh,item).ko;
    else out[k]=walk(v,block,[...path,k],fresh,item);
   }
   if(out.image&&typeof out.image==='object')out.image=out.image.ko;
   if(fresh&&block==='CHECKIN'){out._legacy=null;out._map=false;}
   if(fresh&&block==='AMENITIES')out._legacy=null;
   return out;
  }
  return value;
 }
 const resolved={};
 // I18N has languages at the outer level, unlike other translated blocks.
 resolved.I18N=structuredClone(source.I18N);
 for(const f of baseCatalog.filter(f=>f.block==='I18N'&&!moved.has(f.path[0]))){const vals=field('I18N',f.path,seed[f.id].values,'text',false,null);for(const l of langs)resolved.I18N[l][f.path[0]]=vals[l];}
 for(const [block,value] of Object.entries(source))if(block!=='I18N')resolved[block]=walk(value,block);
 for(const f of catalog.filter(f=>f.id.startsWith('I18N:'))){const vals=(content[f.id]||defaults[f.id]).values;for(const l of langs)resolved.I18N[l][f.id.slice(5)]=vals[l];}
 field('hero',['image'],seed['hero:image'].values.ko,'image',false,null);
 if(Object.keys(structure).some(k=>!seenLists.has(k))||Object.keys(galleries).some(k=>!seenPhotos.has(k)))throw Error('삭제된 항목의 목록 정보가 남아 있습니다. 새로고침해주세요.');
 if(catalog.length>5000)throw Error('안내 항목이 너무 많습니다.');
 return {catalog,defaults,blocks:resolved,lists,photos};
}
export function hydrateContent(blocks,catalog,seed,input){const model=collectionModel(blocks,catalog,seed,input);return {...Object.fromEntries(model.catalog.map(f=>[f.id,input[f.id]||model.defaults[f.id]])),__lists:input.__lists||{},__photos:input.__photos||{}};}
export function changeStructure(blocks,catalog,seed,content,action){
 const draft=structuredClone(content),model=collectionModel(blocks,catalog,seed,draft);draft.__lists||={};draft.__photos||={};
 const prune=key=>{for(const prop of ['__lists','__photos'])for(const k of Object.keys(draft[prop]))if(k===key||k.startsWith(key+'.'))delete draft[prop][k];};
 if(['add','remove','move'].includes(action.type)){
  const list=model.lists.find(l=>l.key===action.key);if(!list)throw Error('목록을 찾을 수 없습니다.');
  const rows=list.items.map(({id,source})=>({id,source}));
  if(action.type==='add'){const source=action.source??0;if(!list.templates.some(t=>t.source===source))throw Error('항목을 추가할 수 없습니다. 새로고침해주세요.');const id='n_'+crypto.randomUUID();if(action.icon!==undefined){if(!['AMENITIES','AIRPORT','TRAVEL_TIPS'].includes(list.block)||!validAmenityIcon(action.icon))throw Error('아이콘을 선택해주세요.');draft[keyFor(list.block,[...list.path,id,'icon'])]=entry(action.icon,'choice');}rows.push({id,source});}
  else{const index=rows.findIndex(r=>r.id===action.id);if(index<0)throw Error('항목을 찾을 수 없습니다.');if(action.type==='remove'){prune(list.key+(list.path.length?'.':'')+action.id);rows.splice(index,1);}else{const next=index+action.direction;if(![-1,1].includes(action.direction)||next<0||next>=rows.length)throw Error('이동할 위치가 없습니다.');[rows[index],rows[next]]=[rows[next],rows[index]];}}
  draft.__lists[action.key]=rows;
 }else if(['photoAdd','photoRemove'].includes(action.type)){
  const photo=model.photos.find(p=>p.key===action.key);if(!photo)throw Error('사진 항목을 찾을 수 없습니다.');
  const slots=[...photo.slots];if(action.type==='photoAdd')slots.push('n_'+crypto.randomUUID());else{const i=slots.indexOf(action.id);if(i<0)throw Error('사진을 찾을 수 없습니다.');slots.splice(i,1);}draft.__photos[action.key]=slots;
 }else throw Error('지원하지 않는 목록 작업입니다.');
 return hydrateContent(blocks,catalog,seed,draft);
}
