/* Visual Timeline: local Markdown-first historical visualization. */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => VisualTimeline
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var TimelineSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Visual Timeline" });
    containerEl.createEl("h3", { text: "Storage" });
    this.text(containerEl, "Root folder", "Markdown root folder", "rootFolder");
    this.text(containerEl, "Records folder", "Folder scanned for created records", "recordsFolder");
    this.text(containerEl, "Index file", "Optional index note", "indexFile");
    this.text(containerEl, "Local map asset", "Optional local SVG/GeoJSON path; no network is used", "mapAssetPath");
    containerEl.createEl("h3", { text: "Timeline" });
    this.number(containerEl, "Default range (years)", "Years shown around the selected range", "defaultRangeYears");
    this.text(containerEl, "Default layer", "Initial layer filter", "defaultLayer");
    new import_obsidian.Setting(containerEl).setName("Show unresolved relationships").setDesc("Keep unresolved references visible for review.").addToggle((t) => t.setValue(this.plugin.settings.showUnresolved).onChange(async (v) => {
      this.plugin.settings.showUnresolved = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Compact layout").addToggle((t) => t.setValue(this.plugin.settings.compact).onChange(async (v) => {
      this.plugin.settings.compact = v;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Taxonomy" });
    new import_obsidian.Setting(containerEl).setName("Layers").setDesc("Comma-separated lane names").addText((t) => t.setValue(this.plugin.settings.layers.join(", ")).onChange(async (v) => {
      this.plugin.settings.layers = v.split(",").map((x) => x.trim()).filter(Boolean);
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Categories").setDesc("Comma-separated record categories").addText((t) => t.setValue(this.plugin.settings.categories.join(", ")).onChange(async (v) => {
      this.plugin.settings.categories = v.split(",").map((x) => x.trim()).filter(Boolean);
      await this.plugin.saveSettings();
    }));
  }
  text(c, name, desc, key) {
    new import_obsidian.Setting(c).setName(name).setDesc(desc).addText((t) => t.setValue(String(this.plugin.settings[key])).onChange(async (v) => {
      this.plugin.settings[key] = v.trim();
      await this.plugin.saveSettings();
    }));
  }
  number(c, name, desc, key) {
    new import_obsidian.Setting(c).setName(name).setDesc(desc).addText((t) => t.setValue(String(this.plugin.settings[key])).onChange(async (v) => {
      const n = Math.max(1, Number(v) || 1);
      this.plugin.settings[key] = n;
      await this.plugin.saveSettings();
    }));
  }
};

// src/repository.ts
var import_obsidian2 = require("obsidian");

// src/types.ts
var DEFAULT_SETTINGS = { settingsVersion: 1, rootFolder: "Collections/Visual Timeline", recordsFolder: "Collections/Visual Timeline/Records", indexFile: "Collections/Visual Timeline/Visual Timeline Index.md", mapAssetPath: "", idPrefix: "VTL", filenameTemplate: "{id} - {title}", defaultRangeYears: 100, defaultLayer: "", showUnresolved: true, compact: false, dashboardWidget: true, startup: false, autoRefreshSeconds: 0, layers: ["church", "kingdoms", "cultures", "people", "places"], categories: ["event", "kingdom", "era", "period", "place", "person", "culture"], relationshipLabels: { continued_from: "Continued from", split_into: "Split into", merged_into: "Merged into", preceded_by: "Preceded by", succeeded_by: "Succeeded by", related_to: "Related to", contemporary_with: "Contemporary with" } };

// src/utils.ts
var RECORD_TYPES = ["visual-timeline-event", "visual-timeline-kingdom", "visual-timeline-era", "visual-timeline-period", "visual-timeline-place", "visual-timeline-person", "visual-timeline-culture"];
function text(value) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}
function list(value) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(text).filter(Boolean);
  return [];
}
function relationList(value) {
  return list(value).map((value2) => value2.replace(/^\[\[|\]\]$/g, "").split("|")[0].trim());
}
function safeName(value) {
  return value.replace(/[\\/:*?"<>|#^[\]]/g, "-").replace(/\s+/g, " ").trim().slice(0, 140) || "Untitled";
}
function id(prefix = "VTL") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}
function parseDate(raw) {
  if (raw && typeof raw === "object") {
    const v = raw;
    return { start: text(v.start), end: text(v.end) || void 0, precision: ["day", "month", "year", "range", "unknown"].includes(text(v.precision)) ? text(v.precision) : "unknown", circa: v.circa === true || text(v.circa) === "true", display: text(v.display) || void 0, note: text(v.note) || void 0 };
  }
  const value = text(raw);
  return { start: value, precision: value ? "year" : "unknown", circa: false, display: value || void 0 };
}
function dateValue(value) {
  if (!value) return 0;
  const m = /(-?\d{1,6})/.exec(value);
  if (!m) return 0;
  let n = Number(m[1]);
  if (/\bBC\b/i.test(value) && n > 0) n = -n;
  return n;
}
function rangeOf(records) {
  const values = records.flatMap((r) => [dateValue(r.date.start), dateValue(r.date.end || r.date.start)]).filter(Number.isFinite);
  if (!values.length) return { min: 0, max: 1 };
  const min = Math.min(...values), max = Math.max(...values);
  return { min, max: min === max ? min + 1 : max };
}
function metadataToRecord(file, cache) {
  var _a;
  const fm = (_a = cache.getFileCache(file)) == null ? void 0 : _a.frontmatter;
  if (!fm || !RECORD_TYPES.includes(text(fm.type))) return null;
  return { type: text(fm.type), frontmatter: fm, excerpt: "" };
}
function relations(fm) {
  var _a, _b, _c, _d, _e, _f, _g;
  const empty = () => relationList([]);
  return { continued_from: relationList((_a = fm.continued_from) != null ? _a : empty()), split_into: relationList((_b = fm.split_into) != null ? _b : empty()), merged_into: relationList((_c = fm.merged_into) != null ? _c : empty()), preceded_by: relationList((_d = fm.preceded_by) != null ? _d : empty()), succeeded_by: relationList((_e = fm.succeeded_by) != null ? _e : empty()), related_to: relationList((_f = fm.related_to) != null ? _f : empty()), contemporary_with: relationList((_g = fm.contemporary_with) != null ? _g : empty()) };
}

// src/repository.ts
var TimelineRepository = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }
  files() {
    return this.app.vault.getMarkdownFiles();
  }
  async all() {
    const records = [];
    for (const file of this.files()) {
      const meta = metadataToRecord(file, this.app.metadataCache);
      if (!meta) continue;
      const fm = meta.frontmatter;
      records.push({ id: text(fm.timeline_id || fm.id) || id(DEFAULT_SETTINGS.idPrefix), title: text(fm.title) || file.basename, type: meta.type, status: text(fm.status) || "active", tags: list(fm.tags), layers: list(fm.layers), categories: list(fm.categories), locations: list(fm.locations), entities: list(fm.entities), date: parseDate(fm.date || { start: fm.start_date, end: fm.end_date, precision: fm.date_precision, circa: fm.circa, display: fm.date_display }), relations: relations(fm), path: file.path, file, excerpt: meta.excerpt });
    }
    return records.sort((a, b) => dateValue(a.date.start) - dateValue(b.date.start) || a.title.localeCompare(b.title));
  }
  async createEvent(input) {
    const recordId = id(this.settings.idPrefix), folder = (0, import_obsidian2.normalizePath)(this.settings.recordsFolder);
    await this.ensureFolder(folder);
    const path = (0, import_obsidian2.normalizePath)(`${folder}/${safeName(this.settings.filenameTemplate.replace("{id}", recordId).replace("{title}", input.title))}.md`);
    const yamlList = (values, fallback) => values.length ? values.map((v) => `  - ${v}`).join("\n") : `  - ${fallback}`;
    const yamlOptional = (values) => values.length ? `
${values.map((v) => `  - ${v}`).join("\n")}` : " []";
    const content = `---
type: ${input.type}
schema_version: 1
timeline_id: ${recordId}
title: ${input.title}
status: active
tags:
${yamlList(input.tags, "timeline")}
layers:
${yamlList(input.layers, "general")}
categories:
${yamlList(input.categories, "event")}
locations:${yamlOptional(input.locations)}
entities:${yamlOptional(input.entities)}
date:
  start: ${input.date.start}
  precision: ${input.date.precision}
  circa: ${input.date.circa}
  display: ${input.date.display || input.date.start}
relations:
  continued_from: []
  split_into: []
  merged_into: []
  preceded_by: []
  succeeded_by: []
  related_to: []
  contemporary_with: []
created: ${(/* @__PURE__ */ new Date()).toISOString()}
updated: ${(/* @__PURE__ */ new Date()).toISOString()}
---

# ${input.title}

`;
    return this.app.vault.create(path, content);
  }
  async ensureFolder(path) {
    const parts = path.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) await this.app.vault.createFolder(current);
    }
  }
};

