/** Timezone-independent proleptic Gregorian coordinates. Astronomical year 0 = 1 BC. */
export function historicalDate(input:string):number {
  const s=input.trim().replace(/^(?:c\.?|circa)\s+/i,'');
  const era=/^(?:(AD|CE)\s+)?(\d{1,6})(?:\s+(BC|BCE|AD|CE))?$/i.exec(s);
  if(era){const n=Number(era[2]);if(!n)return NaN;return /^(BC|BCE)$/i.test(era[3]||'')?1-n:n;}
  const iso=/^(-?\d{4,6})-(\d{2})(?:-(\d{2}))?$/.exec(s);
  if(!iso)return NaN;
  const y=Number(iso[1]),m=Number(iso[2]),d=Number(iso[3]||1);
  const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(m<1||m>12||d<1||d>days[m-1])return NaN;
  return y+(days.slice(0,m-1).reduce((a,b)=>a+b,0)+d-1)/(leap?366:365);
}
export function formatTime(value:number,precise=false):string {
  let y=Math.floor(value+1e-9);const label=y<=0?`${1-y} BC`:`AD ${y}`;
  if(!precise)return label;
  const leap=y%4===0&&(y%100!==0||y%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  let day=Math.round((value-y)*(leap?366:365)),m=0;while(m<11&&day>=days[m])day-=days[m++];
  return `${label} · ${m+1}/${day+1}`;
}
export function timeTicks(min:number,max:number,width:number):number[]{
  const raw=(max-min)/Math.max(2,Math.floor(width/110));
  const power=10**Math.floor(Math.log10(Math.max(raw,1/366)));
  const step=[1,2,5,10].map(n=>n*power).find(n=>n>=raw)||power*10;
  const ticks:number[]=[];for(let n=Math.ceil(min/step)*step;n<=max+step/100&&ticks.length<100;n+=step)ticks.push(n);
  return ticks;
}
