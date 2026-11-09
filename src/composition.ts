import type {TimelineRecord} from './types';
import type {RelationshipKey} from './types';

export type DisplayStyle = 'stream' | 'line' | 'dot' | 'box' | 'band';
export interface LayerAttachment {anchorLayer: string; relationship: RelationshipKey; overrides: Record<string,string>;}
export interface TimelineLayer {
  attachment?: LayerAttachment;
  id: string; name: string; enabled: boolean;
  types: string[]; categories: string[]; tags: string[];
  style: DisplayStyle | 'default'; plane: 'background' | 'foreground';
  opacity: number; color: string; labels: 'adaptive' | 'always' | 'selection' | 'hidden';
}
export interface TimelineRow {anchorOrder?: string[]; maxSubtracks?: number;id: string; name: string; height: number; enabled: boolean; layers: TimelineLayer[];}
export interface Composition {id: string; name: string; rows: TimelineRow[]; yearGrid?: boolean;}
export interface CompositionSettings {version: 2; active: string; views: Composition[]; categoryStyles: Record<string,DisplayStyle>;}
export const STYLES: DisplayStyle[] = ['stream','line','dot','box','band'];
export const uid = ():string => `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
export function newLayer(name = 'New layer', type = ''):TimelineLayer {
  return {id:uid(),name,enabled:true,types:type?[`visual-timeline-${type}`]:[],categories:[],tags:[],style:'default',plane:'foreground',opacity:1,color:'#659fa0',labels:'adaptive'};
}
export function newRow(name = 'New row', layers:TimelineLayer[] = []):TimelineRow {return {id:uid(),name,height:220,enabled:true,layers,anchorOrder:[],maxSubtracks:3};}
export function defaults():CompositionSettings {
  const kingdoms=newLayer('Kingdoms','kingdom');kingdoms.style='stream';kingdoms.color='#bb9865';
  const kings=newLayer('Kings / people','person');kings.style='box';
  const battles=newLayer('Battles / events','event');battles.style='dot';battles.color='#b98d76';
  const stream:Composition={id:'streams',name:'Kingdom succession',rows:[newRow('Kingdoms',[kingdoms])]};
  const rows:Composition={id:'rows',name:'Separate rows',rows:[newRow('Kings / people',[kings]),newRow('Kingdoms',[{...kingdoms,id:uid()}]),newRow('Battles / events',[battles])]};
  const overlay:Composition={id:'overlay',name:'Kings and kingdoms',rows:[newRow('Rulers and kingdoms',[{...kingdoms,id:uid(),plane:'background',opacity:.3,labels:'selection'},{...kings,id:uid()}]),newRow('Battles / events',[{...battles,id:uid()}])]};
  return {version:2,active:'streams',views:[stream,rows,overlay],categoryStyles:{kingdom:'stream',person:'box',event:'dot',era:'band'}};
}
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter(x=>typeof x==='string'):[];
const finite=(v:unknown,fallback:number,min:number,max:number):number=>typeof v==='number'&&Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
/** Validate persisted display settings without changing note schemas or other settings. */
export function normalizeComposition(value:unknown):CompositionSettings {
  if(!value || typeof value!=='object')return defaults();
  const raw=value as Partial<CompositionSettings>;
  if(!Array.isArray(raw.views)||!raw.views.length)return defaults();
  const views=raw.views.filter(v=>v&&typeof v==='object').map(v=>({id:typeof v.id==='string'?v.id:uid(),name:String(v.name||'Untitled view'),...(v.yearGrid!==undefined?{yearGrid:v.yearGrid===true}:{}),rows:(Array.isArray(v.rows)?v.rows:[]).filter(Boolean).map(r=>({id:r.id||uid(),name:String(r.name||'Untitled row'),height:finite(r.height,220,120,1200),anchorOrder:strings(r.anchorOrder),maxSubtracks:Math.round(finite(r.maxSubtracks,3,1,6)),enabled:r.enabled!==false,layers:(Array.isArray(r.layers)?r.layers:[]).filter(Boolean).map(l=>({...newLayer(),id:l.id||uid(),name:String(l.name||'Untitled layer'),enabled:l.enabled!==false,types:strings(l.types),categories:strings(l.categories),tags:strings(l.tags),style:STYLES.includes(l.style as DisplayStyle)?l.style:'default',plane:l.plane==='background'?'background':'foreground',opacity:finite(l.opacity,1,.1,1),color:/^#[\da-f]{6}$/i.test(l.color)?l.color:'#659fa0',labels:['adaptive','always','selection','hidden'].includes(l.labels)?l.labels:'adaptive',attachment:normalizeAttachment(l.attachment)} as TimelineLayer))}))}));
  if(!views.length)return defaults();
  const categoryStyles:Record<string,DisplayStyle>={};
  for(const [key,style] of Object.entries(raw.categoryStyles||{}))if(STYLES.includes(style))categoryStyles[key]=style;
  return {version:2,active:views.some(v=>v.id===raw.active)?raw.active!:views[0].id,views,categoryStyles};
}
export function matches(record:TimelineRecord,layer:TimelineLayer):boolean {
  const norm=(s:string)=>s.replace(/^#/,'').toLocaleLowerCase();
  return layer.enabled&&(!layer.types.length||layer.types.includes(record.type))&&(!layer.categories.length||layer.categories.some(c=>record.categories.map(norm).includes(norm(c))))&&(!layer.tags.length||layer.tags.some(t=>record.tags.map(norm).includes(norm(t))));
}
export function styleFor(r:TimelineRecord,l:TimelineLayer,defaults:Record<string,DisplayStyle>):DisplayStyle {
  return l.style!=='default'?l.style:r.categories.map(c=>defaults[c]).find(Boolean)||defaults[r.type.replace('visual-timeline-','')]||'box';
}
export function reorder<T>(items:T[],from:number,to:number):void {if(from<0||from>=items.length)return;items.splice(Math.max(0,Math.min(items.length-1,to)),0,items.splice(from,1)[0]);}

function normalizeAttachment(value:unknown):LayerAttachment|undefined {
 if(!value||typeof value!=='object')return undefined;
 const a=value as Partial<LayerAttachment>;if(typeof a.anchorLayer!=='string'||!a.anchorLayer)return undefined;
 const keys=['related_to','continued_from','split_into','merged_into','preceded_by','succeeded_by','contemporary_with'];
 const overrides=Object.fromEntries(Object.entries(a.overrides||{}).filter(([k,v])=>k&&typeof v==='string'&&v));
 return {anchorLayer:a.anchorLayer,relationship:keys.includes(a.relationship||'')?a.relationship!:'related_to',overrides};
}
