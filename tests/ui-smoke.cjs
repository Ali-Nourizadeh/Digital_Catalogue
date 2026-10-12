// Development-only test. Requires Playwright; runtime has no package dependency.
// NODE_PATH=/data/node_modules node tests/ui-smoke.cjs http://127.0.0.1:8000
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||require('node:child_process').execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox']});
 const base=process.argv[2]||'http://127.0.0.1:8000';
 let total=0; const results=[];
 for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390},{width:320,height:568}]){
  const mobile=size.width<960;
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});
  let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url());});
  for(const route of ['/','/en/','/wide/','/wide/en/','/products/','/products/en/','/products/wide/','/products/wide/en/']){
   errors=[];await page.goto(base+route);await page.waitForTimeout(120);
   assert.deepEqual(errors,[],`${route}: resource/JS errors`);
   assert.equal(await page.locator('.mobile-return').isVisible(),mobile,route+' mobile return');
   if(mobile){const box=await page.locator('.mobile-return').boundingBox();assert.ok(box.height>=44&&box.width>=44);assert.ok(box.x>=0&&box.x+box.width<=size.width&&box.y+box.height<=size.height);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');
   if(route.startsWith('/products/')){
    assert.equal(await page.locator('.stone').count(),99);
    assert.equal(await page.locator('[data-total]').count(),1);
    if(route.includes('/wide/'))assert.equal(await page.locator('.filters__heading [data-total]').count(),1);
    await page.locator('#q').fill('zzzz-no-stone');await page.waitForTimeout(180);
    assert.equal(await page.locator('.stone:not([hidden])').count(),0);
    assert.ok((await page.locator('[data-total]').innerText()).match(/[0۰]/));
    await page.locator('[data-filters] [data-clear]').click({force:true});await page.waitForTimeout(100);
    assert.equal(await page.locator('.stone:not([hidden])').count(),99);
    if(mobile){
     await page.evaluate(()=>{const t=document.querySelector('.track');if(t&&t.scrollWidth>t.clientWidth)t.scrollLeft=document.dir==='rtl'?-innerWidth*2:innerWidth*2;else window.scrollTo(0,1600);});
     await page.locator('.mobile-return').click();await page.waitForTimeout(200);
     const q=await page.locator('#q').boundingBox();assert.ok(q.x>=-1&&q.x+q.width<=size.width+1&&q.y>=0&&q.y<size.height);
    }
   }
   total++;results.push(`${size.width}x${size.height} ${route}`);
  }
  for(const route of ['/products/','/products/en/','/products/wide/','/products/wide/en/']){
   await page.goto(base+route);const url=await page.locator('.stone__link').first().getAttribute('href');
   assert.ok(url,route+' detail link');
   await page.goto(new URL(url,base+route).href);await page.waitForTimeout(100);
   if(mobile){assert.ok(await page.locator('.mobile-return').isVisible());assert.equal(await page.locator('.mobile-return').getAttribute('href'),await page.locator('.card__back').evaluate(e=>e.href));}
   const zoom=page.locator('[data-zoom]').first();await zoom.click({force:true});await page.waitForTimeout(80);
   assert.ok(await page.locator('dialog[open]').isVisible());
   if(mobile)assert.equal(await page.locator('.mobile-return').isVisible(),false);
   const rtl=await page.evaluate(()=>document.dir==='rtl');
   const transform=await page.locator('[data-lb-step="1"] svg').evaluate(e=>getComputedStyle(e).transform);
   assert.equal(transform,rtl?'matrix(-1, 0, 0, 1, 0, 0)':'none');
   await page.locator('[data-lb-close]').click();
   if(mobile){await page.locator('.mobile-return').click();assert.equal(new URL(page.url()).pathname,route);}
   assert.deepEqual(errors,[]);total++;results.push(`${size.width}x${size.height} detail ${route}`);
  }
  await page.close();
 }
 await browser.close();console.log(JSON.stringify({passed:total,cases:results},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
