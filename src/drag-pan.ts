/** Mouse/pen grab-to-pan without intercepting touch scrolling or ordinary item clicks. */
export function installDragPan(scroll:HTMLElement,onStart:()=>void):()=>void {
  const doc=scroll.ownerDocument,win=doc.defaultView;
  let drag:{id:number;x:number;left:number;moved:boolean}|undefined,suppressClick=false;
  const finish=()=>{
    if(!drag)return;
    const {id,moved}=drag;drag=undefined;suppressClick=suppressClick||moved;
    scroll.classList.remove('is-panning');
    doc.removeEventListener('pointermove',move);doc.removeEventListener('pointerup',up);doc.removeEventListener('pointercancel',up);win?.removeEventListener('blur',finish);
    if(scroll.hasPointerCapture(id))scroll.releasePointerCapture(id);
  };
  const move=(event:PointerEvent)=>{
    if(!drag||event.pointerId!==drag.id)return;
    if(!(event.buttons&1)){finish();return;}
    const dx=event.clientX-drag.x;
    if(!drag.moved){if(Math.abs(dx)<5)return;drag.moved=true;onStart();scroll.classList.add('is-panning');scroll.setPointerCapture(drag.id);}
    event.preventDefault();scroll.scrollLeft=drag.left-dx;
  };
  const up=(event:PointerEvent)=>{if(drag?.id===event.pointerId)finish();};
  const down=(event:PointerEvent)=>{
    if(event.button!==0||!event.isPrimary||event.pointerType==='touch')return;
    if(event.target instanceof Element&&event.target.closest('button,input,select,textarea,a,[contenteditable="true"]'))return;
    const rect=scroll.getBoundingClientRect(),x=event.clientX-rect.left-scroll.clientLeft,y=event.clientY-rect.top-scroll.clientTop;
    if(x<0||y<0||x>=scroll.clientWidth||y>=scroll.clientHeight)return; // native scrollbar
    finish();suppressClick=false;drag={id:event.pointerId,x:event.clientX,left:scroll.scrollLeft,moved:false};
    doc.addEventListener('pointermove',move,{passive:false});doc.addEventListener('pointerup',up);doc.addEventListener('pointercancel',up);win?.addEventListener('blur',finish);
  };
  const click=(event:MouseEvent)=>{if(suppressClick&&event.detail>0){suppressClick=false;event.preventDefault();event.stopImmediatePropagation();}};
  const lost=(event:PointerEvent)=>{if(drag?.id===event.pointerId)finish();};
  const nativeDrag=(event:DragEvent)=>{if(drag)event.preventDefault();};
  scroll.addEventListener('pointerdown',down);scroll.addEventListener('click',click,true);scroll.addEventListener('lostpointercapture',lost);scroll.addEventListener('dragstart',nativeDrag);
  return ()=>{finish();scroll.removeEventListener('pointerdown',down);scroll.removeEventListener('click',click,true);scroll.removeEventListener('lostpointercapture',lost);scroll.removeEventListener('dragstart',nativeDrag);};
}
