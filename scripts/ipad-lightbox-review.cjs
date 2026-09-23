const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const {template,blocks,catalog,seed}=await import('../src/generated.js'),{renderGuide}=await import('../src/content.js');
 const content=structuredClone(seed),photo='/media/12345678-1234-1234-1234-123456789abc.png';
 content[catalog.find(f=>f.block==='ARANYA_CURATED_PLACES'&&f.type==='image').id].values.ko=photo;
 const html=renderGuide(template,blocks,catalog,content);
 const engines=[['Chrome',chromium,{channel:'chrome'}]];if(fs.existsSync(webkit.executablePath()))engines.push(['WebKit',webkit,{}]);else console.log('WebKit unavailable; physical iPad Safari still needs confirmation');
 for(const [name,engine,options]of engines){const browser=await engine.launch({headless:true,...options});try{
  for(const size of [{width:1194,height:834},{width:834,height:1194},{width:390,height:844}]){
   const page=await browser.newPage({viewport:size,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{const p=new URL(route.request().url()).pathname;if(p==='/')return route.fulfill({contentType:'text/html',body:html});if(p===photo)return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1600"><rect width="800" height="1600" fill="beige"/><text x="30" y="50">TOP</text><text x="30" y="1570">BOTTOM</text></svg>'});if(fs.existsSync('dist'+p)&&fs.statSync('dist'+p).isFile())return route.fulfill({path:'dist'+p});return route.abort();});
   const g=Buffer.from(JSON.stringify(['Preview','2099-01-01','2099-01-03','15:00','11:00',2,0,'ko'])).toString('base64url');await page.goto('https://aranya.test/?g='+g);
   await page.locator('.nav-tabs [data-page="around"]').click();const trigger=page.locator('[data-guide-photo="'+photo+'"]').first();await trigger.scrollIntoViewIfNeeded();const before=await page.evaluate(()=>scrollY);await trigger.click();await page.waitForFunction(()=>document.body.style.position==='fixed');await page.locator('.guide-lightbox img').evaluate(img=>img.decode());
   async function fits(){await page.waitForFunction(()=>{const r=document.querySelector('.guide-lightbox').getBoundingClientRect(),v=visualViewport;return Math.abs(r.width-v.width)<2&&Math.abs(r.height-v.height)<2&&Math.abs(r.top-v.offsetTop)<2;});const state=await page.evaluate(()=>{const b=document.querySelector('.guide-lightbox'),i=b.querySelector('img'),c=b.querySelector('button'),r=b.getBoundingClientRect(),v=visualViewport;return {cover:Math.abs(r.width-v.width)<2&&Math.abs(r.height-v.height)<2&&Math.abs(r.top-v.offsetTop)<2,image:i.getBoundingClientRect().top>=r.top&&i.getBoundingClientRect().bottom<=r.bottom,close:c.getBoundingClientRect().top>=r.top&&c.getBoundingClientRect().bottom<=r.bottom,locked:document.body.style.position==='fixed'};});assert(Object.values(state).every(Boolean),JSON.stringify(state));}
   await fits();await page.mouse.wheel(0,700);await fits();await page.setViewportSize({width:size.width,height:size.height-120});await fits();await page.setViewportSize({width:size.height,height:size.width});await fits();await page.setViewportSize(size);await fits();
   assert(await page.locator('.guide-lightbox').evaluate(el=>el.matches(':modal')),'uses browser top layer');await page.screenshot({path:'/tmp/aranya-lightbox-'+name+'-'+size.width+'.png'});
   await page.locator('.guide-lightbox button').click();await page.waitForFunction(()=>document.body.style.position!=='fixed');assert(Math.abs(await page.evaluate(()=>scrollY)-before)<3,'restores scroll');
   await trigger.click();await page.waitForFunction(()=>document.querySelector('.guide-lightbox').matches(':modal'));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.guide-lightbox').open&&document.body.style.position!=='fixed');assert(Math.abs(await page.evaluate(()=>scrollY)-before)<3,'Escape restores scroll');assert.deepEqual(errors,[]);console.log('PASS',name,size,'top layer, fit, close button, scroll lock, resize/rotation, repeated open and Escape, scroll restore');await page.close();
  }
 }finally{await browser.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
