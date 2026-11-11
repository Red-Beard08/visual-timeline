import {App,TFile,normalizePath,stringifyYaml} from "obsidian";
import {DEFAULT_SETTINGS,TimelineRecord,TimelineSettings,RecordType,TimelineDate} from "./types";
import {dateValue,list,metadataToRecord,parseDate,relations,text,id,safeName} from "./utils";

export class TimelineRepository{
  constructor(public app:App,public settings:TimelineSettings){}
  files():TFile[]{return this.app.vault.getMarkdownFiles();}
  async all():Promise<TimelineRecord[]>{const records:TimelineRecord[]=[];for(const file of this.files()){const meta=metadataToRecord(file,this.app.metadataCache);if(!meta)continue;const fm=meta.frontmatter;records.push({id:text(fm.timeline_id||fm.id)||`path:${file.path}`,title:text(fm.title)||file.basename,type:meta.type!,status:text(fm.status)||"active",tags:list(fm.tags),layers:list(fm.layers),categories:list(fm.categories),locations:list(fm.locations),entities:list(fm.entities),date:parseDate(fm.date||{start:fm.start_date,end:fm.end_date,precision:fm.date_precision,circa:fm.circa,display:fm.date_display}),relations:relations(fm),path:file.path,file,excerpt:meta.excerpt,aliases:list(fm.aliases)});}return records.sort((a,b)=>dateValue(a.date.start)-dateValue(b.date.start)||a.title.localeCompare(b.title));}
  async createEvent(input:NewRecord):Promise<TFile>{return (await this.createEventRecord(input)).file;}
  async createEventRecord(input:NewRecord):Promise<{id:string;file:TFile}>{
    const recordId=id(this.settings.idPrefix),folder=normalizePath(this.settings.recordsFolder);await this.ensureFolder(folder);
    const path=normalizePath(`${folder}/${safeName(this.settings.filenameTemplate.replace("{id}",recordId).replace("{title}",input.title))}.md`);
    const now=new Date().toISOString(),fm={type:input.type,schema_version:1,timeline_id:recordId,title:input.title,status:'active',tags:input.tags.length?input.tags:['timeline'],layers:input.layers.length?input.layers:['general'],categories:input.categories.length?input.categories:['event'],locations:input.locations,entities:input.entities,date:{...input.date,display:input.date.display||input.date.start},relations:{continued_from:[],split_into:[],merged_into:[],preceded_by:[],succeeded_by:[],related_to:[],contemporary_with:[]},created:now,updated:now};
    const file=await this.app.vault.create(path,`---\n${stringifyYaml(fm)}---\n\n# ${input.title}\n\n`);return {id:recordId,file};
  }
  private async ensureFolder(path:string):Promise<void>{const parts=path.split("/");let current="";for(const part of parts){current=current?`${current}/${part}`:part;if(!this.app.vault.getAbstractFileByPath(current))await this.app.vault.createFolder(current);}}
}
export interface NewRecord{title:string;type:RecordType;date:TimelineDate;tags:string[];layers:string[];categories:string[];locations:string[];entities:string[];}
