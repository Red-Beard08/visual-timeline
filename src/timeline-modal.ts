import {Modal,Notice,Setting} from 'obsidian';
import type VisualTimeline from './main';
import type {TimelineRecord} from './types';
import type {TimelineCatalog,TimelineDraft,TimelineProject} from './timelines';
import {compositionForTimeline} from './timelines';
import type {CompositionSettings} from './composition';

/** A private membership draft: Cancel never modifies notes or settings. */
export class TimelineManagerModal extends Modal{
  private draft?:TimelineDraft;private editing?:TimelineProject;private copyLayout=false;private busy=false;
  private committed?:{project:TimelineProject;created:boolean;layout?:CompositionSettings;stage:'layout'|'activation';activeId:string;};
  constructor(private plugin:VisualTimeline,private catalog:TimelineCatalog,private records:TimelineRecord[],create=false){
    super(plugin.app);if(create)this.start();
  }
  onOpen():void{this.modalEl.addClass('vt-project-modal');this.draw();this.contentEl.scrollTop=0;}
  onClose():void{this.contentEl.empty();}
  private start(p?:TimelineProject):void{
    this.editing=p;this.copyLayout=false;
    this.draft=p?{name:p.name,description:p.description,status:p.status,recordIds:[...p.recordIds]}:{name:'',description:'',status:'active',recordIds:[]};
  }
  private button(parent:HTMLElement,label:string,action:()=>void):HTMLButtonElement{const b=parent.createEl('button',{text:label});b.onclick=action;return b;}
  private draw():void{
    const c=this.contentEl;c.empty();c.addClass('vt-project-editor');c.scrollTop=0;
    c.createEl('h2',{text:this.draft?(this.editing?'Edit timeline':'New timeline'):'Manage timelines'});
    if(!this.draft){this.drawList(c);return;}
    const draft=this.draft;
    c.createEl('p',{cls:'vt-section-note',text:'Choose the notes in this timeline. Notes stay in place and can be shared with other timelines. Layouts are saved separately for each timeline.'});
    new Setting(c).setName('Name').addText(t=>{t.inputEl.setAttribute('aria-label','Timeline name');t.setValue(draft.name).onChange(v=>draft.name=v);});
    new Setting(c).setName('Description').addTextArea(t=>{t.inputEl.rows=2;t.inputEl.setAttribute('aria-label','Timeline description');t.setValue(draft.description).onChange(v=>draft.description=v);});
    if(this.editing)new Setting(c).setName('Status').setDesc('Archived timelines keep their notes and layouts, but leave the active selector.').addDropdown(d=>d.addOption('active','Active').addOption('archived','Archived').setValue(draft.status).onChange(v=>draft.status=v as TimelineDraft['status']));
    else new Setting(c).setName('Copy current layouts').setDesc('Off starts with an unfiltered Overview. On copies the current rows, layers, and saved views, not its notes.').addToggle(t=>t.setValue(this.copyLayout).onChange(v=>this.copyLayout=v));
    const heading=c.createDiv({cls:'vt-project-members-heading'});heading.createEl('h3',{text:'Included notes'});
    const count=heading.createSpan({cls:'vt-section-note',attr:{'aria-live':'polite'}});
    const updateCount=()=>count.textContent=`${draft.recordIds.length} selected`;
    const search=c.createEl('input',{type:'search',placeholder:'Find notes by name, type, or tag…',cls:'vt-project-search',attr:{'aria-label':'Find notes to include'}});
    const tools=c.createDiv({cls:'vt-project-tools'}),list=c.createDiv({cls:'vt-project-members'});
    let matching=this.records;
    const setMember=(key:string,on:boolean)=>{draft.recordIds=on?[...new Set([...draft.recordIds,key])]:draft.recordIds.filter(id=>id!==key);updateCount();};
    const drawMembers=()=>{
      const q=search.value.trim().toLocaleLowerCase();matching=this.records.filter(r=>`${r.title} ${r.type} ${r.tags.join(' ')} ${r.path}`.toLocaleLowerCase().includes(q));list.empty();
      for(const record of matching){const row=list.createEl('label',{cls:'vt-project-member'}),input=row.createEl('input',{type:'checkbox'});input.checked=draft.recordIds.includes(record.id);input.onchange=()=>setMember(record.id,input.checked);const info=row.createDiv();info.createEl('strong',{text:record.title});info.createEl('small',{text:`${record.type.replace('visual-timeline-','')} · ${record.path}`});}
      if(!matching.length)list.createEl('p',{cls:'vt-section-note',text:'No notes match. Create records from the timeline after saving.'});
      const known=new Set(this.records.map(r=>r.id)),missing=draft.recordIds.filter(key=>!known.has(key));
      if(missing.length){const details=list.createEl('details');details.createEl('summary',{text:`${missing.length} unavailable note reference${missing.length===1?'':'s'} retained`});details.createEl('p',{cls:'vt-section-note',text:'These IDs are preserved. Uncheck one only if you want to remove its membership.'});for(const key of missing){const row=details.createEl('label',{cls:'vt-project-member'}),input=row.createEl('input',{type:'checkbox'});input.checked=true;row.createSpan({text:key});input.onchange=()=>{setMember(key,input.checked);drawMembers();};}}
      updateCount();
    };
    this.button(tools,'Include matching',()=>{matching.forEach(r=>setMember(r.id,true));drawMembers();});
    this.button(tools,'Exclude matching',()=>{matching.forEach(r=>setMember(r.id,false));drawMembers();});
    search.oninput=drawMembers;drawMembers();
    const error=c.createEl('p',{cls:'vt-project-error',attr:{role:'alert'}});
    const footer=c.createDiv({cls:'vt-editor-footer'});
    const cancel=this.button(footer,'Cancel',()=>this.close());
    const save=this.button(footer,'Save timeline',()=>void this.save(error,save,cancel));save.addClass('mod-cta');
  }
  private drawList(c:HTMLElement):void{
    c.createEl('p',{cls:'vt-section-note',text:'Each timeline has its own notes and layouts. All records remains the complete library.'});
    this.button(c,'New timeline',()=>{this.start();this.draw();}).addClass('mod-cta');
    for(const warning of this.catalog.warnings)c.createEl('p',{cls:'vt-project-error',text:warning});
    if(!this.catalog.projects.length)c.createEl('p',{text:'No separate timelines yet. Create one to start a focused collection.'});
    for(const p of this.catalog.projects){const row=c.createDiv({cls:'vt-project-row'}),info=row.createDiv();info.createEl('strong',{text:p.name});info.createEl('small',{text:`${p.recordIds.length} ${p.recordIds.length===1?'note':'notes'}${p.status==='archived'?' · Archived':''}`});if(p.description)info.createEl('p',{text:p.description});const actions=row.createDiv({cls:'vt-project-tools'});if(p.status==='active')this.button(actions,'Open',()=>void this.openProject(p));this.button(actions,'Edit',()=>{this.start(p);this.draw();});this.button(actions,'Open note',()=>this.plugin.openNote(p.path));}
    const footer=c.createDiv({cls:'vt-editor-footer'});this.button(footer,'Close',()=>this.close());
  }
  private async openProject(p:TimelineProject):Promise<void>{
    if(this.busy)return;this.busy=true;
    try{await this.plugin.setActiveTimeline(p.id);this.close();}catch{new Notice('Could not open timeline. Try again.');}finally{this.busy=false;}
  }
  private async save(error:HTMLElement,save:HTMLButtonElement,cancel:HTMLButtonElement):Promise<void>{
    if(this.busy||!this.draft)return;
    this.busy=true;error.textContent='';const controls=Array.from(this.contentEl.querySelectorAll<HTMLInputElement|HTMLButtonElement|HTMLSelectElement|HTMLTextAreaElement>('input,button,select,textarea'));controls.forEach(el=>el.disabled=true);
    try{
      if(!this.committed){
        const sourceId=this.plugin.settings.activeTimeline||'',layout=this.copyLayout?compositionForTimeline(this.plugin.settings,sourceId):undefined;
        const created=!this.editing,p=await this.plugin.projects.save(this.draft,this.editing);
        this.editing=p;this.committed={project:p,created,layout,stage:layout?'layout':'activation',activeId:p.status==='active'?p.id:(sourceId===p.id?'':sourceId)};
      }
      const pending=this.committed;
      if(pending.stage==='layout'){await this.plugin.saveComposition(pending.project.id,pending.layout!);pending.stage='activation';}
      await this.plugin.setActiveTimeline(pending.activeId);
      this.close();new Notice(`Timeline ${pending.created?'created':'saved'}.`);
    }catch(e){
      if(this.committed){const copying=this.committed.stage==='layout',step=copying?'Copying the layouts':'Opening the active timeline',recovery=copying?'Close to keep the saved timeline without copying layouts.':'Close to keep the saved timeline and open it later through Manage timelines.';error.textContent=`Timeline “${this.committed.project.name}” was saved, including its note membership. ${step} could not finish. Retry setup to complete only that step, or ${recovery}`;save.textContent='Retry setup';cancel.textContent='Close';}
      else error.textContent=e instanceof Error?e.message:'Could not save timeline. Try again.';
    }
    finally{this.busy=false;controls.forEach(el=>el.disabled=!!this.committed);save.disabled=false;cancel.disabled=false;}
  }
}
