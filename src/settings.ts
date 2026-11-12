import {App,PluginSettingTab,Setting} from 'obsidian';
import type {TimelineSettings} from './types';
import type VisualTimeline from './main';
export class TimelineSettingsTab extends PluginSettingTab{
  constructor(app:App,private plugin:VisualTimeline){super(app,plugin);}
  display():void{
    const c=this.containerEl;c.empty();c.createEl('h2',{text:'Visual Timeline'});
    c.createEl('h3',{text:'Storage'});
    this.text(c,'Root folder','Markdown root folder. Changing paths never moves existing files.','rootFolder');
    this.text(c,'Records folder','Destination for newly created historical records.','recordsFolder');
    this.text(c,'Timeline workspaces folder','Blank uses <root folder>/Timelines. Existing workspace notes are not moved.','timelinesFolder');
    this.text(c,'Index file','Optional index note','indexFile');this.text(c,'Local map asset','Optional local SVG/GeoJSON path; no network is used','mapAssetPath');
    c.createEl('h3',{text:'Timelines'});
    new Setting(c).setName('Manage timeline projects').setDesc('Create project folders, switch active timelines, rename or archive projects. New records are saved in the active project automatically.').addButton(b=>b.setButtonText('Manage projects').onClick(()=>void this.plugin.openTimelineManager()));
    new Setting(c).setName('Move legacy records').setDesc('Preview and move records from the old shared Records folder into the active project, with a verified backup and link repair.').addButton(b=>b.setButtonText('Preview migration').onClick(()=>void this.plugin.openActiveProjectMigration()));
    this.number(c,'Default range (years)','Years shown around the selected range','defaultRangeYears');
    this.text(c,'Default layer','Initial layer filter','defaultLayer');
    new Setting(c).setName('Show unresolved relationships').setDesc('Keep unresolved references visible for review.').addToggle(t=>t.setValue(this.plugin.settings.showUnresolved).onChange(async v=>{this.plugin.settings.showUnresolved=v;await this.plugin.saveSettings();}));
    new Setting(c).setName('Compact layout').addToggle(t=>t.setValue(this.plugin.settings.compact).onChange(async v=>{this.plugin.settings.compact=v;await this.plugin.saveSettings();}));
    c.createEl('h3',{text:'Taxonomy'});
    new Setting(c).setName('Layers').setDesc('Comma-separated lane names').addText(t=>t.setValue(this.plugin.settings.layers.join(', ')).onChange(async v=>{this.plugin.settings.layers=v.split(',').map(x=>x.trim()).filter(Boolean);await this.plugin.saveSettings();}));
    new Setting(c).setName('Categories').setDesc('Comma-separated record categories').addText(t=>t.setValue(this.plugin.settings.categories.join(', ')).onChange(async v=>{this.plugin.settings.categories=v.split(',').map(x=>x.trim()).filter(Boolean);await this.plugin.saveSettings();}));
  }
  private text(c:HTMLElement,name:string,desc:string,key:keyof TimelineSettings):void{new Setting(c).setName(name).setDesc(desc).addText(t=>t.setValue(String(this.plugin.settings[key]??'')).onChange(async v=>{(this.plugin.settings as unknown as Record<string,unknown>)[key as string]=v.trim();await this.plugin.saveSettings();}));}
  private number(c:HTMLElement,name:string,desc:string,key:keyof TimelineSettings):void{new Setting(c).setName(name).setDesc(desc).addText(t=>t.setValue(String(this.plugin.settings[key])).onChange(async v=>{(this.plugin.settings as unknown as Record<string,unknown>)[key as string]=Math.max(1,Number(v)||1);await this.plugin.saveSettings();}));}
}
