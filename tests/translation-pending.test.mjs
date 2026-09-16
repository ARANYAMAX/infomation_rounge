import test from 'node:test';import assert from 'node:assert/strict';
import {pending,validateDraft,languages} from '../src/content.js';
test('missing translations and new text are pending while icons are excluded',()=>{
 const text={id:'text',type:'text',block:'TRAVEL_TIPS',path:['new','title']},icon={id:'icon',type:'icon',block:'AMENITIES',path:['kit','2','icon']};
 const draft={text:{values:Object.fromEntries(languages.map(l=>[l,'안내'])),translatedFrom:'안내'},icon:{values:{ko:'lucide:camera'},translatedFrom:''}};
 assert.deepEqual(pending(draft,[text,icon]),[]);draft.text.values.ja='';assert.deepEqual(pending(draft,[text,icon]),['text']);draft.text.values.ja='案内';draft.text.values.ko='새 안내';assert.deepEqual(pending(draft,[text,icon]),['text']);
});
test('draft save preserves server translation progress and ignores forged progress',()=>{
 const field={id:'text',type:'text',block:'TRAVEL_TIPS',path:['new','title']};const old={text:{values:Object.fromEntries(languages.map(l=>[l,l==='ko'?'안내':''])),translatedFrom:'',translationProgress:{source:'안내',done:['en']}}};const input=structuredClone(old);input.text.translationProgress.done=languages;const saved=validateDraft(input,[field],old);assert.deepEqual(saved.text.translationProgress.done,['en']);
});
