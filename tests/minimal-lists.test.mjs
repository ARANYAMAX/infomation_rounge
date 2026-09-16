import test from 'node:test';import assert from 'node:assert/strict';
import {blocks,catalog,seed,template} from '../src/generated.js';
import {hydrateContent,collectionModel,changeStructure} from '../src/collections.js';
import {renderGuide} from '../src/content.js';
const hydrate=d=>hydrateContent(blocks,catalog,seed,d),model=d=>collectionModel(blocks,catalog,seed,d),change=(d,a)=>changeStructure(blocks,catalog,seed,d,a);
test('hanbok can retain only its card and posters, then restore individual steps',()=>{
 let d=hydrate({});const title=structuredClone(d['TRAVEL_TIPS:0.title']);
 for(const item of model(d).lists.find(l=>l.key==='TRAVEL_TIPS:0.steps').items)d=change(d,{type:'remove',key:'TRAVEL_TIPS:0.steps',id:item.id});
 d=hydrate(JSON.parse(JSON.stringify(d)));assert.equal(model(d).blocks.TRAVEL_TIPS[0].steps.length,0);assert.deepEqual(d['TRAVEL_TIPS:0.title'],title);
 assert.equal(model(d).catalog.filter(f=>f.itemKey==='TRAVEL_TIPS:0'&&f.path.includes('posters')).length,10);
 d=change(d,{type:'add',key:'TRAVEL_TIPS:0.steps'});assert.equal(model(d).blocks.TRAVEL_TIPS[0].steps.length,1);assert.equal(model(d).blocks.TRAVEL_TIPS[0].steps[0].title.ko,'');
});
test('new cards contain no copied steps; empty original lists remain extensible',()=>{
 let d=hydrate({});d=change(d,{type:'add',key:'TRAVEL_TIPS:'});let card=model(d).blocks.TRAVEL_TIPS.at(-1);assert.equal(card.steps.length,0);assert.equal(card.title.ko,'');
 d=change(d,{type:'add',key:card._cmsKey+'.steps'});assert.equal(model(d).blocks.TRAVEL_TIPS.at(-1).steps.length,1);
 d=change(d,{type:'add',key:'TRAVEL_TIPS:1.steps'});assert.equal(model(d).blocks.TRAVEL_TIPS[1].steps.length,1);assert.doesNotThrow(()=>renderGuide(template,blocks,catalog,d));
 d=change(d,{type:'add',key:'MANUALS:'});const item=model(d).lists.find(l=>l.key==='MANUALS:').items.at(-1);assert(model(d).lists.filter(l=>l.parentKey===item.key).every(l=>l.items.length===0));
});
