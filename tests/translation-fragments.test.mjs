import test from 'node:test';
import assert from 'node:assert/strict';
import {translationFragments} from '../src/content.js';
test('door lock explanation sends appended sentence separately',()=>{
 const first='보안을 위해 도어록 비밀번호는 이 페이지에 표시하지 않으며, 체크인 당일 오전 Airbnb 메시지로 별도 안내드립니다.';
 const last=' 테스트용으로 만들고 있습니다.';
 const parts=translationFragments(first+last).filter(Boolean);
 assert.deepEqual(parts,[first,last]);
 // Simulate a model that returns only the first sentence of each request.
 assert.equal(parts.map(p=>p.split(/(?<=\.)\s/)[0]).join(''),first+last);
});
test('preserves markup, placeholders, URLs, numbers and line breaks exactly',()=>{
 const source='<b>체크인 안내.</b> {name}님, 환영합니다.\n15:00부터 입실입니다. https://example.com/a.b?q=1 다음 안내입니다.\n퇴실은 11:00입니다.';
 const parts=translationFragments(source);
 assert.equal(parts.join(''),source);
 for(const protectedText of ['<b>','</b>','{name}','15:00','11:00','https://example.com/a.b?q=1'])assert(parts.includes(protectedText));
 assert(parts.some(p=>p.includes('다음 안내입니다.')));
});
