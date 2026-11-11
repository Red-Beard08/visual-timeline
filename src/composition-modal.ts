import {Modal,Notice,Setting} from 'obsidian';
import type VisualTimeline from './main';
import type {TimelineRecord} from './types';
import {CompositionSettings,DisplayStyle,TimelineLayer,STYLES,newLayer,newRow,uid,reorder,normalizeComposition,matches} from './composition';
import {RECORD_TYPES} from './utils';

/** Transactional editor: every control edits a private draft; Cancel never writes. */
export class CompositionModal extends Modal {
  private draft:CompositionSettings;
  constructor(private plugin:VisualTimeline,private records:TimelineRecord[]){super(plugin.app);this.draft=normalizeComposition(JSON.parse(JSON.stringify(plugin.settings.composition)));}
  onOpen():void{this.modalEl.addClass('vt-composition-modal');this.draw();this.contentEl.scrollTop=0;}
  private button(parent:HTMLElement,label:string,action:()=>void):HTMLButtonElement {const b=parent.createEl('button',{text:label});b.onclick=action;return b;}
  private draw():void {
    const c=this.contentEl;c.empty();c.addClass('vt-composition-editor');
    c.createEl('h2',{text:'Configure timeline'});
    c.createEl('p',{cls:'vt-section-note',text:'Rows share a date scale. Layers overlay within a row. Changes apply only when you save; historical notes are never changed.'});
    const view=this.draft.views.find(v=>v.id===this.draft.active)!;
    new Setting(c).setName('Saved view').addDropdown(d=>{for(const v of this.draft.views)d.addOption(v.id,v.name);d.setValue(view.id).onChange(id=>{this.draft.active=id;this.draw();});});
    new Setting(c).setName('View name').addText(t=>t.setValue(view.name).onChange(v=>view.name=v));
    new Setting(c).setName('Full-height year lines').setDesc('Extend the date ruler ticks vertically behind every row. Saved separately for each view.').addToggle(t=>t.setValue(view.yearGrid===true).onChange(v=>view.yearGrid=v));
    const viewActions=c.createDiv({cls:'vt-editor-actions'});
    this.button(viewActions,'New view',()=>{const v={id:uid(),name:'New view',rows:[newRow()]};this.draft.views.push(v);this.draft.active=v.id;this.draw();});
    this.button(viewActions,'Duplicate view',()=>{const v=JSON.parse(JSON.stringify(view));v.id=uid();v.name+=' copy';this.draft.views.push(v);this.draft.active=v.id;this.draw();});
    this.button(viewActions,'Remove view',()=>{this.draft.views=this.draft.views.filter(v=>v!==view);this.draft.active=this.draft.views[0].id;this.draw();}).disabled=this.draft.views.length===1;
    view.rows.forEach((row,index)=>{
      const section=c.createEl('section',{cls:'vt-row-editor'});
      const header=section.createDiv({cls:'vt-editor-heading'});header.createEl('h3',{text:`Row ${index+1} · ${row.name}`});
      this.button(header,'Remove row',()=>{view.rows.splice(index,1);this.draw();});
      new Setting(section).setName('Row name').addText(t=>t.setValue(row.name).onChange(v=>row.name=v));
      new Setting(section).setName('Position').setDesc('1 is the first row. Changing the number shifts the other rows.').addText(t=>{t.inputEl.type='number';t.inputEl.min='1';t.inputEl.max=String(view.rows.length);t.setValue(String(index+1));t.inputEl.onchange=()=>{reorder(view.rows,index,(Number(t.getValue())||1)-1);this.draw();};});
      new Setting(section).setName('Minimum height').setDesc('CSS pixels, independent of zoom. Only historical lanes add height, never labels.').addText(t=>{t.inputEl.type='number';t.inputEl.min='120';t.inputEl.max='1200';t.setValue(String(row.height)).onChange(v=>row.height=Math.max(120,Math.min(1200,Number(v)||220)));});
      new Setting(section).setName('Visible overlap tracks').setDesc('Additional overlaps become selectable count markers.').addDropdown(d=>{[1,2,3,4,5,6].forEach(n=>d.addOption(String(n),String(n)));d.setValue(String(row.maxSubtracks||3)).onChange(v=>row.maxSubtracks=Number(v));});
      const order=section.createEl('details');order.createEl('summary',{text:'Anchor ordering'});
      new Setting(order).setName('Anchor IDs in preferred order').setDesc('Comma-separated stable IDs; unspecified anchors use date and ID order.').addText(t=>t.setValue((row.anchorOrder||[]).join(', ')).onChange(v=>row.anchorOrder=v.split(',').map(s=>s.trim()).filter(Boolean)));
      new Setting(section).setName('Show row').addToggle(t=>t.setValue(row.enabled).onChange(v=>row.enabled=v));
      row.layers.forEach((layer,i)=>{
        const details=section.createEl('details',{cls:'vt-layer-editor'});
        details.createEl('summary',{text:`${i+1}. ${layer.name} · ${layer.plane} · ${layer.style}`});
        new Setting(details).setName('Layer name').addText(t=>t.setValue(layer.name).onChange(v=>layer.name=v));
        new Setting(details).setName('Show layer').addToggle(t=>t.setValue(layer.enabled).onChange(v=>layer.enabled=v));
        new Setting(details).setName('Position within plane').setDesc('Layers later in the list draw on top. Backgrounds always stay behind foregrounds.').addText(t=>{t.inputEl.type='number';t.inputEl.min='1';t.inputEl.max=String(row.layers.length);t.setValue(String(i+1));t.inputEl.onchange=()=>{reorder(row.layers,i,(Number(t.getValue())||1)-1);this.draw();};});
        new Setting(details).setName('Move to row').addDropdown(d=>{view.rows.forEach(r=>d.addOption(r.id,r.name));d.setValue(row.id).onChange(id=>{const destination=view.rows.find(r=>r.id===id);if(destination&&destination!==row){row.layers.splice(i,1);destination.layers.push(layer);this.draw();}});});
        this.filters(details,layer);
        new Setting(details).setName('Attach to anchor layer').setDesc('Follow explicit relationships to records in another layer of this row. No name-based guessing.').addDropdown(d=>{d.addOption('','Independent');for(const l of row.layers.filter(l=>l!==layer&&!l.attachment))d.addOption(l.id,l.name);if(layer.attachment&&!row.layers.some(l=>l.id===layer.attachment!.anchorLayer))d.addOption(layer.attachment.anchorLayer,'Unavailable anchor layer');d.setValue(layer.attachment?.anchorLayer||'').onChange(v=>{layer.attachment=v?{anchorLayer:v,relationship:'related_to',overrides:{}}:undefined;this.draw();});});
        if(layer.attachment){
          const a=layer.attachment,anchor=row.layers.find(l=>l.id===a.anchorLayer);
          if(!anchor||!anchor.enabled)details.createEl('p',{text:'Warning: the anchor layer is unavailable. Records will appear in Unassigned.'});
          new Setting(details).setName('Relationship field').addDropdown(d=>{Object.entries(this.plugin.settings.relationshipLabels).forEach(([k,v])=>d.addOption(k,v));d.setValue(a.relationship).onChange(v=>a.relationship=v as typeof a.relationship);});
          const overrides=details.createEl('details');overrides.createEl('summary',{text:'Explicit anchor overrides'});
          overrides.createEl('p',{cls:'vt-section-note',text:'Overrides affect this display only. Notes are never rewritten.'});
          for(const record of this.records.filter(r=>matches(r,layer)))new Setting(overrides).setName(record.title).addDropdown(d=>{d.addOption('','Use note relationship');if(a.overrides[record.id])d.addOption(a.overrides[record.id],a.overrides[record.id]);for(const r of this.records.filter(r=>anchor&&matches(r,anchor)))d.addOption(r.id,r.title);d.setValue(a.overrides[record.id]||'').onChange(v=>{if(v)a.overrides[record.id]=v;else delete a.overrides[record.id];});});
        }
        new Setting(details).setName('Display style').addDropdown(d=>{d.addOption('default','Category default');STYLES.forEach(s=>d.addOption(s,s==='box'?'Box / duration bar':s[0].toUpperCase()+s.slice(1)));d.setValue(layer.style).onChange(v=>layer.style=v as TimelineLayer['style']);});
        new Setting(details).setName('Placement').addDropdown(d=>d.addOption('background','Background').addOption('foreground','Foreground').setValue(layer.plane).onChange(v=>layer.plane=v as TimelineLayer['plane']));
        new Setting(details).setName('Band layout').setDesc('Integrated categories share their related streams’ centerlines. Their own dates set the box boundaries; kingdom and ruler dates never change.').addDropdown(d=>d.addOption('integrated','Integrated with related streams').addOption('context','Separate context strip').addOption('lane','Behind the assigned lane').setValue(layer.bandPlacement||'context').onChange(v=>layer.bandPlacement=v as TimelineLayer['bandPlacement']));
        new Setting(details).setName('Integrated category shape').setDesc('A category box extends above and below the stream. Stream tint keeps the earlier contour-following treatment. Applies to integrated bands.').addDropdown(d=>d.addOption('box','Category box — taller than stream').addOption('contour','Stream tint and continuation').setValue(layer.bandShape||'box').onChange(v=>layer.bandShape=v as TimelineLayer['bandShape']));
        new Setting(details).setName('Shape height (px)').setDesc('Leave blank for automatic: category 88, stream 40, item 14, context strip 32. Category boxes always leave at least 12px above and below their stream. Height never changes dates or zoom.').addText(t=>{t.inputEl.type='number';t.inputEl.min='8';t.inputEl.max='240';t.inputEl.placeholder='Automatic';t.setValue(layer.height===undefined?'':String(layer.height)).onChange(v=>{if(!v.trim())delete layer.height;else if(Number.isFinite(Number(v)))layer.height=Math.max(8,Math.min(240,Number(v)));});});
        new Setting(details).setName('Tint streams from attached durations').setDesc('When every attached duration uses one color, use it for that anchor stream too. Mixed colors retain the stream layer color.').addToggle(t=>t.setValue(layer.tintFromAttached===true).onChange(v=>layer.tintFromAttached=v));
        new Setting(details).setName('Opacity').addSlider(s=>s.setLimits(10,100,5).setValue(layer.opacity*100).setDynamicTooltip().onChange(v=>layer.opacity=v/100));
        new Setting(details).setName('Color').addColorPicker(p=>p.setValue(layer.color).onChange(v=>layer.color=v));
        new Setting(details).setName('Labels').setDesc('Names use aligned rails and may truncate in dense periods. Labels never move records. Full names remain in details.').addDropdown(d=>d.addOption('adaptive','Adaptive: aligned name rails').addOption('always','Prefer visible names').addOption('selection','On hover or keyboard focus').addOption('hidden','Hidden (details remain)').setValue(layer.labels).onChange(v=>layer.labels=v as TimelineLayer['labels']));
        this.button(details,'Remove layer',()=>{row.layers.splice(i,1);this.draw();});
      });
      this.button(section,'Add layer',()=>{row.layers.push(newLayer());this.draw();});
    });
    this.button(c,'Add row',()=>{view.rows.push(newRow(`Row ${view.rows.length+1}`));this.draw();});
    const defaults=c.createEl('details',{cls:'vt-category-defaults'});defaults.createEl('summary',{text:'Category display defaults'});
    defaults.createEl('p',{cls:'vt-section-note',text:'Used by layers set to Category default. For records with several categories, the first configured category wins; the note type is the fallback.'});
    const categories=[...new Set([...this.plugin.settings.categories,...this.records.flatMap(r=>r.categories),...RECORD_TYPES.map(t=>t.replace('visual-timeline-','')),...Object.keys(this.draft.categoryStyles)])].sort();
    for(const category of categories)new Setting(defaults).setName(category).addDropdown(d=>{d.addOption('','Automatic (box)');STYLES.forEach(s=>d.addOption(s,s));d.setValue(this.draft.categoryStyles[category]||'').onChange(v=>{if(v)this.draft.categoryStyles[category]=v as DisplayStyle;else delete this.draft.categoryStyles[category];});});
    const footer=c.createDiv({cls:'vt-editor-footer'});
    this.button(footer,'Cancel',()=>this.close());
    const save=this.button(footer,'Save composition',()=>void this.save());save.addClass('mod-cta');
  }
  private filters(parent:HTMLElement,layer:TimelineLayer):void {
    parent.createEl('p',{cls:'vt-section-note',text:'No selection means all. Options within each group match ANY; different groups must ALL match.'});
    const groups:[keyof Pick<TimelineLayer,'types'|'categories'|'tags'>,string,string[]][]=[['types','Note types',RECORD_TYPES],['categories','Categories',[...this.plugin.settings.categories,...this.records.flatMap(r=>r.categories),...layer.categories]],['tags','Tags',[...this.records.flatMap(r=>r.tags),...layer.tags]]];
    for(const [key,title,values]of groups){const field=parent.createEl('fieldset',{cls:'vt-filter-options'});field.createEl('legend',{text:title});
      for(const value of [...new Set(values)].sort()){const label=field.createEl('label');const input=label.createEl('input',{type:'checkbox'});input.checked=layer[key].includes(value);label.createSpan({text:value.replace('visual-timeline-','')});input.onchange=()=>{layer[key]=input.checked?[...layer[key],value]:layer[key].filter(v=>v!==value);};}
      if(!values.length)field.createEl('p',{text:'No options found in current notes.'});
    }
  }
  private async save():Promise<void>{
    const previous=this.plugin.settings.composition;
    try{this.plugin.settings.composition=normalizeComposition(this.draft);await this.plugin.saveSettings();}
    catch(error){this.plugin.settings.composition=previous;new Notice(`Could not save composition: ${String(error)}`);return;}
    this.close();
    try{await this.plugin.refreshViews();}catch{new Notice('Composition saved. Reopen the timeline to refresh the view.');}
  }
}
