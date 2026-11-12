import {ItemView,WorkspaceLeaf,Notice} from 'obsidian';
import type {TimelineRecord} from './types';
import type VisualTimeline from './main';
import {rangeOf} from './utils';
import {compositionForTimeline,activeProject,recordsForTimeline} from './timelines';
import {renderComposition,ChartController} from './composition-renderer';
export const VIEW='visual-timeline-dashboard';
export class TimelineView extends ItemView{
  private query='';private layer='';private records:TimelineRecord[]=[];private chart?:ChartController;private projectScope='';private generation=0;
  constructor(leaf:WorkspaceLeaf,private plugin:VisualTimeline){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return 'Visual Timeline';}
  async onOpen():Promise<void>{await this.render();}
  async onClose():Promise<void>{this.generation++;this.chart?.destroy();}
  async render():Promise<void>{
    const generation=++this.generation;
    const root=this.containerEl.children[1] as HTMLElement;
    let catalog,all;
    try{[catalog,all]=await Promise.all([this.plugin.projects.all(),this.plugin.repository.all()]);}
    catch(error){if(generation!==this.generation)return;this.chart?.destroy();this.chart=undefined;root.empty();root.createEl('p',{text:`Could not load timelines: ${String(error)}`,attr:{role:'alert'}});this.button(root,'Settings',()=>this.plugin.openSettings());this.button(root,'Retry',()=>void this.render());return;}
    if(generation!==this.generation)return;
    const project=activeProject(this.plugin.settings,catalog),scope=project?.id||'';
    if(scope!==this.projectScope){this.query='';this.layer='';}this.projectScope=scope;
    this.chart?.destroy();this.chart=undefined;root.empty();root.addClass('visual-timeline-dashboard');
    this.records=recordsForTimeline(all,project);
    const hero=root.createDiv({cls:'vt-hero'});hero.createEl('h1',{text:'Visual Timeline'});
    const actions=hero.createDiv({cls:'vt-actions'});
    this.button(actions,'New event',()=>void this.plugin.openNewEvent());this.button(actions,'Configure layout',()=>void this.plugin.openComposition());
    this.button(actions,'Refresh',()=>void this.render());this.button(actions,'Settings',()=>this.plugin.openSettings());
    const switcher=root.createDiv({cls:'vt-timeline-switcher'}),label=switcher.createEl('label',{cls:'vt-timeline-select'});label.createSpan({text:'Timeline project'});
    const timelines=label.createEl('select',{attr:{'aria-label':'Active timeline'}});timelines.createEl('option',{text:'All records',value:''});
    const active=catalog.projects.filter(p=>p.status==='active');for(const p of active)timelines.createEl('option',{text:`${p.name}${p.mode==='legacy'?' · legacy view':''}`,value:p.id});timelines.value=scope;
    timelines.onchange=()=>{timelines.disabled=true;void this.plugin.setActiveTimeline(timelines.value).catch(()=>{timelines.value=scope;timelines.disabled=false;new Notice('Could not switch timeline. Refresh and try again.');});};
    this.button(switcher,'New project',()=>void this.plugin.openTimelineManager(true));this.button(switcher,'Manage projects',()=>void this.plugin.openTimelineManager());
    if(project?.description)root.createEl('p',{cls:'vt-timeline-description',text:project.description});
    if(this.plugin.settings.activeTimeline&&!project)root.createEl('p',{cls:'vt-project-error',text:'The selected timeline is unavailable or archived. Showing All records; choose another timeline above.'});
    if(catalog.warnings.length){const details=root.createEl('details',{cls:'vt-project-warnings'});details.createEl('summary',{text:`${catalog.warnings.length} timeline workspace warning${catalog.warnings.length===1?'':'s'}`});for(const warning of catalog.warnings)details.createEl('p',{text:warning});}
    if(project?.mode==='legacy'){const ids=new Set(all.map(r=>r.id)),missing=project.recordIds.filter(id=>!ids.has(id)).length;if(missing)root.createEl('p',{cls:'vt-section-note',text:`${missing} legacy note reference${missing===1?' is':'s are'} unavailable. References are retained.`});}
    const controls=root.createDiv({cls:'vt-controls'}),layoutLabel=controls.createEl('label',{cls:'vt-layout-select'});layoutLabel.createSpan({text:'Layout'});
    const config=compositionForTimeline(this.plugin.settings,scope),views=layoutLabel.createEl('select',{attr:{'aria-label':'Saved layout'}});config.views.forEach(v=>views.createEl('option',{text:v.name,value:v.id}));views.value=config.active;
    views.onchange=()=>{const previous=config.active;config.active=views.value;views.disabled=true;void this.plugin.saveComposition(scope,config).then(()=>{if(generation===this.generation){views.disabled=false;this.draw(root);}}).catch(()=>{config.active=previous;views.value=previous;views.disabled=false;new Notice('Could not save selected layout.');});};
    const search=controls.createEl('input',{type:'search',placeholder:'Search names, events, tags, places…',attr:{'aria-label':'Search timeline'}});search.value=this.query;search.oninput=()=>{this.query=search.value;this.draw(root);};
    const select=controls.createEl('select',{attr:{'aria-label':'Filter by note layer'}});select.createEl('option',{text:'All note layers',value:''});for(const l of [...new Set([...this.plugin.settings.layers,...this.records.flatMap(r=>r.layers)])])select.createEl('option',{text:l,value:l});select.value=this.layer;select.onchange=()=>{this.layer=select.value;this.draw(root);};
    if(!this.records.length){const empty=root.createDiv({cls:'vt-project-empty'});empty.createEl('h2',{text:project?.mode==='project'?'This project is ready':'No timeline records yet'});empty.createEl('p',{text:project?.mode==='project'?'New items created here will automatically belong to this project.':'Create a timeline project first; new records are always saved inside its folder.'});this.button(empty,project?.mode==='project'?'New item':'Create project',()=>project?.mode==='project'?void this.plugin.openNewEvent():void this.plugin.openTimelineManager(true));return;}
    this.draw(root);
  }
  private draw(root:HTMLElement):void{
    if(!this.records.length)return;
    const q=this.query.toLocaleLowerCase(),records=this.records.filter(r=>(!q||`${r.title} ${r.tags.join(' ')} ${r.categories.join(' ')} ${r.locations.join(' ')} ${r.entities.join(' ')}`.toLocaleLowerCase().includes(q))&&(!this.layer||r.layers.includes(this.layer)));
    const scope=this.projectScope,config=compositionForTimeline(this.plugin.settings,scope),view=config.views.find(v=>v.id===config.active)!;
    const key=`${scope}:${view.id}`;
    if(root.querySelector('.vt-body')?.getAttribute('data-view')!==key){
      this.chart?.destroy();root.querySelectorAll('.vt-body').forEach(el=>el.remove());
      const body=root.createDiv({cls:'vt-body',attr:{'data-view':key}});body.createDiv({cls:'vt-range'});
      this.chart=renderComposition(body,view,config,this.records,rangeOf(this.records),p=>this.plugin.openNote(p),1,async updated=>{
        const current=compositionForTimeline(this.plugin.settings,scope),saved=current.views.find(v=>v.id===updated.id);if(!saved)throw new Error('Saved layout unavailable');saved.yearGrid=updated.yearGrid;await this.plugin.saveComposition(scope,current);
      },root.querySelector('.vt-controls') as HTMLElement);
    }
    const status=root.querySelector('.vt-range'),rows=view.rows.filter(r=>r.enabled).length;if(status)status.textContent=`${records.length} matching notes · ${rows} ${rows===1?'row':'rows'}`;
    this.chart?.setVisible(new Set(records.map(r=>r.id)));
  }
  private button(parent:HTMLElement,label:string,action:()=>void):void{const b=parent.createEl('button',{text:label});b.onclick=action;}
}
