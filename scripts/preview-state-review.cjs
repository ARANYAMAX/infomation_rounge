const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
 const errors=[],popups=[],navigations=[];page.on('pageerror',e=>errors.push(e.message));context.on('page',p=>popups.push(p));
 page.on('framenavigated',f=>{if(f.name()==='aranya-live-preview')navigations.push(f.url());});
 page.on('dialog',d=>d.accept());
 const ready=()=>page.waitForFunction(()=>!document.getElementById('save').disabled);
 const state=()=>page.evaluate(async()=>fetch('/api/content').then(r=>r.json()));
 const remember=()=>page.evaluate(()=>{const d=document.getElementById('guideFrame').contentDocument;window.kept={doc:d,editor:document.getElementById('fields').firstChild,path:document.getElementById('selectionPath').textContent,page:d.querySelector('.page.active')?.dataset.page,scroll:d.defaultView.scrollY,details:d.querySelector('.page.active details[open]')};});
 const unchanged=async(label)=>{
  await ready();await page.waitForTimeout(250);
  const result=await page.evaluate(()=>{const d=document.getElementById('guideFrame').contentDocument,k=window.kept;return {doc:d===k.doc,editor:k.editor===document.getElementById('fields').firstChild,path:k.path===document.getElementById('selectionPath').textContent,page:d.querySelector('.page.active')?.dataset.page===k.page,scroll:Math.abs(d.defaultView.scrollY-k.scroll)<3,details:!k.details||k.details.isConnected&&k.details.open,status:document.getElementById('status').textContent};});
  assert(!result.status.includes('실패'),JSON.stringify(result));for(const [k,v] of Object.entries(result))if(k!=='status')assert(v,label+' preserves '+k+' '+JSON.stringify(result));console.log('PASS',label,result.status);
 };
 try{
  await page.goto('http://127.0.0.1:8790/admin');await page.locator('#password').fill('local-review-only');await page.locator('#loginForm button').click();
  const frame=page.frameLocator('#guideFrame');await frame.locator('#homeBrand').waitFor();await ready();navigations.length=0;
  await page.locator('[data-section="around"]').click();
  const card=frame.locator('#aroundList .place-card').first();await card.locator('h3').click();
  await card.locator('summary').click();await card.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
  await remember();let before=await state();const list=before.lists.find(l=>l.key==='ARANYA_CURATED_PLACES:');assert(list);
  const manager=page.locator('[data-list-key="ARANYA_CURATED_PLACES:"]');
  await manager.locator('.managed-add button').click();await unchanged('add travel item');
  let after=await state();const added=after.lists.find(l=>l.key===list.key).items.find(i=>!list.items.some(o=>o.id===i.id));assert(added);
  assert.equal(await frame.locator('[data-cms-item="'+added.key+'"]').count(),1);
  await remember();await manager.locator('[data-item-id="'+added.id+'"] button').filter({hasText:'↑'}).click();await unchanged('reorder travel item');
  after=await state();assert.equal(after.lists.find(l=>l.key===list.key).items.at(-2).id,added.id);
  await remember();await manager.locator('[data-item-id="'+added.id+'"] button').filter({hasText:'삭제'}).click();await unchanged('delete travel item');
  assert.equal(await frame.locator('[data-cms-item="'+added.key+'"]').count(),0);
  const badge=card.locator('.place-badge');await badge.scrollIntoViewIfNeeded();await remember();const prior=await badge.textContent();await badge.click();assert.notEqual(await badge.textContent(),prior);await page.locator('#save').click();await unchanged('badge and save');
  await page.locator('[data-section="home"]').click();const steps=frame.locator('.steps .step');await steps.first().locator('h3').click();
  await steps.first().evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await remember();before=await state();
  await page.locator('#listManager .item-fields button').filter({hasText:'사진 추가'}).click();await unchanged('add photo slot');
  after=await state();const photoId=after.catalog.find(f=>f.type==='image'&&!before.catalog.some(o=>o.id===f.id)).id;
  await page.locator('#fieldChoices [data-field-id="'+photoId+'"]').evaluate(el=>el.click());await remember();
  await page.locator('#fields input[type="file"]').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
  await ready();await page.waitForTimeout(1000);await unchanged('upload photo');await page.locator('#save').click();await unchanged('save uploaded photo');
  after=await state();const url=after.draft[photoId].values.ko;assert(url.startsWith('/media/'));assert.equal(await frame.locator('[data-guide-photo="'+url+'"]').count(),1);
  // Removing the selected photo clears only that selection, leaving the frame in place.
  await page.locator('#listManager button').filter({hasText:'이 사진 칸 삭제'}).click();await ready();assert(await page.evaluate(()=>kept.doc===document.getElementById('guideFrame').contentDocument));
  await page.locator('[data-section="manuals"]').click();const manual=frame.locator('#manualGrid .manual-card').first();await manual.locator('.manual-title').click();await manual.locator('summary').first().click();await remember();
  await page.locator('[data-list-key="MANUALS:"] .managed-add button').click();await unchanged('add manual with open nested detail');
  after=await state();const last=after.lists.find(l=>l.key==='MANUALS:').items.at(-1);await page.locator('[data-list-key="MANUALS:"] [data-item-id="'+last.id+'"] button').filter({hasText:'삭제'}).click();await unchanged('delete manual with open nested detail');
  assert.equal(popups.length,0);assert.deepEqual(navigations,[],'no iframe navigation after initial load');assert.deepEqual(errors,[]);
  await page.screenshot({path:'.wrangler/review/preview-state-preserved.png'});console.log('PASS all requested actions: one iframe document, no popups, state and persisted data preserved');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
