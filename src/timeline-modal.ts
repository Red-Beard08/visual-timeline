import {Modal,Notice,Setting} from 'obsidian';
import type VisualTimeline from './main';
import type {TimelineRecord} from './types';
import type {TimelineCatalog,TimelineDraft,TimelineProject} from './timelines';
import {compositionForTimeline,recordsForTimeline} from './timelines';
import type {CompositionSettings} from './composition';

/** Project setup contains no item picker: project ownership comes from its Records folder. */
export class TimelineManagerModal extends Modal{
  private draft?:TimelineDraft;private editing?:TimelineProject;private copyLayout=true;private busy=false;
  private committed?:{project:TimelineProject;created:boolean;layout?:CompositionSettings;stage:'layout'|'activation';activeId:string;};
  constructor(private plugin:VisualTimeline,private catalog:TimelineCatalog,private records:TimelineRecord[],create=false){
    super(plugin.app);if(create)this.start();
  }
  onOpen():void{this.modalEl.addClass('vt-project-modal');this.draw();this.contentEl.scrollTop=0;}
  onClose():void{this.contentEl.empty();}
  private start(p?:TimelineProject):void{this.editing=p;this.copyLayout=true;this.draft={name:p?.name||'',description:p?.description||'',status:p?.status||'active'};}
  private button(parent:HTMLElement,label:string,action:()=>void):HTMLButtonElement{const b=parent.createEl('button',{text:label});b.onclick=action;return b;}
  private draw():void{
    const c=this.contentEl;c.empty();c.addClass('vt-project-editor');c.scrollTop=0;
    c.createEl('h2',{text:this.draft?(this.editing?'Edit timeline project':'New timeline project'):'Timeline projects'});
    if(!this.draft){this.drawList(c);return;}
    const draft=this.draft;
    c.createEl('p',{cls:'vt-section-note',text:'A project gets its own folder and Records subfolder. New items are saved there automatically; no item-level timeline assignment is needed.'});
    new Setting(c).setName('Project name').addText(t=>{t.inputEl.setAttribute('aria-label','Timeline project name');t.setValue(draft.name).onChange(v=>draft.name=v);});
    new Setting(c).setName('Description').addTextArea(t=>{t.inputEl.rows=2;t.inputEl.setAttribute('aria-label','Timeline project description');t.setValue(draft.description).onChange(v=>draft.description=v);});
    if(this.editing)new Setting(c).setName('Status').setDesc('Archiving hides the project from the active selector; its folder and records remain intact.').addDropdown(d=>d.addOption('active','Active').addOption('archived','Archived').setValue(draft.status).onChange(v=>draft.status=v as TimelineDraft['status']));
    else new Setting(c).setName('Copy current layout').setDesc('Start this project with the current rows, layers, and saved views. This does not copy or assign any notes.').addToggle(t=>t.setValue(this.copyLayout).onChange(v=>this.copyLayout=v));
    const error=c.createEl('p',{cls:'vt-project-error',attr:{role:'alert'}}),footer=c.createDiv({cls:'vt-editor-footer'});
    const cancel=this.button(footer,'Cancel',()=>this.close());
    const save=this.button(footer,this.editing?'Save project':'Create project',()=>void this.save(error,save,cancel));save.addClass('mod-cta');
  }
  private drawList(c:HTMLElement):void{
    c.createEl('p',{cls:'vt-section-note',text:'Each project owns the items in its Records folder. All records remains available for browsing older notes. Legacy collection timelines are preserved as read-only views.'});
    this.button(c,'New timeline project',()=>{this.start();this.draw();}).addClass('mod-cta');
    for(const warning of this.catalog.warnings)c.createEl('p',{cls:'vt-project-error',text:warning});
    if(!this.catalog.projects.length)c.createEl('p',{text:'No timeline projects yet. Create one to start a focused timeline.'});
    for(const p of this.catalog.projects){
      const row=c.createDiv({cls:'vt-project-row'}),info=row.createDiv(),count=recordsForTimeline(this.records,p).length;
      info.createEl('strong',{text:p.name});info.createEl('small',{text:`${count} ${count===1?'record':'records'} · ${p.mode==='project'?'Project folder':'Legacy collection · read only'}${p.status==='archived'?' · Archived':''}`});
      if(p.description)info.createEl('p',{text:p.description});
      const actions=row.createDiv({cls:'vt-project-tools'});
      if(p.status==='active')this.button(actions,'Open',()=>void this.openProject(p));
      this.button(actions,'Edit details',()=>{this.start(p);this.draw();});
      if(p.mode==='project'&&this.records.some(r=>r.path.startsWith(`${this.plugin.settings.recordsFolder.replace(/\/$/,'')}/`)))this.button(actions,'Move legacy records here',()=>void this.plugin.openProjectMigration(p));
      this.button(actions,'Open note',()=>this.plugin.openNote(p.path));
    }
    const footer=c.createDiv({cls:'vt-editor-footer'});this.button(footer,'Close',()=>this.close());
  }
  private async openProject(p:TimelineProject):Promise<void>{
    if(this.busy)return;this.busy=true;
    try{await this.plugin.setActiveTimeline(p.id);this.close();}catch{new Notice('Could not open timeline project. Try again.');}finally{this.busy=false;}
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
      this.close();new Notice(`Timeline project ${pending.created?'created':'saved'}.`);
    }catch(e){
      if(this.committed){const copying=this.committed.stage==='layout',step=copying?'Copying the layout':'Opening the active project',recovery=copying?'Close to keep the saved project without copying its layout.':'Close to keep the saved project and open it later from Timeline projects.';error.textContent=`Project “${this.committed.project.name}” was saved. ${step} could not finish. Retry setup or ${recovery}`;save.textContent='Retry setup';cancel.textContent='Close';}
      else error.textContent=e instanceof Error?e.message:'Could not save project. Try again.';
    }
    finally{this.busy=false;controls.forEach(el=>el.disabled=!!this.committed);save.disabled=false;cancel.disabled=false;}
  }
}
