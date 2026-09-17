import test from 'node:test';import assert from 'node:assert/strict';
import {issueGuest,readGuest,validateGuest,checkout} from '../src/guest-token.js';
import {blocks,catalog,seed,template} from '../src/generated.js';
import {renderGuide} from '../src/content.js';
const g={n:'Test <guest>',ci:'2099-01-01',co:'2099-01-03',cit:'15:00',cot:'11:00',a:2,c:0,l:'en'},secret='local-test-secret';
test('optional reservation PIN preserves leading zeros and stays encrypted',async()=>{
 const token=await issueGuest({...g,pin:'001234'},secret);
 assert.equal((await readGuest(token,secret)).guest.pin,'001234');
 assert.equal((await readGuest(token,secret,{now:checkout(g)})).expired,true);
 assert.equal(validateGuest({...g,pin:''}).pin,undefined);
 assert.equal((await readGuest(await issueGuest({...g,pin:'*001234#'},secret),secret)).guest.pin,'*001234#');
 for(const pin of ['123a','12 34','123!','가123'])assert.throws(()=>validateGuest({...g,pin}));
 const note={ko:'게스트님 안녕하세요.',en:'Hello, guest.'};assert.deepEqual((await readGuest(await issueGuest({...g,pin:'001234',doorNote:note},secret),secret)).guest.doorNote,note);
 for(const pin of ['123','1'.repeat(13),'<b>1234</b>',1234])assert.throws(()=>validateGuest({...g,pin}));
});
test('encrypted links resist alteration and expire at Korean checkout',async()=>{
 const token=await issueGuest(g,secret);assert(token.startsWith('v1.'));assert(!token.includes(g.n));
 assert.deepEqual((await readGuest(token,secret)).guest,g);
 assert.equal((await readGuest(token,secret,{now:checkout(g)})).expired,true);
 assert.equal((await readGuest(token,'wrong')).invalid,true);
 const parts=token.split('.');parts[2]=(parts[2][0]==='A'?'B':'A')+parts[2].slice(1);
 assert.equal((await readGuest(parts.join('.'),secret)).invalid,true);
 assert.notEqual(await issueGuest(g,secret),token);
});
test('public default developer note is hidden; host replacements and editor remain intact',()=>{
 const original=seed['I18N:amen_note'].values.ko;
 assert(!renderGuide(template,blocks,catalog,seed).includes(original));
 assert(renderGuide(template,blocks,catalog,seed,{editing:true}).includes(original));
 const custom=structuredClone(seed);custom['I18N:amen_note'].values.ko='호스트가 작성한 안내입니다.';
 assert(renderGuide(template,blocks,catalog,custom).includes('호스트가 작성한 안내입니다.'));
});
test('strict validation and bounded legacy compatibility',async()=>{
 for(const change of [{ci:'2099-02-30'},{co:'2098-01-01'},{cit:'<img onerror=alert(1)>'},{cot:'25:00'},{a:-1},{c:1.5},{n:'a'.repeat(101)}])assert.throws(()=>validateGuest({...g,...change}));
 assert.equal(validateGuest({...g,l:'invalid'}).l,'ko');
 const legacy=Buffer.from(JSON.stringify(g)).toString('base64url');assert.deepEqual((await readGuest(legacy,secret)).guest,g);
 assert.equal((await readGuest(legacy,secret,{allowLegacy:false})).invalid,true);
 for(const token of ['','oops','v1.invalid','a'.repeat(4097)])assert.equal((await readGuest(token,secret)).invalid,true);
});
