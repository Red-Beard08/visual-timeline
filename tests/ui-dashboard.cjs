// Full dashboard visual fixture. Real-data inputs are local, never checked in.
const {chromium}=require('playwright');
const {build}=require('esbuild');
const {readFileSync,mkdirSync}=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const records=JSON.parse(readFileSync(process.env.UI_RECORDS,'utf8'));
 const composition=JSON.parse(readFileSync(process.env.UI_COMPOSITION,'utf8'));
 const stub=`export class Notice {constructor(s){window.notice=s;}} export class ItemView {constructor(){this.containerEl=document.querySelector('#leaf');}}`;
 const bundle=await build({stdin:{contents:`import {TimelineView} from './src/dashboard';
 window.start=async(records,composition)=>{window.opened=[];window.saves=0;window.plugin={settings:{composition,layers:[]},repository:{all:async()=>records},saveSettings:async()=>{window.saves++;},openNote:p=>window.opened.push(p),openNewEvent:()=>{},openComposition:async()=>{},openSettings:()=>{}};window.view=new TimelineView({},window.plugin);await window.view.onOpen();};`,loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',plugins:[{name:'obsidian',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},()=>({contents:stub,loader:'js'}));}}]});
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage({viewport:{width:1536,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent(`<style>:root{--font-interface:'Segoe UI',sans-serif;--background-primary:#232323;--background-secondary:#292929;--background-modifier-border:#414141;--text-normal:#ededed;--text-muted:#b8b8b8;--interactive-accent:#a68fc3;--text-selection:#595066}body{margin:0;font:14px var(--font-interface);background:var(--background-primary);color:var(--text-normal)}#leaf{height:100dvh}button,input,select{font:inherit;color:var(--text-normal);background:var(--background-secondary);border:1px solid var(--background-modifier-border);border-radius:5px;padding:6px 10px}button{cursor:pointer}input[type=checkbox]{accent-color:var(--interactive-accent)}${readFileSync('styles.css','utf8')}</style><div id="leaf"><div></div><div></div></div>`);
  await page.evaluate(()=>{HTMLElement.prototype.createEl=function(tag,o={}){const e=document.createElement(tag);if(o.cls)e.className=o.cls;if(o.text)e.textContent=o.text;for(const k of ['type','value','placeholder'])if(o[k]!==undefined)e[k]=o[k];for(const [k,v]of Object.entries(o.attr||{}))e.setAttribute(k,v);this.appendChild(e);return e;};HTMLElement.prototype.createDiv=function(o){return this.createEl('div',o);};HTMLElement.prototype.createSpan=function(o){return this.createEl('span',o);};HTMLElement.prototype.empty=function(){this.replaceChildren();};HTMLElement.prototype.addClass=function(n){this.classList.add(n);};});
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(async args=>start(args.records,args.composition),{records,composition});
  assert.equal(await page.locator('.vt-adaptive-label').count(),48);
  assert.equal(await page.locator('.vt-label-anchor').count(),3);
  assert.ok(await page.locator('.vt-diagnostics').isHidden());
  const integrated=composition.views[0].rows.some(r=>r.layers.some(l=>l.bandPlacement==='integrated'));
  if(integrated){
   assert.equal(await page.locator('.vt-context-band').count(),0,'Integrated context cannot leave a detached strip');
   assert.equal(await page.locator('.vt-integrated-band').count(),3,'Two explicit streams have one overlay and two context continuations');
   assert.equal(await page.locator('.vt-integrated-continuation').count(),2);
   assert.equal(await page.locator('.vt-context-rule').count(),0);
   assert.ok(await page.locator('.vt-integrated-continuation').evaluateAll(es=>es.every(e=>e.getAttribute('stroke-dasharray')==='5 4')));
  }else{
   assert.equal(await page.locator('.vt-context-band').count(),1);
   assert.ok(await page.locator('.vt-context-band').evaluate(e=>Number(e.getAttribute('height'))<=56&&Number(e.getAttribute('opacity'))<=.2));
  }
  assert.equal(await page.locator('.vt-chart-tools').count(),1);
  await page.locator('.vt-name-button[aria-label="Asa"]').click();
  assert.ok(await page.locator('.vt-inspector').isVisible());
  mkdirSync('.impeccable/review',{recursive:true});
  await page.screenshot({path:'.impeccable/review/hero-repro.png'});
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  await page.screenshot({path:'.impeccable/review/desktop.png'});
  const overlapCount=await page.evaluate(()=>{const b=[...document.querySelectorAll('.vt-adaptive-label')].map(e=>e.getBoundingClientRect());return b.reduce((n,a,i)=>n+b.slice(i+1).filter(c=>a.left<c.right&&a.right>c.left&&a.top<c.bottom&&a.bottom>c.top).length,0);});assert.equal(overlapCount,0);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByLabel('Search timeline',{exact:true}).fill('Asa');assert.ok(await page.locator('.vt-composed-record').count()<48);await page.getByLabel('Search timeline',{exact:true}).fill('');
  await page.evaluate(()=>view.render());assert.equal(await page.locator('.vt-chart-tools').count(),1,'Refresh must dispose the old toolbar');
  await page.evaluate(()=>{const s=document.documentElement.style;s.setProperty('--background-primary','#fafafa');s.setProperty('--background-secondary','#f1f1f1');s.setProperty('--background-modifier-border','#ccc');s.setProperty('--text-normal','#222');s.setProperty('--text-muted','#555');});
  const contrast=await page.locator('.vt-cluster-text').evaluateAll(es=>es.map(e=>{const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>c/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);const lum=s=>{const c=rgb(s);return .2126*c[0]+.7152*c[1]+.0722*c[2];};const a=lum(getComputedStyle(e).fill),b=lum(getComputedStyle(e.parentElement.querySelector('circle')).fill);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}));assert.ok(contrast.length&&contrast.every(c=>c>=4.5),'Count numerals need readable contrast against their circle, not the host surface');
  await page.screenshot({path:'.impeccable/review/light.png'});
  await page.evaluate(()=>document.documentElement.removeAttribute('style'));
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'.impeccable/review/mobile.png'});
  await page.locator('.vt-name-button').first().focus();await page.keyboard.press('Enter');
  await page.screenshot({path:'.impeccable/review/mobile-selection.png'});
  assert.ok(await page.getByRole('button',{name:'Close',exact:true}).isVisible());
  assert.deepEqual(errors,[]);console.log('Full dashboard: 48 labels, 3 stream names, bounded context, search, refresh disposal, dark/light, desktop/narrow and selection passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
