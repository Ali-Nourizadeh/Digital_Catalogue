// Development-only regression test: header face, hit box and states must agree.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const cp=require('node:child_process');
const base=process.argv[2]||'http://127.0.0.1:8013';
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||cp.execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox']});
 const main=['/','/en/','/wide/','/wide/en/','/products/','/products/en/','/products/wide/','/products/wide/en/'];
 const discover=await b.newPage();const details=[];
 for(const route of main.filter(x=>x.startsWith('/products/'))){await discover.goto(base+route);details.push(new URL(await discover.locator('.stone__link').first().getAttribute('href'),base+route).pathname)}
 await discover.close();let cases=0,buttons=0;
 for(const width of [320,390,768,1440])for(const touch of [false,true]){
  const p=await b.newPage({viewport:{width,height:900},hasTouch:touch,isMobile:touch&&width<960,reducedMotion:'reduce'});
  for(const route of [...main,...details]){
   await p.goto(base+route);await p.evaluate(()=>document.fonts.ready);
   const chips=p.locator('.bar .chip:visible');
   for(let i=0;i<await chips.count();i++){
    const e=chips.nth(i);const box=await e.boundingBox();
    assert.ok(Math.abs(box.height-32)<0.1,JSON.stringify({route,width,touch,box}));
    const normal=await e.evaluate(el=>{const s=getComputedStyle(el),before=getComputedStyle(el,'::before'),after=getComputedStyle(el,'::after'),r=el.getBoundingClientRect();
     const hit=(x,y)=>document.elementFromPoint(x,y)?.closest('.chip')===el;
     return{beforeBg:before.backgroundColor,clip:s.clipPath,after:after.content,inset:parseFloat(before.top),stroke:parseFloat(s.getPropertyValue('--stroke')),inside:hit(r.x+r.width/2,r.y+r.height/2),above:hit(r.x+r.width/2,r.y-2),below:hit(r.x+r.width/2,r.bottom+2),cut:hit(document.dir==='rtl'?r.x+1:r.right-1,r.y+1)}});
    assert.notEqual(normal.clip,'none');assert.ok(['none','normal'].includes(normal.after));
    assert.equal(normal.inset,normal.stroke);assert.equal(normal.inside,true);assert.equal(normal.above,false);assert.equal(normal.below,false);assert.equal(normal.cut,false);
    await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await e.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
    const hover=await e.evaluate(el=>({inside:getComputedStyle(el,'::before').backgroundColor,outside:getComputedStyle(el).backgroundColor}));
    assert.equal(hover.inside,hover.outside);assert.notEqual(hover.inside,normal.beforeBg);
    await p.mouse.move(box.x+box.width/2,box.y-2);assert.equal(await e.evaluate(el=>el.matches(':hover')),false);
    await p.keyboard.press('Tab');await e.focus();
    assert.equal(await e.evaluate(el=>el.matches(':focus-visible')),true);
    assert.equal(await e.evaluate(el=>getComputedStyle(el).getPropertyValue('--stroke').trim()),'2px');
    await e.evaluate(el=>el.blur());buttons++;
   }
   assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));cases++;
  }await p.close();
 }
 await b.close();console.log(JSON.stringify({passed:cases,buttons,widths:[320,390,768,1440],pointerTypes:['fine','coarse'],checks:['32px actual target','no invisible hit area','clipped corner','hover','keyboard focus','overflow']}));
})().catch(e=>{console.error(e);process.exit(1)});
