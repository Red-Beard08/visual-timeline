import type {TimelineRecord} from './types';
import type {Composition,CompositionSettings} from './composition';
import {matches,styleFor,contrastText} from './composition';
import {layoutRow,placeLabels,centerAt,halfAt,ribbonPath,curvePath,integratedBandSegments,PlacedItem} from './layout';
import {formatTime,timeTicks,historicalDate} from './dates';
import {installDragPan} from './drag-pan';
const NS=['http:','','www.w3.org','2000','svg'].join('/');
let nextClipId=0;
function element(tag:string,attrs:Record<string,string|number>={},text?:string):SVGElement {
  const el=document.createElementNS(NS,tag) as SVGElement;for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text)el.textContent=text;return el;
}
export interface ChartController {destroy():void;setVisible(ids:Set<string>):void;zoomBy(factor:number):void;fit():void;}
export function renderComposition(parent:HTMLElement,view:Composition,settings:CompositionSettings,records:TimelineRecord[],_bounds:{min:number;max:number},open:(path:string)=>void,initialZoom=1,saveView?:(view:Composition)=>Promise<void>,toolbarHost?:HTMLElement):ChartController {
  const root=parent.createDiv({cls:'vt-chart'}),toolbar=(toolbarHost||root).createDiv({cls:'vt-chart-tools'});
  const button=(host:HTMLElement,text:string,fn:()=>void)=>{const b=host.createEl('button',{text});b.onclick=fn;return b;};
  const scroll=root.createDiv({cls:'vt-chart-scroll',attr:{tabindex:'0','aria-label':'Timeline; scroll to explore. Select a shape for details.'}});
  const hint=root.createDiv({cls:'vt-chart-hint',attr:{'aria-live':'polite'}});
  const defaultHint='Drag to pan · Scroll to zoom · Select for details';
  hint.textContent=defaultHint;
  const inspector=root.createEl('aside',{cls:'vt-inspector',attr:{'aria-label':'Timeline details'}});inspector.hidden=true;
  const diagnostics=root.createEl('details',{cls:'vt-diagnostics'});
  let zoom=initialZoom,visible=new Set(records.map(r=>r.id)),selected:PlacedItem|undefined,returnFocus:Element|null=null,dead=false,lastWidth=0;
  const relevant=records.filter(r=>view.rows.some(row=>row.enabled&&row.layers.some(l=>matches(r,l))));
  const values=relevant.flatMap(r=>[historicalDate(r.date.start),historicalDate(r.date.end||r.date.start)]).filter(Number.isFinite);
  const min=values.length?Math.min(...values):1,max=values.length?Math.max(...values):2;
  const bounds={min,max:max===min?min+1:max};
  const gutter=view.rows.some(row=>row.layers.some(l=>l.enabled&&!l.attachment&&records.some(r=>matches(r,l)&&!['stream','band'].includes(styleFor(r,l,settings.categoryStyles)))))?160:24;
  root.dataset.gutter=String(gutter);
  const minPlot=1000,measureCanvas=document.createElement('canvas'),ctx=measureCanvas.getContext('2d');
  if(ctx)ctx.font=`13px ${getComputedStyle(parent).fontFamily}`;
  const measure=(t:string)=>ctx?.measureText(t).width||t.length*8;
  const close=()=>{inspector.hidden=true;selected=undefined;hint.textContent=defaultHint;root.querySelectorAll('.is-selected').forEach(e=>e.classList.remove('is-selected'));if(returnFocus instanceof HTMLElement||returnFocus instanceof SVGElement)(returnFocus as HTMLElement).focus({preventScroll:true});};
  const details=(items:PlacedItem[],focus=true)=>{
    if(focus)returnFocus=document.activeElement;
    inspector.empty();inspector.hidden=false;
    const header=inspector.createDiv({cls:'vt-inspector-header'});const title=header.createEl('h3',{text:items.length>1?`${items.length} items in this group`:items[0].record.title,attr:{tabindex:'-1'}});
    if(items.length>1){for(const p of items){const b=button(inspector,`${p.record.title} · ${p.record.date.display||p.record.date.start}`,()=>details([p]));b.addClass('vt-inspector-item');}}
    else{
      const p=items[0],r=p.record;selected=p;
      const meta=header.createDiv({cls:'vt-selection-meta'});
      meta.createSpan({text:`${r.date.circa?'c. ':''}${r.date.display||[r.date.start,r.date.end].filter(Boolean).join(' — ')}`});
      if(p.integratedAnchors?.length)meta.createSpan({text:`Context for: ${p.integratedAnchors.map(a=>a.record.title).join(' · ')}`});
      else if(p.anchor)meta.createSpan({text:p.anchor.title});
      const actions=header.createDiv({cls:'vt-selection-actions'});
      button(actions,'Open note',()=>open(r.path));
      const more=inspector.createEl('details',{cls:'vt-selection-more'});more.createEl('summary',{text:'Categories and relationships'});
      if(r.categories.length)more.createEl('p',{text:r.categories.join(' · ')});
      for(const [key,refs]of Object.entries(r.relations))if(refs.length){more.createEl('h4',{text:key.replace(/_/g,' ')});const ul=more.createEl('ul');for(const ref of refs)ul.createEl('li',{text:records.find(r=>r.id===ref||r.path.replace(/\.md$/,'')===ref)?.title||ref});}
      root.querySelectorAll('.vt-composed-record').forEach(e=>e.classList.toggle('is-selected',e.getAttribute('data-key')===p.key));
    }
    button(header,'Close',close);
    if(focus)title.focus({preventScroll:true});
  };
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){close();e.stopPropagation();}};root.addEventListener('keydown',onKey);
  const draw=()=>{
    if(dead)return;
    const previousLeft=scroll.scrollLeft,previousTop=scroll.scrollTop;
    scroll.empty();diagnostics.empty();
    const viewport=Math.max(260,scroll.clientWidth),plotWidth=Math.max(minPlot,viewport-gutter)*zoom,total=plotWidth+gutter;
    lastWidth=viewport;
    const canvas=scroll.createDiv({cls:'vt-chart-canvas'});canvas.style.width=`${total}px`;
    const ticks=timeTicks(bounds.min,bounds.max,plotWidth);
    const tickX=(tick:number)=>24+(tick-min)/(bounds.max-min)*(plotWidth-48);
    const axis=canvas.createDiv({cls:'vt-sticky-axis'});axis.style.width=`${total}px`;
    axis.createDiv({cls:'vt-axis-corner',text:gutter>24?'History':''}).style.width=`${gutter}px`;
    const ruler=element('svg',{width:plotWidth,height:38,'aria-label':'Shared date scale'});
    for(const tick of ticks){const x=tickX(tick);ruler.appendChild(element('line',{x1:x,x2:x,y1:26,y2:38}));ruler.appendChild(element('text',{x,y:18,'text-anchor':'middle'},formatTime(tick,bounds.max-min<2)));}axis.appendChild(ruler);
    let warningCount=0;const warningList: {record:TimelineRecord;message:string}[]=[];
    for(const row of view.rows.filter(r=>r.enabled)){
      const section=canvas.createDiv({cls:'vt-compact-row'});section.createEl('h2',{text:row.name,cls:'vt-compact-row-title'});
      const layout=layoutRow(row,records,bounds,plotWidth,settings.categoryStyles);warningList.push(...layout.diagnostics);warningCount+=layout.diagnostics.length;
      const strip=section.createDiv({cls:'vt-row-strip'});strip.style.height=`${layout.height}px`;
      const labels=strip.createDiv({cls:'vt-sticky-lanes'});labels.style.width=`${gutter}px`;
      for(const lane of layout.lanes.filter(l=>!layout.items.some(p=>p.isAnchor&&p.key===l.id))){const l=labels.createDiv({cls:'vt-lane-name',text:lane.title});l.style.top=`${lane.y-14}px`;}
      const svg=element('svg',{width:plotWidth,height:layout.height,class:'vt-composition-svg','aria-label':row.name});strip.appendChild(svg);
      const shown=layout.items.filter(p=>visible.has(p.record.id));
      const labelBoxes=placeLabels(layout.items,plotWidth,measure,layout.height).filter(b=>shown.some(p=>p.key===b.key));
      for(const y of [...new Set(layout.items.filter(p=>p.context).map(p=>p.y))]){
        svg.appendChild(element('line',{x1:0,x2:plotWidth,y1:y-22,y2:y-22,class:'vt-context-rule'}));
      }
      const z=(p:PlacedItem)=>(p.integratedAnchors?.length?(p.layer.bandShape==='contour'?5000:-10000):p.layer.plane==='background'?0:10000)+row.layers.indexOf(p.layer);
      const shapeGroup=(items:PlacedItem[],x:number,y:number,cluster=false)=>{
        const p=items[0],g=element('g',{class:'vt-composed-record',tabindex:0,role:'button','aria-label':cluster?`${items.length} items; select to list`:p.record.title,'data-key':p.key,'data-records':items.map(i=>i.record.id).join('|'),'data-lane':p.laneId,'data-track':p.subtrack});
        const full=cluster?`${items.length} items`: `${p.record.title} · ${p.record.date.display||p.record.date.start}`;
        g.appendChild(element('title',{},full));
        const select=()=>details(items);
        g.addEventListener('click',select);g.addEventListener('focus',()=>{hint.textContent=full;});g.addEventListener('mouseenter',()=>{hint.textContent=full;});
        g.addEventListener('keydown',e=>{const k=(e as KeyboardEvent).key;if(k==='Enter'||k===' '){e.preventDefault();select();}else if(k==='ArrowRight'||k==='ArrowLeft'){e.preventDefault();const all=Array.from(scroll.querySelectorAll<SVGElement>('.vt-composed-record')),i=all.indexOf(g);all[(i+(k==='ArrowRight'?1:all.length-1))%all.length]?.focus();}});
        if(cluster){g.appendChild(element('circle',{cx:x,cy:y,r:10,fill:p.layer.color,class:'vt-cluster-shape'}));g.appendChild(element('text',{x,y:y+4,fill:contrastText(p.layer.color),'text-anchor':'middle',class:'vt-cluster-text'},String(items.length)));}
        return g;
      };
      for(const p of [...shown].filter(p=>!p.clustered).sort((a,b)=>z(a)-z(b))){
        const x=p.x,y=centerAt(p.curve,x),g=shapeGroup([p],x,y);
        const attachedColors=[...new Set(layout.items.filter(i=>i.anchorKey===p.key&&['box','stream','line'].includes(i.style)).map(i=>i.layer.color))];
        const color=p.isAnchor&&p.layer.tintFromAttached&&attachedColors.length===1?attachedColors[0]:p.layer.color;
        const attrs={fill:color,opacity:p.layer.opacity};
        if(p.integratedAnchors?.length){
          for(const segment of integratedBandSegments(p)){
            if(segment.kind==='category'){
              const attrs={fill:p.layer.color,'fill-opacity':p.layer.opacity*.18,stroke:p.layer.color,'stroke-opacity':.8,'stroke-width':1,'stroke-dasharray':'5 4',class:'vt-integrated-band vt-category-box','data-anchor':segment.anchor.record.id,'data-from':segment.from,'data-to':segment.to};
              g.appendChild(segment.rect?element('rect',{...attrs,...segment.rect,rx:6}):element('path',{...attrs,d:segment.path}));
              continue;
            }
            const id=`vt-integrated-band-${++nextClipId}`;
            const clip=element('clipPath',{id,clipPathUnits:'userSpaceOnUse'});
            clip.appendChild(element('rect',{x:segment.from,y:0,width:segment.to-segment.from,height:layout.height}));svg.appendChild(clip);
            g.appendChild(element('path',{d:segment.path,fill:p.layer.color,'fill-opacity':p.layer.opacity*(segment.kind==='overlay'?.28:.18),stroke:p.layer.color,'stroke-opacity':.65,'stroke-width':1,'stroke-dasharray':segment.kind==='continuation'?'5 4':'none','clip-path':`url(#${id})`,class:`vt-integrated-band vt-integrated-${segment.kind}`,'data-anchor':segment.anchor.record.id}));
          }
        }else if(p.style==='stream'||p.style==='box'){
          if(p.xEnd===p.x)g.appendChild(element('line',{x1:x,x2:x,y1:y-6,y2:y+6,stroke:p.layer.color,'stroke-width':2}));
          else g.appendChild(element('path',{...attrs,d:ribbonPath(p),class:p.isAnchor?'vt-anchor-shape':'vt-duration-shape'}));
        }else if(p.style==='dot')g.appendChild(element('circle',{...attrs,cx:x,cy:y,r:5}));
        else if(p.style==='line')g.appendChild(element('path',{d:curvePath(p),stroke:p.layer.color,'stroke-width':2,fill:'none',opacity:p.layer.opacity}));
        else g.appendChild(element('rect',{...attrs,opacity:p.context?p.layer.opacity*.18:p.layer.opacity,x,y:y-p.half,width:Math.max(2,p.xEnd-x),height:p.half*2,rx:p.context?4:6,class:'vt-context-band'}));
        if(!p.isAnchor&&p.style!=='band')g.appendChild(element('path',{d:curvePath(p),stroke:'transparent','stroke-width':20,fill:'none',class:'vt-hit-area'}));
        if(!p.isAnchor&&['box','stream','line'].includes(p.style))for(const boundary of [...new Set([p.x,p.xEnd])]){
          const cy=centerAt(p.curve,boundary),half=halfAt(p,boundary)+2;
          const cap={x1:boundary,x2:boundary,y1:cy-half,y2:cy+half};
          g.appendChild(element('line',{...cap,class:'vt-boundary-under'}));
          g.appendChild(element('line',{...cap,class:'vt-item-boundary'}));
        }
        if(selected?.key===p.key)g.classList.add('is-selected');svg.appendChild(g);
      }
      for(const cluster of layout.clusters){const members=cluster.items.filter(p=>visible.has(p.record.id));if(members.length)svg.appendChild(shapeGroup(members,cluster.x,cluster.y,true));}
      const callouts=element('g',{class:'vt-callouts'});svg.appendChild(callouts);
      for(const box of labelBoxes){
        const p=shown.find(i=>i.key===box.key)!;
        const endY=box.y>box.sourceY?box.y-3:box.y+18,targetX=box.x+Math.min(box.width/2,8),bendY=endY+(box.y>box.sourceY?-7:7);
        if(box.leader)callouts.appendChild(element('path',{d:`M ${box.sourceX} ${box.sourceY} V ${bendY} H ${targetX} V ${endY}`,class:'vt-label-leader'}));
        const label=element('g',{class:`vt-name-button vt-label-${box.kind}`,tabindex:0,role:'button','aria-label':p.record.title});
        label.appendChild(element('title',{},p.record.title));
        label.appendChild(element('rect',{x:box.x-3,y:box.y-3,width:box.width+6,height:box.height+6,rx:2,class:'vt-label-backdrop'}));
        label.appendChild(element('text',{x:box.x,y:box.y+12,class:'vt-adaptive-label','data-for':p.key},box.text));
        label.addEventListener('click',()=>details([p]));label.addEventListener('keydown',e=>{if(['Enter',' '].includes((e as KeyboardEvent).key)){e.preventDefault();details([p]);}});callouts.appendChild(label);
      }
    }
    diagnostics.hidden=!warningCount;
    if(warningCount){diagnostics.createEl('summary',{text:`Layer diagnostics · ${warningCount} items need review`});for(const d of warningList)button(diagnostics,`${d.record.title}: ${d.message}`,()=>details([{record:d.record,layer:{name:'Unassigned'},key:`diagnostic/${d.record.id}`} as PlacedItem]));}
    if(!view.rows.some(r=>r.enabled))canvas.createEl('p',{text:'No visible rows. Add or enable a row in Configure timeline.'});
    if(view.yearGrid){
      const height=Math.max(0,canvas.offsetHeight-38),grid=element('svg',{width:plotWidth,height,class:'vt-year-grid','aria-hidden':'true'});
      grid.style.left=`${gutter}px`;
      for(const tick of ticks){const x=tickX(tick);grid.appendChild(element('line',{x1:x,x2:x,y1:0,y2:height}));}
      canvas.prepend(grid);
    }
    scroll.scrollLeft=previousLeft;scroll.scrollTop=previousTop;
  };
  let wheelFrame=0,pendingWheel=0,wheelPointer=0;
  const clearWheel=()=>{if(wheelFrame)cancelAnimationFrame(wheelFrame);wheelFrame=0;pendingWheel=0;};
  const disposePan=installDragPan(scroll,clearWheel);
  const zoomBy=(factor:number,pointer?:number)=>{
    const old=zoom,viewport=Math.max(260,scroll.clientWidth),basePlot=Math.max(minPlot,viewport-gutter),oldPlot=basePlot*zoom;
    const focus=pointer??viewport/2;
    const relative=pointer===undefined&&selected?(selected.start-bounds.min)/(bounds.max-bounds.min):Math.max(0,Math.min(1,(scroll.scrollLeft+focus-gutter-24)/Math.max(1,oldPlot-48)));
    zoom=Math.max(1,Math.min(32,zoom*factor));if(old===zoom)return;
    draw();scroll.scrollLeft=gutter+24+relative*(basePlot*zoom-48)-focus;
  };
  const fit=()=>{clearWheel();zoom=1;draw();scroll.scrollLeft=0;};
  const onWheel=(event:WheelEvent)=>{
    if(scroll.classList.contains('is-panning')){event.preventDefault();return;}
    if(event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!Number.isFinite(event.deltaY)||!event.deltaY)return;
    const pointer=event.clientX-scroll.getBoundingClientRect().left-scroll.clientLeft;
    // Keep normal scrolling over the pinned lane names and outside the chart.
    if(pointer<gutter||pointer>scroll.clientWidth)return;
    event.preventDefault();event.stopPropagation();
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?scroll.clientHeight:1);
    pendingWheel+=Math.max(-240,Math.min(240,delta));wheelPointer=pointer;
    if(!wheelFrame)wheelFrame=requestAnimationFrame(()=>{
      wheelFrame=0;const amount=pendingWheel;pendingWheel=0;
      if(!dead)zoomBy(Math.exp(Math.max(-1.4,Math.min(1.4,-amount*.002))),wheelPointer);
    });
  };
  scroll.addEventListener('wheel',onWheel,{passive:false});
  button(toolbar,'Fit',fit);button(toolbar,'+',()=>{clearWheel();zoomBy(2);}).setAttribute('aria-label','Zoom in');button(toolbar,'−',()=>{clearWheel();zoomBy(.5);}).setAttribute('aria-label','Zoom out');
  const gridLabel=toolbar.createEl('label',{cls:'vt-grid-toggle'}),gridInput=gridLabel.createEl('input',{type:'checkbox'});
  gridLabel.createSpan({text:'Year lines'});gridInput.checked=view.yearGrid===true;
  gridInput.onchange=async()=>{const old=view.yearGrid;view.yearGrid=gridInput.checked;draw();gridInput.disabled=true;
    try{await saveView?.(view);}catch{view.yearGrid=old;gridInput.checked=old===true;draw();hint.textContent='Could not save year-line setting. Please try again.';}finally{gridInput.disabled=false;}
  };
  const observer=new ResizeObserver(()=>{if(Math.abs(scroll.clientWidth-lastWidth)>1)draw();});observer.observe(scroll);
  draw();
  return {destroy(){dead=true;disposePan();clearWheel();scroll.removeEventListener('wheel',onWheel);observer.disconnect();root.removeEventListener('keydown',onKey);toolbar.remove();root.remove();},setVisible(ids){visible=ids;draw();},zoomBy,fit};
}
