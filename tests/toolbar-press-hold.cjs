// Press/hold regression tests. Hover is not a substitute for a held pointer.
const{chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process');
const base=process.argv[2]||'http://127.0.0.1:8013';
(async()=>{
 const b=await chromium.launch({executablePath:cp.execFileSync('which',['chromium'],{encoding:'utf8'}).trim(),args:['--no-sandbox']});
 const roots=['/','/en/','/wide/','/wide/en/','/products/','/products/en/','/products/wide/','/products/wide/en/'];
 const d=await b.newPage();const details=[];
 for(const route of roots.filter(x=>x.startsWith('/products/'))){await d.goto(base+route);details.push(new URL(await d.locator('.stone__link').first().getAttribute('href'),base+route).pathname)}await d.close();let mouse=0,touch=0;
 for(const width of [390,1440])for(const hasTouch of [false,true]){
  const p=await b.newPage({viewport:{width,height:900},hasTouch,isMobile:hasTouch,reducedMotion:'reduce'}),cdp=await p.context().newCDPSession(p);
  for(const route of [...roots,...details]){
   await p.goto(base+route);await p.evaluate(()=>document.fonts.ready);
   const chips=p.locator('.bar .chip:visible');
   for(const e of await chips.all())assert.equal(await e.evaluate(el=>getComputedStyle(el).webkitTapHighlightColor),'rgba(0, 0, 0, 0)');
   const e=chips.first(),before=await e.boundingBox(),url=p.url(),x=before.x+before.width/2,y=before.y+before.height/2;
   if(hasTouch){
    await p.evaluate(()=>{window.heldPointerReceived=false;document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.target.closest('.bar .chip'))window.heldPointerReceived=true},{once:true})});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1,force:1,radiusX:1,radiusY:1}]});
   }else{await p.mouse.move(x,y);await p.mouse.down()}
   await p.waitForTimeout(1000);
   assert.equal(p.url(),url,'holding must not navigate');
   const held=await e.evaluate(el=>{const s=getComputedStyle(el),b=getComputedStyle(el,'::before');return{active:el.matches(':active'),highlight:s.webkitTapHighlightColor,transform:s.transform,clip:s.clipPath,background:s.backgroundColor,face:b.backgroundColor,select:s.userSelect}});
   assert.equal(held.highlight,'rgba(0, 0, 0, 0)');assert.notEqual(held.clip,'none');assert.equal(held.transform,'none');assert.equal(held.select,'none');
   assert.deepEqual(await e.boundingBox(),before,'pressed face must not move or grow');
   if(hasTouch){assert.equal(await p.evaluate(()=>heldPointerReceived),true);touch++}else{assert.equal(held.active,true);assert.equal(held.background,held.face);mouse++}
   if(width===390&&route==='/products/')await p.screenshot({path:`/data/press-hold-qa/${hasTouch?'touch-long-held':'mouse-long-held'}.png`,clip:{x:0,y:0,width,height:120}});
   // Move off the control before releasing, so the test does not activate its link.
   if(hasTouch){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:1,y:150,id:1,force:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
   else{await p.mouse.move(1,150);await p.mouse.up()}
  }await p.close();
 }await b.close();console.log(JSON.stringify({passed:mouse+touch,mouseHeld:mouse,touchHeld:touch,holdMilliseconds:1000,widths:[390,1440]}));
})().catch(e=>{console.error(e);process.exit(1)});
