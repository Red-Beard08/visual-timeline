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
var import_obsidian6 = require("obsidian");

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

// src/composition.ts
var STYLES = ["stream", "line", "dot", "box", "band"];
var uid = () => `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
function newLayer(name = "New layer", type = "") {
  return { id: uid(), name, enabled: true, types: type ? [`visual-timeline-${type}`] : [], categories: [], tags: [], style: "default", plane: "foreground", opacity: 1, color: "#659fa0", labels: "always" };
}
function newRow(name = "New row", layers = []) {
  return { id: uid(), name, height: 220, enabled: true, layers };
}
function defaults() {
  const kingdoms = newLayer("Kingdoms", "kingdom");
  kingdoms.style = "stream";
  kingdoms.color = "#bb9865";
  const kings = newLayer("Kings / people", "person");
  kings.style = "box";
  const battles = newLayer("Battles / events", "event");
  battles.style = "dot";
  battles.color = "#b98d76";
  const stream = { id: "streams", name: "Kingdom succession", rows: [newRow("Kingdoms", [kingdoms])] };
  const rows = { id: "rows", name: "Separate rows", rows: [newRow("Kings / people", [kings]), newRow("Kingdoms", [{ ...kingdoms, id: uid() }]), newRow("Battles / events", [battles])] };
  const overlay = { id: "overlay", name: "Kings and kingdoms", rows: [newRow("Rulers and kingdoms", [{ ...kingdoms, id: uid(), plane: "background", opacity: 0.3, labels: "selection" }, { ...kings, id: uid() }]), newRow("Battles / events", [{ ...battles, id: uid() }])] };
  return { version: 1, active: "streams", views: [stream, rows, overlay], categoryStyles: { kingdom: "stream", person: "box", event: "dot", era: "band" } };
}
var strings = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
var finite = (v, fallback, min, max) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
function normalizeComposition(value) {
  if (!value || typeof value !== "object") return defaults();
  const raw = value;
  if (!Array.isArray(raw.views) || !raw.views.length) return defaults();
  const views = raw.views.filter((v) => v && typeof v === "object").map((v) => ({ id: typeof v.id === "string" ? v.id : uid(), name: String(v.name || "Untitled view"), rows: (Array.isArray(v.rows) ? v.rows : []).filter(Boolean).map((r) => ({ id: r.id || uid(), name: String(r.name || "Untitled row"), height: finite(r.height, 220, 120, 1200), enabled: r.enabled !== false, layers: (Array.isArray(r.layers) ? r.layers : []).filter(Boolean).map((l) => ({ ...newLayer(), id: l.id || uid(), name: String(l.name || "Untitled layer"), enabled: l.enabled !== false, types: strings(l.types), categories: strings(l.categories), tags: strings(l.tags), style: STYLES.includes(l.style) ? l.style : "default", plane: l.plane === "background" ? "background" : "foreground", opacity: finite(l.opacity, 1, 0.1, 1), color: /^#[\da-f]{6}$/i.test(l.color) ? l.color : "#659fa0", labels: ["always", "selection", "hidden"].includes(l.labels) ? l.labels : "always" })) })) }));
  if (!views.length) return defaults();
  const categoryStyles = {};
  for (const [key, style] of Object.entries(raw.categoryStyles || {})) if (STYLES.includes(style)) categoryStyles[key] = style;
  return { version: 1, active: views.some((v) => v.id === raw.active) ? raw.active : views[0].id, views, categoryStyles };
}
function matches(record, layer) {
  const norm = (s) => s.replace(/^#/, "").toLocaleLowerCase();
  return layer.enabled && (!layer.types.length || layer.types.includes(record.type)) && (!layer.categories.length || layer.categories.some((c) => record.categories.map(norm).includes(norm(c)))) && (!layer.tags.length || layer.tags.some((t) => record.tags.map(norm).includes(norm(t))));
}
function styleFor(r, l, defaults2) {
  return l.style !== "default" ? l.style : r.categories.map((c) => defaults2[c]).find(Boolean) || defaults2[r.type.replace("visual-timeline-", "")] || "box";
}
function reorder(items, from, to) {
  if (from < 0 || from >= items.length) return;
  items.splice(Math.max(0, Math.min(items.length - 1, to)), 0, items.splice(from, 1)[0]);
}
function placeRow(row, records, bounds, width, categoryStyles) {
  const scale = (v) => 40 + (dateValue(v) - bounds.min) / Math.max(1, bounds.max - bounds.min) * (width - 80);
  const items = [];
  const ends = { foreground: [], background: [] };
  for (const layer of [...row.layers.filter((l) => l.plane === "background"), ...row.layers.filter((l) => l.plane === "foreground")]) {
    for (const record of records.filter((r) => matches(r, layer)).sort((a, b) => dateValue(a.date.start) - dateValue(b.date.start) || a.id.localeCompare(b.id))) {
      const x = scale(record.date.start), style = styleFor(record, layer, categoryStyles);
      const end = style === "dot" ? x + 12 : Math.max(x + 4, scale(record.date.end || record.date.start));
      const laneEnds = ends[layer.plane];
      const labelWidth = layer.labels === "always" ? Math.min(240, record.title.length * 7 + 16) : 0;
      let lane = laneEnds.findIndex((e) => e <= x);
      if (lane < 0) lane = laneEnds.length;
      laneEnds[lane] = Math.max(end, x + labelWidth + 14);
      items.push({ record, layer, style, x, end, lane });
    }
  }
  return { items, height: Math.max(row.height, 80 + Math.max(1, ...Object.values(ends).map((e) => e.length)) * 78) };
}

// src/composition-renderer.ts
var NS = ["http:", "", "www.w3.org", "2000", "svg"].join("/");
function element(tag, attrs = {}, text2) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text2) el.textContent = text2;
  return el;
}
function renderComposition(parent, view, settings, records, bounds, open, zoom = 1) {
  const scroll = parent.createDiv({ cls: "vt-composition-scroll" });
  scroll.setAttribute("tabindex", "0");
  scroll.setAttribute("aria-label", "Timeline rows. Scroll horizontally to explore dates.");
  const width = 1200 * zoom;
  const canvas = scroll.createDiv({ cls: "vt-composition-canvas" });
  canvas.style.minWidth = `${width}px`;
  const axis = element("svg", { viewBox: `0 0 ${width} 42`, class: "vt-composition-axis", "aria-label": "Shared date scale" });
  for (let i = 0; i < 5; i++) {
    const year = Math.round(bounds.min + (bounds.max - bounds.min) * i / 4), x = 40 + (width - 80) * i / 4;
    axis.appendChild(element("line", { x1: x, x2: x, y1: 26, y2: 42 }));
    axis.appendChild(element("text", { x, y: 18, "text-anchor": "middle" }, year < 0 ? `${-year} BC` : `AD ${year || 1}`));
  }
  canvas.appendChild(axis);
  const rows = view.rows.filter((r) => r.enabled);
  if (!rows.length) canvas.createEl("p", { text: "No visible rows. Use Configure timeline to add or enable a row." });
  for (const row of rows) {
    const section = canvas.createDiv({ cls: "vt-composition-row" });
    const head = section.createDiv({ cls: "vt-row-heading" });
    head.createEl("h2", { text: row.name });
    const legend = head.createDiv({ cls: "vt-layer-legend" });
    for (const l of row.layers.filter((l2) => l2.enabled)) {
      const item = legend.createSpan({ text: `${l.name} \xB7 ${l.style === "default" ? "category style" : l.style}${l.plane === "background" ? " \xB7 background" : ""}` });
      item.style.setProperty("--vt-color", l.color);
    }
    const layout = placeRow(row, records, bounds, width, settings.categoryStyles);
    if (!layout.items.length) {
      section.createEl("p", { cls: "vt-section-note", text: "No matching records in this row." });
      continue;
    }
    const svg = element("svg", { viewBox: `0 0 ${width} ${layout.height}`, class: "vt-composition-svg", "aria-label": row.name });
    section.appendChild(svg);
    const center = (p) => 60 + p.lane * 78;
    const parentOf = (p) => layout.items.find((other) => other !== p && other.layer.id === p.layer.id && other.style === "stream" && dateValue(other.record.date.start) < dateValue(p.record.date.start) && dateValue(other.record.date.end || other.record.date.start) === dateValue(p.record.date.start) && (p.record.relations.preceded_by.concat(p.record.relations.continued_from).some((ref) => ref === other.record.id || ref === other.record.file.basename || ref === other.record.path.replace(/\.md$/, "")) || other.record.relations.succeeded_by.concat(other.record.relations.split_into).some((ref) => ref === p.record.id || ref === p.record.file.basename || ref === p.record.path.replace(/\.md$/, ""))));
    const ys = new Map(layout.items.map((p) => [p, center(p)]));
    for (const p of [...layout.items].sort((a, b) => b.x - a.x)) {
      const children = layout.items.filter((c) => parentOf(c) === p);
      if (children.length) ys.set(p, children.reduce((s, c) => s + ys.get(c), 0) / children.length);
    }
    for (const p of layout.items) {
      const { record: r, layer: l, x, end, style } = p;
      const y = ys.get(p);
      const g = element("g", { class: `vt-composed-record vt-label-${l.labels}`, tabindex: 0, role: "link", "aria-label": `${r.title}, ${r.date.display || r.date.start}`, "data-layer": l.id });
      g.appendChild(element("title", {}, `${r.title} \xB7 ${r.date.display || r.date.start}${r.date.end ? " \u2014 " + r.date.end : ""}`));
      const attrs = { fill: l.color, opacity: l.opacity };
      if (style === "stream") {
        const parent2 = parentOf(p), siblings = parent2 ? layout.items.filter((c) => parentOf(c) === parent2) : [];
        const half = parent2 ? 20 / siblings.length : 20, origin = parent2 ? ys.get(parent2) - 20 + half + siblings.indexOf(p) * 2 * half : y;
        const bend = Math.min(140, (end - x) * 0.45), settle = x + bend, tail = Math.min(40, (end - settle) * 0.5), tip = layout.items.some((c) => parentOf(c) === p) ? 20 : 0;
        g.appendChild(element("path", { ...attrs, d: `M ${x} ${origin - half} C ${x + bend * 0.55} ${origin - half} ${x + bend * 0.45} ${y - 20} ${settle} ${y - 20} C ${end - tail} ${y - 20} ${end - tail * 0.25} ${y - tip} ${end} ${y - tip} L ${end} ${y + tip} C ${end - tail * 0.25} ${y + tip} ${end - tail} ${y + 20} ${settle} ${y + 20} C ${x + bend * 0.45} ${y + 20} ${x + bend * 0.55} ${origin + half} ${x} ${origin + half} Z` }));
      } else if (style === "dot") g.appendChild(element("circle", { ...attrs, cx: x, cy: y, r: 6 }));
      else if (style === "line") g.appendChild(element("line", { x1: x, x2: end, y1: y, y2: y, stroke: l.color, "stroke-width": 3, opacity: l.opacity }));
      else g.appendChild(element("rect", { ...attrs, x, y: style === "band" ? 32 : y - 14, width: end - x, height: style === "band" ? layout.height - 48 : 28, rx: style === "band" ? 0 : 4 }));
      if (style === "dot" || style === "line") g.appendChild(element("rect", { x: x - 10, y: y - 20, width: Math.max(40, end - x + 20), height: 40, fill: "transparent" }));
      const label = element("text", { x: Math.min(x + 8, width - 250), y: style === "band" ? 25 : y - 29, class: "vt-record-label" }, r.title.length > 34 ? r.title.slice(0, 32) + "\u2026" : r.title);
      g.appendChild(label);
      g.addEventListener("click", () => open(r.path));
      g.addEventListener("keydown", (e) => {
        if (["Enter", " "].includes(e.key)) {
          e.preventDefault();
          open(r.path);
        }
      });
      svg.appendChild(g);
    }
  }
}

// src/dashboard.ts
var VIEW = "visual-timeline-dashboard";
var TimelineView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = "";
    this.layer = "";
    this.zoom = 1;
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
    hero.createEl("h1", { text: "Visual Timeline" });
    const actions = hero.createDiv({ cls: "vt-actions" });
    this.button(actions, "New timeline event", () => this.plugin.openNewEvent());
    this.button(actions, "Configure timeline", () => void this.plugin.openComposition());
    this.button(actions, "Refresh", () => void this.render());
    this.button(actions, "Settings", () => this.plugin.openSettings());
    const controls = root.createDiv({ cls: "vt-controls" });
    const search = controls.createEl("input", { type: "search", placeholder: "Search events, entities, tags, or places", attr: { "aria-label": "Search timeline" } });
    search.value = this.query;
    search.oninput = () => {
      this.query = search.value;
      this.draw(root);
    };
    const config = normalizeComposition(this.plugin.settings.composition);
    const views = controls.createEl("select", { attr: { "aria-label": "Saved composition" } });
    config.views.forEach((v) => views.createEl("option", { text: v.name, value: v.id }));
    views.value = config.active;
    views.onchange = () => {
      const old = config.active;
      config.active = views.value;
      this.plugin.settings.composition = config;
      void this.plugin.saveSettings().then(() => this.draw(root)).catch(() => {
        config.active = old;
        views.value = old;
        new import_obsidian3.Notice("Could not save selected view.");
      });
    };
    const select = controls.createEl("select", { attr: { "aria-label": "Filter by note layer" } });
    select.createEl("option", { text: "All note layers", value: "" });
    for (const l of [.../* @__PURE__ */ new Set([...this.plugin.settings.layers, ...this.records.flatMap((r) => r.layers)])]) select.createEl("option", { text: l, value: l });
    select.value = this.layer;
    select.onchange = () => {
      this.layer = select.value;
      this.draw(root);
    };
    const zoom = controls.createEl("select", { attr: { "aria-label": "Timeline zoom" } });
    [1, 2, 4].forEach((v) => zoom.createEl("option", { text: `${v}\xD7 zoom`, value: String(v) }));
    zoom.value = String(this.zoom);
    zoom.onchange = () => {
      this.zoom = Number(zoom.value);
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
      body.createEl("p", { cls: "vt-empty", text: "No timeline records match this view." });
      return;
    }
    const config = normalizeComposition(this.plugin.settings.composition), view = config.views.find((v) => v.id === config.active);
    body.createDiv({ cls: "vt-range", text: `${records.length} matching records \xB7 ${view.rows.filter((r) => r.enabled).length} visible rows \xB7 select a shape to open its note` });
    renderComposition(body, view, config, records, rangeOf(this.records), (p) => this.plugin.openNote(p), this.zoom);
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

// src/composition-modal.ts
var import_obsidian5 = require("obsidian");
var CompositionModal = class extends import_obsidian5.Modal {
  constructor(plugin, records) {
    super(plugin.app);
    this.plugin = plugin;
    this.records = records;
    this.draft = normalizeComposition(JSON.parse(JSON.stringify(plugin.settings.composition)));
  }
  onOpen() {
    this.modalEl.addClass("vt-composition-modal");
    this.draw();
    this.contentEl.scrollTop = 0;
  }
  button(parent, label, action) {
    const b = parent.createEl("button", { text: label });
    b.onclick = action;
    return b;
  }
  draw() {
    const c = this.contentEl;
    c.empty();
    c.addClass("vt-composition-editor");
    c.createEl("h2", { text: "Configure timeline" });
    c.createEl("p", { cls: "vt-section-note", text: "Rows share a date scale. Layers overlay within a row. Changes apply only when you save; historical notes are never changed." });
    const view = this.draft.views.find((v) => v.id === this.draft.active);
    new import_obsidian5.Setting(c).setName("Saved view").addDropdown((d) => {
      for (const v of this.draft.views) d.addOption(v.id, v.name);
      d.setValue(view.id).onChange((id2) => {
        this.draft.active = id2;
        this.draw();
      });
    });
    new import_obsidian5.Setting(c).setName("View name").addText((t) => t.setValue(view.name).onChange((v) => view.name = v));
    const viewActions = c.createDiv({ cls: "vt-editor-actions" });
    this.button(viewActions, "New view", () => {
      const v = { id: uid(), name: "New view", rows: [newRow()] };
      this.draft.views.push(v);
      this.draft.active = v.id;
      this.draw();
    });
    this.button(viewActions, "Duplicate view", () => {
      const v = JSON.parse(JSON.stringify(view));
      v.id = uid();
      v.name += " copy";
      this.draft.views.push(v);
      this.draft.active = v.id;
      this.draw();
    });
    this.button(viewActions, "Remove view", () => {
      this.draft.views = this.draft.views.filter((v) => v !== view);
      this.draft.active = this.draft.views[0].id;
      this.draw();
    }).disabled = this.draft.views.length === 1;
    view.rows.forEach((row, index) => {
      const section = c.createEl("section", { cls: "vt-row-editor" });
      const header = section.createDiv({ cls: "vt-editor-heading" });
      header.createEl("h3", { text: `Row ${index + 1} \xB7 ${row.name}` });
      this.button(header, "Remove row", () => {
        view.rows.splice(index, 1);
        this.draw();
      });
      new import_obsidian5.Setting(section).setName("Row name").addText((t) => t.setValue(row.name).onChange((v) => row.name = v));
      new import_obsidian5.Setting(section).setName("Position").setDesc("1 is the first row. Changing the number shifts the other rows.").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.inputEl.max = String(view.rows.length);
        t.setValue(String(index + 1));
        t.inputEl.onchange = () => {
          reorder(view.rows, index, (Number(t.getValue()) || 1) - 1);
          this.draw();
        };
      });
      new import_obsidian5.Setting(section).setName("Minimum height").setDesc("Pixels at base zoom. Grows automatically to prevent overlapping labels.").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "120";
        t.inputEl.max = "1200";
        t.setValue(String(row.height)).onChange((v) => row.height = Math.max(120, Math.min(1200, Number(v) || 220)));
      });
      new import_obsidian5.Setting(section).setName("Show row").addToggle((t) => t.setValue(row.enabled).onChange((v) => row.enabled = v));
      row.layers.forEach((layer, i) => {
        const details = section.createEl("details", { cls: "vt-layer-editor" });
        details.createEl("summary", { text: `${i + 1}. ${layer.name} \xB7 ${layer.plane} \xB7 ${layer.style}` });
        new import_obsidian5.Setting(details).setName("Layer name").addText((t) => t.setValue(layer.name).onChange((v) => layer.name = v));
        new import_obsidian5.Setting(details).setName("Show layer").addToggle((t) => t.setValue(layer.enabled).onChange((v) => layer.enabled = v));
        new import_obsidian5.Setting(details).setName("Position within plane").setDesc("Layers later in the list draw on top. Backgrounds always stay behind foregrounds.").addText((t) => {
          t.inputEl.type = "number";
          t.inputEl.min = "1";
          t.inputEl.max = String(row.layers.length);
          t.setValue(String(i + 1));
          t.inputEl.onchange = () => {
            reorder(row.layers, i, (Number(t.getValue()) || 1) - 1);
            this.draw();
          };
        });
        new import_obsidian5.Setting(details).setName("Move to row").addDropdown((d) => {
          view.rows.forEach((r) => d.addOption(r.id, r.name));
          d.setValue(row.id).onChange((id2) => {
            const destination = view.rows.find((r) => r.id === id2);
            if (destination && destination !== row) {
              row.layers.splice(i, 1);
              destination.layers.push(layer);
              this.draw();
            }
          });
        });
        this.filters(details, layer);
        new import_obsidian5.Setting(details).setName("Display style").addDropdown((d) => {
          d.addOption("default", "Category default");
          STYLES.forEach((s) => d.addOption(s, s === "box" ? "Box / duration bar" : s[0].toUpperCase() + s.slice(1)));
          d.setValue(layer.style).onChange((v) => layer.style = v);
        });
        new import_obsidian5.Setting(details).setName("Placement").addDropdown((d) => d.addOption("background", "Background").addOption("foreground", "Foreground").setValue(layer.plane).onChange((v) => layer.plane = v));
        new import_obsidian5.Setting(details).setName("Opacity").addSlider((s) => s.setLimits(10, 100, 5).setValue(layer.opacity * 100).setDynamicTooltip().onChange((v) => layer.opacity = v / 100));
        new import_obsidian5.Setting(details).setName("Color").addColorPicker((p) => p.setValue(layer.color).onChange((v) => layer.color = v));
        new import_obsidian5.Setting(details).setName("Labels").addDropdown((d) => d.addOption("always", "Always visible").addOption("selection", "On hover or keyboard focus").addOption("hidden", "Hidden (tooltip remains)").setValue(layer.labels).onChange((v) => layer.labels = v));
        this.button(details, "Remove layer", () => {
          row.layers.splice(i, 1);
          this.draw();
        });
      });
      this.button(section, "Add layer", () => {
        row.layers.push(newLayer());
        this.draw();
      });
    });
    this.button(c, "Add row", () => {
      view.rows.push(newRow(`Row ${view.rows.length + 1}`));
      this.draw();
    });
    const defaults2 = c.createEl("details", { cls: "vt-category-defaults" });
    defaults2.createEl("summary", { text: "Category display defaults" });
    defaults2.createEl("p", { cls: "vt-section-note", text: "Used by layers set to Category default. For records with several categories, the first configured category wins; the note type is the fallback." });
    const categories = [.../* @__PURE__ */ new Set([...this.plugin.settings.categories, ...this.records.flatMap((r) => r.categories), ...RECORD_TYPES.map((t) => t.replace("visual-timeline-", "")), ...Object.keys(this.draft.categoryStyles)])].sort();
    for (const category of categories) new import_obsidian5.Setting(defaults2).setName(category).addDropdown((d) => {
      d.addOption("", "Automatic (box)");
      STYLES.forEach((s) => d.addOption(s, s));
      d.setValue(this.draft.categoryStyles[category] || "").onChange((v) => {
        if (v) this.draft.categoryStyles[category] = v;
        else delete this.draft.categoryStyles[category];
      });
    });
    const footer = c.createDiv({ cls: "vt-editor-footer" });
    this.button(footer, "Cancel", () => this.close());
    const save = this.button(footer, "Save composition", () => void this.save());
    save.addClass("mod-cta");
  }
  filters(parent, layer) {
    parent.createEl("p", { cls: "vt-section-note", text: "No selection means all. Options within each group match ANY; different groups must ALL match." });
    const groups = [["types", "Note types", RECORD_TYPES], ["categories", "Categories", [...this.plugin.settings.categories, ...this.records.flatMap((r) => r.categories), ...layer.categories]], ["tags", "Tags", [...this.records.flatMap((r) => r.tags), ...layer.tags]]];
    for (const [key, title, values] of groups) {
      const field = parent.createEl("fieldset", { cls: "vt-filter-options" });
      field.createEl("legend", { text: title });
      for (const value of [...new Set(values)].sort()) {
        const label = field.createEl("label");
        const input = label.createEl("input", { type: "checkbox" });
        input.checked = layer[key].includes(value);
        label.createSpan({ text: value.replace("visual-timeline-", "") });
        input.onchange = () => {
          layer[key] = input.checked ? [...layer[key], value] : layer[key].filter((v) => v !== value);
        };
      }
      if (!values.length) field.createEl("p", { text: "No options found in current notes." });
    }
  }
  async save() {
    const previous = this.plugin.settings.composition;
    try {
      this.plugin.settings.composition = normalizeComposition(this.draft);
      await this.plugin.saveSettings();
    } catch (error) {
      this.plugin.settings.composition = previous;
      new import_obsidian5.Notice(`Could not save composition: ${String(error)}`);
      return;
    }
    this.close();
    try {
      await this.plugin.refreshViews();
    } catch (e) {
      new import_obsidian5.Notice("Composition saved. Reopen the timeline to refresh the view.");
    }
  }
};

// src/main.ts
var VisualTimeline = class extends import_obsidian6.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.moduleDispose = () => void 0;
    this.widgetDispose = () => void 0;
  }
  async onload() {
    const stored = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...stored || {}, relationshipLabels: { ...DEFAULT_SETTINGS.relationshipLabels, ...(stored == null ? void 0 : stored.relationshipLabels) || {} }, layers: Array.isArray(stored == null ? void 0 : stored.layers) ? stored.layers : DEFAULT_SETTINGS.layers, categories: Array.isArray(stored == null ? void 0 : stored.categories) ? stored.categories : DEFAULT_SETTINGS.categories };
    this.settings.composition = normalizeComposition(this.settings.composition);
    this.addCommand({ id: "configure-timeline", name: "Configure timeline rows and layers", callback: () => void this.openComposition() });
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
  async openComposition() {
    new CompositionModal(this, await this.repository.all()).open();
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
