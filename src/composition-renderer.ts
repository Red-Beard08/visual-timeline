import type {TimelineRecord} from './types';
import type {Composition,CompositionSettings,Placement} from './composition';
import {placeRow} from './composition';
import {dateValue} from './utils';
const NS=['http:','','www.w3.org','2000','svg'].join('/');
function element(tag:string,attrs:Record<string,string|number>={},text?:string):SVGElement {
  const el=document.createElementNS(NS,tag) as SVGElement;for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text)el.textContent=text;return el;
}
export function renderComposition(parent:HTMLElement,view:Composition,settings:CompositionSettings,records:TimelineRecord[],bounds:{min:number;max:number},open:(path:string)=>void,zoom=1):void {
  const scroll=parent.createDiv({cls:'vt-composition-scroll'});
  scroll.setAttribute('tabindex','0');scroll.setAttribute('aria-label','Timeline rows. Scroll horizontally to explore dates.');
  const width=1200*zoom;
  const canvas=scroll.createDiv({cls:'vt-composition-canvas'});canvas.style.minWidth=`${width}px`;
  const axis=element('svg',{viewBox:`0 0 ${width} 42`,class:'vt-composition-axis','aria-label':'Shared date scale'});
  for(let i=0;i<5;i++){const year=Math.round(bounds.min+(bounds.max-bounds.min)*i/4),x=40+(width-80)*i/4;axis.appendChild(element('line',{x1:x,x2:x,y1:26,y2:42}));axis.appendChild(element('text',{x,y:18,'text-anchor':'middle'},year<0?`${-year} BC`:`AD ${year||1}`));}canvas.appendChild(axis);
  const rows=view.rows.filter(r=>r.enabled);
  if(!rows.length)canvas.createEl('p',{text:'No visible rows. Use Configure timeline to add or enable a row.'});
  for(const row of rows){
    const section=canvas.createDiv({cls:'vt-composition-row'});
    const head=section.createDiv({cls:'vt-row-heading'});head.createEl('h2',{text:row.name});
    const legend=head.createDiv({cls:'vt-layer-legend'});
    for(const l of row.layers.filter(l=>l.enabled)){const item=legend.createSpan({text:`${l.name} · ${l.style==='default'?'category style':l.style}${l.plane==='background'?' · background':''}`});item.style.setProperty('--vt-color',l.color);}
    const layout=placeRow(row,records,bounds,width,settings.categoryStyles);
    if(!layout.items.length){section.createEl('p',{cls:'vt-section-note',text:'No matching records in this row.'});continue;}
    const svg=element('svg',{viewBox:`0 0 ${width} ${layout.height}`,class:'vt-composition-svg','aria-label':row.name});section.appendChild(svg);
    const center=(p:Placement)=>60+p.lane*78;
    const parentOf=(p:Placement):Placement|undefined=>layout.items.find(other=>other!==p&&other.layer.id===p.layer.id&&other.style==='stream'&&dateValue(other.record.date.start)<dateValue(p.record.date.start)&&dateValue(other.record.date.end||other.record.date.start)===dateValue(p.record.date.start)&&(p.record.relations.preceded_by.concat(p.record.relations.continued_from).some(ref=>ref===other.record.id||ref===other.record.file.basename||ref===other.record.path.replace(/\.md$/,''))||other.record.relations.succeeded_by.concat(other.record.relations.split_into).some(ref=>ref===p.record.id||ref===p.record.file.basename||ref===p.record.path.replace(/\.md$/,''))));
    const ys=new Map(layout.items.map(p=>[p,center(p)]));
    for(const p of [...layout.items].sort((a,b)=>b.x-a.x)){const children=layout.items.filter(c=>parentOf(c)===p);if(children.length)ys.set(p,children.reduce((s,c)=>s+ys.get(c)!,0)/children.length);}
    for(const p of layout.items){
      const {record:r,layer:l,x,end,style}=p;const y=ys.get(p)!;
      const g=element('g',{class:`vt-composed-record vt-label-${l.labels}`,tabindex:0,role:'link','aria-label':`${r.title}, ${r.date.display||r.date.start}`, 'data-layer':l.id});
      g.appendChild(element('title',{},`${r.title} · ${r.date.display||r.date.start}${r.date.end?' — '+r.date.end:''}`));
      const attrs={fill:l.color,opacity:l.opacity};
      if(style==='stream'){
        const parent=parentOf(p),siblings=parent?layout.items.filter(c=>parentOf(c)===parent):[];
        const half=parent?20/siblings.length:20,origin=parent?ys.get(parent)!-20+half+siblings.indexOf(p)*2*half:y;
        const bend=Math.min(140,(end-x)*.45),settle=x+bend,tail=Math.min(40,(end-settle)*.5),tip=layout.items.some(c=>parentOf(c)===p)?20:0;
        g.appendChild(element('path',{...attrs,d:`M ${x} ${origin-half} C ${x+bend*.55} ${origin-half} ${x+bend*.45} ${y-20} ${settle} ${y-20} C ${end-tail} ${y-20} ${end-tail*.25} ${y-tip} ${end} ${y-tip} L ${end} ${y+tip} C ${end-tail*.25} ${y+tip} ${end-tail} ${y+20} ${settle} ${y+20} C ${x+bend*.45} ${y+20} ${x+bend*.55} ${origin+half} ${x} ${origin+half} Z`}));
      }else if(style==='dot')g.appendChild(element('circle',{...attrs,cx:x,cy:y,r:6}));
      else if(style==='line')g.appendChild(element('line',{x1:x,x2:end,y1:y,y2:y,stroke:l.color,'stroke-width':3,opacity:l.opacity}));
      else g.appendChild(element('rect',{...attrs,x,y:style==='band'?32:y-14,width:end-x,height:style==='band'?layout.height-48:28,rx:style==='band'?0:4}));
      // Transparent hit area makes thin lines and point events keyboard/touch accessible.
      if(style==='dot'||style==='line')g.appendChild(element('rect',{x:x-10,y:y-20,width:Math.max(40,end-x+20),height:40,fill:'transparent'}));
      const label=element('text',{x:Math.min(x+8,width-250),y:style==='band'?25:y-29,class:'vt-record-label'},r.title.length>34?r.title.slice(0,32)+'…':r.title);g.appendChild(label);
      g.addEventListener('click',()=>open(r.path));g.addEventListener('keydown',e=>{if(['Enter',' '].includes((e as KeyboardEvent).key)){e.preventDefault();open(r.path);}});svg.appendChild(g);
    }
  }
}
