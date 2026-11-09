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
  half:number; initialHalf:number; terminal:boolean; clustered:boolean;
}
export interface Cluster {key:string; x:number; y:number; items:PlacedItem[];}
export interface RowLayout {items:PlacedItem[];lanes:Lane[];clusters:Cluster[];height:number;diagnostics:Diagnostic[];}
export interface LabelBox {key:string;x:number;y:number;width:number;height:number;text:string;sourceX:number;sourceY:number;leader:boolean;}
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
  let nextY=76;
  const assign=(p:PlacedItem):number=>{const cs=children(p);p.y=cs.length?cs.reduce((s,c)=>s+assign(c),0)/cs.length:nextY; if(!cs.length)nextY+=112;return p.y;};
  ordered(anchors.filter(p=>!parents.has(p))).forEach(assign);
  for(const a of anchors){
    const parent=parents.get(a),siblings=parent?children(parent):[],index=siblings.indexOf(a);
    a.laneId=a.key;a.initialHalf=parent?28/siblings.length:28;a.terminal=children(a).length===0;
    const origin=parent?parent.y-28+a.initialHalf+index*2*a.initialHalf:a.y;
    a.curve={start:a.x,settle:a.x+Math.min(110,(a.xEnd-a.x)*.45),origin,target:a.y,initialScale:a.initialHalf/a.half};
    lanes.push({id:a.key,title:a.record.title,y:a.y});
  }
  const independent=new Map<string,Lane>();
  const getLane=(key:string,title:string):Lane=>{let lane=independent.get(key);if(!lane){lane={id:key,title,y:nextY};nextY+=112;independent.set(key,lane);lanes.push(lane);}return lane;};
  // Stable layer IDs, not display order, determine the order of independent lanes.
  const ordinary=items.filter(i=>!i.isAnchor);
  for(const p of [...ordinary].sort((a,b)=>a.layer.id.localeCompare(b.layer.id)||chronological(a,b))){
    const binding=p.layer.attachment;
    if(binding){
      const peers=anchors.filter(a=>a.layer.id===binding.anchorLayer),rs=peers.map(a=>a.record);
      const override=binding.overrides[p.record.id];
      const refs=override?[override]:p.record.relations[binding.relationship]||[];
      const found=refs.map(ref=>resolveReference(ref,rs));const unique=[...new Set(found.filter(Boolean))];
      const anchor=unique.length===1&&!found.includes(undefined)?peers.find(a=>a.record===unique[0]):undefined;
      if(anchor){p.anchor=anchor.record;p.anchorKey=anchor.key;p.laneId=anchor.key;p.curve=anchor.curve;p.y=anchor.y;}
      else{const lane=getLane('unassigned','Unassigned');p.laneId=lane.id;p.y=lane.y;diagnostics.push({record:p.record,message:peers.length?'Missing or ambiguous anchor':'Anchor layer is missing, disabled, or empty'});}
    }else if(p.style==='band'){p.laneId='context';p.y=32;}
    else{const lane=getLane(`independent:${p.layer.id}`,p.layer.name);p.laneId=lane.id;p.y=lane.y;}
    if(!p.anchor)p.curve={start:p.x,settle:p.x,origin:p.y,target:p.y};
  }
  const maxTracks=row.maxSubtracks||3,ends=new Map<string,number[]>();
  for(const p of ordinary.sort(chronological)){
    if(p.style==='band')continue;
    const key=`${p.laneId}/${p.layer.plane}/${p.style==='dot'?'points':'durations'}`;
    const tracks=ends.get(key)||[];let track=tracks.findIndex(e=>e<=p.start);
    if(track<0)track=tracks.length;
    tracks[track]=Math.max(p.end,p.start+1e-8);ends.set(key,tracks);
    p.subtrack=track;p.clustered=track>=maxTracks;
    const visibleTrack=Math.min(track,maxTracks-1);
    const offset=p.style==='dot'?42:visibleTrack===0?0:(visibleTrack%2?-1:1)*Math.ceil(visibleTrack/2)*14;
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
  const height=Math.max(row.height,nextY===76?120:nextY-112+76);
  return {items,lanes,clusters,height,diagnostics};
}
/** Labels use separate callout slots. They never change historical geometry. */
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
    const sx=p.isAnchor?Math.min(p.xEnd-4,p.curve.settle+8):p.x+2;
    const sy=p.style==='band'?32:centerAt(p.curve,sx);
    const available=Math.max(34,p.xEnd-sx-8);
    const preferred=p.isAnchor?Math.min(260,available):Math.min(180,Math.max(50,available));
    const anchor=anchors.find(a=>a.key===p.anchorKey);
    // Keep callouts in their own kingdom's text rail, never in the other branch.
    const rail=anchor&&minAnchor!==maxAnchor&&anchor.y===minAnchor
      ? [anchor.y-72,anchor.y-54,anchor.y-36]
      : anchor&&minAnchor!==maxAnchor&&anchor.y===maxAnchor
        ? [anchor.y+34,anchor.y+52,anchor.y+70,anchor.y+88]
        : p.isAnchor?[sy,sy+18,sy-54,sy-70]
          : [sy-36,sy-54,sy-72,sy+10,sy+28,sy+46];
    let placed=false;
    for(const budget of [preferred,Math.min(preferred,70),34]){
      const name=truncate(p.record.title,Math.min(budget,width-12)),w=measure(name);
      const x=Math.max(4,Math.min(sx,width-w-4));
      for(const y of rail){
        if(y<4||y+15>height-4)continue;
        const box:LabelBox={key:p.key,x,y,width:w,height:15,text:name,sourceX:sx,sourceY:sy,leader:!p.isAnchor&&(Math.abs(y+12-sy)>22||Math.abs(x-sx)>5)};
        if(collision(box))continue;
        boxes.push(box);placed=true;break;
      }
      if(placed)break;
    }
    // Dense configurations still get an identifier in the remaining free text slots.
    if(!placed){
      const text=truncate(p.record.title,34),w=measure(text);
      outer:for(const y of rail.filter(y=>y>=4&&y+15<=height-4))for(const shift of [0,-16,16,-32,32,-48,48,-64,64]){const x=Math.max(4,Math.min(sx+shift,width-w-4));
        const b:LabelBox={key:p.key,x,y,width:w,height:15,text,sourceX:sx,sourceY:sy,leader:true};
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
