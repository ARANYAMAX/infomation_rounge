const {chromium}=require('C:/Users/hot90/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const {template,blocks,catalog,seed}=await import('../src/generated.js');const {renderGuide}=await import('../src/content.js');
 const content=structuredClone(seed),url='/media/12345678-1234-1234-1234-123456789abc.png';
 for(const block of ['amenityPhotos','food','ARANYA_CURATED_PLACES'])content[catalog.find(f=>f.block===block&&f.type==='image').id].values.ko=url;
 const html=renderGuide(template,blocks,catalog,content),browser=await chromium.launch({channel:'msedge',headless:true});
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const u=new URL(route.request().url());if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:html});if(u.pathname===url)return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ZkAAAAASUVORK5CYII=','base64')});return route.abort();});
 const g=Buffer.from(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko'])).toString('base64');await page.goto('https://aranya.test/?g='+encodeURIComponent(g));
 for(const section of ['amenities','food','around']){
  await page.locator('.nav-tabs [data-page="'+section+'"]').click();
  const button=page.locator('.page[data-page="'+section+'"] [data-guide-photo]').first();assert(await button.isVisible(),section+' photo button visible');assert.equal(await button.locator('xpath=ancestor::details').count(),0);
  await button.click();assert(await page.locator('.guide-lightbox.open').isVisible(),section+' lightbox opens');assert((await page.locator('.guide-lightbox img').getAttribute('src')).endsWith(url));await page.keyboard.press('Escape');assert.equal(await page.locator('.guide-lightbox.open').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS actual guest page: amenity, food, travel PHOTO buttons outside details open the existing lightbox');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
