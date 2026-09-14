const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
 const {blocks,catalog,seed,template}=await import(pathToFileURL(path.resolve('src/generated.js'))),{collectionModel,hydrateContent,changeStructure}=await import(pathToFileURL(path.resolve('src/collections.js'))),{renderGuide}=await import(pathToFileURL(path.resolve('src/content.js')));
 let draft=hydrateContent(blocks,catalog,seed,seed);const model=()=>collectionModel(blocks,catalog,seed,draft),address='서울 종로구 자하문로1다길 16';
 for(const key of ['food:','ARANYA_CURATED_PLACES:','aranya-essentials-data:places'])draft=changeStructure(blocks,catalog,seed,draft,{type:'add',key});
 const targets=['I18N:greet_tag'];for(const field of model().catalog){if(['search','address'].includes(field.path.at(-1))||field.id==='I18N:greet_tag'){draft[field.id].values.ko=address;targets.push(field.id);}else if(field.type==='url')draft[field.id].values.ko='https://example.com/old-map';else if(field.path.at(-1)==='naverSearch')draft[field.id].values.ko='오래된 네이버 검색어';}
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage();const base='http://127.0.0.1:8790',packed=Buffer.from(JSON.stringify(['Guest','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko'])).toString('base64url');
 try{
  await page.route(base+'/map-fixture?**',r=>r.fulfill({contentType:'text/html',body:renderGuide(template,blocks,catalog,draft)}));await page.goto(base+'/map-fixture?g='+packed);
  const links=await page.locator('a.maplink').evaluateAll(els=>els.map(a=>({id:a.dataset.cmsField,href:a.href})));assert(links.length>100);for(const link of links)assert(decodeURIComponent(link.href).includes(address),link.href);
  const byField=Object.groupBy(links,l=>l.id);for(const group of Object.values(byField))assert.equal(group.length,3);
  assert(Object.keys(byField).some(id=>id.includes('.tonginGuide.search')));assert(Object.keys(byField).some(id=>id.includes('.stops.')));assert(Object.keys(byField).some(id=>id.startsWith('aranya-essentials-data:')));assert(byField['I18N:greet_tag']);
  await page.locator('#langBtn').click();await page.locator('#langMenu [data-lang="en"]').click();const english=await page.locator('a.maplink').evaluateAll(els=>els.map(a=>a.href));for(const href of english)assert(decodeURIComponent(href).includes(address));
  console.log('PASS all '+Object.keys(byField).length+' map locations use one address for three providers, including nested places, check-in and pharmacies; English preserves destinations');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
