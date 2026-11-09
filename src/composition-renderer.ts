import type {TimelineRecord} from './types';
import type {Composition,CompositionSettings} from './composition';
import {matches} from './composition';
import {layoutRow,placeLabels,centerAt,ribbonPath,PlacedItem} from './layout';
import {formatTime,timeTicks,historicalDate} from './dates';
const NS=['http:','','www.w3.org','2000','svg'].join('/');
function element(tag:string,attrs:Record<string,string|number>={},text?:string):SVGElement {
  const el=document.createElementNS(NS,tag) as SVGElement;for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text)el.textContent=text;return el;
}
export interface ChartController {destroy():void;setVisible(ids:Set<string>):void;zoomBy(factor:number):void;fit():void;}
export function renderComposition(parent:HTMLElement,view:Composition,settings:CompositionSettings,records:TimelineRecord[],_bounds:{min:number;max:number},open:(path:string)=>void,initialZoom=1):ChartController {
  const root=parent.createDiv({cls:'vt-chart'}),toolbar=root.createDiv({cls:'vt-chart-tools'});
  const button=(host:HTMLElement,text:string,fn:()=>void)=>{const b=host.createEl('button',{text});b.onclick=fn;return b;};
  const scroll=root.createDiv({cls:'vt-chart-scroll',attr:{tabindex:'0','aria-label':'Timeline; scroll to explore. Select a shape for details.'}});
  const hint=root.createDiv({cls:'vt-chart-hint',attr:{'aria-live':'polite'}});
  hint.textContent='Select a shape for details. Short or overlapping items may be grouped into count markers.';
  const inspector=root.createEl('aside',{cls:'vt-inspector',attr:{'aria-label':'Timeline details'}});inspector.hidden=true;
  const diagnostics=root.createEl('details',{cls:'vt-diagnostics'});
  let zoom=initialZoom,visible=new Set(records.map(r=>r.id)),selected:PlacedItem|undefined,returnFocus:Element|null=null,dead=false,lastWidth=0;
  const relevant=records.filter(r=>view.rows.some(row=>row.enabled&&row.layers.some(l=>matches(r,l))));
  const values=relevant.flatMap(r=>[historicalDate(r.date.start),historicalDate(r.date.end||r.date.start)]).filter(Number.isFinite);
  const min=values.length?Math.min(...values):1,max=values.length?Math.max(...values):2;
  const bounds={min,max:max===min?min+1:max};
  const gutter=160,measureCanvas=document.createElement('canvas'),ctx=measureCanvas.getContext('2d');
  if(ctx)ctx.font=`13px ${getComputedStyle(parent).fontFamily}`;
  const measure=(t:string)=>ctx?.measureText(t).width||t.length*8;
  const close=()=>{inspector.hidden=true;selected=undefined;root.querySelectorAll('.is-selected').forEach(e=>e.classList.remove('is-selected'));if(returnFocus instanceof HTMLElement||returnFocus instanceof SVGElement)(returnFocus as HTMLElement).focus();};
  const details=(items:PlacedItem[],focus=true)=>{
    if(focus)returnFocus=document.activeElement;
    inspector.empty();inspector.hidden=false;
    const header=inspector.createDiv({cls:'vt-inspector-header'});const title=header.createEl('h3',{text:items.length>1?`${items.length} items in this group`:items[0].record.title,attr:{tabindex:'-1'}});button(header,'Close',close);
    if(items.length>1){for(const p of items){const b=button(inspector,`${p.record.title} · ${p.record.date.display||p.record.date.start}`,()=>details([p]));b.addClass('vt-inspector-item');}}
    else{
      const p=items[0],r=p.record;selected=p;
      inspector.createEl('p',{text:`${r.date.circa?'Circa · ':''}${r.date.display||[r.date.start,r.date.end].filter(Boolean).join(' — ')}`});
      if(r.categories.length)inspector.createEl('p',{cls:'vt-section-note',text:r.categories.join(' · ')});
      if(p.anchor)inspector.createEl('p',{text:`Attached to: ${p.anchor.title}`});
      for(const [key,refs]of Object.entries(r.relations))if(refs.length){inspector.createEl('h4',{text:key.replace(/_/g,' ')});const ul=inspector.createEl('ul');for(const ref of refs)ul.createEl('li',{text:records.find(r=>r.id===ref||r.path.replace(/\.md$/,'')===ref)?.title||ref});}
      button(inspector,'Open note',()=>open(r.path)).addClass('mod-cta');
      root.querySelectorAll('.vt-composed-record').forEach(e=>e.classList.toggle('is-selected',e.getAttribute('data-key')===p.key));
    }
    if(focus)title.focus({preventScroll:true});
  };
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){close();e.stopPropagation();}};root.addEventListener('keydown',onKey);
  const draw=()=>{
    if(dead)return;
    const previousLeft=scroll.scrollLeft,previousTop=scroll.scrollTop;
    scroll.empty();diagnostics.empty();
    const viewport=Math.max(260,scroll.clientWidth),plotWidth=Math.max(200,viewport-gutter)*zoom,total=plotWidth+gutter;
    lastWidth=viewport;
    const canvas=scroll.createDiv({cls:'vt-chart-canvas'});canvas.style.width=`${total}px`;
    const axis=canvas.createDiv({cls:'vt-sticky-axis'});axis.style.width=`${total}px`;
    axis.createDiv({cls:'vt-axis-corner',text:'History'}).style.width=`${gutter}px`;
    const ruler=element('svg',{width:plotWidth,height:38,'aria-label':'Shared date scale'});
    for(const tick of timeTicks(bounds.min,bounds.max,plotWidth)){const x=24+(tick-min)/(bounds.max-min)*(plotWidth-48);ruler.appendChild(element('line',{x1:x,x2:x,y1:26,y2:38}));ruler.appendChild(element('text',{x,y:18,'text-anchor':'middle'},formatTime(tick,bounds.max-min<2)));}axis.appendChild(ruler);
    let warningCount=0;const warningList: {record:TimelineRecord;message:string}[]=[];
    for(const row of view.rows.filter(r=>r.enabled)){
      const section=canvas.createDiv({cls:'vt-compact-row'});section.createEl('h2',{text:row.name,cls:'vt-compact-row-title'});
      const layout=layoutRow(row,records,bounds,plotWidth,settings.categoryStyles);warningList.push(...layout.diagnostics);warningCount+=layout.diagnostics.length;
      const strip=section.createDiv({cls:'vt-row-strip'});strip.style.height=`${layout.height}px`;
      const labels=strip.createDiv({cls:'vt-sticky-lanes'});labels.style.width=`${gutter}px`;
      for(const lane of layout.lanes){const l=labels.createDiv({cls:'vt-lane-name',text:lane.title});l.style.top=`${lane.y-14}px`;}
      const svg=element('svg',{width:plotWidth,height:layout.height,class:'vt-composition-svg','aria-label':row.name});strip.appendChild(svg);
      const shown=layout.items.filter(p=>visible.has(p.record.id));
      const labelBoxes=placeLabels(shown,plotWidth,measure);
      const z=(p:PlacedItem)=>(p.layer.plane==='background'?0:10000)+row.layers.indexOf(p.layer);
      const shapeGroup=(items:PlacedItem[],x:number,y:number,cluster=false)=>{
        const p=items[0],g=element('g',{class:'vt-composed-record',tabindex:0,role:'button','aria-label':cluster?`${items.length} items; select to list`:p.record.title,'data-key':p.key,'data-records':items.map(i=>i.record.id).join('|'),'data-lane':p.laneId,'data-track':p.subtrack});
        const full=cluster?`${items.length} items`: `${p.record.title} · ${p.record.date.display||p.record.date.start}`;
        g.appendChild(element('title',{},full));
        const select=()=>details(items);
        g.addEventListener('click',select);g.addEventListener('focus',()=>{hint.textContent=full;});g.addEventListener('mouseenter',()=>{hint.textContent=full;});
        g.addEventListener('keydown',e=>{const k=(e as KeyboardEvent).key;if(k==='Enter'||k===' '){e.preventDefault();select();}else if(k==='ArrowRight'||k==='ArrowLeft'){e.preventDefault();const all=Array.from(scroll.querySelectorAll<SVGElement>('.vt-composed-record')),i=all.indexOf(g);all[(i+(k==='ArrowRight'?1:all.length-1))%all.length]?.focus();}});
        if(cluster){g.appendChild(element('circle',{cx:x,cy:y,r:13,fill:p.layer.color,class:'vt-cluster-shape'}));g.appendChild(element('text',{x,y:y+4,'text-anchor':'middle',class:'vt-cluster-text'},String(items.length)));}
        return g;
      };
      for(const p of [...shown].filter(p=>!p.clustered).sort((a,b)=>z(a)-z(b))){
        const x=p.x,y=centerAt(p.curve,x),g=shapeGroup([p],x,y),attrs={fill:p.layer.color,opacity:p.layer.opacity};
        if(p.style==='stream'||p.style==='box'){
          if(p.xEnd===p.x)g.appendChild(element('line',{x1:x,x2:x,y1:y-6,y2:y+6,stroke:p.layer.color,'stroke-width':2}));
          else g.appendChild(element('path',{...attrs,d:ribbonPath(p)}));
        }else if(p.style==='dot')g.appendChild(element('circle',{...attrs,cx:x,cy:y,r:5}));
        else if(p.style==='line')g.appendChild(element('path',{d:Array.from({length:25},(_,i)=>{const xx=x+(p.xEnd-x)*i/24;return `${i?'L':'M'} ${xx} ${centerAt(p.curve,xx)}`;}).join(' '),stroke:p.layer.color,'stroke-width':2,fill:'none',opacity:p.layer.opacity}));
        else g.appendChild(element('rect',{...attrs,x,y:p.anchor?y-28:16,width:Math.max(1,p.xEnd-x),height:p.anchor?56:layout.height-32}));
        if(!p.isAnchor&&p.style!=='band')g.appendChild(element('rect',{x:x-4,y:y-10,width:Math.max(12,p.xEnd-x+8),height:20,fill:'transparent',class:'vt-hit-area'}));
        if(selected?.key===p.key)g.classList.add('is-selected');svg.appendChild(g);
      }
      for(const cluster of layout.clusters){const members=cluster.items.filter(p=>visible.has(p.record.id));if(members.length)svg.appendChild(shapeGroup(members,cluster.x,cluster.y,true));}
      for(const box of labelBoxes){const p=shown.find(i=>i.key===box.key)!;svg.appendChild(element('text',{x:box.x,y:box.y+12,class:'vt-adaptive-label','data-for':p.key},p.record.title));}
    }
    diagnostics.hidden=!warningCount;
    if(warningCount){diagnostics.createEl('summary',{text:`${warningCount} records or relationships need attention`});for(const d of warningList)button(diagnostics,`${d.record.title}: ${d.message}`,()=>details([{record:d.record,layer:{name:'Unassigned'},key:`diagnostic/${d.record.id}`} as PlacedItem]));}
    if(!view.rows.some(r=>r.enabled))canvas.createEl('p',{text:'No visible rows. Add or enable a row in Configure timeline.'});
    scroll.scrollLeft=previousLeft;scroll.scrollTop=previousTop;
  };
  const zoomBy=(factor:number)=>{
    const old=zoom,viewport=Math.max(260,scroll.clientWidth),oldPlot=(viewport-gutter)*zoom;
    const relative=selected?(selected.start-bounds.min)/(bounds.max-bounds.min):Math.max(0,(scroll.scrollLeft+viewport/2-gutter)/Math.max(1,oldPlot));
    zoom=Math.max(1,Math.min(32,zoom*factor));if(old===zoom)return;draw();scroll.scrollLeft=gutter+relative*(viewport-gutter)*zoom-viewport/2;
  };
  button(toolbar,'Fit',()=>{zoom=1;draw();scroll.scrollLeft=0;});button(toolbar,'Zoom in',()=>zoomBy(2));button(toolbar,'Zoom out',()=>zoomBy(.5));
  const observer=new ResizeObserver(()=>{if(Math.abs(scroll.clientWidth-lastWidth)>1)draw();});observer.observe(scroll);
  draw();
  return {destroy(){dead=true;observer.disconnect();root.removeEventListener('keydown',onKey);root.remove();},setVisible(ids){visible=ids;draw();},zoomBy,fit(){zoom=1;draw();scroll.scrollLeft=0;}};
}
