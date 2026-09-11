import test from 'node:test';import assert from 'node:assert/strict';
import {catalog,seed,template,blocks} from '../src/generated.js';import {renderGuide,validateDraft} from '../src/content.js';
test('all 15 indoor amenity photos render independently including TV',()=>{
 const fields=catalog.filter(f=>f.block==='amenityPhotos');assert.equal(fields.length,15);assert(fields.some(f=>f.path[0]==='a_tv'));
 assert(!catalog.some(f=>f.block==='aranya-essentials-data'&&f.type==='image'));
 const draft=structuredClone(seed);for(const f of fields)draft[f.id].values.ko='/media/12345678-1234-1234-1234-123456789abc.png';
 validateDraft(draft,catalog,seed);const html=renderGuide(template,blocks,catalog,draft);assert(!html.includes('__AMEN_PHOTO_'));assert.equal(html.split('/media/12345678-1234-1234-1234-123456789abc.png').length-1,15);
 assert(!renderGuide(template,blocks,catalog,seed).includes('__AMEN_PHOTO_'));
});
