// Optional browser check: provide Playwright via NODE_PATH. No vault data is used.
const {chromium}=require('playwright');
const {build}=require('esbuild');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
const stub=`export class Notice {constructor(message){window.lastNotice=message;}}
export class Modal {constructor(app){this.app=app;this.modalEl=document.createElement('div');this.modalEl.className='modal';this.contentEl=this.modalEl.createDiv({cls:'modal-content'});}open(){document.body.append(this.modalEl);this.onOpen();}close(){this.modalEl.remove();}}
export class Setting {constructor(parent){this.row=parent.createDiv({cls:'setting-item'});this.info=this.row.createDiv();this.control=this.row.createDiv({cls:'setting-item-control'});}setName(n){this.info.createEl('strong',{text:n});return this;}setDesc(d){this.info.createEl('small',{text:d});return this;}addText(fn){const input=this.control.createEl('input',{type:'text'});const c={inputEl:input,setValue(v){input.value=v;return c;},getValue(){return input.value;},onChange(f){input.oninput=()=>f(input.value);return c;}};fn(c);return this;}addDropdown(fn){const input=this.control.createEl('select');const c={addOption(v,t){input.createEl('option',{value:v,text:t});return c;},setValue(v){input.value=v;return c;},onChange(f){input.onchange=()=>f(input.value);return c;}};fn(c);return this;}addToggle(fn){const input=this.control.createEl('input',{type:'checkbox'});const c={setValue(v){input.checked=v;return c;},onChange(f){input.onchange=()=>f(input.checked);return c;}};fn(c);return this;}addColorPicker(fn){return this.addText(fn);}addSlider(fn){const input=this.control.createEl('input',{type:'range'});const c={setLimits(a,b,s){input.min=a;input.max=b;input.step=s;return c;},setValue(v){input.value=v;return c;},setDynamicTooltip(){return c;},onChange(f){input.oninput=()=>f(Number(input.value));return c;}};fn(c);return this;}}`;
const entry=`import {defaults} from './src/composition';import {renderComposition} from './src/composition-renderer';import {CompositionModal} from './src/composition-modal';
const relations=()=>({preceded_by:[],continued_from:[],split_into:[],succeeded_by:[],merged_into:[],related_to:[],contemporary_with:[]});
const record=(id,type,start,end)=>({id,title:id,type:'visual-timeline-'+type,date:{start,end},file:{basename:id},path:id+'.md',categories:[type],tags:['history'],layers:[],relations:relations()});
const records=[record('United Kingdom','kingdom','1050 BC','930 BC'),record('Northern Kingdom','kingdom','930 BC','722 BC'),record('Southern Kingdom','kingdom','930 BC','586 BC'),record('First ruler','person','1050 BC','1010 BC'),record('Second ruler','person','1010 BC','970 BC'),record('Third ruler','person','970 BC','930 BC'),record('Northern ruler','person','930 BC','910 BC'),record('Southern ruler','person','930 BC','913 BC'),record('Battle at the border','event','900 BC','900 BC')];records[0].relations.split_into=['Northern Kingdom','Southern Kingdom'];
window.config=defaults();window.config.active='overlay';window.opened=[];window.saved=0;window.refreshed=0;
window.plugin={app:{},settings:{composition:window.config,categories:['kingdom','person','event']},saveSettings:async()=>{window.saved++;},refreshViews:async()=>{window.refreshed++;}};
renderComposition(document.querySelector('#chart'),window.config.views[2],window.config,records,{min:-1050,max:-586},p=>window.opened.push(p));
window.edit=()=>new CompositionModal(window.plugin,records).open();`;
const compiled=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'iife',plugins:[{name:'obsidian-fixture',setup(b){b.onResolve({filter:/^obsidian$/},()=>({path:'obsidian',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:stub,loader:'js'}));}}]});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});
await page.setContent(`<style>:root{--background-primary:#202020;--background-secondary:#272727;--background-modifier-border:#484848;--text-normal:#eee;--text-muted:#bbb;--interactive-accent:#b88d65}body{background:var(--background-primary);color:var(--text-normal);font:15px Arial;margin:20px}button,input,select{background:#333;color:#eee;border:1px solid #555;border-radius:5px;padding:8px}small{display:block;color:#bbb}.setting-item{display:flex;justify-content:space-between}.modal{position:fixed;inset:3vh 0 auto;margin:auto;background:#222;border:1px solid #555;padding:20px;box-sizing:border-box}.modal-content{max-height:80vh;overflow:auto;box-sizing:border-box}${readFileSync('styles.css','utf8')}</style><div id="chart"></div>`);
await page.evaluate(()=>{HTMLElement.prototype.createEl=function(tag,o={}){const el=document.createElement(tag);if(o.cls)el.className=o.cls;if(o.text)el.textContent=o.text;for(const k of ['type','value','placeholder'])if(o[k]!==undefined)el[k]=o[k];for(const [k,v]of Object.entries(o.attr||{}))el.setAttribute(k,v);this.appendChild(el);return el;};HTMLElement.prototype.createDiv=function(o){return this.createEl('div',o);};HTMLElement.prototype.createSpan=function(o){return this.createEl('span',o);};HTMLElement.prototype.empty=function(){this.replaceChildren();};HTMLElement.prototype.addClass=function(n){this.classList.add(n);};});
await page.addScriptTag({content:compiled.outputFiles[0].text});
assert.equal(await page.locator('.vt-composition-row').count(),2);
assert.equal(await page.locator('.vt-composed-record').count(),9);
await page.locator('.vt-composed-record').first().focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>opened.length),1);
await page.screenshot({path:path.join(process.env.TEMP||'.','timeline-composition-desktop.png'),fullPage:true});
await page.evaluate(()=>edit());await page.getByRole('button',{name:'Add row',exact:true}).click();assert.equal(await page.locator('.vt-row-editor').count(),3);
await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.evaluate(()=>saved),0);
await page.evaluate(()=>edit());await page.getByRole('button',{name:'Add row',exact:true}).click();
await page.getByRole('button',{name:'Save composition',exact:true}).click();assert.equal(await page.evaluate(()=>plugin.settings.composition.views.find(v=>v.id==='overlay').rows.length),3);
assert.equal(await page.evaluate(()=>saved),1);
await page.evaluate(()=>edit());await page.screenshot({path:path.join(process.env.TEMP||'.','timeline-editor-desktop.png')});
await page.setViewportSize({width:390,height:844});
await page.locator('.vt-layer-editor summary').first().click();
await page.screenshot({path:path.join(process.env.TEMP||'.','timeline-editor-mobile.png')});
await page.getByRole('button',{name:'Save composition',exact:true}).scrollIntoViewIfNeeded();assert.ok(await page.getByRole('button',{name:'Save composition',exact:true}).isVisible());
assert.ok(await page.evaluate(()=>document.querySelector('.modal').getBoundingClientRect().width<=innerWidth));
await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.screenshot({path:path.join(process.env.TEMP||'.','timeline-composition-mobile.png')});
console.log('Browser fixture passed: layered rendering, keyboard navigation, draft cancel/save, adding rows, and narrow editor scrolling. Screenshots in TEMP.');
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
