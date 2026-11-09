import {ItemView, WorkspaceLeaf, Notice} from 'obsidian';
import type {TimelineRecord} from './types';
import type VisualTimeline from './main';
import {rangeOf} from './utils';
import {normalizeComposition} from './composition';
import {renderComposition} from './composition-renderer';
export const VIEW='visual-timeline-dashboard';
export class TimelineView extends ItemView {
  private query='';private layer='';private zoom=1;private records:TimelineRecord[]=[];
  constructor(leaf:WorkspaceLeaf,private plugin:VisualTimeline){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return 'Visual Timeline';}
  async onOpen():Promise<void>{await this.render();}
  async render():Promise<void>{
    const root=this.containerEl.children[1] as HTMLElement;root.empty();root.addClass('visual-timeline-dashboard');
    this.records=await this.plugin.repository.all();
    const hero=root.createDiv({cls:'vt-hero'});hero.createEl('h1',{text:'Visual Timeline'});
    const actions=hero.createDiv({cls:'vt-actions'});
    this.button(actions,'New timeline event',()=>this.plugin.openNewEvent());
    this.button(actions,'Configure timeline',()=>void this.plugin.openComposition());
    this.button(actions,'Refresh',()=>void this.render());this.button(actions,'Settings',()=>this.plugin.openSettings());
    const controls=root.createDiv({cls:'vt-controls'});
    const search=controls.createEl('input',{type:'search',placeholder:'Search events, entities, tags, or places',attr:{'aria-label':'Search timeline'}});search.value=this.query;search.oninput=()=>{this.query=search.value;this.draw(root);};
    const config=normalizeComposition(this.plugin.settings.composition);
    const views=controls.createEl('select',{attr:{'aria-label':'Saved composition'}});config.views.forEach(v=>views.createEl('option',{text:v.name,value:v.id}));views.value=config.active;
    views.onchange=()=>{const old=config.active;config.active=views.value;this.plugin.settings.composition=config;void this.plugin.saveSettings().then(()=>this.draw(root)).catch(()=>{config.active=old;views.value=old;new Notice('Could not save selected view.');});};
    const select=controls.createEl('select',{attr:{'aria-label':'Filter by note layer'}});select.createEl('option',{text:'All note layers',value:''});for(const l of [...new Set([...this.plugin.settings.layers,...this.records.flatMap(r=>r.layers)])])select.createEl('option',{text:l,value:l});select.value=this.layer;select.onchange=()=>{this.layer=select.value;this.draw(root);};
    const zoom=controls.createEl('select',{attr:{'aria-label':'Timeline zoom'}});[1,2,4].forEach(v=>zoom.createEl('option',{text:`${v}× zoom`,value:String(v)}));zoom.value=String(this.zoom);zoom.onchange=()=>{this.zoom=Number(zoom.value);this.draw(root);};
    this.draw(root);
  }
  private draw(root:HTMLElement):void {
    root.querySelectorAll('.vt-body').forEach(el=>el.remove());const body=root.createDiv({cls:'vt-body'});
    const q=this.query.toLocaleLowerCase();const records=this.records.filter(r=>(!q||`${r.title} ${r.tags.join(' ')} ${r.categories.join(' ')} ${r.locations.join(' ')} ${r.entities.join(' ')}`.toLocaleLowerCase().includes(q))&&(!this.layer||r.layers.includes(this.layer)));
    if(!records.length){body.createEl('p',{cls:'vt-empty',text:'No timeline records match this view.'});return;}
    const config=normalizeComposition(this.plugin.settings.composition),view=config.views.find(v=>v.id===config.active)!;
    body.createDiv({cls:'vt-range',text:`${records.length} matching records · ${view.rows.filter(r=>r.enabled).length} visible rows · select a shape to open its note`});
    renderComposition(body,view,config,records,rangeOf(this.records),p=>this.plugin.openNote(p),this.zoom);
  }
  private button(parent:HTMLElement,label:string,action:()=>void):void{const b=parent.createEl('button',{text:label});b.onclick=action;}
}
