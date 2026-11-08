import {ItemView, WorkspaceLeaf} from "obsidian";
import type {TimelineRecord} from "./types";
import type VisualTimeline from "./main";
import {dateValue, rangeOf} from "./utils";

export const VIEW = "visual-timeline-dashboard";

export class TimelineView extends ItemView {
  private query = "";
  private layer = "";
  private records: TimelineRecord[] = [];

  constructor(leaf: WorkspaceLeaf, private plugin: VisualTimeline) { super(leaf); }
  getViewType(): string { return VIEW; }
  getDisplayText(): string { return "Visual Timeline"; }
  async onOpen(): Promise<void> { await this.render(); }

  async render(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("visual-timeline-dashboard");
    this.records = await this.plugin.repository.all();
    const hero = root.createDiv({cls: "vt-hero"});
    hero.createEl("div", {cls: "vt-eyebrow", text: "RED-BEARD · VISUAL HISTORY"});
    hero.createEl("h1", {text: "Visual Timeline"});
    hero.createEl("p", {text: "See events, eras, kingdoms, and explicit historical streams in one local, searchable view."});
    const actions = hero.createDiv({cls: "vt-actions"});
    this.button(actions, "New timeline event", () => this.plugin.openNewEvent());
    this.button(actions, "Refresh", () => void this.render());
    this.button(actions, "Settings", () => this.plugin.openSettings());
    const controls = root.createDiv({cls: "vt-controls"});
    const search = controls.createEl("input", {type: "search", placeholder: "Search events, entities, tags, or places", attr: {"aria-label": "Search timeline"}});
    search.value = this.query;
    search.oninput = () => { this.query = search.value; this.draw(root); };
    const select = controls.createEl("select", {attr: {"aria-label": "Filter by layer"}});
    select.createEl("option", {text: "All layers", value: ""});
    for (const layer of this.plugin.settings.layers) select.createEl("option", {text: layer, value: layer});
    select.value = this.layer;
    select.onchange = () => { this.layer = select.value; this.draw(root); };
    this.draw(root);
  }

  private draw(root: HTMLElement): void {
    root.querySelectorAll(".vt-body").forEach(el => el.remove());
    const body = root.createDiv({cls: "vt-body"});
    const q = this.query.toLocaleLowerCase();
    const records = this.records.filter(r => (!q || `${r.title} ${r.tags.join(" ")} ${r.categories.join(" ")} ${r.locations.join(" ")} ${r.entities.join(" ")}`.toLocaleLowerCase().includes(q)) && (!this.layer || r.layers.includes(this.layer)));
    if (!records.length) { body.createDiv({cls: "vt-empty", text: "No timeline records match this view."}); return; }
    const bounds = rangeOf(records);
    body.createDiv({cls: "vt-range", text: `${records.length} records · ${bounds.min < 0 ? `${Math.abs(bounds.min)} BC` : bounds.min} → ${bounds.max < 0 ? `${Math.abs(bounds.max)} BC` : bounds.max}`});
    const axis = body.createDiv({cls: "vt-axis"});
    [0, .25, .5, .75, 1].forEach(position => {
      const tick = axis.createDiv({cls: "vt-axis-tick"});
      tick.style.left = `${position * 100}%`;
      tick.createSpan({text: this.formatYear(bounds.min + (bounds.max - bounds.min) * position)});
    });

    const kingdoms = records.filter(record => record.type === "visual-timeline-kingdom");
    if (kingdoms.length) this.renderKingdomChart(body, kingdoms, bounds);

    const detailRecords = records.filter(record => record.type !== "visual-timeline-kingdom");
    const lanes = new Map<string, TimelineRecord[]>();
    for (const record of detailRecords) {
      const lane = record.layers[0] || record.type.replace("visual-timeline-", "");
      if (!lanes.has(lane)) lanes.set(lane, []);
      lanes.get(lane)!.push(record);
    }
    const graph = body.createDiv({cls: "vt-graph"});
    for (const [laneName, laneRecords] of lanes) {
      const lane = graph.createDiv({cls: "vt-lane"});
      lane.createDiv({cls: "vt-lane-label", text: laneName});
      const track = lane.createDiv({cls: "vt-track"});
      for (const record of laneRecords) this.renderRecord(track, record, bounds);
    }

    const relationRecords = records.filter(r => Object.values(r.relations).some(v => v.length));
    if (relationRecords.length) {
      const rel = body.createDiv({cls: "vt-relations"});
      rel.createEl("h2", {text: "Explicit relationships"});
      for (const record of relationRecords.slice(0, 12)) {
        const row = rel.createDiv({cls: "vt-relation-row"});
        row.createEl("strong", {text: record.title});
        const labels: string[] = [];
        for (const [key, values] of Object.entries(record.relations)) if (values.length) labels.push(`${key.replace(/_/g, " ")}: ${values.join(", ")}`);
        row.createEl("span", {text: labels.join(" · ")});
      }
    }
  }

