import vm from 'node:vm';
import test from 'node:test';import assert from 'node:assert/strict';
import {blocks,catalog,seed,template} from '../src/generated.js';
import {collectionModel,hydrateContent,changeStructure} from '../src/collections.js';
import {renderGuide,validateDraft,pending} from '../src/content.js';
const model=d=>collectionModel(blocks,catalog,seed,d),hydrate=d=>hydrateContent(blocks,catalog,seed,d),change=(d,a)=>changeStructure(blocks,catalog,seed,d,a);
test('new amenities retain the chosen icon and map URLs are validated without translation',()=>{
 const d=change(hydrate(seed),{type:'add',key:'AMENITIES:hanok',icon:'a_tv'});assert.equal(model(d).blocks.AMENITIES.hanok.at(-1).icon,'a_tv');
 assert.throws(()=>change(d,{type:'add',key:'AMENITIES:hanok',icon:'bad'}));
 for(const key of ['food:','ARANYA_CURATED_PLACES:']){const before=change(hydrate(seed),{type:'add',key}),m=model(before),item=m.lists.find(l=>l.key===key).items.at(-1);const edited=structuredClone(before);const id=item.key+'.googleUrl';edited[id].values.ko='https://maps.app.goo.gl/example';const saved=validateDraft(edited,m.catalog,before);assert.equal(saved[id].values.ko,edited[id].values.ko);assert(!pending(saved,m.catalog).includes(id));edited[id].values.ko='javascript:alert(1)';assert.throws(()=>validateDraft(edited,m.catalog,before));}
});
test('amenity icons remain selectable for new items in every group',()=>{
 for(const group of ['hanok','ess','kit']){
  const d=change(hydrate(seed),{type:'add',key:'AMENITIES:'+group});const m=model(d),item=m.lists.find(l=>l.key==='AMENITIES:'+group).items.at(-1),id=item.key+'.icon';
  const f=m.catalog.find(f=>f.id===id);assert.equal(f.type,'icon');
  const edited=structuredClone(d);edited[id].values.ko='lucide:air-vent';validateDraft(edited,m.catalog,d);assert.equal(model(edited).blocks.AMENITIES[group].at(-1).icon,'lucide:air-vent');
  const html=renderGuide(template,blocks,catalog,edited);assert(!html.includes('<span aria-hidden="true">◇</span>'));
  edited[id].values.ko='<svg>';assert.throws(()=>validateDraft(edited,m.catalog,d));
 }
 assert(template.includes('.step:nth-child(4n+2)::before'));assert(template.includes('.step:nth-child(4n+3)::before'));assert(template.includes('.step:nth-child(4n)::before'));
 assert.deepEqual(model(hydrate(seed)).catalog.find(f=>f.id==='ARANYA_CURATED_PLACES:0.group').options,['pick','walk']);
});
test('migration preserves every existing published translation and image',()=>{
 const legacy=structuredClone(seed);legacy['I18N:greet_tag'].values.ko='운영 주소';legacy['hero:image'].values.ko='/media/11111111-1111-1111-1111-111111111111.jpg';
 const d=hydrate(legacy);for(const id of Object.keys(legacy))assert.deepEqual(d[id],legacy[id],id);assert(model(d).lists.length>=40);
});
test('add, reorder and remove preserve sibling identity, translations and images',()=>{
 let d=hydrate(seed);d['food:0.name'].values.en='Preserved restaurant';d=change(d,{type:'add',key:'food:',source:0});
 const added=model(d).lists.find(l=>l.key==='food:').items.at(-1);assert.equal(d[added.titleId].values.ko,'');d[added.titleId].values.ko='새 식당';
 d=change(d,{type:'move',key:'food:',id:added.id,direction:-1});assert.equal(d['food:0.name'].values.en,'Preserved restaurant');
 d=change(d,{type:'remove',key:'food:',id:'0'});assert.equal(d['food:0.name'],undefined);assert.equal(d[added.titleId].values.ko,'새 식당');assert.equal(model(d).blocks.food.at(-2).name.ko,'새 식당');
});
test('nested lists and galleries are removed together with their parent',()=>{
 let d=change(hydrate(seed),{type:'add',key:'MANUALS:',source:0});const item=model(d).lists.find(l=>l.key==='MANUALS:').items.at(-1);
 d=change(d,{type:'add',key:item.key+'.steps',source:0});d=change(d,{type:'photoAdd',key:item.key});const image=model(d).photos.find(p=>p.key===item.key).fieldIds[0];d[image].values.ko='/media/11111111-1111-1111-1111-111111111111.jpg';
 assert(model(d).blocks.MANUALS.at(-1).photos.length===1);d=change(d,{type:'remove',key:'MANUALS:',id:item.id});assert(!Object.keys(d).some(k=>k.startsWith(item.key)));assert(!Object.keys(d.__lists).some(k=>k.startsWith(item.key)));assert(!Object.keys(d.__photos).some(k=>k.startsWith(item.key)));
});
test('dynamic Korean edits require translation and reject forged structure or external images',()=>{
 let d=change(hydrate(seed),{type:'add',key:'HOUSE_NOTES:',source:0}),m=model(d),newField=m.lists.find(l=>l.key==='HOUSE_NOTES:').items.at(-1).titleId;
 const edited=structuredClone(d);edited[newField].values.ko='새 안내';edited[newField].translatedFrom='새 안내';const valid=validateDraft(edited,m.catalog,d);assert(pending(valid,m.catalog).includes(newField));
 edited.__lists['HOUSE_NOTES:']=[];assert.throws(()=>validateDraft(edited,m.catalog,d));
 d=change(d,{type:'photoAdd',key:m.lists.find(l=>l.key==='HOUSE_NOTES:').items.at(-1).key});m=model(d);const photo=m.photos.at(-1);const img=m.catalog.find(f=>f.path.includes('photos'));const bad=structuredClone(d);bad[img.id].values.ko='https://external.invalid/image.jpg';assert.throws(()=>validateDraft(bad,m.catalog,d));
});
test('deleted check-in and amenity items stay deleted and empty lists render',()=>{
 let d=hydrate(seed);for(const row of [...model(d).lists.find(l=>l.key==='CHECKIN:').items])d=change(d,{type:'remove',key:'CHECKIN:',id:row.id});
 for(const row of [...model(d).lists.find(l=>l.key==='AMENITIES:hanok').items])d=change(d,{type:'remove',key:'AMENITIES:hanok',id:row.id});
 const html=renderGuide(template,blocks,catalog,d);assert(!html.includes('id="stationMaps"'));assert(!html.includes('data-cms-item="AMENITIES:hanok.0"'));assert(!html.includes('__AMEN_PHOTO_'));
 for(const key of ['CHECKIN:','AMENITIES:hanok']){d=change(d,{type:'add',key});const list=model(d).lists.find(l=>l.key===key);assert.equal(list.items.length,1);assert.equal(d[list.items[0].titleId].values.ko,'');}
});
test('malformed list sources and duplicate identities are rejected',()=>{
 const d=hydrate(seed);assert.throws(()=>change(d,{type:'add',key:'food:',source:999}));d.__lists['food:']=[{id:'0',source:0},{id:'0',source:0}];assert.throws(()=>model(d));
});
test('empty new items show friendly preview labels without saving placeholders',()=>{
 const d=change(hydrate(seed),{type:'add',key:'CHECKIN:',source:0}),item=model(d).lists.find(l=>l.key==='CHECKIN:').items.at(-1),before=JSON.stringify(d);
 const preview=renderGuide(template,blocks,catalog,d,{editing:true}),live=renderGuide(template,blocks,catalog,d);
 assert(preview.includes('>제목 수정</h3>'));assert(preview.includes('>내용 수정</p>'));assert(!live.includes('>제목 수정</h3>'));assert.equal(JSON.stringify(d),before);assert.equal(d[item.titleId].values.ko,'');
 const key='cms_'+item.titleId.replace(/[^a-zA-Z0-9_]/g,'_');
 for(const [html,expected] of [[preview,'제목 수정'],[live,'']]){const I18N=JSON.parse(/const I18N\s*=\s*(\{[^\n]+\});/.exec(html)[1]),lookup=/const t = \(key\) => ([^\n]+);/.exec(html)[1];assert.equal(vm.runInNewContext('('+lookup+')',{I18N,lang:'ko',key}),expected);}
 d[item.titleId].values.ko='입력한 제목';assert(renderGuide(template,blocks,catalog,d,{editing:true}).includes('>입력한 제목</h3>'));
});
