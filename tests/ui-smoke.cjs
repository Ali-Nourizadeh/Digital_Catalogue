// Development-only tests; runtime remains dependency-free static HTML/CSS/JS.
// NODE_PATH=/data/node_modules node tests/ui-smoke.cjs http://127.0.0.1:8000
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||cp.execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),headless:true,args:['--no-sandbox']});
 const base=process.argv[2]||'http://127.0.0.1:8000';
 let total=0;const results=[];
 for(const size of [{width:1440,height:900},{width:390,height:844},{width:844,height:390},{width:320,height:568}]){
  const mobile=size.width<960;
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce',hasTouch:mobile,isMobile:mobile});
  let errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))errors.push(r.status()+' '+r.url());});
  for(const route of ['/','/en/','/wide/','/wide/en/','/products/','/products/en/','/products/wide/','/products/wide/en/']){
   errors=[];await page.goto(base+route);await page.waitForTimeout(100);
   assert.deepEqual(errors,[],route+' resource errors');
   assert.equal(await page.locator('.mobile-return').count(),0);
   assert.equal(await page.locator('.mobile-back').count(),0,route+' main page must have no back');
   assert.equal(await page.locator('[data-contents-open]').count(),0,'removed hamburger');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow');
   if(route.startsWith('/products/')){
    assert.equal(await page.locator('.stone').count(),99);assert.equal(await page.locator('[data-total]').count(),1);
    if(route.includes('/wide/')){
     assert.equal(await page.locator('.filters__heading [data-total]').count(),1);
     const style=await page.locator('[data-total]').evaluate(e=>{const s=getComputedStyle(e);return[s.backgroundColor,s.borderTopWidth]});
     assert.deepEqual(style,['rgba(0, 0, 0, 0)','0px']);
    }
    await page.locator('#q').fill('zzzz-no-stone');await page.waitForTimeout(160);
    assert.equal(await page.locator('.stone:not([hidden])').count(),0);
    await page.locator('[data-filters] [data-clear]').click({force:true});await page.waitForTimeout(60);
    assert.equal(await page.locator('.stone:not([hidden])').count(),99);
   }
   total++;results.push(`${size.width}x${size.height} ${route}`);
  }
  for(const route of ['/products/','/products/en/','/products/wide/','/products/wide/en/']){
   errors=[];await page.goto(base+route);
   const urls=await page.locator('.stone__link').evaluateAll(a=>a.slice(0,2).map(e=>e.href));
   await page.goto(urls[0]);await page.waitForTimeout(100);
   assert.equal(await page.locator('.mobile-return').count(),0);
   assert.equal(await page.locator('.mobile-back').isVisible(),mobile);
   if(mobile){
    const style=await page.locator('.mobile-back').evaluate(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{x:r.x,y:r.y,w:r.width,h:r.height,radius:s.borderRadius,shadow:s.boxShadow,colour:s.color,header:getComputedStyle(document.querySelector('.bar .chip:not(.mobile-back)')).color};});
    assert.ok(style.x<40&&style.y<25&&style.w>=44&&style.h>=44,JSON.stringify(style));
    assert.equal(style.radius,'0px');assert.equal(style.shadow,'none');assert.equal(style.colour,style.header);
    const overlap=await page.locator('.mobile-back').evaluate(e=>{const b=e.getBoundingClientRect();return Array.from(document.querySelectorAll('.bar__logo,.bar__end')).some(n=>{const r=n.getBoundingClientRect();return Math.min(r.right,b.right)-Math.max(r.left,b.left)>1&&Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)>1;});});
    assert.equal(overlap,false,'back must not cover toolbar');
    assert.ok(await page.locator('.bar__end').evaluate(e=>e.getBoundingClientRect().right<=innerWidth-8),'toolbar clips at edge');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'detail overflow');
   }
   await page.locator('[data-zoom]').first().click({force:true});await page.waitForTimeout(60);
   assert.ok(await page.locator('dialog[open]').isVisible());
   if(mobile)assert.equal(await page.locator('.mobile-back').isVisible(),false);
   const rtl=await page.evaluate(()=>document.dir==='rtl');
   const transform=await page.locator('[data-lb-step="1"] svg').evaluate(e=>getComputedStyle(e).transform);
   assert.equal(transform,rtl?'matrix(-1, 0, 0, 1, 0, 0)':'none');
   await page.locator('[data-lb-close]').click();
   if(mobile){
    await page.goto(urls[1]);await page.locator('.mobile-back').click();await page.waitForURL(urls[0]);
    // A second detail was visited: back must return to that detail, not always to listing.
    await page.locator('.mobile-back').click();await page.waitForURL(base+route);
    // Direct QR entry has no previous entry and falls back to its own list.
    const direct=await browser.newPage({viewport:size,hasTouch:true,isMobile:true});
    await direct.goto(urls[0]);assert.equal(await direct.evaluate(()=>navigation.canGoBack),false);
    await direct.locator('.mobile-back').click();await direct.waitForURL(base+route);await direct.close();
   }
   assert.deepEqual(errors,[]);total++;results.push(`${size.width}x${size.height} detail ${route}`);
  }
  await page.close();
 }
 await browser.close();console.log(JSON.stringify({passed:total,cases:results},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