// src/dashboard.ts
var import_obsidian3 = require("obsidian");
var VIEW = "visual-timeline-dashboard";
var TimelineView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = "";
    this.layer = "";
    this.records = [];
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "Visual Timeline";
  }
  async onOpen() {
    await this.render();
  }
  async render() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("visual-timeline-dashboard");
    this.records = await this.plugin.repository.all();
    const hero = root.createDiv({ cls: "vt-hero" });
    hero.createEl("div", { cls: "vt-eyebrow", text: "RED-BEARD \xB7 VISUAL HISTORY" });
    hero.createEl("h1", { text: "Visual Timeline" });
    hero.createEl("p", { text: "See events, eras, kingdoms, and explicit historical streams in one local, searchable view." });
    const actions = hero.createDiv({ cls: "vt-actions" });
    this.button(actions, "New timeline event", () => this.plugin.openNewEvent());
    this.button(actions, "Refresh", () => void this.render());
    this.button(actions, "Settings", () => this.plugin.openSettings());
    const controls = root.createDiv({ cls: "vt-controls" });
    const search = controls.createEl("input", { type: "search", placeholder: "Search events, entities, tags, or places", attr: { "aria-label": "Search timeline" } });
    search.value = this.query;
    search.oninput = () => {
      this.query = search.value;
      this.draw(root);
    };
    const select = controls.createEl("select", { attr: { "aria-label": "Filter by layer" } });
    select.createEl("option", { text: "All layers", value: "" });
    for (const layer of this.plugin.settings.layers) select.createEl("option", { text: layer, value: layer });
    select.value = this.layer;
    select.onchange = () => {
      this.layer = select.value;
      this.draw(root);
    };
    this.draw(root);
  }
  draw(root) {
    root.querySelectorAll(".vt-body").forEach((el) => el.remove());
    const body = root.createDiv({ cls: "vt-body" });
    const q = this.query.toLocaleLowerCase();
    const records = this.records.filter((r) => (!q || `${r.title} ${r.tags.join(" ")} ${r.categories.join(" ")} ${r.locations.join(" ")} ${r.entities.join(" ")}`.toLocaleLowerCase().includes(q)) && (!this.layer || r.layers.includes(this.layer)));
    if (!records.length) {
      body.createDiv({ cls: "vt-empty", text: "No timeline records match this view." });
      return;
    }
    const bounds = rangeOf(records);
    body.createDiv({ cls: "vt-range", text: `${records.length} records \xB7 ${bounds.min < 0 ? `${Math.abs(bounds.min)} BC` : bounds.min} \u2192 ${bounds.max < 0 ? `${Math.abs(bounds.max)} BC` : bounds.max}` });
    const axis = body.createDiv({ cls: "vt-axis" });
    [0, 0.25, 0.5, 0.75, 1].forEach((position) => {
      const tick = axis.createDiv({ cls: "vt-axis-tick" });
      tick.style.left = `${position * 100}%`;
      tick.createSpan({ text: this.formatYear(bounds.min + (bounds.max - bounds.min) * position) });
    });
    const kingdoms = records.filter((record) => record.type === "visual-timeline-kingdom");
    if (kingdoms.length) this.renderKingdomChart(body, kingdoms, bounds);
    const detailRecords = records.filter((record) => record.type !== "visual-timeline-kingdom");
    const lanes = /* @__PURE__ */ new Map();
    for (const record of detailRecords) {
      const lane = record.layers[0] || record.type.replace("visual-timeline-", "");
      if (!lanes.has(lane)) lanes.set(lane, []);
      lanes.get(lane).push(record);
    }
    const graph = body.createDiv({ cls: "vt-graph" });
    for (const [laneName, laneRecords] of lanes) {
      const lane = graph.createDiv({ cls: "vt-lane" });
      lane.createDiv({ cls: "vt-lane-label", text: laneName });
      const track = lane.createDiv({ cls: "vt-track" });
      for (const record of laneRecords) this.renderRecord(track, record, bounds);
    }
    const relationRecords = records.filter((r) => Object.values(r.relations).some((v) => v.length));
    if (relationRecords.length) {
      const rel = body.createDiv({ cls: "vt-relations" });
      rel.createEl("h2", { text: "Explicit relationships" });
      for (const record of relationRecords.slice(0, 12)) {
        const row = rel.createDiv({ cls: "vt-relation-row" });
        row.createEl("strong", { text: record.title });
        const labels = [];
        for (const [key, values] of Object.entries(record.relations)) if (values.length) labels.push(`${key.replace(/_/g, " ")}: ${values.join(", ")}`);
        row.createEl("span", { text: labels.join(" \xB7 ") });
      }
    }
  }
  renderRecord(track, record, bounds) {
    const start = dateValue(record.date.start), end = dateValue(record.date.end || record.date.start);
    const left = Math.max(0, Math.min(100, (start - bounds.min) / (bounds.max - bounds.min) * 100));
    const width = Math.max(2, Math.min(96, (Math.max(end, start + 1) - start) / (bounds.max - bounds.min) * 100));
    const card = track.createDiv({ cls: "vt-record", attr: { tabindex: "0", "aria-label": `${record.title}, ${record.date.display || record.date.start}` } });
    card.style.left = `${left}%`;
    card.style.width = `${width}%`;
    card.createEl("strong", { text: record.title });
    card.createEl("small", { text: record.date.display || record.date.start });
    if (record.date.circa) card.addClass("is-circa");
    card.onclick = () => this.plugin.openNote(record.path);
    card.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.plugin.openNote(record.path);
      }
    };
  }
  renderKingdomChart(parent, records, bounds) {
    const section = parent.createDiv({ cls: "vt-kingdom-section" });
    section.createEl("h2", { text: "Kingdom streams" });
    section.createEl("p", { cls: "vt-section-note", text: "The united monarchy continues into two explicit successor kingdoms at the split point. Select a stream to open its source note." });
    const chart = section.createDiv({ cls: "vt-kingdom-chart" });
    const ordered = [...records].sort((a, b) => dateValue(b.date.start) - dateValue(a.date.start));
    const rows = ordered.map((record, index) => {
      const row = chart.createDiv({ cls: "vt-kingdom-row", attr: { "data-record-id": record.id } });
      const label = row.createDiv({ cls: "vt-kingdom-label" });
      label.createEl("strong", { text: record.title.replace("Kingdom of ", "") });
      label.createEl("small", { text: record.date.display || record.date.start });
      const track = row.createDiv({ cls: "vt-kingdom-track" });
      const start = dateValue(record.date.start), end = dateValue(record.date.end || record.date.start);
      const left = Math.max(0, Math.min(100, (start - bounds.min) / (bounds.max - bounds.min) * 100));
      const width = Math.max(2, Math.min(96, (Math.max(end, start + 1) - start) / (bounds.max - bounds.min) * 100));
      const bar = track.createDiv({ cls: "vt-kingdom-bar", attr: { tabindex: "0", "aria-label": `${record.title}, ${record.date.display || record.date.start}` } });
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      if (record.id !== "VTL-KINGDOM-UNITED") row.addClass("is-branch");
      bar.onclick = () => this.plugin.openNote(record.path);
      bar.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.plugin.openNote(record.path);
        }
      };
      return { record, index };
    });
    const rowHeight = 56;
    const connectors = chart.createDiv({ cls: "vt-kingdom-connectors", attr: { "aria-hidden": "true" } });
    connectors.style.height = `${Math.max(rowHeight, rows.length * rowHeight)}px`;
    const byId = new Map(rows.map((row) => [row.record.id, row]));
    for (const source of rows) for (const targetId of source.record.relations.succeeded_by) {
      const target = byId.get(targetId);
      if (!target) continue;
      const x = Math.max(0, Math.min(100, (dateValue(target.record.date.start) - bounds.min) / (bounds.max - bounds.min) * 100));
      const line = connectors.createDiv({ cls: "vt-kingdom-connector" });
      line.style.left = `${x}%`;
      line.style.top = `${Math.min(source.index, target.index) * rowHeight + rowHeight / 2}px`;
      line.style.height = `${Math.abs(target.index - source.index) * rowHeight}px`;
    }
    chart.prepend(connectors);
  }
  formatYear(value) {
    const year = Math.round(value);
    return year < 0 ? `${Math.abs(year)} BC` : `AD ${year || 1}`;
  }
  button(parent, label, action) {
    const b = parent.createEl("button", { text: label });
    b.onclick = action;
  }
};

