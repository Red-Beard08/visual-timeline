import {Modal,Notice,TFile,parseYaml} from 'obsidian';
import type VisualTimeline from './main';
import type {TimelineProject} from './timelines';
import {metadataToRecord} from './utils';

interface BackupEntry{source:string;target:string;backup:string;sha256:string;kind:'record'|'linked-note';timelineId?:string;status:'backed-up'|'moved'|'verified'|'rollback-failed';}
const BACKUP_ROOT='.obsidian/plugins/visual-timeline/migration-backups';
async function sha256(value:string):Promise<string>{
  const bytes=new TextEncoder().encode(value),digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
}
function identity(content:string):{type:string;id:string}{const match=content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!match)throw new Error('Timeline record has no frontmatter.');const fm=parseYaml(match[1]) as Record<string,unknown>;return{type:String(fm.type||''),id:String(fm.timeline_id||fm.id||'')};}

/** A preview-first, reversible move from the legacy records folder into one project. */
export class ProjectMigrationModal extends Modal{
  private files:ReturnType<VisualTimeline['app']['vault']['getMarkdownFiles']>=[];private linkedFiles:ReturnType<VisualTimeline['app']['vault']['getMarkdownFiles']>=[];private loading=true;private busy=false;private error='';
  constructor(private plugin:VisualTimeline,private project:TimelineProject){super(plugin.app);}
  onOpen():void{this.modalEl.addClass('vt-project-modal');this.contentEl.addClass('vt-project-editor');this.contentEl.scrollTop=0;void this.load();}
  onClose():void{this.contentEl.empty();}
  private async load():Promise<void>{
    const source=this.plugin.settings.recordsFolder.replace(/\\/g,'/').replace(/\/$/,'')+'/',all=this.plugin.app.vault.getMarkdownFiles();
    this.files=all.filter(file=>file.path.startsWith(source));
    const records=new Set(this.plugin.repository.files().filter(file=>file.path.startsWith(source)).map(file=>file.path));
    const unsupported=this.files.filter(file=>!records.has(file.path));
    if(unsupported.length)this.error=`${unsupported.length} Markdown file${unsupported.length===1?' is':'s are'} not recognized as timeline records; nothing will move until reviewed.`;
    const moved=new Set(this.files.map(file=>file.path));
    const links=this.plugin.app.metadataCache.resolvedLinks as Record<string,Record<string,number>>|undefined;
    const sources=new Set<string>();for(const [sourcePath,targets] of Object.entries(links||{}))if(Object.keys(targets).some(target=>moved.has(target))&&!moved.has(sourcePath))sources.add(sourcePath);
    this.linkedFiles=all.filter(file=>sources.has(file.path));
    this.loading=false;this.draw();
  }
  private draw():void{
    const c=this.contentEl;c.empty();c.scrollTop=0;c.createEl('h2',{text:'Move legacy records into project'});
    if(this.loading){c.createEl('p',{text:'Preparing a migration preview…'});return;}
    if(this.project.mode!=='project'||!this.project.recordsFolder){c.createEl('p',{cls:'vt-project-error',text:'Select a project-folder timeline before moving legacy records.'});return;}
    const destination=this.project.recordsFolder.replace(/\/$/,'')+'/',collisions=this.files.filter(file=>this.plugin.app.vault.getAbstractFileByPath(destination+file.name));
    c.createEl('p',{cls:'vt-section-note',text:`This preview will move ${this.files.length} existing records from “${this.plugin.settings.recordsFolder}” into “${this.project.name}”. The notes keep their filenames and stable IDs. Linked notes are backed up before Obsidian updates paths.`});
    c.createEl('p',{cls:'vt-section-note',text:`A verified copy of each record and any note linking to it will be retained under ${BACKUP_ROOT}/ before the move.`});
    if(collisions.length)c.createEl('p',{cls:'vt-project-error',text:`${collisions.length} destination filename collision${collisions.length===1?'':'s'} detected. Nothing will move.`});
    if(!this.files.length)c.createEl('p',{text:'No legacy records remain in the configured records folder.'});
    if(this.files.length){const details=c.createEl('details');details.createEl('summary',{text:`Preview ${this.files.length} records`});const list=details.createEl('ul');for(const file of this.files)list.createEl('li',{text:file.basename});}
    if(this.linkedFiles.length)c.createEl('p',{cls:'vt-section-note',text:`${this.linkedFiles.length} other note${this.linkedFiles.length===1?' links':'s link'} to these records; their original contents will be backed up before link repair.`});
    const error=c.createEl('p',{cls:'vt-project-error',attr:{role:'alert'}});error.textContent=this.error;
    const footer=c.createDiv({cls:'vt-editor-footer'}),cancel=footer.createEl('button',{text:'Cancel'});cancel.onclick=()=>this.close();
    const move=footer.createEl('button',{text:`Move ${this.files.length} records`,cls:'mod-cta'});move.disabled=!!this.error||collisions.length>0||!this.files.length||this.busy;move.onclick=()=>void this.migrate(error,move,cancel);
  }
  private async ensureFolder(path:string):Promise<void>{let current='';for(const part of path.split('/')){current=current?`${current}/${part}`:part;if(!this.plugin.app.vault.getAbstractFileByPath(current))await this.plugin.app.vault.createFolder(current);}}
  private async migrate(error:HTMLElement,move:HTMLButtonElement,cancel:HTMLButtonElement):Promise<void>{
    if(this.busy||this.project.mode!=='project'||!this.project.recordsFolder)return;
    this.busy=true;error.textContent='';const buttons=[move,cancel];buttons.forEach(b=>b.disabled=true);
    const source=this.plugin.settings.recordsFolder.replace(/\\/g,'/').replace(/\/$/,'')+'/',destination=this.project.recordsFolder.replace(/\/$/,'')+'/',timestamp=new Date().toISOString().replace(/[:.]/g,'-'),backupRoot=`${BACKUP_ROOT}/${timestamp}`,entries:BackupEntry[]=[],moved:Array<{source:string;target:string}>=[];let manifestFile:TFile|undefined;
    try{
      const current=this.plugin.app.vault.getMarkdownFiles().filter(file=>file.path.startsWith(source));
      if(current.length!==this.files.length)throw new Error('The source records changed after preview. Reopen the migration preview.');
      const ids=new Map<string,string>();for(const file of current){const meta=metadataToRecord(file,this.plugin.app.metadataCache);if(!meta)throw new Error(`A source file is no longer a recognized timeline record: ${file.basename}`);const id=String(meta.frontmatter.timeline_id||meta.frontmatter.id||'');if(!id)throw new Error(`Record has no stable ID; add one before moving it: ${file.basename}`);if(ids.has(id))throw new Error(`Duplicate timeline record ID ${id}; resolve it before migration.`);ids.set(id,file.path);if(this.plugin.app.vault.getAbstractFileByPath(destination+file.name))throw new Error(`Destination collision: ${file.name}`);}
      const backupInputs=[...current.map(file=>({file,kind:'record' as const})),...this.linkedFiles.map(file=>({file,kind:'linked-note' as const}))];
      for(const {file,kind} of backupInputs){const content=await this.plugin.app.vault.read(file),backup=`${backupRoot}/files/${file.path}`;await this.ensureFolder(backup.slice(0,backup.lastIndexOf('/')));const copy=await this.plugin.app.vault.create(backup,content),verify=await this.plugin.app.vault.read(copy),hash=await sha256(content),target=kind==='record'?destination+file.name:file.path,recordIdentity=kind==='record'?identity(content):undefined;if(verify!==content||await sha256(verify)!==hash)throw new Error(`Backup verification failed for ${file.path}`);entries.push({source:file.path,target,backup,sha256:hash,kind,timelineId:recordIdentity?.id,status:'backed-up'});}
      await this.ensureFolder(backupRoot);
      const manifest={schema_version:1,type:'visual-timeline-project-migration-backup',project_id:this.project.id,created:new Date().toISOString(),status:'ready-to-move',source_folder:this.plugin.settings.recordsFolder,destination_folder:this.project.recordsFolder,entries};
      manifestFile=await this.plugin.app.vault.create(`${backupRoot}/manifest.json`,JSON.stringify(manifest,null,2));
      await this.ensureFolder(this.project.recordsFolder);
      for(const file of current){const target=destination+file.name;await this.plugin.app.fileManager.renameFile(file,target);moved.push({source:source+file.name,target});const entry=entries.find(value=>value.kind==='record'&&value.source===file.path);if(entry)entry.status='moved';manifest.status='moving';await this.plugin.app.vault.modify(manifestFile,JSON.stringify(manifest,null,2));}
      const finalFiles=this.plugin.app.vault.getMarkdownFiles().filter(file=>file.path.startsWith(destination));
      if(finalFiles.length!==current.length)throw new Error(`Moved ${finalFiles.length} records but expected ${current.length}.`);
      for(const move of moved){const target=this.plugin.app.vault.getAbstractFileByPath(move.target);if(!(target instanceof TFile))throw new Error(`Moved file is missing: ${move.target}`);const recordIdentity=identity(await this.plugin.app.vault.read(target)),entry=entries.find(value=>value.kind==='record'&&value.target===move.target);if(!recordIdentity.type.startsWith('visual-timeline-')||!entry||recordIdentity.id!==entry.timelineId)throw new Error(`Moved record identity verification failed: ${move.target}`);entry.status='verified';}
      manifest.status='verified';await this.plugin.app.vault.modify(manifestFile,JSON.stringify(manifest,null,2));
      await this.plugin.refreshViews();this.close();new Notice(`Moved ${moved.length} records into ${this.project.name}. Verified backup retained in ${backupRoot}.`);
    }catch(e){
      const failures:string[]=[];for(const entry of [...moved].reverse()){const file=this.plugin.app.vault.getAbstractFileByPath(entry.target);if(file instanceof TFile)try{await this.plugin.app.fileManager.renameFile(file,entry.source);const record=entries.find(value=>value.kind==='record'&&value.target===entry.target);if(record)record.status='backed-up';}catch{failures.push(entry.target);const record=entries.find(value=>value.kind==='record'&&value.target===entry.target);if(record)record.status='rollback-failed';}}
      if(manifestFile)try{await this.plugin.app.vault.modify(manifestFile,JSON.stringify({schema_version:1,type:'visual-timeline-project-migration-backup',project_id:this.project.id,created:timestamp,status:failures.length?'rollback-incomplete':'rolled-back',source_folder:this.plugin.settings.recordsFolder,destination_folder:this.project.recordsFolder,entries},null,2));}catch{}
      error.textContent=`Migration stopped. ${e instanceof Error?e.message:'Unexpected error.'}${failures.length?` Rollback needs attention for ${failures.join(', ')}.`:' Moved files were returned to their source paths where possible.'} Verified backups were retained.`;
      this.busy=false;buttons.forEach(b=>b.disabled=false);
    }
  }
}