  private renderRecord(track: HTMLElement, record: TimelineRecord, bounds: {min: number; max: number}): void {
    const start = dateValue(record.date.start), end = dateValue(record.date.end || record.date.start);
    const left = Math.max(0, Math.min(100, (start - bounds.min) / (bounds.max - bounds.min) * 100));
    const width = Math.max(2, Math.min(96, (Math.max(end, start + 1) - start) / (bounds.max - bounds.min) * 100));
    const card = track.createDiv({cls: "vt-record", attr: {tabindex: "0", "aria-label": `${record.title}, ${record.date.display || record.date.start}`}});
    card.style.left = `${left}%`;
    card.style.width = `${width}%`;
    card.createEl("strong", {text: record.title});
    card.createEl("small", {text: record.date.display || record.date.start});
    if (record.date.circa) card.addClass("is-circa");
    card.onclick = () => this.plugin.openNote(record.path);
    card.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.plugin.openNote(record.path); } };
  }

  private renderKingdomChart(parent: HTMLElement, records: TimelineRecord[], bounds: {min: number; max: number}): void {
    const section = parent.createDiv({cls: "vt-kingdom-section"});
    section.createEl("h2", {text: "Kingdom streams"});
    section.createEl("p", {cls: "vt-section-note", text: "The united monarchy continues into two explicit successor kingdoms at the split point. Select a stream to open its source note."});
    const chart = section.createDiv({cls: "vt-kingdom-chart"});
    const ordered = [...records].sort((a, b) => dateValue(b.date.start) - dateValue(a.date.start));
    const rows = ordered.map((record, index) => {
      const row = chart.createDiv({cls: "vt-kingdom-row", attr: {"data-record-id": record.id}});
      const label = row.createDiv({cls: "vt-kingdom-label"});
      label.createEl("strong", {text: record.title.replace("Kingdom of ", "")});
      label.createEl("small", {text: record.date.display || record.date.start});
      const track = row.createDiv({cls: "vt-kingdom-track"});
      const start = dateValue(record.date.start), end = dateValue(record.date.end || record.date.start);
      const left = Math.max(0, Math.min(100, (start - bounds.min) / (bounds.max - bounds.min) * 100));
      const width = Math.max(2, Math.min(96, (Math.max(end, start + 1) - start) / (bounds.max - bounds.min) * 100));
      const bar = track.createDiv({cls: "vt-kingdom-bar", attr: {tabindex: "0", "aria-label": `${record.title}, ${record.date.display || record.date.start}`}});
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      if (record.id !== "VTL-KINGDOM-UNITED") row.addClass("is-branch");
      bar.onclick = () => this.plugin.openNote(record.path);
      bar.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.plugin.openNote(record.path); } };
      return {record, index};
    });
    const rowHeight = 56;
    const connectors = chart.createDiv({cls: "vt-kingdom-connectors", attr: {"aria-hidden": "true"}});
    connectors.style.height = `${Math.max(rowHeight, rows.length * rowHeight)}px`;
    const byId = new Map(rows.map(row => [row.record.id, row]));
    for (const source of rows) for (const targetId of source.record.relations.succeeded_by) {
      const target = byId.get(targetId);
      if (!target) continue;
      const x = Math.max(0, Math.min(100, (dateValue(target.record.date.start) - bounds.min) / (bounds.max - bounds.min) * 100));
      const line = connectors.createDiv({cls: "vt-kingdom-connector"});
      line.style.left = `${x}%`;
      line.style.top = `${Math.min(source.index, target.index) * rowHeight + rowHeight / 2}px`;
      line.style.height = `${Math.abs(target.index - source.index) * rowHeight}px`;
    }
    chart.prepend(connectors);
  }

  private formatYear(value: number): string { const year = Math.round(value); return year < 0 ? `${Math.abs(year)} BC` : `AD ${year || 1}`; }
  private button(parent: HTMLElement, label: string, action: () => void): void { const b = parent.createEl("button", {text: label}); b.onclick = action; }
}
