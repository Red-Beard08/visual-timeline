import {App,Notice,Plugin} from 'obsidian';
import {TimelineSettingsTab} from './settings';
import {TimelineRepository} from './repository';
import {TimelineProjectRepository} from './timeline-repository';
import {TimelineManagerModal} from './timeline-modal';
import {ProjectMigrationModal} from './project-migration';
import {TimelineView,VIEW} from './dashboard';
import {NewEventModal} from './modals';
import {DEFAULT_SETTINGS,TimelineSettings} from './types';
import {registerDashboardModule,registerDashboardWidget} from './dashboard-bridge';
import {CompositionSettings,normalizeComposition} from './composition';
import {CompositionModal} from './composition-modal';
import {activeProject,recordsForTimeline} from './timelines';

export default class VisualTimeline extends Plugin{
  settings:TimelineSettings=DEFAULT_SETTINGS;repository!:TimelineRepository;projects!:TimelineProjectRepository;
  private moduleDispose:()=>void=()=>undefined;private widgetDispose:()=>void=()=>undefined;
  async onload():Promise<void>{
    const stored=await this.loadData() as Partial<TimelineSettings>|null;
    this.settings={...DEFAULT_SETTINGS,...(stored||{}),settingsVersion:2,relationshipLabels:{...DEFAULT_SETTINGS.relationshipLabels,...(stored?.relationshipLabels||{})},layers:Array.isArray(stored?.layers)?stored!.layers!:DEFAULT_SETTINGS.layers,categories:Array.isArray(stored?.categories)?stored!.categories!:DEFAULT_SETTINGS.categories};
    this.settings.composition=normalizeComposition(this.settings.composition);
    if(!this.settings.timelineLayouts||typeof this.settings.timelineLayouts!=='object'||Array.isArray(this.settings.timelineLayouts))this.settings.timelineLayouts={};
    this.repository=new TimelineRepository(this.app,this.settings);this.projects=new TimelineProjectRepository(this.app,this.settings);
    this.registerView(VIEW,leaf=>new TimelineView(leaf,this));this.addSettingTab(new TimelineSettingsTab(this.app,this));
    this.addCommand({id:'configure-timeline',name:'Configure timeline rows and layers',callback:()=>void this.openComposition()});
    this.addCommand({id:'open-dashboard',name:'Open Visual Timeline',callback:()=>void this.openDashboard()});
    this.addCommand({id:'open-timeline',name:'Open timeline',callback:()=>void this.openDashboard()});
    this.addCommand({id:'new-timeline',name:'New timeline',callback:()=>void this.openTimelineManager(true)});
    this.addCommand({id:'manage-timelines',name:'Manage timelines',callback:()=>void this.openTimelineManager()});
    this.addCommand({id:'new-event',name:'New timeline event',callback:()=>void this.openNewEvent()});
    this.addCommand({id:'move-legacy-records',name:'Move legacy records into active project',callback:()=>void this.openActiveProjectMigration()});
    this.addCommand({id:'refresh',name:'Refresh timeline',callback:()=>void this.refreshViews()});
    this.addCommand({id:'manage-layers',name:'Manage timeline layers',callback:()=>this.openSettings()});
    this.addCommand({id:'manage-categories',name:'Manage timeline categories',callback:()=>this.openSettings()});
    this.addCommand({id:'open-settings',name:'Open Visual Timeline settings',callback:()=>this.openSettings()});
    this.registerDashboardIntegration();
    this.registerEvent(this.app.vault.on('create',()=>void this.refreshViews()));
    this.registerEvent(this.app.vault.on('modify',file=>{if(file.path.endsWith('.md'))void this.refreshViews();}));
    this.registerEvent(this.app.vault.on('rename',()=>void this.refreshViews()));
    this.registerEvent(this.app.vault.on('delete',()=>void this.refreshViews()));
    this.registerEvent(this.app.metadataCache.on('changed',()=>void this.refreshViews()));
    if(this.settings.startup)this.app.workspace.onLayoutReady(()=>void this.openDashboard());
  }
  onunload():void{this.moduleDispose();this.widgetDispose();}
  async saveSettings():Promise<void>{await this.saveData(this.settings);}
  async saveComposition(projectId:string,config:CompositionSettings):Promise<void>{
    const previous=this.settings.composition,layouts=this.settings.timelineLayouts;
    if(projectId)this.settings.timelineLayouts={...layouts,[projectId]:normalizeComposition(config)};
    else this.settings.composition=normalizeComposition(config);
    try{await this.saveSettings();}catch(error){this.settings.composition=previous;this.settings.timelineLayouts=layouts;throw error;}
  }
  async setActiveTimeline(projectId:string):Promise<void>{
    if(projectId&&!(await this.projects.all()).projects.some(p=>p.id===projectId&&p.status==='active'))throw new Error('Timeline is unavailable or archived.');
    const previous=this.settings.activeTimeline;this.settings.activeTimeline=projectId;
    try{await this.saveSettings();}catch(error){this.settings.activeTimeline=previous;throw error;}
    await this.refreshViews();
  }
  openSettings():void{(this.app as App&{setting?:{open?():void}}).setting?.open?.();}
  openNote(path:string):void{const file=this.app.vault.getAbstractFileByPath(path);if(file)this.app.workspace.getLeaf(false).openFile(file as never);}
  async openNewEvent():Promise<void>{try{new NewEventModal(this.app,this,await this.projects.activeProject(this.settings.activeTimeline||'')).open();}catch(error){new Notice(`Could not load project: ${String(error)}`);}}
  async openTimelineManager(create=false):Promise<void>{try{const [catalog,records]=await Promise.all([this.projects.all(),this.repository.all()]);new TimelineManagerModal(this,catalog,records,create).open();}catch(error){new Notice(`Could not load timelines: ${String(error)}`);}}
  async openActiveProjectMigration():Promise<void>{try{const project=await this.projects.activeProject(this.settings.activeTimeline||'');if(!project){new Notice('Choose or create a project timeline first.');return;}this.openProjectMigration(project);}catch(error){new Notice(`Could not prepare migration: ${String(error)}`);}}
  openProjectMigration(project:import('./timelines').TimelineProject):void{new ProjectMigrationModal(this,project).open();}
  async openComposition():Promise<void>{try{const [catalog,records]=await Promise.all([this.projects.all(),this.repository.all()]),project=activeProject(this.settings,catalog);new CompositionModal(this,recordsForTimeline(records,project),project?.id||'').open();}catch(error){new Notice(`Could not open layouts: ${String(error)}`);}}
  async openDashboard():Promise<void>{const existing=this.app.workspace.getLeavesOfType(VIEW)[0],leaf=existing||this.app.workspace.getLeaf(true);await leaf.setViewState({type:VIEW,active:true});this.app.workspace.revealLeaf(leaf);}
  async refreshViews():Promise<void>{for(const leaf of this.app.workspace.getLeavesOfType(VIEW))if(leaf.view instanceof TimelineView)await leaf.view.render();}
  private registerDashboardIntegration():void{
    this.moduleDispose=registerDashboardModule(this.app,{id:'visual-timeline',name:'Visual Timeline',command:'visual-timeline:open-dashboard',icon:'timeline',description:'Searchable historical streams, eras, and explicit branches.',order:75});
    this.widgetDispose=registerDashboardWidget(this.app,{id:'visual-timeline/historical-range',name:'Historical Range',icon:'timeline',description:'A compact snapshot of indexed timeline records.',defaultLayout:{w:4,mobileW:12,h:2,order:75},mobile:'responsive',render:async(_,container)=>{
      container.empty();const records=await this.repository.all();if(!records.length){container.createEl('p',{text:'No timeline records yet.'});return;}
      const years=records.map(r=>r.date.start).filter(Boolean);container.createEl('strong',{text:`${records.length} records`});container.createEl('p',{text:`${years[0]} → ${years[years.length-1]}`});
      const open=container.createEl('button',{text:'Open Visual Timeline'});open.onclick=()=>void this.openDashboard();
    }});
  }
}
