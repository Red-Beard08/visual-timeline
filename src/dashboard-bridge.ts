import type {App} from "obsidian";
import type {DashboardModuleDefinition,DashboardWidgetDefinition} from "./types";
type Host={registerModule?:(d:DashboardModuleDefinition)=>()=>void;registerWidget?:(d:DashboardWidgetDefinition)=>()=>void};
function register<T>(app:App,method:"registerModule"|"registerWidget",definition:T):()=>void{
  let dispose:()=>void=()=>undefined;let timer:number|undefined;let tries=0;
  const attempt=()=>{const host=(app as App&{plugins?:{getPlugin?:(id:string)=>unknown}}).plugins?.getPlugin?.("red-beard-dashboard") as Host|undefined;const fn=host?.[method] as ((d:T)=>()=>void)|undefined;if(fn){dispose=fn.call(host,definition)||(()=>undefined);return;}if(tries++<120)timer=window.setTimeout(attempt,250);};
  attempt();return()=>{if(timer!==undefined)window.clearTimeout(timer);dispose();};
}
export const registerDashboardModule=(app:App,d:DashboardModuleDefinition)=>register(app,"registerModule",d);
export const registerDashboardWidget=(app:App,d:DashboardWidgetDefinition)=>register(app,"registerWidget",d);
