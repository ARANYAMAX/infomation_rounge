import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {recordGuestActivity,isGuestOpen} from '../src/guest-activity.js';
test('D1 records issuance and repeated opens without credentials; old links register on first open',async()=>{
 const mf=new Miniflare(convertV4MiniflareOptions({workers:[{compatibilityDate:'2026-09-10',modules:true,script:'export default {fetch(){return new Response("ok")}}',d1Databases:['DB']}]}));
 try {
 const db=await mf.getD1Database('DB');
 await db.exec(readFileSync(new URL('../migrations/0002_guest_link_activity.sql',import.meta.url),'utf8').replace(/\s+/g,' '));
 const guest={l:'en',ci:'2099-01-01',co:'2099-01-03',n:'Private name',pin:'1234'};
 await recordGuestActivity(db,'secret-token',guest);
 let row=await db.prepare('SELECT * FROM guest_link_activity').first();
 assert.equal(row.open_count,0);assert.equal(row.first_opened_at,null);assert(row.issued_at);
 await recordGuestActivity(db,'secret-token',guest,true);
 row=await db.prepare('SELECT * FROM guest_link_activity').first();const first=row.first_opened_at;
 await recordGuestActivity(db,'secret-token',guest,true);
 row=await db.prepare('SELECT * FROM guest_link_activity').first();
 assert.equal(row.open_count,2);assert.equal(row.first_opened_at,first);assert.equal(row.link_id.length,64);
 assert(!JSON.stringify(row).includes('secret-token'));assert(!JSON.stringify(row).includes('Private name'));assert(!JSON.stringify(row).includes('1234'));
 await recordGuestActivity(db,'old-token',guest,true);
 const old=await db.prepare('SELECT * FROM guest_link_activity WHERE issued_at IS NULL').first();assert.equal(old.open_count,1);
 }finally{await mf.dispose();}
});
test('HEAD and prefetch excluded, logging errors do not break links',async()=>{
 assert(isGuestOpen(new Request('https://test/')));
 assert(!isGuestOpen(new Request('https://test/',{method:'HEAD'})));
 assert(!isGuestOpen(new Request('https://test/',{headers:{'Sec-Purpose':'prefetch'}})));
 await recordGuestActivity({prepare(){throw Error('offline')}},'token',{},true);
});

