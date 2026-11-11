import {historicalDate} from './dates';
import type {MetadataCache, TFile} from "obsidian";
import type {RecordType, TimelineDate, TimelineRelations} from "./types";

export const RECORD_TYPES: RecordType[]=["visual-timeline-event","visual-timeline-kingdom","visual-timeline-era","visual-timeline-period","visual-timeline-place","visual-timeline-person","visual-timeline-culture"];
export function text(value:unknown):string{return typeof value==="string"?value.trim():value==null?"":String(value).trim();}
export function list(value:unknown):string[]{if(Array.isArray(value))return value.map(text).filter(Boolean);if(typeof value==="string")return value.split(",").map(text).filter(Boolean);return [];}
export function relationList(value:unknown):string[]{return list(value).map(value=>value.replace(/^\[\[|\]\]$/g,"").split("|")[0].trim());}
export function safeName(value:string):string{return value.replace(/[\\/:*?"<>|#^[\]]/g,"-").replace(/\s+/g," ").trim().slice(0,140)||"Untitled";}
export function id(prefix:string= "VTL"):string{return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,10).toUpperCase()}`;}
export function parseDate(raw:unknown):TimelineDate{if(raw&&typeof raw==="object"){const v=raw as Record<string,unknown>;return{start:text(v.start),end:text(v.end)||undefined,precision:(['day','month','year','range','unknown'].includes(text(v.precision))?text(v.precision):"unknown") as TimelineDate["precision"],circa:v.circa===true||text(v.circa)==="true",display:text(v.display)||undefined,note:text(v.note)||undefined};}const value=text(raw);return{start:value,precision:value?"year":"unknown",circa:false,display:value||undefined};}
export function dateValue(value:string):number{return historicalDate(value);}
export function rangeOf(records:{date:TimelineDate}[]):{min:number;max:number}{const values=records.flatMap(r=>[dateValue(r.date.start),dateValue(r.date.end||r.date.start)]).filter(Number.isFinite);if(!values.length)return{min:0,max:1};const min=Math.min(...values),max=Math.max(...values);return{min,max:min===max?min+1:max};}
export function metadataToRecord(file:TFile,cache:MetadataCache):{type?:RecordType;frontmatter:Record<string,unknown>;excerpt:string}|null{const fm=cache.getFileCache(file)?.frontmatter as Record<string,unknown>|undefined;if(!fm||!RECORD_TYPES.includes(text(fm.type) as RecordType))return null;return{type:text(fm.type) as RecordType,frontmatter:fm,excerpt:""};}
export function relations(fm:Record<string,unknown>):TimelineRelations{const nested=fm.relations&&typeof fm.relations==='object'?fm.relations as Record<string,unknown>:{};return Object.fromEntries(['continued_from','split_into','merged_into','preceded_by','succeeded_by','related_to','contemporary_with'].map(k=>[k,[...new Set([...relationList(nested[k]),...relationList(fm[k])])]])) as unknown as TimelineRelations;}
