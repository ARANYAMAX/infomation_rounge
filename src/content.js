export const languages=['ko','en','zh','ja','de','fr','es','it','pt','ru'];
export function validateDraft(input,catalog,previous){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('초안 형식이 올바르지 않습니다.');
 if(Object.keys(input).length!==catalog.length)throw Error('항목이 누락되었습니다. 새로고침해주세요.');
 const result={};
 for(const field of catalog){
  const entry=input[field.id],old=previous[field.id];if(!entry?.values)throw Error('항목 누락');
  const values={};for(const l of field.type==='image'?['ko']:languages){const v=entry.values[l];if(typeof v!=='string'||v.length>12000)throw Error('문구 길이나 언어를 확인해주세요.');if(v!==old.values[l]&&/<(?!\/?(?:b|strong|em|i|small|br)\s*\/?>)[^>]*>/i.test(v))throw Error('문구에는 일반 텍스트와 기본 강조 태그만 사용할 수 있습니다.');values[l]=v;}
  if(field.type==='image'&&!/^\/(?:assets\/[a-f0-9]{24}\.(?:png|jpeg|webp|gif)|media\/[a-f0-9-]{36}\.(?:png|jpg|webp))$/.test(values.ko))throw Error('사진을 업로드해 선택해주세요.');
  // Translation status comes only from the server, never from the browser.
  result[field.id]={values,translatedFrom:old.translatedFrom,reviewed:old.reviewed&&JSON.stringify(values)===JSON.stringify(old.values)};
 }
 return result;
}
export function pending(draft,catalog){return catalog.filter(f=>f.type==='text'&&draft[f.id].values.ko!==draft[f.id].translatedFrom).map(f=>f.id);}
export function renderGuide(template,blocks,catalog,content){
 const copy=structuredClone(blocks);
 for(const field of catalog){const entry=content[field.id];if(!entry)continue;
  if(field.block==='hero'){template=template.replace('__ARANYA_HERO__',entry.values.ko);continue;}
  for(const [l,path] of Object.entries(field.paths)){let target=copy[field.block];for(const key of path.slice(0,-1))target=target[key];target[path.at(-1)]=entry.values[l];}
 }
 return template.replace(/__ARANYA_BLOCK_([\w-]+)__/g,(_,name)=>JSON.stringify(copy[name]).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'));
}
