import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';
import {blocks,catalog,seed,template} from '../src/generated.js';
import {hydrateContent,collectionModel,changeStructure} from '../src/collections.js';
import {renderGuide,validateDraft,pending,languages} from '../src/content.js';
const h=d=>hydrateContent(blocks,catalog,seed,d),m=d=>collectionModel(blocks,catalog,seed,d),change=(d,a)=>changeStructure(blocks,catalog,seed,d,a);
test('airport and tips fields use existing translations, stable lists and galleries',()=>{
 let d=h(seed),model=m(d);for(const key of ['AIRPORT:methods','TRAVEL_TIPS:','TRAVEL_TIPS:0.steps'])assert(model.lists.some(l=>l.key===key));
 for(const f of model.catalog.filter(f=>['AIRPORT','TRAVEL_TIPS'].includes(f.block)&&f.type==='text')){for(const l of languages)assert.equal(typeof d[f.id].values[l],'string');const edited=structuredClone(d);edited[f.id].values.ko+=' 수정';assert.equal(pending(validateDraft(edited,model.catalog,d),model.catalog).includes(f.id),f.block!=='AIRPORT'||f.path[0]==='button');}
 for(const key of ['AIRPORT:methods','TRAVEL_TIPS:','TRAVEL_TIPS:0.steps']){let a=change(d,{type:'add',key});let list=m(a).lists.find(l=>l.key===key),last=list.items.at(-1);assert.equal(list.items.length,model.lists.find(l=>l.key===key).items.length+1);a=change(a,{type:'move',key,id:last.id,direction:-1});assert.equal(m(a).lists.find(l=>l.key===key).items.at(-2).id,last.id);a=change(a,{type:'remove',key,id:last.id});assert.deepEqual(m(a).lists.find(l=>l.key===key).items.map(i=>i.id),model.lists.find(l=>l.key===key).items.map(i=>i.id));}
 d=change(d,{type:'photoAdd',key:'TRAVEL_TIPS:0'});const id=m(d).photos.find(p=>p.key==='TRAVEL_TIPS:0').fieldIds[0];d[id].values.ko='/media/12345678-1234-1234-1234-123456789abc.png';assert(renderGuide(template,blocks,catalog,d).includes(d[id].values.ko));
 d['TRAVEL_TIPS:0.linkUrl'].values.ko='javascript:alert(1)';assert.throws(()=>validateDraft(d,m(d).catalog,h(seed)));
});
test('airport stays inside location card and tips are translated between travel and dining',()=>{
 const html=renderGuide(template,blocks,catalog,h(seed));assert(html.includes('id="stationMaps"></div><div class="links" id="airportGuide"><button'));assert(!html.includes('data-page="airport"'));assert(!/<details id="airportGuide"/.test(html));
 assert(html.indexOf('data-page="around"')<html.indexOf('data-page="tips"'));assert(html.indexOf('data-page="tips"')<html.indexOf('data-page="food"'));assert(html.includes('한복 대여 안내'));assert(!html.includes('__TRAVEL_TIPS_CONTENT__'));
 for(const l of languages)assert(blocks.I18N[l].travel_tips_tab);
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g))if(!match[1].includes('application/json'))new vm.Script(match[2]);
});
