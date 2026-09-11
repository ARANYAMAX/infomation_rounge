// Local review only. This file is never an asset or a deployed Worker entrypoint.
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import fs from 'node:fs';
import path from 'node:path';
const useTestAI=process.argv.includes('--test-ai');
const output=await build({stdin:{contents:useTestAI?`import worker from './src/worker.js';export default {fetch(r,e,c){return worker.fetch(r,{...e,AI:{run:async(m,p)=>({translated_text:'[TEST '+p.target_lang+'] '+p.text})}},c)}}`:`export {default} from './src/worker.js';`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false,platform:'browser'});
const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',port:8790,resourcePersistencePath:path.resolve('.wrangler/review/storage'),workers:[{name:'aranya-review',modules:true,script:output.outputFiles[0].text,compatibilityDate:'2026-09-10',d1Databases:['DB'],r2Buckets:['IMAGES'],assets:{directory:path.resolve('dist'),binding:'ASSETS',routerConfig:{invoke_user_worker_ahead_of_assets:true,has_user_worker:true}},bindings:{HOST_PASSWORD:'local-review-only',SESSION_SECRET:'local-review-only-not-a-production-secret'}}]}));
const db=await mf.getD1Database('DB');for(const sql of fs.readFileSync('migrations/0001_content.sql','utf8').split(';').filter(x=>x.trim()))await db.prepare(sql).run();
console.log('Review server:',String(await mf.ready),'AI:',useTestAI?'TEST STUB (not real translation)':'unconfigured');
let stopping=false;async function stop(){if(stopping)return;stopping=true;await mf.dispose();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);

