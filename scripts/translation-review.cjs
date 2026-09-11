const {chromium}=require('C:/Users/hot90/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext(),page=await context.newPage();page.on('dialog',d=>d.accept());try{
 const base='http://127.0.0.1:8790';await page.goto(base+'/admin');await page.locator('#password').fill('local-review-only');await page.locator('#loginForm button').click();await page.locator('#manager').waitFor();
 const data=await(await context.request.get(base+'/api/content',{headers:{Cookie:(await context.cookies()).map(c=>c.name+'='+c.value).join('; ')}})).json();
 const index=id=>data.catalog.findIndex(f=>f.id===id),first=index('I18N:step_wifi_p'),second=index('I18N:step_co_p');
 await page.locator('#field-'+first).fill('번역 중 일부 성공 검증 '+Date.now());await page.locator('#field-'+second).fill('번역 중 실패 검증 '+Date.now());await page.locator('#save').click();await page.getByRole('status').filter({hasText:'초안을 저장했습니다.'}).waitFor();
 let calls=0;await page.route('**/api/translate',async route=>{if(++calls===2)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'검증용 번역 서비스 실패'})});else await route.continue();});
 await page.locator('#translate').click();await page.getByRole('status').filter({hasText:'검증용 번역 서비스 실패'}).waitFor();
 await page.locator('#field-'+first).fill('번역 실패 후 다시 수정한 문구');await page.locator('#save').click();await page.getByRole('status').filter({hasText:'초안을 저장했습니다.'}).waitFor();await page.reload();await page.locator('#manager').waitFor();
 assert.equal(await page.locator('#field-'+first).inputValue(),'번역 실패 후 다시 수정한 문구');console.log('PASS: partial translation failure does not lose subsequent edits (test AI adapter only).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
