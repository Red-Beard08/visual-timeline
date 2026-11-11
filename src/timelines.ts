import type {TFile} from 'obsidian';
import type {TimelineRecord,TimelineSettings} from './types';
import {CompositionSettings,normalizeComposition} from './composition';

export interface TimelineProject {
  id:string; name:string; description:string; status:'active'|'archived';
  recordIds:string[]; path:string; file:TFile; revision:string;
}
export interface TimelineCatalog {projects:TimelineProject[]; warnings:string[];}
export interface TimelineDraft {name:string;description:string;status:'active'|'archived';recordIds:string[];}

/** Membership is explicit. A record may be shared without copying its note. */
export function recordsForTimeline(records:TimelineRecord[],project?:TimelineProject):TimelineRecord[]{
  if(!project)return records;
  const ids=new Set(project.recordIds);return records.filter(r=>ids.has(r.id));
}
export function activeProject(settings:TimelineSettings,catalog:TimelineCatalog):TimelineProject|undefined{
  return catalog.projects.find(p=>p.id===settings.activeTimeline&&p.status==='active');
}
/** All records retains the original composition; new projects start without type filters. */
export function compositionForTimeline(settings:TimelineSettings,projectId=''):CompositionSettings{
  if(!projectId)return normalizeComposition(settings.composition);
  if(settings.timelineLayouts&&Object.prototype.hasOwnProperty.call(settings.timelineLayouts,projectId))return normalizeComposition(settings.timelineLayouts[projectId]);
  const viewId=`${projectId}-overview`;
  return {version:2,active:viewId,categoryStyles:{...normalizeComposition(settings.composition).categoryStyles},views:[{
    id:viewId,name:'Overview',yearGrid:true,rows:[{id:`${projectId}-row`,name:'Timeline',height:220,enabled:true,maxSubtracks:3,anchorOrder:[],layers:[{
      id:`${projectId}-records`,name:'Records',enabled:true,types:[],categories:[],tags:[],style:'default',plane:'foreground',opacity:1,color:'#659fa0',labels:'adaptive',bandPlacement:'context',bandShape:'box'
    }]}]
  }]};
}
