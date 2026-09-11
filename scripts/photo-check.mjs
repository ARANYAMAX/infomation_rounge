import assert from 'node:assert/strict';
const base='http://127.0.0.1:8790';let cookie='';
async function req(path,body){const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});if(path==='/api/login')cookie=r.headers.get('set-cookie').split(';')[0];assert.equal(r.status,200,await r.clone().text());return r.json();}
await req('/api/login',{password:'local-review-only'});
let s=await req('/api/content');for(const b of ['food','ARANYA_CURATED_PLACES'])assert(s.catalog.some(f=>f.block===b&&f.type==='image'));
const photo=await fetch(base+'/api/image',{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'image/png'},body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ZkAAAAASUVORK5CYII=','base64')});assert.equal(photo.status,200);const {url}=await photo.json();
for(const b of ['food','ARANYA_CURATED_PLACES'])s.draft[s.catalog.find(f=>f.block===b&&f.type==='image').id].values.ko=url;
await req('/api/draft',{revision:s.revision,draft:s.draft});s=await req('/api/content');assert.equal(Object.values(s.draft).filter(x=>x.values?.ko===url).length,2);
const r=await fetch(base+'/preview',{headers:{Cookie:cookie}});assert.equal(r.status,200);assert((await r.text()).includes(url));assert.equal((await fetch(base+url)).status,200);
await req('/api/logout',{});await req('/api/login',{password:'local-review-only'});s=await req('/api/content');assert.equal(Object.values(s.draft).filter(x=>x.values?.ko===url).length,2);
console.log('PASS photo upload, draft save, preview, media response, reload and relogin persistence');
