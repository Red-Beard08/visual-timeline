import type {TimelineRecord} from './types';
import {dateValue} from './utils';

/** One SVG coordinate space for both ribbons and labels; no detached connector overlay. */
export function renderStreams(parent: HTMLElement, records: TimelineRecord[], bounds: {min:number;max:number}, open:(path:string)=>void):void {
  const ns=['http:','','www.w3.org','2000','svg'].join('/');
  const section=parent.createDiv({cls:'vt-rivers'});
  section.createEl('p',{text:'Kingdoms · follow a stream to its successors. Select a ribbon to open its note.',cls:'vt-section-note'});
  const viewport=section.createDiv({cls:'vt-river-scroll'});
  const svg=document.createElementNS(ns,'svg');
  const sorted=[...records].sort((a,b)=>dateValue(a.date.start)-dateValue(b.date.start)||a.id.localeCompare(b.id));
  const height=Math.max(340,sorted.length*110+60);
  svg.setAttribute('viewBox',`0 0 1200 ${height}`); svg.setAttribute('class','vt-river-svg');
  svg.setAttribute('aria-label','Kingdom succession streams');
  viewport.appendChild(svg);
  const x=(date:string)=>40+(dateValue(date)-bounds.min)/Math.max(1,bounds.max-bounds.min)*1120;
  const resolve=(ref:string)=>sorted.find(r=>r.id===ref||r.path.replace(/\.md$/,'')===ref||r.file.basename===ref);
  const parents=new Map<string,TimelineRecord>();
  for(const r of sorted){for(const ref of [...r.relations.split_into,...r.relations.succeeded_by]){const t=resolve(ref);if(t&&t.id!==r.id)parents.set(t.id,r);}for(const ref of [...r.relations.continued_from,...r.relations.preceded_by]){const p=resolve(ref);if(p&&p.id!==r.id)parents.set(r.id,p);}}
  const ys=new Map(sorted.map((r,i)=>[r.id,80+i*110]));
  // Center a trunk between its direct branches, retaining chronological x positions.
  for(const r of [...sorted].reverse()){const children=sorted.filter(c=>parents.get(c.id)?.id===r.id);if(children.length)ys.set(r.id,children.reduce((n,c)=>n+ys.get(c.id)!,0)/children.length);}
  const colors=['#bb9865','#659fa0','#a887b0','#859c64','#bc8276'];
  sorted.forEach((r,i)=>{
    const start=x(r.date.start),end=Math.max(start+3,x(r.date.end||r.date.start)),y=ys.get(r.id)!;
    const p=parents.get(r.id),py=p?ys.get(p.id)!:y;
    const siblings=p?sorted.filter(c=>parents.get(c.id)?.id===p.id):[];
    const slot=siblings.findIndex(c=>c.id===r.id);
    const half=p?26/Math.max(1,siblings.length):26;
    const origin=p?py-26+half+slot*half*2:y;
    const bend=Math.min(145,(end-start)*.45),settle=start+bend;
    const branches=sorted.some(c=>parents.get(c.id)?.id===r.id);
    const tail=Math.min(45,(end-settle)*.5);
    const tip=branches?26:0;
    const d=`M ${start} ${origin-half} C ${start+bend*.55} ${origin-half} ${start+bend*.45} ${y-26} ${settle} ${y-26} C ${end-tail} ${y-26} ${end-tail*.25} ${y-tip} ${end} ${y-tip} L ${end} ${y+tip} C ${end-tail*.25} ${y+tip} ${end-tail} ${y+26} ${settle} ${y+26} C ${start+bend*.45} ${y+26} ${start+bend*.55} ${origin+half} ${start} ${origin+half} Z`;
    const g=document.createElementNS(ns,'g');g.setAttribute('class','vt-river');g.setAttribute('tabindex','0');g.setAttribute('role','link');g.setAttribute('aria-label',`${r.title}, ${r.date.display||r.date.start}`);
    const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill',colors[i%colors.length]);g.appendChild(path);
    const title=document.createElementNS(ns,'title');title.textContent=`${r.title} · ${r.date.display||r.date.start}`;g.appendChild(title);
    const label=document.createElementNS(ns,'text');label.setAttribute('x',String(p?settle+12:start+12));label.setAttribute('y',String(y-38));label.textContent=r.title;g.appendChild(label);
    const date=document.createElementNS(ns,'text');date.setAttribute('x',label.getAttribute('x')!);date.setAttribute('y',String(y+44));date.setAttribute('class','vt-river-date');date.textContent=r.date.display||r.date.start;g.appendChild(date);
    g.addEventListener('click',()=>open(r.path));g.addEventListener('keydown',e=>{const key=(e as KeyboardEvent).key;if(key==='Enter'||key===' '){e.preventDefault();open(r.path);}});svg.appendChild(g);
  });
}
