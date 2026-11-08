import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['src/streams.ts'],bundle:true,write:false,format:'esm',external:['obsidian']});
const {renderStreams}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.listeners={};}
  appendChild(child){this.children.push(child);return child;}
  setAttribute(key,value){this.attrs[key]=value;}
  getAttribute(key){return this.attrs[key];}
  createDiv(options){return this.createEl('div',options);}
  createEl(tag,options={}){const el=new Element(tag);el.textContent=options.text;el.attrs.class=options.cls;return this.appendChild(el);}
  addEventListener(key,fn){this.listeners[key]=fn;}
}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const record=(id,start,end,relations={})=>({id,title:id,path:id+'.md',file:{basename:id},date:{start,end},relations:{split_into:[],succeeded_by:[],continued_from:[],preceded_by:[],...relations}});
const root=new Element('div');const opened=[];
renderStreams(root,[record('United','1050 BC','930 BC',{split_into:['North','Judah']}),record('North','930 BC','722 BC'),record('Judah','930 BC','586 BC')],{min:-1050,max:-539},p=>opened.push(p));
const flatten=e=>[e,...e.children.flatMap(flatten)];
const all=flatten(root),paths=all.filter(e=>e.tag==='path'),groups=all.filter(e=>e.tag==='g');
assert.equal(paths.length,3);assert.equal(all.filter(e=>e.tag==='rect').length,0);
for(const path of paths){assert.ok(path.attrs.d.includes(' C '));assert.ok(path.attrs.d.endsWith(' Z'));assert.ok(!/NaN|Infinity/.test(path.attrs.d));}
const parentEnd=paths[0].attrs.d.match(/ L ([\d.]+) ([\d.]+)/);
for(const path of paths.slice(1))assert.equal(Number(path.attrs.d.split(' ')[1]),Number(parentEnd[1]),'Branches share the trunk split date');
groups[1].listeners.click();groups[2].listeners.keydown({key:'Enter',preventDefault(){}});
assert.equal(opened.length,2);
console.log('Validated filled stream geometry, shared split dates, and keyboard/click navigation.');
