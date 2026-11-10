import type {TimelineRecord} from './types';
import type {TimelineRow,TimelineLayer,DisplayStyle} from './composition';
import {matches,styleFor} from './composition';
import {historicalDate} from './dates';

export interface Diagnostic {record:TimelineRecord; message:string;}
export interface Lane {id:string; title:string; y:number;}
export interface Curve {start:number; settle:number; origin:number; target:number; offset?:number; initialScale?:number;}
export interface PlacedItem {
  key:string; record:TimelineRecord; layer:TimelineLayer; style:DisplayStyle;
  start:number; end:number; x:number; xEnd:number; laneId:string; subtrack:number;
  y:number; curve:Curve; anchor?:TimelineRecord; anchorKey?:string; isAnchor:boolean;
  half:number; initialHalf:number; terminal:boolean; clustered:boolean; context?:boolean; integratedAnchors?:PlacedItem[];
}
export interface Cluster {key:string; x:number; y:number; items:PlacedItem[];}
export interface RowLayout {items:PlacedItem[];lanes:Lane[];clusters:Cluster[];height:number;diagnostics:Diagnostic[];}
export interface LabelBox {key:string;x:number;y:number;width:number;height:number;text:string;sourceX:number;sourceY:number;leader:boolean;kind:'anchor'|'record'|'context';}
const refName=(s:string)=>s.replace(/^\[\[|\]\]$/g,'').split('|')[0].replace(/\.md$/,'');
/** Resolve by identity first. A non-unique match is never silently selected. */
export function resolveReference(ref:string,records:TimelineRecord[]):TimelineRecord|undefined {
  const value=refName(ref);
  const groups=[records.filter(r=>r.id===value),records.filter(r=>r.path.replace(/\.md$/,'')===value),records.filter(r=>r.file.basename===value||(r.aliases||[]).includes(value))];
  for(const group of groups)if(group.length)return group.length===1?group[0]:undefined;
  return undefined;
}
export function centerAt(curve:Curve,x:number):number {
  const t=Math.max(0,Math.min(1,(x-curve.start)/Math.max(.00001,curve.settle-curve.start)));
  return curve.origin+(curve.target-curve.origin)*t*t*(3-2*t)+(curve.offset||0)*((curve.initialScale??1)+(1-(curve.initialScale??1))*t);
}
const chronological=(a:PlacedItem,b:PlacedItem)=>a.start-b.start||a.end-b.end||a.key.localeCompare(b.key);
export function layoutRow(row:TimelineRow,records:TimelineRecord[],bounds:{min:number;max:number},width:number,styles:Record<string,DisplayStyle>):RowLayout {
  const items:PlacedItem[]=[],diagnostics:Diagnostic[]=[],lanes:Lane[]=[];
  const x=(n:number)=>24+(n-bounds.min)/Math.max(1/366,bounds.max-bounds.min)*(width-48);
  const anchorLayers=new Set(row.layers.flatMap(l=>l.attachment?[l.attachment.anchorLayer]:[]));
  for(const layer of row.layers.filter(l=>l.enabled))for(const record of records.filter(r=>matches(r,layer))){
    const start=historicalDate(record.date.start),end=historicalDate(record.date.end||record.date.start);
    if(!Number.isFinite(start)||!Number.isFinite(end)||end<start){diagnostics.push({record,message:'Invalid or reversed date range'});continue;}
    const style=styleFor(record,layer,styles),isAnchor=!layer.attachment&&(style==='stream'||anchorLayers.has(layer.id));
    items.push({key:`${layer.id}/${record.id}`,record,layer,style,start,end,x:x(start),xEnd:x(end),laneId:'',subtrack:0,y:0,curve:{start:0,settle:0,origin:0,target:0},isAnchor,half:isAnchor?28:5,initialHalf:28,terminal:true,clustered:false});
  }
  items.sort(chronological);
  const anchors=items.filter(i=>i.isAnchor),parents=new Map<PlacedItem,PlacedItem>(),candidates=new Map<PlacedItem,Set<PlacedItem>>();
  const add=(child:PlacedItem,parent:PlacedItem)=>{if(!candidates.has(child))candidates.set(child,new Set());candidates.get(child)!.add(parent);};
  for(const a of anchors){
    const peers=anchors.filter(p=>p.layer.id===a.layer.id),rs=peers.map(p=>p.record);
    for(const ref of [...a.record.relations.preceded_by,...a.record.relations.continued_from]){const r=resolveReference(ref,rs),p=peers.find(p=>p.record===r);if(p)add(a,p);else diagnostics.push({record:a.record,message:`Unresolved predecessor: ${ref}`});}
    for(const ref of [...a.record.relations.succeeded_by,...a.record.relations.split_into]){const r=resolveReference(ref,rs),p=peers.find(p=>p.record===r);if(p)add(p,a);else diagnostics.push({record:a.record,message:`Unresolved successor: ${ref}`});}
  }
  for(const [child,ps]of candidates){if(ps.size===1)parents.set(child,[...ps][0]);else diagnostics.push({record:child.record,message:'Conflicting parents; placed independently'});}
  const cyclic=new Set<PlacedItem>();
  for(const start of anchors){const chain:PlacedItem[]=[];let node:PlacedItem|undefined=start;while(node){const at=chain.indexOf(node);if(at!==-1){chain.slice(at).forEach(p=>cyclic.add(p));break;}chain.push(node);node=parents.get(node);}}
  for(const node of cyclic){parents.delete(node);diagnostics.push({record:node.record,message:'Cyclic succession; placed independently'});}
  for(const [child,parent]of parents)if(parent.end!==child.start||parent.start>=child.start){parents.delete(child);diagnostics.push({record:child.record,message:'Succession dates do not meet; placed independently'});}
  const ordered=(list:PlacedItem[])=>list.sort((a,b)=>{const rank=(p:PlacedItem)=>{const n=(row.anchorOrder||[]).indexOf(p.record.id);return n<0?Number.MAX_SAFE_INTEGER:n;};return rank(a)-rank(b)||chronological(a,b);});
  const children=(p:PlacedItem)=>ordered(anchors.filter(c=>parents.get(c)===p));
  // Fixed screen-space rails leave room for names, without creating historical lanes.
  let nextY=134;
  const assign=(p:PlacedItem):number=>{const cs=children(p);p.y=cs.length?cs.reduce((s,c)=>s+assign(c),0)/cs.length:nextY; if(!cs.length)nextY+=192;return p.y;};
  ordered(anchors.filter(p=>!parents.has(p))).forEach(assign);
  for(const a of anchors){
    const parent=parents.get(a),siblings=parent?children(parent):[],index=siblings.indexOf(a);
    a.laneId=a.key;a.initialHalf=parent?28/siblings.length:28;a.terminal=children(a).length===0;
    const origin=parent?parent.y-28+a.initialHalf+index*2*a.initialHalf:a.y;
    a.curve={start:a.x,settle:a.x+Math.min(110,(a.xEnd-a.x)*.45),origin,target:a.y,initialScale:a.initialHalf/a.half};
    lanes.push({id:a.key,title:a.record.title,y:a.y});
  }
  const independent=new Map<string,Lane>();
  const getLane=(key:string,title:string):Lane=>{let lane=independent.get(key);if(!lane){lane={id:key,title,y:nextY};nextY+=192;independent.set(key,lane);lanes.push(lane);}return lane;};
  // Stable layer IDs, not display order, determine the order of independent lanes.
  const ordinary=items.filter(i=>!i.isAnchor);
  for(const p of [...ordinary].sort((a,b)=>a.layer.id.localeCompare(b.layer.id)||chronological(a,b))){
    if(p.style==='band'&&p.layer.bandPlacement==='integrated'){
      const binding=p.layer.attachment,peers=anchors.filter(a=>!binding||a.layer.id===binding.anchorLayer),rs=peers.map(a=>a.record);
      const override=binding?.overrides[p.record.id];
      const refs=override?[override]:p.record.relations[binding?.relationship||'related_to']||[];
      for(const ref of refs)if(!resolveReference(ref,rs)){
        const v=refName(ref),ambiguous=rs.filter(r=>r.id===v||r.path.replace(/\.md$/,'')===v||r.file.basename===v||(r.aliases||[]).includes(v)).length>1;
        if(ambiguous)diagnostics.push({record:p.record,message:`Ambiguous integrated stream reference: ${ref}`});
        else if(!resolveReference(ref,records))diagnostics.push({record:p.record,message:`Unresolved integrated stream reference: ${ref}`});
      }
      const resolved=[...new Set(refs.map(ref=>resolveReference(ref,rs)).filter(Boolean))];
      const targets=peers.filter(a=>resolved.includes(a.record)&&p.end>=a.start);
      if(targets.length){
        p.integratedAnchors=ordered(targets);const first=p.integratedAnchors[0];
        p.anchor=first.record;p.anchorKey=first.key;p.laneId=first.key;p.y=first.y;p.curve=first.curve;
        // The source kingdom still ends at its recorded date. Its adjacent context
        // continues with a visibly different, dashed treatment, not another kingdom.
        for(const a of targets)if(p.start<=a.end&&p.end>a.end)a.terminal=false;
        continue;
      }
      diagnostics.push({record:p.record,message:'Integrated band needs an explicit reference to an available stream; shown in context strip'});
      p.context=true;continue;
    }
    // A context strip describes time across the row; it is not a single-anchor claim.
    if(p.style==='band'&&p.layer.bandPlacement!=='lane'){p.context=true;continue;}
    const binding=p.layer.attachment;
    if(binding){
      const peers=anchors.filter(a=>a.layer.id===binding.anchorLayer),rs=peers.map(a=>a.record);
      const override=binding.overrides[p.record.id];
      const refs=override?[override]:p.record.relations[binding.relationship]||[];
      const found=refs.map(ref=>resolveReference(ref,rs));const unique=[...new Set(found.filter(Boolean))];
      // Extra links to eras, events, etc. must not invalidate one explicit kingdom link.
      // A basename ambiguous among anchor records still invalidates the binding.
      const ambiguous=refs.some(ref=>{const v=refName(ref);return !resolveReference(ref,rs)&&rs.filter(r=>r.id===v||r.path.replace(/\.md$/,'')===v||r.file.basename===v||(r.aliases||[]).includes(v)).length>1;});
      const anchor=unique.length===1&&!ambiguous?peers.find(a=>a.record===unique[0]):undefined;
      if(anchor){p.anchor=anchor.record;p.anchorKey=anchor.key;p.laneId=anchor.key;p.curve=anchor.curve;p.y=anchor.y;}
      else{const lane=getLane('unassigned','Unassigned');p.laneId=lane.id;p.y=lane.y;diagnostics.push({record:p.record,message:peers.length?'Missing or ambiguous anchor':'Anchor layer is missing, disabled, or empty'});}
    }else{const lane=getLane(`independent:${p.layer.id}`,p.layer.name);p.laneId=lane.id;p.y=lane.y;}
    if(!p.anchor)p.curve={start:p.x,settle:p.x,origin:p.y,target:p.y};
  }
  const contexts=new Map<string,number>();
  const contextTop=Math.max(152,nextY-192+152);
  for(const p of ordinary.filter(p=>p.context)){
    if(!contexts.has(p.layer.id))contexts.set(p.layer.id,contextTop+contexts.size*48);
    p.laneId=`context:${p.layer.id}`;p.y=contexts.get(p.layer.id)!;
    p.curve={start:p.x,settle:p.x,origin:p.y,target:p.y};
  }
  const maxTracks=row.maxSubtracks||3,ends=new Map<string,number[]>();
  for(const p of ordinary.sort(chronological)){
    if(p.style==='band')continue;
    const key=`${p.laneId}/${p.layer.plane}/${p.style==='dot'?'points':'durations'}`;
    const tracks=ends.get(key)||[];
    // An instant (including a year-only start=end record) has no duration to reserve.
    // Reserving an artificial epsilon here displaced the entire following reign.
    const instant=p.start===p.end||p.style==='dot';
    let track=instant?0:tracks.findIndex(e=>e<=p.start);
    if(track<0)track=tracks.length;
    if(!instant){tracks[track]=p.end;ends.set(key,tracks);}
    p.subtrack=track;p.clustered=track>=maxTracks;
    const visibleTrack=Math.min(track,maxTracks-1);
    const spacing=Math.min(10,20/Math.max(1,Math.ceil((maxTracks-1)/2)));
    const offset=p.style==='dot'?0:visibleTrack===0?0:(visibleTrack%2?-1:1)*Math.ceil(visibleTrack/2)*spacing;
    p.curve={...p.curve,offset,initialScale:p.style==='dot'?1:p.curve.initialScale};p.y+=offset;
  }
  // Clusters are hit-target groups, never discarded records. Geometry above remains stable.
  const clusters:Cluster[]=[];
  const clusterGroups=new Map<string,PlacedItem[]>();
  for(const p of ordinary.filter(p=>p.style!=='band')){
    if(p.style!=='dot'&&!p.clustered&&p.xEnd-p.x>=12)continue;
    const key=`${p.laneId}/${p.style==='dot'?'points':'small'}`;
    const list=clusterGroups.get(key)||[];list.push(p);clusterGroups.set(key,list);
  }
  for(const group of clusterGroups.values()){
    const sorted=group.sort((a,b)=>a.x-b.x);let bucket:PlacedItem[]=[];
    const flush=()=>{if(bucket.length>1||bucket[0]?.clustered){bucket.forEach(p=>p.clustered=true);const first=bucket[0];clusters.push({key:`cluster:${first.key}`,x:first.x,y:centerAt(first.curve,first.x),items:[...bucket]});}bucket=[];};
    for(const p of sorted){if(bucket.length&&p.x-bucket[0].x>32)flush();bucket.push(p);}flush();
  }
  const height=Math.max(row.height,nextY===134?160:nextY-192+138,contexts.size?contextTop+(contexts.size-1)*48+32:0);
  return {items,lanes,clusters,height,diagnostics};
}
/** Fixed name rails and orthogonal leaders never change historical geometry. */
export function placeLabels(items:PlacedItem[],width:number,measure:(text:string)=>number,height=300):LabelBox[]{
  const boxes:LabelBox[]=[];
  const anchors=items.filter(p=>p.isAnchor);
  const minAnchor=Math.min(...anchors.map(p=>p.y)),maxAnchor=Math.max(...anchors.map(p=>p.y));
  const truncate=(s:string,w:number):string=>{
    if(measure(s)<=w)return s;
    let n=s.length;while(n>1&&measure(s.slice(0,n)+'…')>w)n--;
    return s.slice(0,n)+'…';
  };
  const collision=(b:LabelBox)=>boxes.some(a=>b.x<a.x+a.width+6&&b.x+b.width+6>a.x&&b.y<a.y+a.height+3&&b.y+b.height+3>a.y);
  for(const p of [...items].sort((a,b)=>Number(b.isAnchor)-Number(a.isAnchor)||chronological(a,b))){
    if(!['adaptive','always'].includes(p.layer.labels))continue;
    const sx=p.isAnchor?Math.min(p.xEnd-4,p.curve.settle+10):p.x+2;
    const sy=centerAt(p.curve,sx);
    const available=Math.max(28,p.xEnd-sx-8);
    const preferred=p.isAnchor||p.integratedAnchors?.length?Math.min(340,available):Math.min(170,Math.max(60,available));
    const anchor=anchors.find(a=>a.key===p.anchorKey);
    // Keep callouts in their own kingdom's text rail, never in the other branch.
    const rail=p.integratedAnchors?.length?[sy+9,sy-22]
      : p.context?[p.y-7]
      : anchor&&minAnchor!==maxAnchor&&anchor.y===minAnchor
      ? [anchor.y-54,anchor.y-76,anchor.y-98,anchor.y-120]
      : anchor&&minAnchor!==maxAnchor&&anchor.y===maxAnchor
        ? [anchor.y+40,anchor.y+62,anchor.y+84,anchor.y+106]
        : p.isAnchor?[sy+9]
          : [sy-54,sy-76,sy-98,sy-120];
    const kind=p.isAnchor?'anchor':p.context||p.integratedAnchors?.length?'context':'record';
    let placed=false;
    for(const budget of [preferred,Math.min(preferred,100),Math.min(preferred,68),40,34]){
      const name=truncate(p.record.title,Math.min(budget,width-12)),w=measure(name);
      const starts=[sx];
      // Names may use space along their actual duration, never an unrelated date lane.
      if(!p.isAnchor&&!p.context)for(let dx=18;dx<=Math.min(100,Math.max(18,p.xEnd-sx));dx+=18)starts.push(sx+dx);
      search:for(const x0 of starts)for(const y of rail){
        const x=Math.max(4,Math.min(x0,width-w-4));
        if(y<4||y+15>height-4)continue;
        const box:LabelBox={key:p.key,x,y,width:w,height:15,text:name,sourceX:sx,sourceY:sy,leader:kind==='record',kind};
        if(collision(box))continue;
        boxes.push(box);placed=true;break search;
      }
      if(placed)break;
    }
    // Dense configurations still get an identifier in the remaining free text slots.
    if(!placed){
      const text=truncate(p.record.title,34),w=measure(text);
      outer:for(const y of rail.filter(y=>y>=4&&y+15<=height-4))for(const shift of [0,-18,18,-36,36,-54,54,-72,72,-90,90]){const x=Math.max(4,Math.min(sx+shift,width-w-4));
        const b:LabelBox={key:p.key,x,y,width:w,height:15,text,sourceX:sx,sourceY:sy,leader:kind==='record',kind};
        if(!collision(b)){boxes.push(b);break outer;}
      }
    }
  }
  return boxes;
}
/** Piecewise exact cubic interpolation. Shared curves have identical geometry at every zoom. */
function cubicSection(from:number,to:number,f:(x:number)=>number):string {
  const d=to-from,a=f(from),b=f(from+d/3),c=f(from+2*d/3),e=f(to);
  const c1=3*b-1.5*c-5*a/6+e/3,c2=3*c-1.5*b+a/3-5*e/6;
  return `C ${from+d/3},${c1} ${from+2*d/3},${c2} ${to},${e}`;
}
export function halfAt(p:PlacedItem,x:number):number {
  if(!p.isAnchor){const t=Math.max(0,Math.min(1,(x-p.curve.start)/Math.max(.001,p.curve.settle-p.curve.start)));return p.half*(p.anchor?(p.curve.initialScale??1)+(1-(p.curve.initialScale??1))*t:1);}
  const t=Math.max(0,Math.min(1,(x-p.x)/Math.max(.001,p.curve.settle-p.x)));
  let half=p.initialHalf+(p.half-p.initialHalf)*t;
  if(p.terminal)half*=Math.max(0,Math.min(1,(p.xEnd-x)/Math.max(.001,Math.min(30,(p.xEnd-p.x)*.2))));
  return half;
}
export function curvePath(p:PlacedItem,edge=0):string {
  const breaks=[p.x,p.xEnd,p.curve.start,p.curve.settle,p.xEnd-Math.min(30,(p.xEnd-p.x)*.2)]
    .filter(x=>x>=p.x&&x<=p.xEnd).sort((a,b)=>a-b).filter((x,i,a)=>i===0||x!==a[i-1]);
  const fn=(x:number)=>centerAt(p.curve,x)+edge*halfAt(p,x);
  return `M ${breaks[0]},${fn(breaks[0])} `+breaks.slice(1).map((x,i)=>cubicSection(breaks[i],x,fn)).join(' ');
}
export function ribbonPath(p:PlacedItem):string {
  const breaks=[p.x,p.xEnd,p.curve.start,p.curve.settle,p.xEnd-Math.min(30,(p.xEnd-p.x)*.2)]
    .filter(x=>x>=p.x&&x<=p.xEnd).sort((a,b)=>a-b).filter((x,i,a)=>i===0||x!==a[i-1]).reverse();
  const lower=(x:number)=>centerAt(p.curve,x)+halfAt(p,x);
  return curvePath(p,-1)+` L ${p.xEnd},${lower(p.xEnd)} `+breaks.slice(1).map((x,i)=>cubicSection(breaks[i],x,lower)).join(' ')+' Z';
}

export interface IntegratedBandSegment {anchor:PlacedItem;kind:'overlay'|'continuation';path:string;from:number;to:number;}
/** A context reuses the exact stream contour. It never lengthens a source record. */
export function integratedBandSegments(band:PlacedItem):IntegratedBandSegment[]{
  const result:IntegratedBandSegment[]=[];
  for(const anchor of band.integratedAnchors||[]){
    const from=Math.max(band.x,anchor.x),to=Math.min(band.xEnd,anchor.xEnd);
    if(to>from)result.push({anchor,kind:'overlay',path:ribbonPath(anchor),from,to});
    const tailStart=Math.max(band.x,anchor.xEnd);
    if(band.xEnd>tailStart){
      const y=centerAt(anchor.curve,anchor.xEnd);
      const tail:PlacedItem={...band,integratedAnchors:undefined,x:tailStart,xEnd:band.xEnd,isAnchor:true,half:anchor.half,initialHalf:anchor.half,terminal:true,curve:{start:tailStart,settle:tailStart,origin:y,target:y}};
      result.push({anchor,kind:'continuation',path:ribbonPath(tail),from:tailStart,to:band.xEnd});
    }
  }
  return result;
}
