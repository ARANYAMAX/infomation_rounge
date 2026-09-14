const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8790',frame=()=>page.frameLocator('#guideFrame');
 const ready=()=>page.waitForFunction(()=>!document.getElementById('save').disabled);
 try{
  await page.goto(base+'/admin');await page.locator('#password').fill('local-review-only');await page.locator('#loginForm button').click();await frame().locator('#homeBrand').waitFor();
  for(const group of ['hanok','ess','kit']){
   await page.locator('[data-section="amenities"]').click();const list=page.locator('[data-list-key="AMENITIES:'+group+'"]');await list.locator('.managed-add button').click();await page.locator('#iconDialog').waitFor();assert(await page.evaluate(()=>Object.keys(window.amenityIcons).length>2000));assert.equal(await page.locator('#newIconPicker button').count(),120);assert((await page.locator('#newIconPicker button').allTextContents()).every(t=>!t.trim()));await page.locator('#moreIcons').click();assert.equal(await page.locator('#newIconPicker button').count(),240);await page.locator('#iconSearch').fill('air vent');await page.locator('#newIconPicker').getByRole('button',{name:'air vent',exact:true}).click();await ready();await list.locator('.item-fields button').filter({hasText:'아이콘 ·'}).click();
   await page.locator('.chosen-icon').click();await page.locator('#iconSearch').fill('wifi');await page.locator('#newIconPicker').getByRole('button',{name:'wifi',exact:true}).click();await page.locator('#save').click();await ready();await frame().locator('.page.active[data-page="amenities"]').waitFor();
   const icon=await page.locator('.chosen-icon svg').evaluate(el=>el.outerHTML);
   const itemKey=await list.locator('.managed-row').last().getAttribute('data-item-id');
   await page.waitForFunction(({group,itemKey,icon})=>document.getElementById('guideFrame').contentDocument.querySelector('[data-cms-item="AMENITIES:'+group+'.'+itemKey+'"] svg')?.outerHTML===icon,{group,itemKey,icon});
   await page.screenshot({path:'.wrangler/review/icon-picker-'+group+'.png',fullPage:true});console.log('PASS new amenity icon selection and saved preview: '+group);
  }
  await page.locator('[data-section="around"]').click();const badge=frame().locator('#aroundList .place-card .place-badge').first();await badge.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));const fieldId=await badge.getAttribute('data-cms-field');const before=await badge.textContent();await badge.click();await page.locator('#save').click();await ready();const updated=frame().locator('[data-cms-field="'+fieldId+'"]');await updated.waitFor({state:'attached'});assert.notEqual(await updated.textContent(),before);assert.equal(await page.locator('#fields select').count(),0);assert.equal(await page.locator('.item-fields button').filter({hasText:/^사진( 추가)?$/}).count(),0);console.log('PASS badge directly toggles group without a select or popup');
  await page.locator('[data-section="food"]').click();await page.locator('[data-list-key="food:"] .managed-title').first().click();assert.equal(await page.locator('.item-fields button').filter({hasText:/^사진( 추가)?$/}).count(),0);console.log('PASS dining photo buttons removed');
  for(const [section,block] of [['food','food'],['around','ARANYA_CURATED_PLACES']]){
   await page.locator('[data-section="'+section+'"]').click();const list=page.locator('[data-list-key="'+block+':"]');await list.locator('.managed-add button').click();await ready();const id=await list.locator('.managed-row').last().getAttribute('data-item-id');
   assert.equal(await list.locator('.item-fields button').filter({hasText:/지도 링크|카카오맵 링크|네이버지도 검색어/}).count(),0);
   const address='서울 종로구 자하문로1다길 16';await list.locator('.item-fields').getByRole('button',{name:'지도 검색 주소',exact:true}).click();await page.locator('#fields input').fill(address);await page.locator('#save').click();await ready();await page.waitForFunction(({id,block,address})=>{const links=[...document.getElementById('guideFrame').contentDocument.querySelectorAll('a[data-cms-field="'+block+':'+id+'.search"]')];return links.length===3&&links.every(a=>decodeURIComponent(a.href).includes(address));},{id,block,address});
   console.log('PASS one search address updates all three maps for new '+section+' item');
  }
  const {blocks,catalog,seed,template}=await import(pathToFileURL(path.resolve('src/generated.js'))),{hydrateContent,changeStructure}=await import(pathToFileURL(path.resolve('src/collections.js'))),{renderGuide}=await import(pathToFileURL(path.resolve('src/content.js')));
  let draft=hydrateContent(blocks,catalog,seed,seed);for(let i=0;i<5;i++)draft=changeStructure(blocks,catalog,seed,draft,{type:'add',key:'CHECKIN:'});
  await page.route(base+'/colors?**',r=>r.fulfill({contentType:'text/html',body:renderGuide(template,blocks,catalog,draft)}));const packed=Buffer.from(JSON.stringify(['Guest','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko'])).toString('base64url');await page.goto(base+'/colors?g='+packed);
  const colors=await page.locator('.step').evaluateAll(els=>els.map(el=>getComputedStyle(el,'::before').backgroundColor));assert.equal(colors.length,9);assert.equal(new Set(colors.slice(0,4)).size,4);for(let i=4;i<9;i++)assert.equal(colors[i],colors[i%4]);console.log('PASS nine check-in items repeat all four badge colors');assert.deepEqual(errors,[]);
 }catch(error){await page.screenshot({path:'.wrangler/review/controls-failure.png',fullPage:true});throw error;}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
