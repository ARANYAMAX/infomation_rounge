const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();const popups=[];context.on('page',p=>popups.push(p));
 try{
  await page.goto('http://127.0.0.1:8790/admin');await page.locator('#password').fill('local-review-only');await page.locator('#loginForm button').click();const frame=page.frameLocator('#guideFrame');await frame.locator('#homeBrand').waitFor();
  await page.locator('[data-section="around"]').click();const badge=frame.locator('#aroundList .place-card .place-badge').first();await badge.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));const id=await badge.getAttribute('data-cms-field');const before=await badge.evaluate(el=>({text:el.textContent,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor}));
  await page.evaluate(()=>{window.reviewDocument=document.getElementById('guideFrame').contentDocument;window.reviewEditor=document.getElementById('fields').firstChild;});
  await badge.click();const immediate=await frame.locator('[data-cms-field="'+id+'"]').evaluate(el=>({text:el.textContent,color:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderColor}));
  await page.waitForTimeout(1600);console.log(JSON.stringify({before,immediate,popups:popups.length,urls:await Promise.all(popups.map(p=>p.url())),frameName:await page.locator('#guideFrame').getAttribute('name')}));
  assert.equal(popups.length,0,'inline preview must not open a new tab');for(const key of ['text','color','background','border'])assert.notEqual(immediate[key],before[key],key+' changes immediately');
  assert(await page.evaluate(()=>window.reviewDocument===document.getElementById('guideFrame').contentDocument),'badge click must not reload the preview');
  assert(await page.evaluate(()=>window.reviewEditor===document.getElementById('fields').firstChild),'badge click must not rebuild the editor');
  await page.locator('#save').click();await page.waitForFunction(()=>!document.getElementById('save').disabled);assert(await page.evaluate(()=>window.reviewDocument===document.getElementById('guideFrame').contentDocument),'saving only a badge change must not reload the preview');
  assert.equal(await frame.locator('[data-cms-field="'+id+'"]').textContent(),immediate.text,'badge stays changed after debounce interval');
  await frame.locator('#langBtn').click();await frame.locator('#langMenu [data-lang="en"]').click();assert.equal(await frame.locator('[data-cms-field="'+id+'"]').textContent(),immediate.text,'language render retains unsaved badge change');
  await frame.locator('.tab[data-page="amenities"]').click();assert.equal(await page.locator('#sectionTitle').textContent(),'편의시설');assert(await page.locator('[data-list-key="AMENITIES:hanok"]').isVisible());
  await page.locator('[data-list-key="AMENITIES:hanok"] .managed-add button').click();await page.locator('#iconDialog').waitFor();await page.screenshot({path:'.wrangler/review/icon-library-desktop.png'});await page.setViewportSize({width:390,height:844});assert(await page.locator('#iconDialog').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:'.wrangler/review/icon-library-mobile.png'});await page.locator('#cancelIcon').click();
  console.log('PASS inline badge update, no popup and guest-tab/editor synchronization');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
