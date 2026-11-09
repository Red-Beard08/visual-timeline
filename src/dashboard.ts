import {ItemView, WorkspaceLeaf, Notice} from 'obsidian';
import type {TimelineRecord} from './types';
import type VisualTimeline from './main';
import {rangeOf} from './utils';
import {normalizeComposition} from './composition';
import {renderComposition,ChartController} from './composition-renderer';
export const VIEW='visual-timeline-dashboard';
export class TimelineView extends ItemView {
  private query='';private layer='';private records:TimelineRecord[]=[];private chart?:ChartController;
  constructor(leaf:WorkspaceLeaf,private plugin:VisualTimeline){super(leaf);}
  getViewType():string{return VIEW;}
  getDisplayText():string{return 'Visual Timeline';}
  async onOpen():Promise<void>{await this.render();}
  async onClose():Promise<void>{this.chart?.destroy();}
  async render():Promise<void>{
    this.chart?.destroy();this.chart=undefined;
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
    this.draw(root);
  }
  private draw(root:HTMLElement):void {
    const q=this.query.toLocaleLowerCase();const records=this.records.filter(r=>(!q||`${r.title} ${r.tags.join(' ')} ${r.categories.join(' ')} ${r.locations.join(' ')} ${r.entities.join(' ')}`.toLocaleLowerCase().includes(q))&&(!this.layer||r.layers.includes(this.layer)));
    const config=normalizeComposition(this.plugin.settings.composition),view=config.views.find(v=>v.id===config.active)!;
    if(root.querySelector('.vt-body')?.getAttribute('data-view')!==view.id){
      this.chart?.destroy();root.querySelectorAll('.vt-body').forEach(el=>el.remove());
      const body=root.createDiv({cls:'vt-body',attr:{'data-view':view.id}});body.createDiv({cls:'vt-range'});
      this.chart=renderComposition(body,view,config,this.records,rangeOf(this.records),p=>this.plugin.openNote(p));
    }
    const status=root.querySelector('.vt-range');if(status)status.textContent=`${records.length} matching records · ${view.rows.filter(r=>r.enabled).length} rows · select an item for details`;
    this.chart?.setVisible(new Set(records.map(r=>r.id)));
  }
  private button(parent:HTMLElement,label:string,action:()=>void):void{const b=parent.createEl('button',{text:label});b.onclick=action;}
}
