import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function module(path){const out=await build({entryPoints:[path],bundle:true,write:false,format:'esm'});return import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));}
const {defaults,normalizeComposition,newLayer,newRow,reorder,matches,styleFor,contrastText}=await module('src/composition.ts');
const {layoutRow,resolveReference,placeLabels,centerAt,curvePath,ribbonPath,integratedBandSegments,categoryHalf,isInstantItem,diamondPath}=await module('src/layout.ts');
const {historicalDate,formatTime,timeTicks}=await module('src/dates.ts');
const {relations}=await module('src/utils.ts');
assert.equal(historicalDate('930 BC'),-929);assert.equal(historicalDate('1 BC'),0);assert.equal(historicalDate('AD 1'),1);
assert.equal(historicalDate('0001-01-01'),1);assert.ok(historicalDate('2024-02-29')<historicalDate('2024-03-01'));
assert.ok(Number.isNaN(historicalDate('2023-02-29')));assert.ok(Number.isNaN(historicalDate('garbage')));assert.ok(Number.isNaN(historicalDate('0 AD')));
assert.equal(formatTime(0),'1 BC');assert.equal(formatTime(1),'AD 1');assert.equal(historicalDate('circa 930 BC'),-929);
assert.deepEqual(timeTicks(-1049,-538,1200).map(t=>formatTime(t)),['1000 BC','900 BC','800 BC','700 BC','600 BC']);
assert.ok(timeTicks(-4,4,1000).every(t=>!formatTime(t).includes('AD 0')));
assert.deepEqual(relations({relations:{related_to:['[[K]]']},related_to:['[[L]]']}).related_to,['K','L']);
assert.equal(contrastText('#72b7b1'),'#000000');assert.equal(contrastText('#b998c9'),'#000000');assert.equal(contrastText('#111111'),'#ffffff');
const config=defaults();assert.equal(config.version,2);assert.deepEqual(JSON.parse(JSON.stringify(normalizeComposition(config))),JSON.parse(JSON.stringify(config)));
const v1=JSON.parse(JSON.stringify(config));v1.version=1;delete v1.views[0].rows[0].anchorOrder;delete v1.views[0].rows[0].maxSubtracks;
const gridConfig=JSON.parse(JSON.stringify(config));gridConfig.views[0].yearGrid=true;
assert.equal(normalizeComposition(gridConfig).views[0].yearGrid,true);
gridConfig.views[0].yearGrid='true';assert.equal(normalizeComposition(gridConfig).views[0].yearGrid,false);
assert.equal(normalizeComposition(config).views[0].yearGrid,undefined,'Existing views keep grid off until enabled');
const upgraded=normalizeComposition(v1);assert.equal(upgraded.version,2);assert.equal(upgraded.views[0].id,v1.views[0].id);assert.equal(upgraded.views[0].rows[0].maxSubtracks,3);
const rel=()=>({preceded_by:[],continued_from:[],split_into:[],succeeded_by:[],merged_into:[],related_to:[],contemporary_with:[]});
const record=(id,type,start,end,links={})=>({id,title:id,type:'visual-timeline-'+type,path:id+'.md',file:{basename:id},categories:[type],tags:['#history'],aliases:[],date:{start,end},relations:{...rel(),...links}});
const a=record('A','kingdom','1000 BC','900 BC',{split_into:['B','C']}),b=record('B','kingdom','900 BC','700 BC'),c=record('C','kingdom','900 BC','600 BC');
const king=record('King','person','950 BC','920 BC',{related_to:['A']});
const anchors=newLayer('Kingdoms','kingdom');anchors.id='anchors';anchors.style='stream';anchors.plane='background';
const rulers=newLayer('Rulers','person');rulers.id='rulers';rulers.style='box';rulers.attachment={anchorLayer:'anchors',relationship:'related_to',overrides:{}};
const row=newRow('History',[anchors,rulers]);row.anchorOrder=['A','B','C'];const records=[a,b,c,king],bounds={min:-999,max:-599};
const layout=layoutRow(row,records,bounds,1000,{}),get=(l,id)=>l.items.find(p=>p.record.id===id);
assert.equal(get(layout,'King').anchor.id,'A');assert.equal(get(layout,'King').laneId,'anchors/A');
assert.equal(get(layout,'A').y,(get(layout,'B').y+get(layout,'C').y)/2);
const changed=records.map(r=>({...r,title:r.title.repeat(80)}));const long=layoutRow(row,changed,bounds,1000,{});
assert.deepEqual(layout.items.map(p=>[p.laneId,p.subtrack,p.y]),long.items.map(p=>[p.laneId,p.subtrack,p.y]));
const wide=layoutRow(row,records,bounds,3000,{});assert.equal(wide.height,layout.height);assert.deepEqual(wide.items.map(p=>p.y),layout.items.map(p=>p.y));
const reversed=layoutRow({...row,layers:[rulers,anchors]},records,bounds,1000,{});assert.deepEqual(layout.items.map(p=>[p.key,p.y]),reversed.items.map(p=>[p.key,p.y]));
const curveKing=record('CurveKing','person','900 BC','850 BC',{related_to:['B']});const curved=layoutRow(row,[...records,curveKing],bounds,1000,{});const cp=get(curved,'CurveKing'),ap=get(curved,'B');assert.equal(centerAt(cp.curve,cp.x)-centerAt(ap.curve,cp.x),0);
const labelBoxes=placeLabels(layout.items,1000,s=>s.length*7);for(const l of labelBoxes){assert.ok(l.x>=0&&l.x+l.width<=1000);}
const alias={...a,aliases:['Alias']};assert.equal(resolveReference('Alias',[alias]),alias);assert.equal(resolveReference('A.md',[alias]),alias);assert.equal(resolveReference('A',[alias,{...a,path:'other/A.md'}]),undefined);
assert.equal(resolveReference('missing',records),undefined);
const missing=record('Missing','person','950 BC','920 BC',{related_to:['no-such-anchor']});assert.equal(get(layoutRow(row,[...records,missing],bounds,1000,{}),'Missing').laneId,'unassigned');
rulers.attachment.overrides.Missing='A';assert.equal(get(layoutRow(row,[...records,missing],bounds,1000,{}),'Missing').anchor.id,'A');delete rulers.attachment.overrides.Missing;
const many=Array.from({length:12},(_,i)=>record('Co'+i,'person','950 BC','920 BC',{related_to:['A']}));const crowded=layoutRow(row,[a,b,c,...many],bounds,1000,{});
assert.ok(crowded.clusters.length);const accessible=new Set([...crowded.items.filter(i=>!i.clustered).map(i=>i.key),...crowded.clusters.flatMap(c=>c.items.map(i=>i.key))]);assert.equal(accessible.size,crowded.items.length);
const cyclic=layoutRow(newRow('Cycle',[anchors]),[{...a,relations:{...rel(),split_into:['B']}},{...b,relations:{...rel(),split_into:['A']}}],bounds,1000,{});assert.ok(cyclic.diagnostics.some(d=>d.message.includes('Cyclic')));
const conflict=layoutRow(row,[a,{...b,relations:{...rel(),preceded_by:['A','C']}},c],bounds,1000,{});assert.ok(conflict.diagnostics.some(d=>d.message.includes('Conflicting')));
const invalid=layoutRow(row,[{...king,date:{start:'bad'}},{...a,date:{start:'800 BC',end:'900 BC'}}],bounds,1000,{});assert.equal(invalid.items.length,0);assert.equal(invalid.diagnostics.length,2);
const l=newLayer();l.tags=['history'];assert.ok(matches(a,l));l.categories=['person'];assert.ok(!matches(a,l));l.style='line';assert.equal(styleFor(a,l,{kingdom:'box'}),'line');
const order=['a','b','c'];reorder(order,2,0);assert.deepEqual(order,['c','a','b']);
console.log('Validated v2 compatibility, date precision, explicit anchors, stable geometry, label isolation, overlap/cluster coverage, and diagnostics.');
// Long anchors and short attached spans must render the same exact curve, not different sampling densities.
for(const span of [200,10000]){
  const p={...get(layout,'King'),x:0,xEnd:span,curve:{start:0,settle:110,origin:132,target:76,offset:-14,initialScale:.5}};
  const d=curvePath(p);let x0=0,y0=centerAt(p.curve,0);
  for(const m of d.matchAll(/C ([^ ]+) ([^ ]+) ([^ ]+)/g)){
    const [x1,y1]=m[1].split(',').map(Number),[x2,y2]=m[2].split(',').map(Number),[x3,y3]=m[3].split(',').map(Number),t=.37,u=1-t;
    const xx=u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3,yy=u*u*u*y0+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
    assert.ok(Math.abs(yy-centerAt(p.curve,xx))<1e-8,'Exact curve must not drift with item length');x0=x3;y0=y3;
  }
}
const names=placeLabels(crowded.items,1000,s=>s.length*7,crowded.height);
assert.equal(names.length,crowded.items.length,'Clustered short items must still have name labels');
assert.ok(names.every(n=>n.text.length&&n.x>=0&&n.x+n.width<=1000));
const nameLayer=newLayer('Events','person');nameLayer.style='dot';
const narrowEvent={...record('Event','person','930 BC','928 BC'),title:'The Community at Jerusalem'};
const nameLayout=layoutRow(newRow('Names',[nameLayer]),[narrowEvent],bounds,1000,{});
const fullName=placeLabels(nameLayout.items,1000,s=>s.length*8,nameLayout.height);
assert.equal(fullName[0].text,narrowEvent.title,'Use the complete title when any collision-free rail slot can fit it, even when the dated span is short');
const longEvent={...narrowEvent,title:'The Apostolic Community at Jerusalem'};
const longLayout=layoutRow(newRow('Names',[nameLayer]),[longEvent],bounds,1000,{});
const croppedName=placeLabels(longLayout.items,110,s=>s.length*7,longLayout.height);
assert.equal(croppedName[0].text,'The Apostolic…','Fallback truncation retains complete words before the ellipsis');
// Same-year markers must not displace subsequent durations; actual overlaps still do.
for(const [label,date,end]of [['Northern succession','885 BC','874 BC'],['Judah succession','841 BC','835 BC'],['Day boundary','0900-01-02','0900-01-03']]){
  const marker=record(label+' marker','person',date,date,{related_to:['A']}),successor=record(label+' successor','person',date,end,{related_to:['A']});
  for(const input of [[marker,successor],[successor,marker]]){
    const result=layoutRow(row,[a,...input],bounds,1000,{});
    assert.equal(get(result,marker.id).subtrack,0);
    assert.equal(get(result,successor.id).subtrack,0,'Zero-duration marker cannot reserve the center track');
    assert.equal(get(result,successor.id).curve.offset,0);
  }
}
const overlapA=record('Overlap A','person','950 BC','920 BC',{related_to:['A']}),overlapB=record('Overlap B','person','940 BC','930 BC',{related_to:['A']});
const overlapping=layoutRow(row,[a,overlapA,overlapB],bounds,1000,{});
assert.notEqual(get(overlapping,overlapA.id).subtrack,get(overlapping,overlapB.id).subtrack,'True duration overlap must retain separate tracks');
const ending=record('Ending','person','950 BC','940 BC',{related_to:['A']}),next=record('Next','person','940 BC','930 BC',{related_to:['A']});
const adjacent=layoutRow(row,[a,ending,next],bounds,1000,{});
assert.equal(get(adjacent,next.id).subtrack,0,'Touching duration boundaries are not overlaps');
const extra=record('Extra references','event','900 BC','900 BC',{related_to:['B','Some era outside the anchor layer']});
const events=newLayer('Events','event');events.style='dot';events.attachment={anchorLayer:'anchors',relationship:'related_to',overrides:{}};
assert.equal(get(layoutRow({...row,layers:[anchors,rulers,events]},[...records,extra],bounds,1000,{}),extra.id).anchor.id,'B','An unrelated era reference cannot invalidate one kingdom anchor');
const era=record('Era','era','900 BC','600 BC',{related_to:['B','C']});const band=newLayer('Context','era');band.style='band';band.attachment={anchorLayer:'anchors',relationship:'related_to',overrides:{}};
const withContext=layoutRow({...row,layers:[...row.layers,band]},[...records,era],bounds,1000,{});
assert.equal(get(withContext,'Era').context,true);assert.equal(withContext.diagnostics.length,0,'Row context does not claim one kingdom anchor');
assert.ok(get(withContext,'Era').y>Math.max(...withContext.items.filter(p=>p.isAnchor).map(p=>p.y)));
band.bandPlacement='lane';const laneBand=layoutRow({...row,layers:[...row.layers,band]},[...records,era],bounds,1000,{});
assert.ok(laneBand.diagnostics.some(d=>d.record.id==='Era'),'A lane band with two anchors remains explicitly ambiguous');
const custom=defaults();custom.views[0].rows[0].layers[0].tintFromAttached=true;custom.views[0].rows[0].layers[0].bandPlacement='lane';
assert.equal(normalizeComposition(custom).views[0].rows[0].layers[0].tintFromAttached,true);
assert.equal(normalizeComposition(custom).views[0].rows[0].layers[0].bandPlacement,'lane');
assert.ok(names.every(b=>b.kind&&Number.isFinite(b.sourceY)));
// Integrated context follows explicit streams, including multiple related anchors.
const integratedBand={...band,bandPlacement:'integrated'};
const allWithEra=[...records,era],snapshot=JSON.stringify(allWithEra);
const integrated=layoutRow({...row,layers:[...row.layers,integratedBand]},allWithEra,bounds,1000,{});
const eraItem=get(integrated,'Era'),parts=integratedBandSegments(eraItem);
assert.deepEqual(eraItem.integratedAnchors.map(p=>p.record.id),['B','C']);
assert.equal(eraItem.context,undefined,'An integrated band must not allocate a separate strip');
assert.equal(integrated.diagnostics.length,0);
assert.ok(integrated.height<withContext.height);
assert.equal(get(integrated,'B').xEnd,get(layout,'B').xEnd,'Context does not lengthen the source kingdom');
assert.equal(parts.length,2,'One era is represented once for each explicitly related stream');
for(const part of parts){
  assert.equal(part.kind,'category');
  assert.equal(part.from,Math.max(eraItem.x,part.anchor.x));
  assert.equal(part.to,eraItem.xEnd,'The category retains its own recorded endpoint');
  assert.ok(categoryHalf(eraItem,part.anchor)>part.anchor.half,'Category is taller vertically than the stream');
}
const contourLayer={...integratedBand,bandShape:'contour'};
const contour=layoutRow({...row,layers:[...row.layers,contourLayer]},allWithEra,bounds,1000,{});
const contourParts=integratedBandSegments(get(contour,'Era'));
assert.equal(contourParts.find(p=>p.kind==='overlay'&&p.anchor.record.id==='B').path,ribbonPath(get(contour,'B')),'Optional contour mode retains exact stream tint geometry');
assert.ok(contourParts.some(p=>p.kind==='continuation'&&p.from===get(contour,'B').xEnd&&p.to===get(contour,'Era').xEnd));
assert.equal(JSON.stringify(allWithEra),snapshot,'Layout must not mutate dates, references or records');
const missingContext={...era,relations:{...rel(),related_to:['not-an-anchor']}};
const missingIntegrated=layoutRow({...row,layers:[...row.layers,integratedBand]},[...records,missingContext],bounds,1000,{});
assert.equal(get(missingIntegrated,'Era').context,true);assert.ok(missingIntegrated.diagnostics.some(d=>d.message.includes('explicit reference')));
const savedIntegrated=defaults();savedIntegrated.views[0].rows[0].layers[0].bandPlacement='integrated';
assert.equal(normalizeComposition(savedIntegrated).views[0].rows[0].layers[0].bandPlacement,'integrated');
const ambiguousStreams=[{...b,id:'D',path:'one/Shared.md',file:{basename:'Shared'}},{...c,id:'E',path:'two/Shared.md',file:{basename:'Shared'}}];
const mixedEra={...era,relations:{...rel(),related_to:['A','Shared']}};
const mixedIntegrated=layoutRow({...row,layers:[...row.layers,integratedBand]},[a,...ambiguousStreams,mixedEra],bounds,1000,{});
assert.deepEqual(get(mixedIntegrated,'Era').integratedAnchors.map(p=>p.record.id),['A'],'Valid explicit targets still render');
assert.ok(mixedIntegrated.diagnostics.some(d=>d.message.includes('Ambiguous integrated stream reference')),'Mixed valid and ambiguous references cannot silently lose intended streams');
const partialEra={...era,relations:{...rel(),related_to:['A','missing-stream']}};
assert.ok(layoutRow({...row,layers:[...row.layers,integratedBand]},[a,partialEra],bounds,1000,{}).diagnostics.some(d=>d.message.includes('Unresolved integrated stream reference')));
// Category boxes, streams and individual bars have independent pixel heights.
assert.equal(get(layout,'A').half*2,40);assert.equal(get(layout,'King').half*2,14);
assert.equal(eraItem.half*2,88);
const lateEra=record('Late era','era','800 BC','550 BC',{related_to:['B','C']});
const lateLayout=layoutRow({...row,layers:[...row.layers,integratedBand]},[...records,lateEra],{min:-999,max:-549},1000,{});
const lateItem=get(lateLayout,'Late era'),lateParts=integratedBandSegments(lateItem);
for(const part of lateParts){
  assert.ok(part.rect,'A category in a settled lane is a box, not a stream ribbon');
  assert.equal(part.rect.height,88);assert.equal(part.rect.y+part.rect.height/2,centerAt(part.anchor.curve,part.from));
  assert.equal(part.rect.x,lateItem.x);assert.equal(part.rect.width,lateItem.xEnd-lateItem.x);
  assert.ok(part.to>part.anchor.xEnd,'Category continues without lengthening its source stream');
}
const zoomed=layoutRow({...row,layers:[...row.layers,integratedBand]},[...records,lateEra],{min:-999,max:-549},4000,{});
assert.deepEqual(integratedBandSegments(get(zoomed,'Late era')).map(p=>[p.rect.height,p.rect.y]),lateParts.map(p=>[p.rect.height,p.rect.y]),'Zoom never stretches category height or changes its lane');
const oversizedStream={...anchors,height:120},smallCategory={...integratedBand,height:8};
const resized=layoutRow({...row,layers:[oversizedStream,rulers,smallCategory]},[...records,lateEra],{min:-999,max:-549},1000,{});
assert.ok(integratedBandSegments(get(resized,'Late era')).every(s=>s.rect.height===144),'Custom categories retain 12px clearance above and below a taller stream');
const customized=defaults();customized.views[0].rows[0].layers[0].height=72;customized.views[0].rows[0].layers[0].bandShape='contour';
const normalized=normalizeComposition(customized).views[0].rows[0].layers[0];assert.equal(normalized.height,72);assert.equal(normalized.bandShape,'contour');
customized.views[0].rows[0].layers[0].height=Infinity;assert.equal(normalizeComposition(customized).views[0].rows[0].layers[0].height,undefined);
customized.views[0].rows[0].layers[0].height=900;assert.equal(normalizeComposition(customized).views[0].rows[0].layers[0].height,240);
customized.views[0].rows[0].layers[0].height=1;assert.equal(normalizeComposition(customized).views[0].rows[0].layers[0].height,8);
console.log('Validated independent category/stream/item heights, shared centerlines, category dates, zoom invariance, custom bounds and optional contour compatibility.');
// Instant markers are symbols, not duration reservations or shifted dates.
const pointA=record('Point A','person','753 BC','753 BC',{related_to:['B']}),pointB=record('Point B','person','752 BC','752 BC',{related_to:['B']});
const nextRuler=record('Next ruler','person','752 BC','742 BC',{related_to:['B']});
const pointRecords=[a,b,c,pointA,pointB,nextRuler],pointSnapshot=JSON.stringify(pointRecords);
const points=layoutRow(row,pointRecords,bounds,1000,{});
const pa=get(points,'Point A'),pb=get(points,'Point B');
assert.ok(isInstantItem(pa)&&isInstantItem(pb));assert.equal(pa.x,pa.xEnd);assert.equal(pb.x,pb.xEnd);
assert.ok(!pa.clustered&&!pb.clustered,'Nearby point records remain individually visible as diamonds');
assert.equal(Math.abs((centerAt(pa.curve,pa.x)+pa.markerOffset)-(centerAt(pb.curve,pb.x)+pb.markerOffset)),20,'Crowded markers separate vertically, not in time');
assert.equal(pa.markerHitHeight,20);assert.equal(pb.markerHitHeight,20,'Crowded touch areas cannot silently overlap');
assert.equal(get(points,'Next ruler').subtrack,0);assert.equal(pa.x,24+(historicalDate('753 BC')-bounds.min)/(bounds.max-bounds.min)*952);
assert.equal(get(points,'C').y-get(points,'B').y,128,'Default lane-center spacing is one-third smaller than 192px');
const hugeZoom=layoutRow(row,pointRecords,bounds,10000,{});
assert.equal(get(hugeZoom,'Point A').markerOffset,0);assert.equal(get(hugeZoom,'Point B').markerOffset,0,'Separated dates return to the stream centerline');
assert.deepEqual(points.items.map(p=>[p.key,p.laneId,p.y]),hugeZoom.items.map(p=>[p.key,p.laneId,p.y]),'Marker callouts cannot create historical lanes');
assert.equal(diamondPath(100,80),'M 100,71 L 109,80 L 100,89 L 91,80 Z');
const oneYear=record('Known year interval','person','753 BC','752 BC',{related_to:['B']});
assert.equal(isInstantItem(get(layoutRow(row,[a,b,c,oneYear],bounds,1000,{}),'Known year interval')),false,'Known nonzero durations remain bars');
const samePoints=Array.from({length:8},(_,i)=>record('Same-date '+i,'person','753 BC','753 BC',{related_to:['B']}));
const densePoints=layoutRow(row,[a,b,c,...samePoints],bounds,1000,{});
assert.equal(densePoints.items.filter(p=>isInstantItem(p)&&!p.clustered).length,2);
assert.ok(densePoints.clusters.some(c=>c.items.length===6&&c.items.every(isInstantItem)),'Overflow has an explicit selectable point group');
assert.equal(new Set([...densePoints.items.filter(p=>!p.clustered).map(p=>p.key),...densePoints.clusters.flatMap(c=>c.items.map(p=>p.key))]).size,densePoints.items.length);
assert.equal(JSON.stringify(pointRecords),pointSnapshot,'Marker layout cannot mutate note dates or references');
console.log('Validated diamond geometry, date-pinned collision handling, overflow access, nonzero durations and one-third tighter lane spacing.');