// src/modals.ts
var import_obsidian4 = require("obsidian");
var NewEventModal = class extends import_obsidian4.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.title = "";
    this.start = "";
    this.display = "";
    this.type = "visual-timeline-event";
    this.layer = "general";
    this.category = "event";
    this.circa = false;
  }
  onOpen() {
    this.contentEl.empty();
    this.contentEl.addClass("vt-modal");
    this.contentEl.createEl("h2", { text: "New timeline record" });
    new import_obsidian4.Setting(this.contentEl).setName("Title").addText((t) => t.setValue(this.title).onChange((v) => this.title = v));
    new import_obsidian4.Setting(this.contentEl).setName("Record type").addDropdown((d) => {
      for (const type of ["visual-timeline-event", "visual-timeline-kingdom", "visual-timeline-era", "visual-timeline-period", "visual-timeline-place", "visual-timeline-person", "visual-timeline-culture"]) d.addOption(type, type.replace("visual-timeline-", ""));
      d.setValue(this.type).onChange((v) => this.type = v);
    });
    new import_obsidian4.Setting(this.contentEl).setName("Start date").setDesc("AD ISO date or a BC year such as 930 BC").addText((t) => t.setValue(this.start).onChange((v) => this.start = v));
    new import_obsidian4.Setting(this.contentEl).setName("Display date").addText((t) => t.setValue(this.display).onChange((v) => this.display = v));
    new import_obsidian4.Setting(this.contentEl).setName("Layer").addText((t) => t.setValue(this.layer).onChange((v) => this.layer = v));
    new import_obsidian4.Setting(this.contentEl).setName("Category").addText((t) => t.setValue(this.category).onChange((v) => this.category = v));
    new import_obsidian4.Setting(this.contentEl).setName("Circa").addToggle((t) => t.setValue(this.circa).onChange((v) => this.circa = v));
    const actions = this.contentEl.createDiv({ cls: "vt-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.onclick = () => this.close();
    const save = actions.createEl("button", { text: "Create", cls: "mod-cta" });
    save.onclick = async () => {
      if (!this.title.trim() || !this.start.trim()) {
        new import_obsidian4.Notice("Title and start date are required.");
        return;
      }
      const date = { start: this.start.trim(), precision: /^\d{4}-\d{2}-\d{2}$/.test(this.start.trim()) ? "day" : "year", circa: this.circa, display: this.display.trim() || this.start.trim() };
      await this.plugin.repository.createEvent({ title: this.title.trim(), type: this.type, date, tags: ["timeline"], layers: [this.layer.trim() || "general"], categories: [this.category.trim() || "event"], locations: [], entities: [] });
      new import_obsidian4.Notice("Timeline record created.");
      this.close();
      await this.plugin.refreshViews();
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/dashboard-bridge.ts
function register(app, method, definition) {
  let dispose = () => void 0;
  let timer;
  let tries = 0;
  const attempt = () => {
    var _a, _b;
    const host = (_b = (_a = app.plugins) == null ? void 0 : _a.getPlugin) == null ? void 0 : _b.call(_a, "red-beard-dashboard");
    const fn = host == null ? void 0 : host[method];
    if (fn) {
      dispose = fn.call(host, definition) || (() => void 0);
      return;
    }
    if (tries++ < 120) timer = window.setTimeout(attempt, 250);
  };
  attempt();
  return () => {
    if (timer !== void 0) window.clearTimeout(timer);
    dispose();
  };
}
var registerDashboardModule = (app, d) => register(app, "registerModule", d);
var registerDashboardWidget = (app, d) => register(app, "registerWidget", d);

// src/main.ts
var VisualTimeline = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.moduleDispose = () => void 0;
    this.widgetDispose = () => void 0;
  }
  async onload() {
    const stored = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...stored || {}, relationshipLabels: { ...DEFAULT_SETTINGS.relationshipLabels, ...(stored == null ? void 0 : stored.relationshipLabels) || {} }, layers: Array.isArray(stored == null ? void 0 : stored.layers) ? stored.layers : DEFAULT_SETTINGS.layers, categories: Array.isArray(stored == null ? void 0 : stored.categories) ? stored.categories : DEFAULT_SETTINGS.categories };
    this.repository = new TimelineRepository(this.app, this.settings);
    this.registerView(VIEW, (leaf) => new TimelineView(leaf, this));
    this.addSettingTab(new TimelineSettingsTab(this.app, this));
    this.addCommand({ id: "open-dashboard", name: "Open Visual Timeline", callback: () => void this.openDashboard() });
    this.addCommand({ id: "open-timeline", name: "Open timeline", callback: () => void this.openDashboard() });
    this.addCommand({ id: "new-event", name: "New timeline event", callback: () => this.openNewEvent() });
    this.addCommand({ id: "refresh", name: "Refresh timeline", callback: () => this.refreshViews() });
    this.addCommand({ id: "manage-layers", name: "Manage timeline layers", callback: () => this.openSettings() });
    this.addCommand({ id: "manage-categories", name: "Manage timeline categories", callback: () => this.openSettings() });
    this.addCommand({ id: "open-settings", name: "Open Visual Timeline settings", callback: () => void this.openSettings() });
    this.registerDashboardIntegration();
    this.registerEvent(this.app.vault.on("create", () => void this.refreshViews()));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file.path.endsWith(".md")) void this.refreshViews();
    }));
    if (this.settings.startup) this.app.workspace.onLayoutReady(() => void this.openDashboard());
  }
  onunload() {
    this.moduleDispose();
    this.widgetDispose();
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  openSettings() {
    var _a, _b;
    (_b = (_a = this.app.setting) == null ? void 0 : _a.open) == null ? void 0 : _b.call(_a);
  }
  openNote(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) this.app.workspace.getLeaf(false).openFile(file);
  }
  openNewEvent() {
    new NewEventModal(this.app, this).open();
  }
  async openDashboard() {
    const existing = this.app.workspace.getLeavesOfType(VIEW)[0];
    const leaf = existing || this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) {
      if (leaf.view instanceof TimelineView) await leaf.view.render();
    }
  }
  registerDashboardIntegration() {
    this.moduleDispose = registerDashboardModule(this.app, { id: "visual-timeline", name: "Visual Timeline", command: "visual-timeline:open-dashboard", icon: "timeline", description: "Searchable historical streams, eras, and explicit branches.", order: 75 });
    this.widgetDispose = registerDashboardWidget(this.app, { id: "visual-timeline/historical-range", name: "Historical Range", icon: "timeline", description: "A compact snapshot of indexed timeline records.", defaultLayout: { w: 4, mobileW: 12, h: 2, order: 75 }, mobile: "responsive", render: async (_, container) => {
      container.empty();
      const records = await this.repository.all();
      if (!records.length) {
        container.createEl("p", { text: "No timeline records yet." });
        return;
      }
      const years = records.map((r) => r.date.start).filter(Boolean);
      container.createEl("strong", { text: `${records.length} records` });
      container.createEl("p", { text: `${years[0]} \u2192 ${years[years.length - 1]}` });
      const open = container.createEl("button", { text: "Open Visual Timeline" });
      open.onclick = () => void this.openDashboard();
    } });
  }
};
