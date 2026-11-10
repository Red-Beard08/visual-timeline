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

// src/dates.ts
function historicalDate(input) {
  const s = input.trim().replace(/^(?:c\.?|circa)\s+/i, "");
  const era = /^(?:(AD|CE)\s+)?(\d{1,6})(?:\s+(BC|BCE|AD|CE))?$/i.exec(s);
  if (era) {
    const n = Number(era[2]);
    if (!n) return NaN;
    return /^(BC|BCE)$/i.test(era[3] || "") ? 1 - n : n;
  }
  const iso = /^(-?\d{4,6})-(\d{2})(?:-(\d{2}))?$/.exec(s);
  if (!iso) return NaN;
  const y = Number(iso[1]), m = Number(iso[2]), d = Number(iso[3] || 1);
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0), days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > days[m - 1]) return NaN;
  return y + (days.slice(0, m - 1).reduce((a, b) => a + b, 0) + d - 1) / (leap ? 366 : 365);
}
function formatTime(value, precise = false) {
  let y = Math.floor(value + 1e-9);
  const label = y <= 0 ? `${1 - y} BC` : `AD ${y}`;
  if (!precise) return label;
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0), days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let day = Math.round((value - y) * (leap ? 366 : 365)), m = 0;
  while (m < 11 && day >= days[m]) day -= days[m++];
  return `${label} \xB7 ${m + 1}/${day + 1}`;
}
function timeTicks(min, max, width) {
  const raw = (max - min) / Math.max(2, Math.floor(width / 110));
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1 / 366)));
  const step = [1, 2, 5, 10].map((n) => n * power).find((n) => n >= raw) || power * 10;
  const ticks = [];
  for (let n = Math.ceil(min / step) * step; n <= max + step / 100 && ticks.length < 100; n += step) ticks.push(n);
  return ticks;
}

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
  return historicalDate(value);
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
  const nested = fm.relations && typeof fm.relations === "object" ? fm.relations : {};
  return Object.fromEntries(["continued_from", "split_into", "merged_into", "preceded_by", "succeeded_by", "related_to", "contemporary_with"].map((k) => [k, [.../* @__PURE__ */ new Set([...relationList(nested[k]), ...relationList(fm[k])])]]));
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
      records.push({ id: text(fm.timeline_id || fm.id) || `path:${file.path}`, title: text(fm.title) || file.basename, type: meta.type, status: text(fm.status) || "active", tags: list(fm.tags), layers: list(fm.layers), categories: list(fm.categories), locations: list(fm.locations), entities: list(fm.entities), date: parseDate(fm.date || { start: fm.start_date, end: fm.end_date, precision: fm.date_precision, circa: fm.circa, display: fm.date_display }), relations: relations(fm), path: file.path, file, excerpt: meta.excerpt, aliases: list(fm.aliases) });
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
  return { id: uid(), name, enabled: true, types: type ? [`visual-timeline-${type}`] : [], categories: [], tags: [], style: "default", plane: "foreground", opacity: 1, color: "#659fa0", labels: "adaptive" };
}
function newRow(name = "New row", layers = []) {
  return { id: uid(), name, height: 220, enabled: true, layers, anchorOrder: [], maxSubtracks: 3 };
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
  return { version: 2, active: "streams", views: [stream, rows, overlay], categoryStyles: { kingdom: "stream", person: "box", event: "dot", era: "band" } };
}
var strings = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
var finite = (v, fallback, min, max) => typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
function normalizeComposition(value) {
  if (!value || typeof value !== "object") return defaults();
  const raw = value;
  if (!Array.isArray(raw.views) || !raw.views.length) return defaults();
  const views = raw.views.filter((v) => v && typeof v === "object").map((v) => ({ id: typeof v.id === "string" ? v.id : uid(), name: String(v.name || "Untitled view"), ...v.yearGrid !== void 0 ? { yearGrid: v.yearGrid === true } : {}, rows: (Array.isArray(v.rows) ? v.rows : []).filter(Boolean).map((r) => ({ id: r.id || uid(), name: String(r.name || "Untitled row"), height: finite(r.height, 220, 120, 1200), anchorOrder: strings(r.anchorOrder), maxSubtracks: Math.round(finite(r.maxSubtracks, 3, 1, 6)), enabled: r.enabled !== false, layers: (Array.isArray(r.layers) ? r.layers : []).filter(Boolean).map((l) => ({ ...newLayer(), id: l.id || uid(), name: String(l.name || "Untitled layer"), enabled: l.enabled !== false, types: strings(l.types), categories: strings(l.categories), tags: strings(l.tags), style: STYLES.includes(l.style) ? l.style : "default", plane: l.plane === "background" ? "background" : "foreground", opacity: finite(l.opacity, 1, 0.1, 1), color: /^#[\da-f]{6}$/i.test(l.color) ? l.color : "#659fa0", labels: ["adaptive", "always", "selection", "hidden"].includes(l.labels) ? l.labels : "adaptive", attachment: normalizeAttachment(l.attachment) })) })) }));
  if (!views.length) return defaults();
  const categoryStyles = {};
  for (const [key, style] of Object.entries(raw.categoryStyles || {})) if (STYLES.includes(style)) categoryStyles[key] = style;
  return { version: 2, active: views.some((v) => v.id === raw.active) ? raw.active : views[0].id, views, categoryStyles };
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
function normalizeAttachment(value) {
  if (!value || typeof value !== "object") return void 0;
  const a = value;
  if (typeof a.anchorLayer !== "string" || !a.anchorLayer) return void 0;
  const keys = ["related_to", "continued_from", "split_into", "merged_into", "preceded_by", "succeeded_by", "contemporary_with"];
  const overrides = Object.fromEntries(Object.entries(a.overrides || {}).filter(([k, v]) => k && typeof v === "string" && v));
  return { anchorLayer: a.anchorLayer, relationship: keys.includes(a.relationship || "") ? a.relationship : "related_to", overrides };
}

// src/layout.ts
var refName = (s) => s.replace(/^\[\[|\]\]$/g, "").split("|")[0].replace(/\.md$/, "");
function resolveReference(ref, records) {
  const value = refName(ref);
  const groups = [records.filter((r) => r.id === value), records.filter((r) => r.path.replace(/\.md$/, "") === value), records.filter((r) => r.file.basename === value || (r.aliases || []).includes(value))];
  for (const group of groups) if (group.length) return group.length === 1 ? group[0] : void 0;
  return void 0;
}
function centerAt(curve, x) {
  var _a, _b;
  const t = Math.max(0, Math.min(1, (x - curve.start) / Math.max(1e-5, curve.settle - curve.start)));
  return curve.origin + (curve.target - curve.origin) * t * t * (3 - 2 * t) + (curve.offset || 0) * (((_a = curve.initialScale) != null ? _a : 1) + (1 - ((_b = curve.initialScale) != null ? _b : 1)) * t);
}
var chronological = (a, b) => a.start - b.start || a.end - b.end || a.key.localeCompare(b.key);
function layoutRow(row, records, bounds, width, styles) {
  const items = [], diagnostics = [], lanes = [];
  const x = (n) => 24 + (n - bounds.min) / Math.max(1 / 366, bounds.max - bounds.min) * (width - 48);
  const anchorLayers = new Set(row.layers.flatMap((l) => l.attachment ? [l.attachment.anchorLayer] : []));
  for (const layer of row.layers.filter((l) => l.enabled)) for (const record of records.filter((r) => matches(r, layer))) {
    const start = historicalDate(record.date.start), end = historicalDate(record.date.end || record.date.start);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      diagnostics.push({ record, message: "Invalid or reversed date range" });
      continue;
    }
    const style = styleFor(record, layer, styles), isAnchor = !layer.attachment && (style === "stream" || anchorLayers.has(layer.id));
    items.push({ key: `${layer.id}/${record.id}`, record, layer, style, start, end, x: x(start), xEnd: x(end), laneId: "", subtrack: 0, y: 0, curve: { start: 0, settle: 0, origin: 0, target: 0 }, isAnchor, half: isAnchor ? 28 : 5, initialHalf: 28, terminal: true, clustered: false });
  }
  items.sort(chronological);
  const anchors = items.filter((i) => i.isAnchor), parents = /* @__PURE__ */ new Map(), candidates = /* @__PURE__ */ new Map();
  const add = (child, parent) => {
    if (!candidates.has(child)) candidates.set(child, /* @__PURE__ */ new Set());
    candidates.get(child).add(parent);
  };
  for (const a of anchors) {
    const peers = anchors.filter((p) => p.layer.id === a.layer.id), rs = peers.map((p) => p.record);
    for (const ref of [...a.record.relations.preceded_by, ...a.record.relations.continued_from]) {
      const r = resolveReference(ref, rs), p = peers.find((p2) => p2.record === r);
      if (p) add(a, p);
      else diagnostics.push({ record: a.record, message: `Unresolved predecessor: ${ref}` });
    }
    for (const ref of [...a.record.relations.succeeded_by, ...a.record.relations.split_into]) {
      const r = resolveReference(ref, rs), p = peers.find((p2) => p2.record === r);
      if (p) add(p, a);
      else diagnostics.push({ record: a.record, message: `Unresolved successor: ${ref}` });
    }
  }
  for (const [child, ps] of candidates) {
    if (ps.size === 1) parents.set(child, [...ps][0]);
    else diagnostics.push({ record: child.record, message: "Conflicting parents; placed independently" });
  }
  const cyclic = /* @__PURE__ */ new Set();
  for (const start of anchors) {
    const chain = [];
    let node = start;
    while (node) {
      const at = chain.indexOf(node);
      if (at !== -1) {
        chain.slice(at).forEach((p) => cyclic.add(p));
        break;
      }
      chain.push(node);
      node = parents.get(node);
    }
  }
  for (const node of cyclic) {
    parents.delete(node);
    diagnostics.push({ record: node.record, message: "Cyclic succession; placed independently" });
  }
  for (const [child, parent] of parents) if (parent.end !== child.start || parent.start >= child.start) {
    parents.delete(child);
    diagnostics.push({ record: child.record, message: "Succession dates do not meet; placed independently" });
  }
  const ordered = (list2) => list2.sort((a, b) => {
    const rank = (p) => {
      const n = (row.anchorOrder || []).indexOf(p.record.id);
      return n < 0 ? Number.MAX_SAFE_INTEGER : n;
    };
    return rank(a) - rank(b) || chronological(a, b);
  });
  const children = (p) => ordered(anchors.filter((c) => parents.get(c) === p));
  let nextY = 76;
  const assign = (p) => {
    const cs = children(p);
    p.y = cs.length ? cs.reduce((s, c) => s + assign(c), 0) / cs.length : nextY;
    if (!cs.length) nextY += 112;
    return p.y;
  };
  ordered(anchors.filter((p) => !parents.has(p))).forEach(assign);
  for (const a of anchors) {
    const parent = parents.get(a), siblings = parent ? children(parent) : [], index = siblings.indexOf(a);
    a.laneId = a.key;
    a.initialHalf = parent ? 28 / siblings.length : 28;
    a.terminal = children(a).length === 0;
    const origin = parent ? parent.y - 28 + a.initialHalf + index * 2 * a.initialHalf : a.y;
    a.curve = { start: a.x, settle: a.x + Math.min(110, (a.xEnd - a.x) * 0.45), origin, target: a.y, initialScale: a.initialHalf / a.half };
    lanes.push({ id: a.key, title: a.record.title, y: a.y });
  }
  const independent = /* @__PURE__ */ new Map();
  const getLane = (key, title) => {
    let lane = independent.get(key);
    if (!lane) {
      lane = { id: key, title, y: nextY };
      nextY += 112;
      independent.set(key, lane);
      lanes.push(lane);
    }
    return lane;
  };
  const ordinary = items.filter((i) => !i.isAnchor);
  for (const p of [...ordinary].sort((a, b) => a.layer.id.localeCompare(b.layer.id) || chronological(a, b))) {
    const binding = p.layer.attachment;
    if (binding) {
      const peers = anchors.filter((a) => a.layer.id === binding.anchorLayer), rs = peers.map((a) => a.record);
      const override = binding.overrides[p.record.id];
      const refs = override ? [override] : p.record.relations[binding.relationship] || [];
      const found = refs.map((ref) => resolveReference(ref, rs));
      const unique = [...new Set(found.filter(Boolean))];
      const anchor = unique.length === 1 && !found.includes(void 0) ? peers.find((a) => a.record === unique[0]) : void 0;
      if (anchor) {
        p.anchor = anchor.record;
        p.anchorKey = anchor.key;
        p.laneId = anchor.key;
        p.curve = anchor.curve;
        p.y = anchor.y;
      } else {
        const lane = getLane("unassigned", "Unassigned");
        p.laneId = lane.id;
        p.y = lane.y;
        diagnostics.push({ record: p.record, message: peers.length ? "Missing or ambiguous anchor" : "Anchor layer is missing, disabled, or empty" });
      }
    } else if (p.style === "band") {
      p.laneId = "context";
      p.y = 32;
    } else {
      const lane = getLane(`independent:${p.layer.id}`, p.layer.name);
      p.laneId = lane.id;
      p.y = lane.y;
    }
    if (!p.anchor) p.curve = { start: p.x, settle: p.x, origin: p.y, target: p.y };
  }
  const maxTracks = row.maxSubtracks || 3, ends = /* @__PURE__ */ new Map();
  for (const p of ordinary.sort(chronological)) {
    if (p.style === "band") continue;
    const key = `${p.laneId}/${p.layer.plane}/${p.style === "dot" ? "points" : "durations"}`;
    const tracks = ends.get(key) || [];
    const instant = p.start === p.end || p.style === "dot";
    let track = instant ? 0 : tracks.findIndex((e) => e <= p.start);
    if (track < 0) track = tracks.length;
    if (!instant) {
      tracks[track] = p.end;
      ends.set(key, tracks);
    }
    p.subtrack = track;
    p.clustered = track >= maxTracks;
    const visibleTrack = Math.min(track, maxTracks - 1);
    const offset = p.style === "dot" ? 42 : visibleTrack === 0 ? 0 : (visibleTrack % 2 ? -1 : 1) * Math.ceil(visibleTrack / 2) * 14;
    p.curve = { ...p.curve, offset, initialScale: p.style === "dot" ? 1 : p.curve.initialScale };
    p.y += offset;
  }
  const clusters = [];
  const clusterGroups = /* @__PURE__ */ new Map();
  for (const p of ordinary.filter((p2) => p2.style !== "band")) {
    if (p.style !== "dot" && !p.clustered && p.xEnd - p.x >= 12) continue;
    const key = `${p.laneId}/${p.style === "dot" ? "points" : "small"}`;
    const list2 = clusterGroups.get(key) || [];
    list2.push(p);
    clusterGroups.set(key, list2);
  }
  for (const group of clusterGroups.values()) {
    const sorted = group.sort((a, b) => a.x - b.x);
    let bucket = [];
    const flush = () => {
      var _a;
      if (bucket.length > 1 || ((_a = bucket[0]) == null ? void 0 : _a.clustered)) {
        bucket.forEach((p) => p.clustered = true);
        const first = bucket[0];
        clusters.push({ key: `cluster:${first.key}`, x: first.x, y: centerAt(first.curve, first.x), items: [...bucket] });
      }
      bucket = [];
    };
    for (const p of sorted) {
      if (bucket.length && p.x - bucket[0].x > 32) flush();
      bucket.push(p);
    }
    flush();
  }
  const height = Math.max(row.height, nextY === 76 ? 120 : nextY - 112 + 76);
  return { items, lanes, clusters, height, diagnostics };
}
function placeLabels(items, width, measure, height = 300) {
  const boxes = [];
  const anchors = items.filter((p) => p.isAnchor);
  const minAnchor = Math.min(...anchors.map((p) => p.y)), maxAnchor = Math.max(...anchors.map((p) => p.y));
  const truncate = (s, w) => {
    if (measure(s) <= w) return s;
    let n = s.length;
    while (n > 1 && measure(s.slice(0, n) + "\u2026") > w) n--;
    return s.slice(0, n) + "\u2026";
  };
  const collision = (b) => boxes.some((a) => b.x < a.x + a.width + 6 && b.x + b.width + 6 > a.x && b.y < a.y + a.height + 3 && b.y + b.height + 3 > a.y);
  for (const p of [...items].sort((a, b) => Number(b.isAnchor) - Number(a.isAnchor) || chronological(a, b))) {
    if (!["adaptive", "always"].includes(p.layer.labels)) continue;
    const sx = p.isAnchor ? Math.min(p.xEnd - 4, p.curve.settle + 8) : p.x + 2;
    const sy = p.style === "band" ? 32 : centerAt(p.curve, sx);
    const available = Math.max(34, p.xEnd - sx - 8);
    const preferred = p.isAnchor ? Math.min(260, available) : Math.min(180, Math.max(50, available));
    const anchor = anchors.find((a) => a.key === p.anchorKey);
    const rail = anchor && minAnchor !== maxAnchor && anchor.y === minAnchor ? [anchor.y - 72, anchor.y - 54, anchor.y - 36] : anchor && minAnchor !== maxAnchor && anchor.y === maxAnchor ? [anchor.y + 34, anchor.y + 52, anchor.y + 70, anchor.y + 88] : p.isAnchor ? [sy, sy + 18, sy - 54, sy - 70] : [sy - 36, sy - 54, sy - 72, sy + 10, sy + 28, sy + 46];
    let placed = false;
    for (const budget of [preferred, Math.min(preferred, 70), 34]) {
      const name = truncate(p.record.title, Math.min(budget, width - 12)), w = measure(name);
      const x = Math.max(4, Math.min(sx, width - w - 4));
      for (const y of rail) {
        if (y < 4 || y + 15 > height - 4) continue;
        const box = { key: p.key, x, y, width: w, height: 15, text: name, sourceX: sx, sourceY: sy, leader: !p.isAnchor && (Math.abs(y + 12 - sy) > 22 || Math.abs(x - sx) > 5) };
        if (collision(box)) continue;
        boxes.push(box);
        placed = true;
        break;
      }
      if (placed) break;
    }
    if (!placed) {
      const text2 = truncate(p.record.title, 34), w = measure(text2);
      outer: for (const y of rail.filter((y2) => y2 >= 4 && y2 + 15 <= height - 4)) for (const shift of [0, -16, 16, -32, 32, -48, 48, -64, 64]) {
        const x = Math.max(4, Math.min(sx + shift, width - w - 4));
        const b = { key: p.key, x, y, width: w, height: 15, text: text2, sourceX: sx, sourceY: sy, leader: true };
        if (!collision(b)) {
          boxes.push(b);
          break outer;
        }
      }
    }
  }
  return boxes;
}
function cubicSection(from, to, f) {
  const d = to - from, a = f(from), b = f(from + d / 3), c = f(from + 2 * d / 3), e = f(to);
  const c1 = 3 * b - 1.5 * c - 5 * a / 6 + e / 3, c2 = 3 * c - 1.5 * b + a / 3 - 5 * e / 6;
  return `C ${from + d / 3},${c1} ${from + 2 * d / 3},${c2} ${to},${e}`;
}
function halfAt(p, x) {
  var _a, _b;
  if (!p.isAnchor) {
    const t2 = Math.max(0, Math.min(1, (x - p.curve.start) / Math.max(1e-3, p.curve.settle - p.curve.start)));
    return p.half * (p.anchor ? ((_a = p.curve.initialScale) != null ? _a : 1) + (1 - ((_b = p.curve.initialScale) != null ? _b : 1)) * t2 : 1);
  }
  const t = Math.max(0, Math.min(1, (x - p.x) / Math.max(1e-3, p.curve.settle - p.x)));
  let half = p.initialHalf + (p.half - p.initialHalf) * t;
  if (p.terminal) half *= Math.max(0, Math.min(1, (p.xEnd - x) / Math.max(1e-3, Math.min(30, (p.xEnd - p.x) * 0.2))));
  return half;
}
function curvePath(p, edge = 0) {
  const breaks = [p.x, p.xEnd, p.curve.start, p.curve.settle, p.xEnd - Math.min(30, (p.xEnd - p.x) * 0.2)].filter((x) => x >= p.x && x <= p.xEnd).sort((a, b) => a - b).filter((x, i, a) => i === 0 || x !== a[i - 1]);
  const fn = (x) => centerAt(p.curve, x) + edge * halfAt(p, x);
  return `M ${breaks[0]},${fn(breaks[0])} ` + breaks.slice(1).map((x, i) => cubicSection(breaks[i], x, fn)).join(" ");
}
function ribbonPath(p) {
  const breaks = [p.x, p.xEnd, p.curve.start, p.curve.settle, p.xEnd - Math.min(30, (p.xEnd - p.x) * 0.2)].filter((x) => x >= p.x && x <= p.xEnd).sort((a, b) => a - b).filter((x, i, a) => i === 0 || x !== a[i - 1]).reverse();
  const lower = (x) => centerAt(p.curve, x) + halfAt(p, x);
  return curvePath(p, -1) + ` L ${p.xEnd},${lower(p.xEnd)} ` + breaks.slice(1).map((x, i) => cubicSection(breaks[i], x, lower)).join(" ") + " Z";
}

// src/drag-pan.ts
function installDragPan(scroll, onStart) {
  const doc = scroll.ownerDocument, win = doc.defaultView;
  let drag, suppressClick = false;
  const finish = () => {
    if (!drag) return;
    const { id: id2, moved } = drag;
    drag = void 0;
    suppressClick = suppressClick || moved;
    scroll.classList.remove("is-panning");
    doc.removeEventListener("pointermove", move);
    doc.removeEventListener("pointerup", up);
    doc.removeEventListener("pointercancel", up);
    win == null ? void 0 : win.removeEventListener("blur", finish);
    if (scroll.hasPointerCapture(id2)) scroll.releasePointerCapture(id2);
  };
  const move = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!(event.buttons & 1)) {
      finish();
      return;
    }
    const dx = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 5) return;
      drag.moved = true;
      onStart();
      scroll.classList.add("is-panning");
      scroll.setPointerCapture(drag.id);
    }
    event.preventDefault();
    scroll.scrollLeft = drag.left - dx;
  };
  const up = (event) => {
    if ((drag == null ? void 0 : drag.id) === event.pointerId) finish();
  };
  const down = (event) => {
    if (event.button !== 0 || !event.isPrimary || event.pointerType === "touch") return;
    if (event.target instanceof Element && event.target.closest('button,input,select,textarea,a,[contenteditable="true"]')) return;
    const rect = scroll.getBoundingClientRect(), x = event.clientX - rect.left - scroll.clientLeft, y = event.clientY - rect.top - scroll.clientTop;
    if (x < 0 || y < 0 || x >= scroll.clientWidth || y >= scroll.clientHeight) return;
    finish();
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, left: scroll.scrollLeft, moved: false };
    doc.addEventListener("pointermove", move, { passive: false });
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", up);
    win == null ? void 0 : win.addEventListener("blur", finish);
  };
  const click = (event) => {
    if (suppressClick && event.detail > 0) {
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const lost = (event) => {
    if ((drag == null ? void 0 : drag.id) === event.pointerId) finish();
  };
  const nativeDrag = (event) => {
    if (drag) event.preventDefault();
  };
  scroll.addEventListener("pointerdown", down);
  scroll.addEventListener("click", click, true);
  scroll.addEventListener("lostpointercapture", lost);
  scroll.addEventListener("dragstart", nativeDrag);
  return () => {
    finish();
    scroll.removeEventListener("pointerdown", down);
    scroll.removeEventListener("click", click, true);
    scroll.removeEventListener("lostpointercapture", lost);
    scroll.removeEventListener("dragstart", nativeDrag);
  };
}

// src/composition-renderer.ts
var NS = ["http:", "", "www.w3.org", "2000", "svg"].join("/");
function element(tag, attrs = {}, text2) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  if (text2) el.textContent = text2;
  return el;
}
function renderComposition(parent, view, settings, records, _bounds, open, initialZoom = 1, saveView) {
  const root = parent.createDiv({ cls: "vt-chart" }), toolbar = root.createDiv({ cls: "vt-chart-tools" });
  const button = (host, text2, fn) => {
    const b = host.createEl("button", { text: text2 });
    b.onclick = fn;
    return b;
  };
  const scroll = root.createDiv({ cls: "vt-chart-scroll", attr: { tabindex: "0", "aria-label": "Timeline; scroll to explore. Select a shape for details." } });
  const hint = root.createDiv({ cls: "vt-chart-hint", attr: { "aria-live": "polite" } });
  hint.textContent = "Click and drag to pan left/right. Wheel up/down to zoom. Click an item for details.";
  const inspector = root.createEl("aside", { cls: "vt-inspector", attr: { "aria-label": "Timeline details" } });
  inspector.hidden = true;
  const diagnostics = root.createEl("details", { cls: "vt-diagnostics" });
  let zoom = initialZoom, visible = new Set(records.map((r) => r.id)), selected, returnFocus = null, dead = false, lastWidth = 0;
  const relevant = records.filter((r) => view.rows.some((row) => row.enabled && row.layers.some((l) => matches(r, l))));
  const values = relevant.flatMap((r) => [historicalDate(r.date.start), historicalDate(r.date.end || r.date.start)]).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : 1, max = values.length ? Math.max(...values) : 2;
  const bounds = { min, max: max === min ? min + 1 : max };
  const gutter = 160, measureCanvas = document.createElement("canvas"), ctx = measureCanvas.getContext("2d");
  if (ctx) ctx.font = `13px ${getComputedStyle(parent).fontFamily}`;
  const measure = (t) => (ctx == null ? void 0 : ctx.measureText(t).width) || t.length * 8;
  const close = () => {
    inspector.hidden = true;
    selected = void 0;
    root.querySelectorAll(".is-selected").forEach((e) => e.classList.remove("is-selected"));
    if (returnFocus instanceof HTMLElement || returnFocus instanceof SVGElement) returnFocus.focus();
  };
  const details = (items, focus = true) => {
    var _a;
    if (focus) returnFocus = document.activeElement;
    inspector.empty();
    inspector.hidden = false;
    const header = inspector.createDiv({ cls: "vt-inspector-header" });
    const title = header.createEl("h3", { text: items.length > 1 ? `${items.length} items in this group` : items[0].record.title, attr: { tabindex: "-1" } });
    button(header, "Close", close);
    if (items.length > 1) {
      for (const p of items) {
        const b = button(inspector, `${p.record.title} \xB7 ${p.record.date.display || p.record.date.start}`, () => details([p]));
        b.addClass("vt-inspector-item");
      }
    } else {
      const p = items[0], r = p.record;
      selected = p;
      inspector.createEl("p", { text: `${r.date.circa ? "Circa \xB7 " : ""}${r.date.display || [r.date.start, r.date.end].filter(Boolean).join(" \u2014 ")}` });
      if (r.categories.length) inspector.createEl("p", { cls: "vt-section-note", text: r.categories.join(" \xB7 ") });
      if (p.anchor) inspector.createEl("p", { text: `Attached to: ${p.anchor.title}` });
      for (const [key, refs] of Object.entries(r.relations)) if (refs.length) {
        inspector.createEl("h4", { text: key.replace(/_/g, " ") });
        const ul = inspector.createEl("ul");
        for (const ref of refs) ul.createEl("li", { text: ((_a = records.find((r2) => r2.id === ref || r2.path.replace(/\.md$/, "") === ref)) == null ? void 0 : _a.title) || ref });
      }
      button(inspector, "Open note", () => open(r.path)).addClass("mod-cta");
      root.querySelectorAll(".vt-composed-record").forEach((e) => e.classList.toggle("is-selected", e.getAttribute("data-key") === p.key));
    }
    if (focus) title.focus({ preventScroll: true });
  };
  const onKey = (e) => {
    if (e.key === "Escape") {
      close();
      e.stopPropagation();
    }
  };
  root.addEventListener("keydown", onKey);
  const draw = () => {
    if (dead) return;
    const previousLeft = scroll.scrollLeft, previousTop = scroll.scrollTop;
    scroll.empty();
    diagnostics.empty();
    const viewport = Math.max(260, scroll.clientWidth), plotWidth = Math.max(720, viewport - gutter) * zoom, total = plotWidth + gutter;
    lastWidth = viewport;
    const canvas = scroll.createDiv({ cls: "vt-chart-canvas" });
    canvas.style.width = `${total}px`;
    const ticks = timeTicks(bounds.min, bounds.max, plotWidth);
    const tickX = (tick) => 24 + (tick - min) / (bounds.max - min) * (plotWidth - 48);
    const axis = canvas.createDiv({ cls: "vt-sticky-axis" });
    axis.style.width = `${total}px`;
    axis.createDiv({ cls: "vt-axis-corner", text: "History" }).style.width = `${gutter}px`;
    const ruler = element("svg", { width: plotWidth, height: 38, "aria-label": "Shared date scale" });
    for (const tick of ticks) {
      const x = tickX(tick);
      ruler.appendChild(element("line", { x1: x, x2: x, y1: 26, y2: 38 }));
      ruler.appendChild(element("text", { x, y: 18, "text-anchor": "middle" }, formatTime(tick, bounds.max - min < 2)));
    }
    axis.appendChild(ruler);
    let warningCount = 0;
    const warningList = [];
    for (const row of view.rows.filter((r) => r.enabled)) {
      const section = canvas.createDiv({ cls: "vt-compact-row" });
      section.createEl("h2", { text: row.name, cls: "vt-compact-row-title" });
      const layout = layoutRow(row, records, bounds, plotWidth, settings.categoryStyles);
      warningList.push(...layout.diagnostics);
      warningCount += layout.diagnostics.length;
      const strip = section.createDiv({ cls: "vt-row-strip" });
      strip.style.height = `${layout.height}px`;
      const labels = strip.createDiv({ cls: "vt-sticky-lanes" });
      labels.style.width = `${gutter}px`;
      for (const lane of layout.lanes) {
        const l = labels.createDiv({ cls: "vt-lane-name", text: lane.title });
        l.style.top = `${lane.y - 14}px`;
      }
      const svg = element("svg", { width: plotWidth, height: layout.height, class: "vt-composition-svg", "aria-label": row.name });
      strip.appendChild(svg);
      const shown = layout.items.filter((p) => visible.has(p.record.id));
      const labelBoxes = placeLabels(shown, plotWidth, measure, layout.height);
      const z = (p) => (p.layer.plane === "background" ? 0 : 1e4) + row.layers.indexOf(p.layer);
      const shapeGroup = (items, x, y, cluster = false) => {
        const p = items[0], g = element("g", { class: "vt-composed-record", tabindex: 0, role: "button", "aria-label": cluster ? `${items.length} items; select to list` : p.record.title, "data-key": p.key, "data-records": items.map((i) => i.record.id).join("|"), "data-lane": p.laneId, "data-track": p.subtrack });
        const full = cluster ? `${items.length} items` : `${p.record.title} \xB7 ${p.record.date.display || p.record.date.start}`;
        g.appendChild(element("title", {}, full));
        const select = () => details(items);
        g.addEventListener("click", select);
        g.addEventListener("focus", () => {
          hint.textContent = full;
        });
        g.addEventListener("mouseenter", () => {
          hint.textContent = full;
        });
        g.addEventListener("keydown", (e) => {
          var _a;
          const k = e.key;
          if (k === "Enter" || k === " ") {
            e.preventDefault();
            select();
          } else if (k === "ArrowRight" || k === "ArrowLeft") {
            e.preventDefault();
            const all = Array.from(scroll.querySelectorAll(".vt-composed-record")), i = all.indexOf(g);
            (_a = all[(i + (k === "ArrowRight" ? 1 : all.length - 1)) % all.length]) == null ? void 0 : _a.focus();
          }
        });
        if (cluster) {
          g.appendChild(element("circle", { cx: x, cy: y, r: 13, fill: p.layer.color, class: "vt-cluster-shape" }));
          g.appendChild(element("text", { x, y: y + 4, "text-anchor": "middle", class: "vt-cluster-text" }, String(items.length)));
        }
        return g;
      };
      for (const p of [...shown].filter((p2) => !p2.clustered).sort((a, b) => z(a) - z(b))) {
        const x = p.x, y = centerAt(p.curve, x), g = shapeGroup([p], x, y), attrs = { fill: p.layer.color, opacity: p.layer.opacity };
        if (p.style === "stream" || p.style === "box") {
          if (p.xEnd === p.x) g.appendChild(element("line", { x1: x, x2: x, y1: y - 6, y2: y + 6, stroke: p.layer.color, "stroke-width": 2 }));
          else g.appendChild(element("path", { ...attrs, d: ribbonPath(p), class: p.isAnchor ? "vt-anchor-shape" : "vt-duration-shape" }));
        } else if (p.style === "dot") g.appendChild(element("circle", { ...attrs, cx: x, cy: y, r: 5 }));
        else if (p.style === "line") g.appendChild(element("path", { d: curvePath(p), stroke: p.layer.color, "stroke-width": 2, fill: "none", opacity: p.layer.opacity }));
        else g.appendChild(element("rect", { ...attrs, x, y: p.anchor ? y - 28 : 16, width: Math.max(1, p.xEnd - x), height: p.anchor ? 56 : layout.height - 32 }));
        if (!p.isAnchor && p.style !== "band") g.appendChild(element("path", { d: curvePath(p), stroke: "transparent", "stroke-width": 20, fill: "none", class: "vt-hit-area" }));
        if (!p.isAnchor && ["box", "stream", "line"].includes(p.style)) for (const boundary of [.../* @__PURE__ */ new Set([p.x, p.xEnd])]) {
          const cy = centerAt(p.curve, boundary), half = halfAt(p, boundary) + 2;
          const cap = { x1: boundary, x2: boundary, y1: cy - half, y2: cy + half };
          g.appendChild(element("line", { ...cap, class: "vt-boundary-under" }));
          g.appendChild(element("line", { ...cap, class: "vt-item-boundary" }));
        }
        if ((selected == null ? void 0 : selected.key) === p.key) g.classList.add("is-selected");
        svg.appendChild(g);
      }
      for (const cluster of layout.clusters) {
        const members = cluster.items.filter((p) => visible.has(p.record.id));
        if (members.length) svg.appendChild(shapeGroup(members, cluster.x, cluster.y, true));
      }
      const callouts = element("g", { class: "vt-callouts" });
      svg.appendChild(callouts);
      for (const box of labelBoxes) {
        const p = shown.find((i) => i.key === box.key);
        if (box.leader) callouts.appendChild(element("path", { d: `M ${box.sourceX} ${box.sourceY} L ${box.x + Math.min(box.width / 2, 12)} ${box.y + 15}`, class: "vt-label-leader" }));
        const label = element("g", { class: "vt-name-button", tabindex: 0, role: "button", "aria-label": p.record.title });
        label.appendChild(element("title", {}, p.record.title));
        label.appendChild(element("rect", { x: box.x - 2, y: box.y - 1, width: box.width + 4, height: box.height + 2, rx: 3, class: "vt-label-backdrop" }));
        label.appendChild(element("text", { x: box.x, y: box.y + 12, class: "vt-adaptive-label", "data-for": p.key }, box.text));
        label.addEventListener("click", () => details([p]));
        label.addEventListener("keydown", (e) => {
          if (["Enter", " "].includes(e.key)) {
            e.preventDefault();
            details([p]);
          }
        });
        callouts.appendChild(label);
      }
    }
    diagnostics.hidden = !warningCount;
    if (warningCount) {
      diagnostics.createEl("summary", { text: `${warningCount} records or relationships need attention` });
      for (const d of warningList) button(diagnostics, `${d.record.title}: ${d.message}`, () => details([{ record: d.record, layer: { name: "Unassigned" }, key: `diagnostic/${d.record.id}` }]));
    }
    if (!view.rows.some((r) => r.enabled)) canvas.createEl("p", { text: "No visible rows. Add or enable a row in Configure timeline." });
    if (view.yearGrid) {
      const height = Math.max(0, canvas.offsetHeight - 38), grid = element("svg", { width: plotWidth, height, class: "vt-year-grid", "aria-hidden": "true" });
      grid.style.left = `${gutter}px`;
      for (const tick of ticks) {
        const x = tickX(tick);
        grid.appendChild(element("line", { x1: x, x2: x, y1: 0, y2: height }));
      }
      canvas.prepend(grid);
    }
    scroll.scrollLeft = previousLeft;
    scroll.scrollTop = previousTop;
  };
  let wheelFrame = 0, pendingWheel = 0, wheelPointer = 0;
  const clearWheel = () => {
    if (wheelFrame) cancelAnimationFrame(wheelFrame);
    wheelFrame = 0;
    pendingWheel = 0;
  };
  const disposePan = installDragPan(scroll, clearWheel);
  const zoomBy = (factor, pointer) => {
    const old = zoom, viewport = Math.max(260, scroll.clientWidth), basePlot = Math.max(720, viewport - gutter), oldPlot = basePlot * zoom;
    const focus = pointer != null ? pointer : viewport / 2;
    const relative = pointer === void 0 && selected ? (selected.start - bounds.min) / (bounds.max - bounds.min) : Math.max(0, Math.min(1, (scroll.scrollLeft + focus - gutter - 24) / Math.max(1, oldPlot - 48)));
    zoom = Math.max(1, Math.min(32, zoom * factor));
    if (old === zoom) return;
    draw();
    scroll.scrollLeft = gutter + 24 + relative * (basePlot * zoom - 48) - focus;
  };
  const fit = () => {
    clearWheel();
    zoom = 1;
    draw();
    scroll.scrollLeft = 0;
  };
  const onWheel = (event) => {
    if (scroll.classList.contains("is-panning")) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !Number.isFinite(event.deltaY) || !event.deltaY) return;
    const pointer = event.clientX - scroll.getBoundingClientRect().left - scroll.clientLeft;
    if (pointer < gutter || pointer > scroll.clientWidth) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroll.clientHeight : 1);
    pendingWheel += Math.max(-240, Math.min(240, delta));
    wheelPointer = pointer;
    if (!wheelFrame) wheelFrame = requestAnimationFrame(() => {
      wheelFrame = 0;
      const amount = pendingWheel;
      pendingWheel = 0;
      if (!dead) zoomBy(Math.exp(Math.max(-1.4, Math.min(1.4, -amount * 2e-3))), wheelPointer);
    });
  };
  scroll.addEventListener("wheel", onWheel, { passive: false });
  button(toolbar, "Fit", fit);
  button(toolbar, "Zoom in", () => {
    clearWheel();
    zoomBy(2);
  });
  button(toolbar, "Zoom out", () => {
    clearWheel();
    zoomBy(0.5);
  });
  const gridLabel = toolbar.createEl("label", { cls: "vt-grid-toggle" }), gridInput = gridLabel.createEl("input", { type: "checkbox" });
  gridLabel.createSpan({ text: "Year lines" });
  gridInput.checked = view.yearGrid === true;
  gridInput.onchange = async () => {
    const old = view.yearGrid;
    view.yearGrid = gridInput.checked;
    draw();
    gridInput.disabled = true;
    try {
      await (saveView == null ? void 0 : saveView(view));
    } catch (e) {
      view.yearGrid = old;
      gridInput.checked = old === true;
      draw();
      hint.textContent = "Could not save year-line setting. Please try again.";
    } finally {
      gridInput.disabled = false;
    }
  };
  const observer = new ResizeObserver(() => {
    if (Math.abs(scroll.clientWidth - lastWidth) > 1) draw();
  });
  observer.observe(scroll);
  draw();
  return { destroy() {
    dead = true;
    disposePan();
    clearWheel();
    scroll.removeEventListener("wheel", onWheel);
    observer.disconnect();
    root.removeEventListener("keydown", onKey);
    root.remove();
  }, setVisible(ids) {
    visible = ids;
    draw();
  }, zoomBy, fit };
}

// src/dashboard.ts
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
  async onClose() {
    var _a;
    (_a = this.chart) == null ? void 0 : _a.destroy();
  }
  async render() {
    var _a;
    (_a = this.chart) == null ? void 0 : _a.destroy();
    this.chart = void 0;
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
    this.draw(root);
  }
  draw(root) {
    var _a, _b, _c;
    const q = this.query.toLocaleLowerCase();
    const records = this.records.filter((r) => (!q || `${r.title} ${r.tags.join(" ")} ${r.categories.join(" ")} ${r.locations.join(" ")} ${r.entities.join(" ")}`.toLocaleLowerCase().includes(q)) && (!this.layer || r.layers.includes(this.layer)));
    const config = normalizeComposition(this.plugin.settings.composition), view = config.views.find((v) => v.id === config.active);
    if (((_a = root.querySelector(".vt-body")) == null ? void 0 : _a.getAttribute("data-view")) !== view.id) {
      (_b = this.chart) == null ? void 0 : _b.destroy();
      root.querySelectorAll(".vt-body").forEach((el) => el.remove());
      const body = root.createDiv({ cls: "vt-body", attr: { "data-view": view.id } });
      body.createDiv({ cls: "vt-range" });
      this.chart = renderComposition(body, view, config, this.records, rangeOf(this.records), (p) => this.plugin.openNote(p), 1, async (updated) => {
        var _a2;
        const saved = (_a2 = this.plugin.settings.composition) == null ? void 0 : _a2.views.find((v) => v.id === updated.id);
        if (!saved) throw new Error("Saved view unavailable");
        const previous = saved.yearGrid;
        saved.yearGrid = updated.yearGrid;
        try {
          await this.plugin.saveSettings();
        } catch (error) {
          saved.yearGrid = previous;
          throw error;
        }
      });
    }
    const status = root.querySelector(".vt-range");
    if (status) status.textContent = `${records.length} matching records \xB7 ${view.rows.filter((r) => r.enabled).length} rows \xB7 select an item for details`;
    (_c = this.chart) == null ? void 0 : _c.setVisible(new Set(records.map((r) => r.id)));
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

// src/types.ts
var DEFAULT_SETTINGS = { settingsVersion: 1, rootFolder: "Collections/Visual Timeline", recordsFolder: "Collections/Visual Timeline/Records", indexFile: "Collections/Visual Timeline/Visual Timeline Index.md", mapAssetPath: "", idPrefix: "VTL", filenameTemplate: "{id} - {title}", defaultRangeYears: 100, defaultLayer: "", showUnresolved: true, compact: false, dashboardWidget: true, startup: false, autoRefreshSeconds: 0, layers: ["church", "kingdoms", "cultures", "people", "places"], categories: ["event", "kingdom", "era", "period", "place", "person", "culture"], relationshipLabels: { continued_from: "Continued from", split_into: "Split into", merged_into: "Merged into", preceded_by: "Preceded by", succeeded_by: "Succeeded by", related_to: "Related to", contemporary_with: "Contemporary with" } };

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
    new import_obsidian5.Setting(c).setName("Full-height year lines").setDesc("Extend the date ruler ticks vertically behind every row. Saved separately for each view.").addToggle((t) => t.setValue(view.yearGrid === true).onChange((v) => view.yearGrid = v));
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
      new import_obsidian5.Setting(section).setName("Minimum height").setDesc("CSS pixels, independent of zoom. Only historical lanes add height, never labels.").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "120";
        t.inputEl.max = "1200";
        t.setValue(String(row.height)).onChange((v) => row.height = Math.max(120, Math.min(1200, Number(v) || 220)));
      });
      new import_obsidian5.Setting(section).setName("Visible overlap tracks").setDesc("Additional overlaps become selectable count markers.").addDropdown((d) => {
        [1, 2, 3, 4, 5, 6].forEach((n) => d.addOption(String(n), String(n)));
        d.setValue(String(row.maxSubtracks || 3)).onChange((v) => row.maxSubtracks = Number(v));
      });
      const order = section.createEl("details");
      order.createEl("summary", { text: "Anchor ordering" });
      new import_obsidian5.Setting(order).setName("Anchor IDs in preferred order").setDesc("Comma-separated stable IDs; unspecified anchors use date and ID order.").addText((t) => t.setValue((row.anchorOrder || []).join(", ")).onChange((v) => row.anchorOrder = v.split(",").map((s) => s.trim()).filter(Boolean)));
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
        new import_obsidian5.Setting(details).setName("Attach to anchor layer").setDesc("Follow explicit relationships to records in another layer of this row. No name-based guessing.").addDropdown((d) => {
          var _a;
          d.addOption("", "Independent");
          for (const l of row.layers.filter((l2) => l2 !== layer && !l2.attachment)) d.addOption(l.id, l.name);
          if (layer.attachment && !row.layers.some((l) => l.id === layer.attachment.anchorLayer)) d.addOption(layer.attachment.anchorLayer, "Unavailable anchor layer");
          d.setValue(((_a = layer.attachment) == null ? void 0 : _a.anchorLayer) || "").onChange((v) => {
            layer.attachment = v ? { anchorLayer: v, relationship: "related_to", overrides: {} } : void 0;
            this.draw();
          });
        });
        if (layer.attachment) {
          const a = layer.attachment, anchor = row.layers.find((l) => l.id === a.anchorLayer);
          if (!anchor || !anchor.enabled) details.createEl("p", { text: "Warning: the anchor layer is unavailable. Records will appear in Unassigned." });
          new import_obsidian5.Setting(details).setName("Relationship field").addDropdown((d) => {
            Object.entries(this.plugin.settings.relationshipLabels).forEach(([k, v]) => d.addOption(k, v));
            d.setValue(a.relationship).onChange((v) => a.relationship = v);
          });
          const overrides = details.createEl("details");
          overrides.createEl("summary", { text: "Explicit anchor overrides" });
          overrides.createEl("p", { cls: "vt-section-note", text: "Overrides affect this display only. Notes are never rewritten." });
          for (const record of this.records.filter((r) => matches(r, layer))) new import_obsidian5.Setting(overrides).setName(record.title).addDropdown((d) => {
            d.addOption("", "Use note relationship");
            if (a.overrides[record.id]) d.addOption(a.overrides[record.id], a.overrides[record.id]);
            for (const r of this.records.filter((r2) => anchor && matches(r2, anchor))) d.addOption(r.id, r.title);
            d.setValue(a.overrides[record.id] || "").onChange((v) => {
              if (v) a.overrides[record.id] = v;
              else delete a.overrides[record.id];
            });
          });
        }
        new import_obsidian5.Setting(details).setName("Display style").addDropdown((d) => {
          d.addOption("default", "Category default");
          STYLES.forEach((s) => d.addOption(s, s === "box" ? "Box / duration bar" : s[0].toUpperCase() + s.slice(1)));
          d.setValue(layer.style).onChange((v) => layer.style = v);
        });
        new import_obsidian5.Setting(details).setName("Placement").addDropdown((d) => d.addOption("background", "Background").addOption("foreground", "Foreground").setValue(layer.plane).onChange((v) => layer.plane = v));
        new import_obsidian5.Setting(details).setName("Opacity").addSlider((s) => s.setLimits(10, 100, 5).setValue(layer.opacity * 100).setDynamicTooltip().onChange((v) => layer.opacity = v / 100));
        new import_obsidian5.Setting(details).setName("Color").addColorPicker((p) => p.setValue(layer.color).onChange((v) => layer.color = v));
        new import_obsidian5.Setting(details).setName("Labels").setDesc("Labels never move records. Full names are always available in the detail panel.").addDropdown((d) => d.addOption("adaptive", "Adaptive: show names that fit").addOption("always", "Prefer visible: omit collisions").addOption("selection", "On hover or keyboard focus").addOption("hidden", "Hidden (details remain)").setValue(layer.labels).onChange((v) => layer.labels = v));
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
