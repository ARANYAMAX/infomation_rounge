import {build} from 'esbuild';import {Miniflare,convertV4MiniflareOptions} from 'miniflare';import fs from 'node:fs';import assert from 'node:assert/strict';
const output=await build({stdin:{contents:`import worker from './src/worker.js';export default {fetch(r,e,c){return worker.fetch(r,{...e,AI:r.headers.get('x-test-ai')==='yes'?{run:async(m,p)=>({translated_text:p.text+' translated'})}:undefined},c)}}`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false,platform:'browser'});
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-09-10',d1Databases:['DB'],r2Buckets:['IMAGES'],bindings:{HOST_PASSWORD:'integration-only-password',SESSION_SECRET:'integration-only-secret-not-for-production'}}]}));
try{
 const db=await mf.getD1Database('DB');for(const sql of fs.readFileSync('migrations/0001_content.sql','utf8').split(';').filter(x=>x.trim()))await db.prepare(sql).run();
 let cookie='';
 const request=async(path,body,extra={})=>mf.dispatchFetch('https://aranya.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://aranya.test',Cookie:cookie,'Content-Type':'application/json',...extra},body:body===undefined?undefined:JSON.stringify(body)});
 assert.equal((await request('/api/content')).status,401);
 assert.equal((await request('/api/login',{password:'wrong'})).status,401);
 const login=await request('/api/login',{password:'integration-only-password'});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];assert(login.headers.get('set-cookie').includes('HttpOnly'));
 let data=await (await request('/api/content')).json();assert.equal(data.catalog.length,500);
 const id=data.catalog.find(f=>f.block==='I18N'&&f.path[0]==='step_wifi_p').id;
 data.draft[id].values.ko='테스트 와이파이 안내';
 let saved=await request('/api/draft',{revision:data.revision,draft:data.draft});assert.equal(saved.status,200);data=await saved.json();
 assert((await (await request('/preview')).text()).includes('테스트 와이파이 안내'));assert(!(await (await request('/')).text()).includes('테스트 와이파이 안내'));
 assert.equal((await request('/api/publish',{revision:data.revision,reviewed:true})).status,400);
 assert.equal((await request('/api/translate',{revision:data.revision,id})).status,503);
 assert.equal((await request('/api/draft',{revision:-1,draft:data.draft})).status,409);
 const translated=await request('/api/translate',{revision:data.revision,id},{'x-test-ai':'yes'});assert.equal(translated.status,200);data=await translated.json();assert.equal(data.pending.length,0);
 const published=await request('/api/publish',{revision:data.revision,reviewed:true});assert.equal(published.status,200);assert((await (await request('/')).text()).includes('테스트 와이파이 안내'));
 const png=Uint8Array.from([137,80,78,71,13,10,26,10]);const upload=await mf.dispatchFetch('https://aranya.test/api/image',{method:'POST',headers:{Origin:'https://aranya.test',Cookie:cookie},body:png});assert.equal(upload.status,200);const photo=await upload.json();assert.equal((await request(photo.url)).status,200);
 assert.equal((await request('/api/draft',{}, {Origin:'https://other.test'})).status,403);
 assert.equal((await request('/.git/config')).status,404);
 const out=await request('/api/logout',{});assert(out.headers.get('set-cookie').includes('Max-Age=0'));
 console.log('PASS: real local D1/R2, server auth, CSRF, draft isolation, conflict detection, translation failure blocking, mocked translation success, publish, upload, .git denial');
}finally{await mf.dispose();}


