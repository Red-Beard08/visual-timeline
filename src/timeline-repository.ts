import {App,TFile,normalizePath,parseYaml,stringifyYaml} from 'obsidian';
import type {TimelineSettings} from './types';
import type {TimelineCatalog,TimelineDraft,TimelineProject} from './timelines';
import {id,safeName} from './utils';

const TYPE='visual-timeline-project';
const unique=(ids:string[]):string[]=>[...new Set(ids.map(v=>v.trim()).filter(Boolean))].sort();
function frontmatter(content:string):Record<string,unknown>{
  const match=content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!match)return {};
  const parsed=parseYaml(match[1]);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Invalid frontmatter');
  return parsed;
}
function fields(fm:Record<string,unknown>):string{
  return JSON.stringify([fm.type,fm.schema_version,fm.timeline_project_id,fm.name,fm.description,fm.status,fm.record_ids,fm.records_folder]);
}
function project(file:TFile,fm:Record<string,unknown>):TimelineProject{
  const schema=fm.schema_version;
  if((schema!==1&&schema!==2)||typeof fm.timeline_project_id!=='string'||!fm.timeline_project_id.trim()||typeof fm.name!=='string'||!fm.name.trim()||!['active','archived'].includes(String(fm.status)))throw new Error('Unsupported or incomplete timeline metadata');
  if(schema===1){
    if(!Array.isArray(fm.record_ids)||fm.record_ids.some(v=>typeof v!=='string'))throw new Error('Legacy timeline membership is invalid');
    return {id:fm.timeline_project_id,name:fm.name.trim(),description:typeof fm.description==='string'?fm.description:'',status:fm.status as 'active'|'archived',mode:'legacy',recordIds:unique(fm.record_ids as string[]),path:file.path,file,revision:fields(fm)};
  }
  if(typeof fm.records_folder!=='string'||!fm.records_folder.trim())throw new Error('Project timeline is missing its Records folder.');
  return {id:fm.timeline_project_id,name:fm.name.trim(),description:typeof fm.description==='string'?fm.description:'',status:fm.status as 'active'|'archived',mode:'project',recordIds:[],recordsFolder:normalizePath(fm.records_folder),path:file.path,file,revision:fields(fm)};
}

/** One project note and Records folder per timeline. Version-1 collection notes remain readable. */
export class TimelineProjectRepository{
  constructor(private app:App,private settings:TimelineSettings){}
  folder():string{
    const value=(this.settings.timelinesFolder||`${this.settings.rootFolder}/Timelines`).trim().replace(/\\/g,'/');
    if(!value||value.startsWith('/')||value.includes(':')||value.split('/').some(p=>p==='..'||p==='.'||!p))throw new Error('Timeline folder must be a vault-relative path without . or .. segments.');
    return normalizePath(value);
  }
  async all():Promise<TimelineCatalog>{
    const folder=this.folder()+'/',projects:TimelineProject[]=[],warnings:string[]=[];
    for(const file of this.app.vault.getMarkdownFiles().filter(f=>f.path.startsWith(folder))){
      try{
        const fm=frontmatter(await this.app.vault.cachedRead(file));
        if(fm.type!==TYPE)continue;
        const p=project(file,fm);
        if(p.mode==='project'){
          const parent=file.path.split('/').slice(0,-1).join('/'),expected=normalizePath(`${parent}/Records`);
          if(!file.path.endsWith('/Timeline.md')||p.recordsFolder!==expected||!p.recordsFolder.startsWith(folder))throw new Error('Project folder metadata does not match its Timeline.md location.');
        }
        projects.push(p);
      }catch{warnings.push(`Could not read timeline project: ${file.path}`);}
    }
    const counts=new Map<string,number>();projects.forEach(p=>counts.set(p.id,(counts.get(p.id)||0)+1));
    const duplicates=new Set([...counts].filter(([,n])=>n>1).map(([key])=>key));
    for(const key of duplicates)warnings.push(`Duplicate timeline ID ${key}. Give each workspace a unique ID before opening it.`);
    return {projects:projects.filter(p=>!duplicates.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id)),warnings};
  }
  async save(draft:TimelineDraft,existing?:TimelineProject):Promise<TimelineProject>{
    const name=draft.name.trim();if(!name)throw new Error('Give this timeline a name.');
    const catalog=await this.all();
    if(catalog.warnings.length)throw new Error('Resolve the timeline workspace warnings before saving.');
    if(existing&&!catalog.projects.some(p=>p.id===existing.id&&p.path===existing.path))throw new Error('This timeline was moved or removed. Reopen the manager before saving.');
    if(catalog.projects.some(p=>p.id!==existing?.id&&p.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('A timeline with this name already exists. Choose another name.');
    const values={name,description:draft.description.trim(),status:draft.status};
    if(!existing){
      const projectId=id('VTP'),root=this.folder();let folder=normalizePath(`${root}/${safeName(name)}`);
      if(this.app.vault.getAbstractFileByPath(folder))folder=normalizePath(`${folder} ${projectId.slice(-6)}`);
      const recordsFolder=normalizePath(`${folder}/Records`);await this.ensureFolder(recordsFolder);
      const now=new Date().toISOString(),fm={type:TYPE,schema_version:2,timeline_project_id:projectId,...values,records_folder:recordsFolder,created:now,updated:now};
      const file=await this.app.vault.create(normalizePath(`${folder}/Timeline.md`),`---\n${stringifyYaml(fm)}---\n\n# ${name}\n\nThis project owns the timeline records in its Records folder. New records are created here automatically.\n\n## Notes\n\n`);
      return project(file,fm);
    }
    const file=this.app.vault.getAbstractFileByPath(existing.path);
    if(!(file instanceof TFile))throw new Error('Timeline workspace is no longer available.');
    const currentFm=frontmatter(await this.app.vault.read(file));
    if(fields(currentFm)!==existing.revision)throw new Error('This timeline changed elsewhere. Reopen it before saving.');
    const current=project(file,currentFm);
    if(current.name===values.name&&current.description===values.description&&current.status===values.status)return current;
    await this.app.fileManager.processFrontMatter(file,fm=>{
      if(fields(fm)!==existing.revision)throw new Error('This timeline changed elsewhere. Reopen it before saving.');
      Object.assign(fm,values,{updated:new Date().toISOString()});
    });
    return project(file,frontmatter(await this.app.vault.read(file)));
  }
  async activeProject(projectId:string):Promise<TimelineProject|undefined>{
    if(!projectId)return undefined;
    const catalog=await this.all();return catalog.projects.find(p=>p.id===projectId&&p.status==='active');
  }
  private async ensureFolder(path:string):Promise<void>{const parts=path.split('/');let current='';for(const part of parts){current=current?`${current}/${part}`:part;if(!this.app.vault.getAbstractFileByPath(current))await this.app.vault.createFolder(current);}}
}
