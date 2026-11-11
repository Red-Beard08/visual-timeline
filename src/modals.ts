import {App,Modal,Notice,Setting} from 'obsidian';
import type {RecordType,TimelineDate} from './types';
import type VisualTimeline from './main';
import type {TimelineCatalog} from './timelines';
import {dateValue,RECORD_TYPES} from './utils';

export class NewEventModal extends Modal{
  private title='';private start='';private display='';private type:RecordType='visual-timeline-event';private layer='general';private category='event';private circa=false;private timeline='';private busy=false;
  constructor(app:App,private plugin:VisualTimeline,private catalog:TimelineCatalog){super(app);this.timeline=catalog.projects.some(p=>p.id===plugin.settings.activeTimeline&&p.status==='active')?plugin.settings.activeTimeline!:'';}
  onOpen():void{
    this.modalEl.addClass('vt-project-modal');this.contentEl.empty();this.contentEl.addClass('vt-modal');this.contentEl.scrollTop=0;
    const c=this.contentEl;c.createEl('h2',{text:'New timeline record'});
    new Setting(c).setName('Timeline').setDesc('Assign the new record to a timeline. It always remains available in All records.').addDropdown(d=>{d.addOption('','All records only');for(const p of this.catalog.projects.filter(p=>p.status==='active'))d.addOption(p.id,p.name);d.setValue(this.timeline).onChange(v=>this.timeline=v);});
    new Setting(c).setName('Title').addText(t=>t.setValue(this.title).onChange(v=>this.title=v));
    new Setting(c).setName('Record type').addDropdown(d=>{for(const type of RECORD_TYPES)d.addOption(type,type.replace('visual-timeline-',''));d.setValue(this.type).onChange(v=>this.type=v as RecordType);});
    new Setting(c).setName('Start date').setDesc('AD ISO date or a BC year such as 930 BC').addText(t=>t.setValue(this.start).onChange(v=>this.start=v));
    new Setting(c).setName('Display date').addText(t=>t.setValue(this.display).onChange(v=>this.display=v));
    new Setting(c).setName('Layer').addText(t=>t.setValue(this.layer).onChange(v=>this.layer=v));
    new Setting(c).setName('Category').addText(t=>t.setValue(this.category).onChange(v=>this.category=v));
    new Setting(c).setName('Circa').addToggle(t=>t.setValue(this.circa).onChange(v=>this.circa=v));
    const error=c.createEl('p',{cls:'vt-project-error',attr:{role:'alert'}}),actions=c.createDiv({cls:'vt-editor-footer'});
    const cancel=actions.createEl('button',{text:'Cancel'});cancel.onclick=()=>this.close();
    const save=actions.createEl('button',{text:'Create record',cls:'mod-cta'});save.onclick=async()=>{
      if(this.busy)return;
      if(!this.title.trim()||!Number.isFinite(dateValue(this.start.trim()))){error.textContent='Enter a title and valid start date.';return;}
      this.busy=true;save.disabled=true;cancel.disabled=true;error.textContent='';
      try{
        const date:TimelineDate={start:this.start.trim(),precision:/^\d{4}-\d{2}-\d{2}$/.test(this.start.trim())?'day':'year',circa:this.circa,display:this.display.trim()||this.start.trim()};
        const created=await this.plugin.repository.createEventRecord({title:this.title.trim(),type:this.type,date,tags:['timeline'],layers:[this.layer.trim()||'general'],categories:[this.category.trim()||'event'],locations:[],entities:[]});
        if(this.timeline){try{await this.plugin.projects.addRecord(this.timeline,created.id);}catch{new Notice('Record created in All records, but timeline assignment failed. Add it through Manage timelines.');this.close();await this.plugin.refreshViews();return;}}
        this.close();new Notice('Timeline record created.');await this.plugin.refreshViews();
      }catch(e){error.textContent=e instanceof Error?e.message:'Could not create the record.';}
      finally{this.busy=false;save.disabled=false;cancel.disabled=false;}
    };
  }
  onClose():void{this.contentEl.empty();}
}
