import test from 'node:test';import assert from 'node:assert/strict';
import {guestLinkStatus} from '../src/guest-expiry.js';import worker from '../src/worker.js';
const encode=g=>Buffer.from(JSON.stringify(g)).toString('base64url');
test('Korean checkout boundary, legacy and compact links',()=>{
 const g=['게스트','2026-09-10','2026-09-11','15:00','11:00',2,0,'ko'],at=Date.parse('2026-09-11T11:00:00+09:00');
 assert.equal(guestLinkStatus(encode(g),at-1).expired,false);assert.equal(guestLinkStatus(encode(g),at).expired,true);
 assert.equal(guestLinkStatus(JSON.stringify({co:g[2],cot:g[4]}),at).expired,true);
 assert.equal(guestLinkStatus(null,at).expired,false);assert.equal(guestLinkStatus('invalid',at).expired,true);
});
test('expired HTTP response contains only expiration page without fetching content',async()=>{
 const env={DB:{prepare(){throw Error('Expired request must not read guide database');}}};
 for(const path of ['/','/index.html']){const r=await worker.fetch(new Request('https://aranya.test'+path+'?g='+encode(['Guest','','2000-01-01','','11:00',1,0,'en'])),env);assert.equal(r.status,410);assert.equal(r.headers.get('cache-control'),'no-store');const html=await r.text();assert(html.includes('This guest link has expired'));assert(!html.includes('const food'));assert(!html.includes('manualGrid'));assert(!html.includes('/media/'));assert(!html.includes('HOST_PASSWORD'));}
});
