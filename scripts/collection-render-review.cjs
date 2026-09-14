// Browser checks for every managed collection using locally rendered fixtures.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
 const {blocks,catalog,seed,template}=await import(pathToFileURL(path.resolve('src/generated.js'))),{collectionModel,hydrateContent,changeStructure}=await import(pathToFileURL(path.resolve('src/collections.js'))),{renderGuide}=await import(pathToFileURL(path.resolve('src/content.js')));
 const model=d=>collectionModel(blocks,catalog,seed,d),change=(d,a)=>changeStructure(blocks,catalog,seed,d,a),base='http://127.0.0.1:8790';
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const packed=Buffer.from(JSON.stringify(['Guest','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko'])).toString('base64url');
 try{
  let fixture='';await page.route(base+'/collection-review?**',r=>r.fulfill({contentType:'text/html;charset=utf-8',body:fixture}));
  for(const key of ['CHECKIN:','HOUSE_NOTES:','MANUALS:','AMENITIES:hanok','ARANYA_CURATED_PLACES:','food:','aranya-essentials-data:places']){
   let d=change(hydrateContent(blocks,catalog,seed,seed),{type:'add',key,source:0}),item=model(d).lists.find(l=>l.key===key).items.at(-1);d[item.titleId].values.ko='새 항목 검증 '+key;
   d=change(d,{type:'photoAdd',key:item.key});const field=model(d).photos.find(p=>p.key===item.key).fieldIds[0];d[field].values.ko=seed['hero:image'].values.ko;
   fixture=renderGuide(template,blocks,catalog,d);await page.goto(base+'/collection-review?g='+packed);await page.waitForTimeout(250);assert((await page.locator('body').textContent()).includes('새 항목 검증 '+key),key+' new title missing');assert(await page.locator('[data-guide-photo="'+d[field].values.ko+'"]').count(),key+' gallery missing');assert.deepEqual(errors,[]);console.log('PASS render new item and gallery: '+key);
  }
  let empty=hydrateContent(blocks,catalog,seed,seed);for(const list of model(empty).lists.filter(l=>!l.parentKey))for(const item of list.items)empty=change(empty,{type:'remove',key:list.key,id:item.id});empty['hero:image'].values.ko='';fixture=renderGuide(template,blocks,catalog,empty);await page.goto(base+'/collection-review?g='+packed);await page.waitForTimeout(250);assert.equal(await page.locator('.step,.amen,.notice-card,.manual-card,.place-card,.essentials-card').count(),0);assert.deepEqual(errors,[]);assert.equal(await page.locator('.masthead-visual').isVisible(),false);console.log('PASS all lists empty and hero image removed without browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
