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
var import_obsidian9 = require("obsidian");

// src/settings.ts
var import_obsidian = require("obsidian");
var TimelineSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const c = this.containerEl;
    c.empty();
    c.createEl("h2", { text: "Visual Timeline" });
    c.createEl("h3", { text: "Storage" });
    this.text(c, "Root folder", "Markdown root folder. Changing paths never moves existing files.", "rootFolder");
    this.text(c, "Records folder", "Destination for newly created historical records.", "recordsFolder");
    this.text(c, "Timeline workspaces folder", "Blank uses <root folder>/Timelines. Existing workspace notes are not moved.", "timelinesFolder");
    this.text(c, "Index file", "Optional index note", "indexFile");
    this.text(c, "Local map asset", "Optional local SVG/GeoJSON path; no network is used", "mapAssetPath");
    c.createEl("h3", { text: "Timelines" });
    new import_obsidian.Setting(c).setName("Manage timeline projects").setDesc("Create project folders, switch active timelines, rename or archive projects. New records are saved in the active project automatically.").addButton((b) => b.setButtonText("Manage projects").onClick(() => void this.plugin.openTimelineManager()));
    new import_obsidian.Setting(c).setName("Move legacy records").setDesc("Preview and move records from the old shared Records folder into the active project, with a verified backup and link repair.").addButton((b) => b.setButtonText("Preview migration").onClick(() => void this.plugin.openActiveProjectMigration()));
    this.number(c, "Default range (years)", "Years shown around the selected range", "defaultRangeYears");
    this.text(c, "Default layer", "Initial layer filter", "defaultLayer");
    new import_obsidian.Setting(c).setName("Show unresolved relationships").setDesc("Keep unresolved references visible for review.").addToggle((t) => t.setValue(this.plugin.settings.showUnresolved).onChange(async (v) => {
      this.plugin.settings.showUnresolved = v;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(c).setName("Compact layout").addToggle((t) => t.setValue(this.plugin.settings.compact).onChange(async (v) => {
      this.plugin.settings.compact = v;
      await this.plugin.saveSettings();
    }));
    c.createEl("h3", { text: "Taxonomy" });
    new import_obsidian.Setting(c).setName("Layers").setDesc("Comma-separated lane names").addText((t) => t.setValue(this.plugin.settings.layers.join(", ")).onChange(async (v) => {
      this.plugin.settings.layers = v.split(",").map((x) => x.trim()).filter(Boolean);
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(c).setName("Categories").setDesc("Comma-separated record categories").addText((t) => t.setValue(this.plugin.settings.categories.join(", ")).onChange(async (v) => {
      this.plugin.settings.categories = v.split(",").map((x) => x.trim()).filter(Boolean);
      await this.plugin.saveSettings();
    }));
  }
  text(c, name, desc, key) {
    new import_obsidian.Setting(c).setName(name).setDesc(desc).addText((t) => {
      var _a;
      return t.setValue(String((_a = this.plugin.settings[key]) != null ? _a : "")).onChange(async (v) => {
        this.plugin.settings[key] = v.trim();
        await this.plugin.saveSettings();
      });
    });
  }
  number(c, name, desc, key) {
    new import_obsidian.Setting(c).setName(name).setDesc(desc).addText((t) => t.setValue(String(this.plugin.settings[key])).onChange(async (v) => {
      this.plugin.settings[key] = Math.max(1, Number(v) || 1);
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
  if (step >= 1) {
    for (let n = Math.max(step, Math.ceil((1 - Math.min(max, 0)) / step) * step); n <= 1 - min && ticks.length < 100; n += step) ticks.push(1 - n);
    for (let n = Math.max(step, Math.ceil(Math.max(1, min) / step) * step); n <= max && ticks.length < 100; n += step) ticks.push(n);
  } else for (let n = Math.ceil(min / step) * step; n <= max + step / 100 && ticks.length < 100; n += step) ticks.push(n);
  return ticks.sort((a, b) => a - b);
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
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
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
    return this.app.vault.getMarkdownFiles().filter((file) => !file.path.startsWith(".obsidian/plugins/visual-timeline/migration-backups/"));
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
  async createEvent(input, project2) {
    return (await this.createEventRecord(input, project2)).file;
  }
  async createEventRecord(input, project2) {
    if (project2.mode !== "project" || !project2.recordsFolder) throw new Error("Choose a project timeline before creating a record.");
    const recordId = id(this.settings.idPrefix), folder = (0, import_obsidian2.normalizePath)(project2.recordsFolder);
    await this.ensureFolder(folder);
    const path = (0, import_obsidian2.normalizePath)(`${folder}/${safeName(this.settings.filenameTemplate.replace("{id}", recordId).replace("{title}", input.title))}.md`);
    const now = (/* @__PURE__ */ new Date()).toISOString(), fm = { type: input.type, schema_version: 1, timeline_id: recordId, timeline_project_id: project2.id, title: input.title, status: "active", tags: input.tags.length ? input.tags : ["timeline"], layers: input.layers.length ? input.layers : ["general"], categories: input.categories.length ? input.categories : ["event"], locations: input.locations, entities: input.entities, date: { ...input.date, display: input.date.display || input.date.start }, relations: { continued_from: [], split_into: [], merged_into: [], preceded_by: [], succeeded_by: [], related_to: [], contemporary_with: [] }, created: now, updated: now };
    const file = await this.app.vault.create(path, `---
${(0, import_obsidian2.stringifyYaml)(fm)}---

# ${input.title}

`);
    return { id: recordId, file };
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

// src/timeline-repository.ts
var import_obsidian3 = require("obsidian");
var TYPE = "visual-timeline-project";
var unique = (ids) => [...new Set(ids.map((v) => v.trim()).filter(Boolean))].sort();
function frontmatter(content) {
  const match = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const parsed = (0, import_obsidian3.parseYaml)(match[1]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid frontmatter");
  return parsed;
}
function fields(fm) {
  return JSON.stringify([fm.type, fm.schema_version, fm.timeline_project_id, fm.name, fm.description, fm.status, fm.record_ids, fm.records_folder]);
}
function project(file, fm) {
  const schema = fm.schema_version;
  if (schema !== 1 && schema !== 2 || typeof fm.timeline_project_id !== "string" || !fm.timeline_project_id.trim() || typeof fm.name !== "string" || !fm.name.trim() || !["active", "archived"].includes(String(fm.status))) throw new Error("Unsupported or incomplete timeline metadata");
  if (schema === 1) {
    if (!Array.isArray(fm.record_ids) || fm.record_ids.some((v) => typeof v !== "string")) throw new Error("Legacy timeline membership is invalid");
    return { id: fm.timeline_project_id, name: fm.name.trim(), description: typeof fm.description === "string" ? fm.description : "", status: fm.status, mode: "legacy", recordIds: unique(fm.record_ids), path: file.path, file, revision: fields(fm) };
  }
  if (typeof fm.records_folder !== "string" || !fm.records_folder.trim()) throw new Error("Project timeline is missing its Records folder.");
  return { id: fm.timeline_project_id, name: fm.name.trim(), description: typeof fm.description === "string" ? fm.description : "", status: fm.status, mode: "project", recordIds: [], recordsFolder: (0, import_obsidian3.normalizePath)(fm.records_folder), path: file.path, file, revision: fields(fm) };
}
var TimelineProjectRepository = class {
  constructor(app, settings) {
    this.app = app;
    this.settings = settings;
  }
  folder() {
    const value = (this.settings.timelinesFolder || `${this.settings.rootFolder}/Timelines`).trim().replace(/\\/g, "/");
    if (!value || value.startsWith("/") || value.includes(":") || value.split("/").some((p) => p === ".." || p === "." || !p)) throw new Error("Timeline folder must be a vault-relative path without . or .. segments.");
    return (0, import_obsidian3.normalizePath)(value);
  }
  async all() {
    const folder = this.folder() + "/", projects = [], warnings = [];
    for (const file of this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith(folder))) {
      try {
        const fm = frontmatter(await this.app.vault.cachedRead(file));
        if (fm.type !== TYPE) continue;
        const p = project(file, fm);
        if (p.mode === "project") {
          const parent = file.path.split("/").slice(0, -1).join("/"), expected = (0, import_obsidian3.normalizePath)(`${parent}/Records`);
          if (!file.path.endsWith("/Timeline.md") || p.recordsFolder !== expected || !p.recordsFolder.startsWith(folder)) throw new Error("Project folder metadata does not match its Timeline.md location.");
        }
        projects.push(p);
      } catch (e) {
        warnings.push(`Could not read timeline project: ${file.path}`);
      }
    }
    const counts = /* @__PURE__ */ new Map();
    projects.forEach((p) => counts.set(p.id, (counts.get(p.id) || 0) + 1));
    const duplicates = new Set([...counts].filter(([, n]) => n > 1).map(([key]) => key));
    for (const key of duplicates) warnings.push(`Duplicate timeline ID ${key}. Give each workspace a unique ID before opening it.`);
    return { projects: projects.filter((p) => !duplicates.has(p.id)).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)), warnings };
  }
  async save(draft, existing) {
    const name = draft.name.trim();
    if (!name) throw new Error("Give this timeline a name.");
    const catalog = await this.all();
    if (catalog.warnings.length) throw new Error("Resolve the timeline workspace warnings before saving.");
    if (existing && !catalog.projects.some((p) => p.id === existing.id && p.path === existing.path)) throw new Error("This timeline was moved or removed. Reopen the manager before saving.");
    if (catalog.projects.some((p) => p.id !== (existing == null ? void 0 : existing.id) && p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error("A timeline with this name already exists. Choose another name.");
    const values = { name, description: draft.description.trim(), status: draft.status };
    if (!existing) {
      const projectId = id("VTP"), root = this.folder();
      let folder = (0, import_obsidian3.normalizePath)(`${root}/${safeName(name)}`);
      if (this.app.vault.getAbstractFileByPath(folder)) folder = (0, import_obsidian3.normalizePath)(`${folder} ${projectId.slice(-6)}`);
      const recordsFolder = (0, import_obsidian3.normalizePath)(`${folder}/Records`);
      await this.ensureFolder(recordsFolder);
      const now = (/* @__PURE__ */ new Date()).toISOString(), fm = { type: TYPE, schema_version: 2, timeline_project_id: projectId, ...values, records_folder: recordsFolder, created: now, updated: now };
      const file2 = await this.app.vault.create((0, import_obsidian3.normalizePath)(`${folder}/Timeline.md`), `---
${(0, import_obsidian3.stringifyYaml)(fm)}---

# ${name}

This project owns the timeline records in its Records folder. New records are created here automatically.

## Notes

`);
      return project(file2, fm);
    }
    const file = this.app.vault.getAbstractFileByPath(existing.path);
    if (!(file instanceof import_obsidian3.TFile)) throw new Error("Timeline workspace is no longer available.");
    const currentFm = frontmatter(await this.app.vault.read(file));
    if (fields(currentFm) !== existing.revision) throw new Error("This timeline changed elsewhere. Reopen it before saving.");
    const current = project(file, currentFm);
    if (current.name === values.name && current.description === values.description && current.status === values.status) return current;
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      if (fields(fm) !== existing.revision) throw new Error("This timeline changed elsewhere. Reopen it before saving.");
      Object.assign(fm, values, { updated: (/* @__PURE__ */ new Date()).toISOString() });
    });
    return project(file, frontmatter(await this.app.vault.read(file)));
  }
  async activeProject(projectId) {
    if (!projectId) return void 0;
    const catalog = await this.all();
    return catalog.projects.find((p) => p.id === projectId && p.status === "active");
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

// src/timeline-modal.ts
var import_obsidian4 = require("obsidian");

// src/composition.ts
var STYLES = ["stream", "line", "dot", "box", "band"];
var SHAPE_HEIGHTS = { category: 88, stream: 40, item: 14, context: 32 };
function displayHeight(layer, style, isAnchor = false) {
  if (typeof layer.height === "number" && Number.isFinite(layer.height)) return Math.max(8, Math.min(240, layer.height));
  return style === "band" ? layer.bandPlacement === "lane" || layer.bandPlacement === "integrated" ? SHAPE_HEIGHTS.category : SHAPE_HEIGHTS.context : isAnchor ? SHAPE_HEIGHTS.stream : SHAPE_HEIGHTS.item;
}
function contrastText(color) {
  const channels = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#000000" : "#ffffff";
}
var uid = () => `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
function newLayer(name = "New layer", type = "") {
  return { id: uid(), name, enabled: true, types: type ? [`visual-timeline-${type}`] : [], categories: [], excludeCategories: [], tags: [], style: "default", plane: "foreground", opacity: 1, color: "#659fa0", labels: "adaptive", bandPlacement: "context", bandShape: "box", tintFromAttached: false };
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
  var _a, _b, _c, _d;
  if (!value || typeof value !== "object") return defaults();
  const raw = value;
  if (!Array.isArray(raw.views) || !raw.views.length) return defaults();
  const views = raw.views.filter((v) => v && typeof v === "object").map((v) => ({ id: typeof v.id === "string" ? v.id : uid(), name: String(v.name || "Untitled view"), ...v.yearGrid !== void 0 ? { yearGrid: v.yearGrid === true } : {}, rows: (Array.isArray(v.rows) ? v.rows : []).filter(Boolean).map((r) => ({ id: r.id || uid(), name: String(r.name || "Untitled row"), height: finite(r.height, 220, 120, 1200), anchorOrder: strings(r.anchorOrder), maxSubtracks: Math.round(finite(r.maxSubtracks, 3, 1, 6)), enabled: r.enabled !== false, layers: (Array.isArray(r.layers) ? r.layers : []).filter(Boolean).map((l) => ({ ...newLayer(), id: l.id || uid(), name: String(l.name || "Untitled layer"), enabled: l.enabled !== false, types: strings(l.types), categories: strings(l.categories), excludeCategories: strings(l.excludeCategories), tags: strings(l.tags), style: STYLES.includes(l.style) ? l.style : "default", plane: l.plane === "background" ? "background" : "foreground", opacity: finite(l.opacity, 1, 0.1, 1), color: /^#[\da-f]{6}$/i.test(l.color) ? l.color : "#659fa0", labels: ["adaptive", "always", "selection", "hidden"].includes(l.labels) ? l.labels : "adaptive", attachment: normalizeAttachment(l.attachment) })) })) }));
  if (!views.length) return defaults();
  for (const view of views) for (const row of view.rows) for (const layer of row.layers) {
    const stored = (_d = (_c = (_b = (_a = raw.views.find((v) => v.id === view.id)) == null ? void 0 : _a.rows) == null ? void 0 : _b.find((r) => r.id === row.id)) == null ? void 0 : _c.layers) == null ? void 0 : _d.find((l) => l.id === layer.id);
    layer.bandPlacement = (stored == null ? void 0 : stored.bandPlacement) === "integrated" ? "integrated" : (stored == null ? void 0 : stored.bandPlacement) === "lane" ? "lane" : "context";
    layer.tintFromAttached = (stored == null ? void 0 : stored.tintFromAttached) === true;
    layer.bandShape = (stored == null ? void 0 : stored.bandShape) === "contour" ? "contour" : "box";
    if (typeof (stored == null ? void 0 : stored.height) === "number" && Number.isFinite(stored.height)) layer.height = finite(stored.height, SHAPE_HEIGHTS.item, 8, 240);
  }
  const categoryStyles = {};
  for (const [key, style] of Object.entries(raw.categoryStyles || {})) if (STYLES.includes(style)) categoryStyles[key] = style;
  return { version: 2, active: views.some((v) => v.id === raw.active) ? raw.active : views[0].id, views, categoryStyles };
}
function matches(record, layer) {
  const norm = (s) => s.replace(/^#/, "").toLocaleLowerCase();
  const categories = record.categories.map(norm);
  return layer.enabled && (!layer.types.length || layer.types.includes(record.type)) && (!layer.categories.length || layer.categories.some((c) => categories.includes(norm(c)))) && !(layer.excludeCategories || []).some((c) => categories.includes(norm(c))) && (!layer.tags.length || layer.tags.some((t) => record.tags.map(norm).includes(norm(t))));
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

// src/timelines.ts
function recordsForTimeline(records, project2) {
  if (!project2) return records;
  if (project2.mode === "project" && project2.recordsFolder) {
    const prefix = `${project2.recordsFolder.replace(/\/$/, "")}/`;
    return records.filter((r) => r.path.startsWith(prefix));
  }
  const ids = new Set(project2.recordIds);
  return records.filter((r) => ids.has(r.id));
}
function activeProject(settings, catalog) {
  return catalog.projects.find((p) => p.id === settings.activeTimeline && p.status === "active");
}
function compositionForTimeline(settings, projectId = "") {
  if (!projectId) return normalizeComposition(settings.composition);
  if (settings.timelineLayouts && Object.prototype.hasOwnProperty.call(settings.timelineLayouts, projectId)) return normalizeComposition(settings.timelineLayouts[projectId]);
  const viewId = `${projectId}-overview`;
  return { version: 2, active: viewId, categoryStyles: { ...normalizeComposition(settings.composition).categoryStyles }, views: [{
    id: viewId,
    name: "Overview",
    yearGrid: true,
    rows: [{ id: `${projectId}-row`, name: "Timeline", height: 220, enabled: true, maxSubtracks: 3, anchorOrder: [], layers: [{
      id: `${projectId}-records`,
      name: "Records",
      enabled: true,
      types: [],
      categories: [],
      tags: [],
      style: "default",
      plane: "foreground",
      opacity: 1,
      color: "#659fa0",
      labels: "adaptive",
      bandPlacement: "context",
      bandShape: "box"
    }] }]
  }] };
}

// src/timeline-modal.ts
var TimelineManagerModal = class extends import_obsidian4.Modal {
  constructor(plugin, catalog, records, create = false) {
    super(plugin.app);
    this.plugin = plugin;
    this.catalog = catalog;
    this.records = records;
    this.copyLayout = true;
    this.busy = false;
    if (create) this.start();
  }
  onOpen() {
    this.modalEl.addClass("vt-project-modal");
    this.draw();
    this.contentEl.scrollTop = 0;
  }
  onClose() {
    this.contentEl.empty();
  }
  start(p) {
    this.editing = p;
    this.copyLayout = true;
    this.draft = { name: (p == null ? void 0 : p.name) || "", description: (p == null ? void 0 : p.description) || "", status: (p == null ? void 0 : p.status) || "active" };
  }
  button(parent, label, action) {
    const b = parent.createEl("button", { text: label });
    b.onclick = action;
    return b;
  }
  draw() {
    const c = this.contentEl;
    c.empty();
    c.addClass("vt-project-editor");
    c.scrollTop = 0;
    c.createEl("h2", { text: this.draft ? this.editing ? "Edit timeline project" : "New timeline project" : "Timeline projects" });
    if (!this.draft) {
      this.drawList(c);
      return;
    }
    const draft = this.draft;
    c.createEl("p", { cls: "vt-section-note", text: "A project gets its own folder and Records subfolder. New items are saved there automatically; no item-level timeline assignment is needed." });
    new import_obsidian4.Setting(c).setName("Project name").addText((t) => {
      t.inputEl.setAttribute("aria-label", "Timeline project name");
      t.setValue(draft.name).onChange((v) => draft.name = v);
    });
    new import_obsidian4.Setting(c).setName("Description").addTextArea((t) => {
      t.inputEl.rows = 2;
      t.inputEl.setAttribute("aria-label", "Timeline project description");
      t.setValue(draft.description).onChange((v) => draft.description = v);
    });
    if (this.editing) new import_obsidian4.Setting(c).setName("Status").setDesc("Archiving hides the project from the active selector; its folder and records remain intact.").addDropdown((d) => d.addOption("active", "Active").addOption("archived", "Archived").setValue(draft.status).onChange((v) => draft.status = v));
    else new import_obsidian4.Setting(c).setName("Copy current layout").setDesc("Start this project with the current rows, layers, and saved views. This does not copy or assign any notes.").addToggle((t) => t.setValue(this.copyLayout).onChange((v) => this.copyLayout = v));
    const error = c.createEl("p", { cls: "vt-project-error", attr: { role: "alert" } }), footer = c.createDiv({ cls: "vt-editor-footer" });
    const cancel = this.button(footer, "Cancel", () => this.close());
    const save = this.button(footer, this.editing ? "Save project" : "Create project", () => void this.save(error, save, cancel));
    save.addClass("mod-cta");
  }
  drawList(c) {
    c.createEl("p", { cls: "vt-section-note", text: "Each project owns the items in its Records folder. All records remains available for browsing older notes. Legacy collection timelines are preserved as read-only views." });
    this.button(c, "New timeline project", () => {
      this.start();
      this.draw();
    }).addClass("mod-cta");
    for (const warning of this.catalog.warnings) c.createEl("p", { cls: "vt-project-error", text: warning });
    if (!this.catalog.projects.length) c.createEl("p", { text: "No timeline projects yet. Create one to start a focused timeline." });
    for (const p of this.catalog.projects) {
      const row = c.createDiv({ cls: "vt-project-row" }), info = row.createDiv(), count = recordsForTimeline(this.records, p).length;
      info.createEl("strong", { text: p.name });
      info.createEl("small", { text: `${count} ${count === 1 ? "record" : "records"} \xB7 ${p.mode === "project" ? "Project folder" : "Legacy collection \xB7 read only"}${p.status === "archived" ? " \xB7 Archived" : ""}` });
      if (p.description) info.createEl("p", { text: p.description });
      const actions = row.createDiv({ cls: "vt-project-tools" });
      if (p.status === "active") this.button(actions, "Open", () => void this.openProject(p));
      this.button(actions, "Edit details", () => {
        this.start(p);
        this.draw();
      });
      if (p.mode === "project" && this.records.some((r) => r.path.startsWith(`${this.plugin.settings.recordsFolder.replace(/\/$/, "")}/`))) this.button(actions, "Move legacy records here", () => void this.plugin.openProjectMigration(p));
      this.button(actions, "Open note", () => this.plugin.openNote(p.path));
    }
    const footer = c.createDiv({ cls: "vt-editor-footer" });
    this.button(footer, "Close", () => this.close());
  }
  async openProject(p) {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.plugin.setActiveTimeline(p.id);
      this.close();
    } catch (e) {
      new import_obsidian4.Notice("Could not open timeline project. Try again.");
    } finally {
      this.busy = false;
    }
  }
  async save(error, save, cancel) {
    if (this.busy || !this.draft) return;
    this.busy = true;
    error.textContent = "";
    const controls = Array.from(this.contentEl.querySelectorAll("input,button,select,textarea"));
    controls.forEach((el) => el.disabled = true);
    try {
      if (!this.committed) {
        const sourceId = this.plugin.settings.activeTimeline || "", layout = this.copyLayout ? compositionForTimeline(this.plugin.settings, sourceId) : void 0;
        const created = !this.editing, p = await this.plugin.projects.save(this.draft, this.editing);
        this.editing = p;
        this.committed = { project: p, created, layout, stage: layout ? "layout" : "activation", activeId: p.status === "active" ? p.id : sourceId === p.id ? "" : sourceId };
      }
      const pending = this.committed;
      if (pending.stage === "layout") {
        await this.plugin.saveComposition(pending.project.id, pending.layout);
        pending.stage = "activation";
      }
      await this.plugin.setActiveTimeline(pending.activeId);
      this.close();
      new import_obsidian4.Notice(`Timeline project ${pending.created ? "created" : "saved"}.`);
    } catch (e) {
      if (this.committed) {
        const copying = this.committed.stage === "layout", step = copying ? "Copying the layout" : "Opening the active project", recovery = copying ? "Close to keep the saved project without copying its layout." : "Close to keep the saved project and open it later from Timeline projects.";
        error.textContent = `Project \u201C${this.committed.project.name}\u201D was saved. ${step} could not finish. Retry setup or ${recovery}`;
        save.textContent = "Retry setup";
        cancel.textContent = "Close";
      } else error.textContent = e instanceof Error ? e.message : "Could not save project. Try again.";
    } finally {
      this.busy = false;
      controls.forEach((el) => el.disabled = !!this.committed);
      save.disabled = false;
      cancel.disabled = false;
    }
  }
};

// src/project-migration.ts
var import_obsidian5 = require("obsidian");
var BACKUP_ROOT = ".obsidian/plugins/visual-timeline/migration-backups";
async function sha256(value) {
  const bytes = new TextEncoder().encode(value), digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((v) => v.toString(16).padStart(2, "0")).join("");
}
function identity(content) {
  const match = content.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error("Timeline record has no frontmatter.");
  const fm = (0, import_obsidian5.parseYaml)(match[1]);
  return { type: String(fm.type || ""), id: String(fm.timeline_id || fm.id || "") };
}
var ProjectMigrationModal = class extends import_obsidian5.Modal {
  constructor(plugin, project2) {
    super(plugin.app);
    this.plugin = plugin;
    this.project = project2;
    this.files = [];
    this.linkedFiles = [];
    this.loading = true;
    this.busy = false;
    this.error = "";
  }
  onOpen() {
    this.modalEl.addClass("vt-project-modal");
    this.contentEl.addClass("vt-project-editor");
    this.contentEl.scrollTop = 0;
    void this.load();
  }
  onClose() {
    this.contentEl.empty();
  }
  async load() {
    const source = this.plugin.settings.recordsFolder.replace(/\\/g, "/").replace(/\/$/, "") + "/", all = this.plugin.app.vault.getMarkdownFiles();
    this.files = all.filter((file) => file.path.startsWith(source));
    const records = new Set(this.plugin.repository.files().filter((file) => file.path.startsWith(source)).map((file) => file.path));
    const unsupported = this.files.filter((file) => !records.has(file.path));
    if (unsupported.length) this.error = `${unsupported.length} Markdown file${unsupported.length === 1 ? " is" : "s are"} not recognized as timeline records; nothing will move until reviewed.`;
    const moved = new Set(this.files.map((file) => file.path));
    const links = this.plugin.app.metadataCache.resolvedLinks;
    const sources = /* @__PURE__ */ new Set();
    for (const [sourcePath, targets] of Object.entries(links || {})) if (Object.keys(targets).some((target) => moved.has(target)) && !moved.has(sourcePath)) sources.add(sourcePath);
    this.linkedFiles = all.filter((file) => sources.has(file.path));
    this.loading = false;
    this.draw();
  }
  draw() {
    const c = this.contentEl;
    c.empty();
    c.scrollTop = 0;
    c.createEl("h2", { text: "Move legacy records into project" });
    if (this.loading) {
      c.createEl("p", { text: "Preparing a migration preview\u2026" });
      return;
    }
    if (this.project.mode !== "project" || !this.project.recordsFolder) {
      c.createEl("p", { cls: "vt-project-error", text: "Select a project-folder timeline before moving legacy records." });
      return;
    }
    const destination = this.project.recordsFolder.replace(/\/$/, "") + "/", collisions = this.files.filter((file) => this.plugin.app.vault.getAbstractFileByPath(destination + file.name));
    c.createEl("p", { cls: "vt-section-note", text: `This preview will move ${this.files.length} existing records from \u201C${this.plugin.settings.recordsFolder}\u201D into \u201C${this.project.name}\u201D. The notes keep their filenames and stable IDs. Linked notes are backed up before Obsidian updates paths.` });
    c.createEl("p", { cls: "vt-section-note", text: `A verified copy of each record and any note linking to it will be retained under ${BACKUP_ROOT}/ before the move.` });
    if (collisions.length) c.createEl("p", { cls: "vt-project-error", text: `${collisions.length} destination filename collision${collisions.length === 1 ? "" : "s"} detected. Nothing will move.` });
    if (!this.files.length) c.createEl("p", { text: "No legacy records remain in the configured records folder." });
    if (this.files.length) {
      const details = c.createEl("details");
      details.createEl("summary", { text: `Preview ${this.files.length} records` });
      const list2 = details.createEl("ul");
      for (const file of this.files) list2.createEl("li", { text: file.basename });
    }
    if (this.linkedFiles.length) c.createEl("p", { cls: "vt-section-note", text: `${this.linkedFiles.length} other note${this.linkedFiles.length === 1 ? " links" : "s link"} to these records; their original contents will be backed up before link repair.` });
    const error = c.createEl("p", { cls: "vt-project-error", attr: { role: "alert" } });
    error.textContent = this.error;
    const footer = c.createDiv({ cls: "vt-editor-footer" }), cancel = footer.createEl("button", { text: "Cancel" });
    cancel.onclick = () => this.close();
    const move = footer.createEl("button", { text: `Move ${this.files.length} records`, cls: "mod-cta" });
    move.disabled = !!this.error || collisions.length > 0 || !this.files.length || this.busy;
    move.onclick = () => void this.migrate(error, move, cancel);
  }
  async ensureFolder(path) {
    let current = "";
    for (const part of path.split("/")) {
      current = current ? `${current}/${part}` : part;
      if (!this.plugin.app.vault.getAbstractFileByPath(current)) await this.plugin.app.vault.createFolder(current);
    }
  }
  async migrate(error, move, cancel) {
    if (this.busy || this.project.mode !== "project" || !this.project.recordsFolder) return;
    this.busy = true;
    error.textContent = "";
    const buttons = [move, cancel];
    buttons.forEach((b) => b.disabled = true);
    const source = this.plugin.settings.recordsFolder.replace(/\\/g, "/").replace(/\/$/, "") + "/", destination = this.project.recordsFolder.replace(/\/$/, "") + "/", timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-"), backupRoot = `${BACKUP_ROOT}/${timestamp}`, entries = [], moved = [];
    let manifestFile;
    try {
      const current = this.plugin.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(source));
      if (current.length !== this.files.length) throw new Error("The source records changed after preview. Reopen the migration preview.");
      const ids = /* @__PURE__ */ new Map();
      for (const file of current) {
        const meta = metadataToRecord(file, this.plugin.app.metadataCache);
        if (!meta) throw new Error(`A source file is no longer a recognized timeline record: ${file.basename}`);
        const id2 = String(meta.frontmatter.timeline_id || meta.frontmatter.id || "");
        if (!id2) throw new Error(`Record has no stable ID; add one before moving it: ${file.basename}`);
        if (ids.has(id2)) throw new Error(`Duplicate timeline record ID ${id2}; resolve it before migration.`);
        ids.set(id2, file.path);
        if (this.plugin.app.vault.getAbstractFileByPath(destination + file.name)) throw new Error(`Destination collision: ${file.name}`);
      }
      const backupInputs = [...current.map((file) => ({ file, kind: "record" })), ...this.linkedFiles.map((file) => ({ file, kind: "linked-note" }))];
      for (const { file, kind } of backupInputs) {
        const content = await this.plugin.app.vault.read(file), backup = `${backupRoot}/files/${file.path}`;
        await this.ensureFolder(backup.slice(0, backup.lastIndexOf("/")));
        const copy = await this.plugin.app.vault.create(backup, content), verify = await this.plugin.app.vault.read(copy), hash = await sha256(content), target = kind === "record" ? destination + file.name : file.path, recordIdentity = kind === "record" ? identity(content) : void 0;
        if (verify !== content || await sha256(verify) !== hash) throw new Error(`Backup verification failed for ${file.path}`);
        entries.push({ source: file.path, target, backup, sha256: hash, kind, timelineId: recordIdentity == null ? void 0 : recordIdentity.id, status: "backed-up" });
      }
      await this.ensureFolder(backupRoot);
      const manifest = { schema_version: 1, type: "visual-timeline-project-migration-backup", project_id: this.project.id, created: (/* @__PURE__ */ new Date()).toISOString(), status: "ready-to-move", source_folder: this.plugin.settings.recordsFolder, destination_folder: this.project.recordsFolder, entries };
      manifestFile = await this.plugin.app.vault.create(`${backupRoot}/manifest.json`, JSON.stringify(manifest, null, 2));
      await this.ensureFolder(this.project.recordsFolder);
      for (const file of current) {
        const target = destination + file.name;
        await this.plugin.app.fileManager.renameFile(file, target);
        moved.push({ source: source + file.name, target });
        const entry = entries.find((value) => value.kind === "record" && value.source === file.path);
        if (entry) entry.status = "moved";
        manifest.status = "moving";
        await this.plugin.app.vault.modify(manifestFile, JSON.stringify(manifest, null, 2));
      }
      const finalFiles = this.plugin.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(destination));
      if (finalFiles.length !== current.length) throw new Error(`Moved ${finalFiles.length} records but expected ${current.length}.`);
      for (const move2 of moved) {
        const target = this.plugin.app.vault.getAbstractFileByPath(move2.target);
        if (!(target instanceof import_obsidian5.TFile)) throw new Error(`Moved file is missing: ${move2.target}`);
        const recordIdentity = identity(await this.plugin.app.vault.read(target)), entry = entries.find((value) => value.kind === "record" && value.target === move2.target);
        if (!recordIdentity.type.startsWith("visual-timeline-") || !entry || recordIdentity.id !== entry.timelineId) throw new Error(`Moved record identity verification failed: ${move2.target}`);
        entry.status = "verified";
      }
      manifest.status = "verified";
      await this.plugin.app.vault.modify(manifestFile, JSON.stringify(manifest, null, 2));
      await this.plugin.refreshViews();
      this.close();
      new import_obsidian5.Notice(`Moved ${moved.length} records into ${this.project.name}. Verified backup retained in ${backupRoot}.`);
    } catch (e) {
      const failures = [];
      for (const entry of [...moved].reverse()) {
        const file = this.plugin.app.vault.getAbstractFileByPath(entry.target);
        if (file instanceof import_obsidian5.TFile) try {
          await this.plugin.app.fileManager.renameFile(file, entry.source);
          const record = entries.find((value) => value.kind === "record" && value.target === entry.target);
          if (record) record.status = "backed-up";
        } catch (e2) {
          failures.push(entry.target);
          const record = entries.find((value) => value.kind === "record" && value.target === entry.target);
          if (record) record.status = "rollback-failed";
        }
      }
      if (manifestFile) try {
        await this.plugin.app.vault.modify(manifestFile, JSON.stringify({ schema_version: 1, type: "visual-timeline-project-migration-backup", project_id: this.project.id, created: timestamp, status: failures.length ? "rollback-incomplete" : "rolled-back", source_folder: this.plugin.settings.recordsFolder, destination_folder: this.project.recordsFolder, entries }, null, 2));
      } catch (e2) {
      }
      error.textContent = `Migration stopped. ${e instanceof Error ? e.message : "Unexpected error."}${failures.length ? ` Rollback needs attention for ${failures.join(", ")}.` : " Moved files were returned to their source paths where possible."} Verified backups were retained.`;
      this.busy = false;
      buttons.forEach((b) => b.disabled = false);
    }
  }
};

// src/dashboard.ts
var import_obsidian6 = require("obsidian");

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
var INSTANT_MARKER_SIZE = 18;
function isInstantItem(p) {
  return !p.isAnchor && p.start === p.end && ["box", "stream", "line"].includes(p.style);
}
function diamondPath(x, y, size = INSTANT_MARKER_SIZE) {
  const r = size / 2;
  return `M ${x},${y - r} L ${x + r},${y} L ${x},${y + r} L ${x - r},${y} Z`;
}
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
    const half = displayHeight(layer, style, isAnchor) / 2;
    items.push({ key: `${layer.id}/${record.id}`, record, layer, style, start, end, x: x(start), xEnd: x(end), laneId: "", subtrack: 0, y: 0, curve: { start: 0, settle: 0, origin: 0, target: 0 }, isAnchor, half, initialHalf: half, terminal: true, clustered: false });
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
  const anchorHalf = Math.max(20, ...anchors.map((p) => p.half));
  const bands = items.filter((p) => p.style === "band" && p.layer.bandPlacement !== "context");
  const maxHalf = Math.max(anchorHalf, ...bands.map((p) => p.layer.bandShape === "contour" ? p.half : Math.max(p.half, anchorHalf + 12)));
  const laneStep = Math.max(Math.max(192, maxHalf * 2 + 80) * 2 / 3, maxHalf * 2 + 24), firstY = Math.max(134, maxHalf + 104);
  let nextY = firstY;
  const assign = (p) => {
    const cs = children(p);
    p.y = cs.length ? cs.reduce((s, c) => s + assign(c), 0) / cs.length : nextY;
    if (!cs.length) nextY += laneStep;
    return p.y;
  };
  ordered(anchors.filter((p) => !parents.has(p))).forEach(assign);
  for (const a of anchors) {
    const parent = parents.get(a), siblings = parent ? children(parent) : [], index = siblings.indexOf(a);
    a.laneId = a.key;
    a.initialHalf = parent ? parent.half / siblings.length : a.half;
    a.terminal = children(a).length === 0;
    const origin = parent ? parent.y - parent.half + a.initialHalf + index * 2 * a.initialHalf : a.y;
    a.curve = { start: a.x, settle: a.x + Math.min(110, (a.xEnd - a.x) * 0.45), origin, target: a.y, initialScale: a.initialHalf / a.half };
    lanes.push({ id: a.key, title: a.record.title, y: a.y });
  }
  const independent = /* @__PURE__ */ new Map();
  const getLane = (key, title) => {
    let lane = independent.get(key);
    if (!lane) {
      lane = { id: key, title, y: nextY };
      nextY += laneStep;
      independent.set(key, lane);
      lanes.push(lane);
    }
    return lane;
  };
  const ordinary = items.filter((i) => !i.isAnchor);
  for (const p of [...ordinary].sort((a, b) => a.layer.id.localeCompare(b.layer.id) || chronological(a, b))) {
    if (p.style === "band" && p.layer.bandPlacement === "integrated") {
      const binding2 = p.layer.attachment, peers = anchors.filter((a) => !binding2 || a.layer.id === binding2.anchorLayer), rs = peers.map((a) => a.record);
      const override = binding2 == null ? void 0 : binding2.overrides[p.record.id];
      const refs = override ? [override] : p.record.relations[(binding2 == null ? void 0 : binding2.relationship) || "related_to"] || [];
      for (const ref of refs) if (!resolveReference(ref, rs)) {
        const v = refName(ref), ambiguous = rs.filter((r) => r.id === v || r.path.replace(/\.md$/, "") === v || r.file.basename === v || (r.aliases || []).includes(v)).length > 1;
        if (ambiguous) diagnostics.push({ record: p.record, message: `Ambiguous integrated stream reference: ${ref}` });
        else if (!resolveReference(ref, records)) diagnostics.push({ record: p.record, message: `Unresolved integrated stream reference: ${ref}` });
      }
      const resolved = [...new Set(refs.map((ref) => resolveReference(ref, rs)).filter(Boolean))];
      const targets = peers.filter((a) => resolved.includes(a.record) && p.end >= a.start);
      if (targets.length) {
        p.integratedAnchors = ordered(targets);
        const first = p.integratedAnchors[0];
        p.anchor = first.record;
        p.anchorKey = first.key;
        p.laneId = first.key;
        p.y = first.y;
        p.curve = first.curve;
        for (const a of targets) if (p.start <= a.end && p.end > a.end) a.terminal = false;
        continue;
      }
      diagnostics.push({ record: p.record, message: "Integrated band needs an explicit reference to an available stream; shown in context strip" });
      p.context = true;
      continue;
    }
    if (p.style === "band" && p.layer.bandPlacement !== "lane") {
      p.context = true;
      continue;
    }
    const binding = p.layer.attachment;
    if (binding) {
      const peers = anchors.filter((a) => a.layer.id === binding.anchorLayer), rs = peers.map((a) => a.record);
      const override = binding.overrides[p.record.id];
      const refs = override ? [override] : p.record.relations[binding.relationship] || [];
      const found = refs.map((ref) => resolveReference(ref, rs));
      const unique2 = [...new Set(found.filter(Boolean))];
      const ambiguous = refs.some((ref) => {
        const v = refName(ref);
        return !resolveReference(ref, rs) && rs.filter((r) => r.id === v || r.path.replace(/\.md$/, "") === v || r.file.basename === v || (r.aliases || []).includes(v)).length > 1;
      });
      const anchor = unique2.length === 1 && !ambiguous ? peers.find((a) => a.record === unique2[0]) : void 0;
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
    } else {
      const lane = getLane(`independent:${p.layer.id}`, p.layer.name);
      p.laneId = lane.id;
      p.y = lane.y;
    }
    if (!p.anchor) p.curve = { start: p.x, settle: p.x, origin: p.y, target: p.y };
  }
  const contexts = /* @__PURE__ */ new Map();
  let contextBottom = Math.max(152, nextY - laneStep + Math.max(152, maxHalf + 120));
  for (const p of ordinary.filter((p2) => p2.context)) {
    p.half = displayHeight({ ...p.layer, bandPlacement: "context" }, "band") / 2;
    if (!contexts.has(p.layer.id)) {
      contexts.set(p.layer.id, contextBottom + p.half);
      contextBottom += p.half * 2 + 16;
    }
    p.laneId = `context:${p.layer.id}`;
    p.y = contexts.get(p.layer.id);
    p.curve = { start: p.x, settle: p.x, origin: p.y, target: p.y };
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
    const containing = anchors.find((a) => a.key === p.anchorKey);
    const spacing = Math.min(10, Math.max(0, ((containing == null ? void 0 : containing.half) || 20) - p.half - 2) / Math.max(1, Math.ceil((maxTracks - 1) / 2)));
    const offset = p.style === "dot" ? 0 : visibleTrack === 0 ? 0 : (visibleTrack % 2 ? -1 : 1) * Math.ceil(visibleTrack / 2) * spacing;
    p.curve = { ...p.curve, offset, initialScale: p.style === "dot" ? 1 : p.curve.initialScale };
    p.y += offset;
  }
  const clusters = [];
  const pointLanes = /* @__PURE__ */ new Map();
  for (const p of ordinary.filter(isInstantItem)) {
    const list2 = pointLanes.get(p.laneId) || [];
    list2.push(p);
    pointLanes.set(p.laneId, list2);
  }
  for (const group of pointLanes.values()) {
    let bucket = [];
    const flush = () => {
      if (!bucket.length) return;
      const slots = Math.min(3, bucket.length), offsets = slots === 1 ? [0] : slots === 2 ? [-10, 10] : [-20, 0, 20];
      const cy = centerAt(bucket[0].curve, bucket[0].x);
      bucket.forEach((p, i) => {
        p.markerOffset = cy + offsets[Math.min(i, 2)] - centerAt(p.curve, p.x);
        p.markerHitHeight = slots === 1 ? 44 : 20;
      });
      if (bucket.length > 3) {
        const overflow = bucket.slice(2);
        overflow.forEach((p) => p.clustered = true);
        clusters.push({ key: `point-cluster:${overflow[0].key}`, x: overflow[0].x, y: cy + 20, items: overflow });
      }
      bucket = [];
    };
    for (const p of group.sort((a, b) => a.x - b.x || chronological(a, b))) {
      if (bucket.length && (p.x - bucket[0].x > 22 || Math.abs(centerAt(p.curve, p.x) - centerAt(bucket[0].curve, bucket[0].x)) > 22)) flush();
      bucket.push(p);
    }
    flush();
  }
  const clusterGroups = /* @__PURE__ */ new Map();
  for (const p of ordinary.filter((p2) => p2.style !== "band" && !isInstantItem(p2))) {
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
  const height = Math.max(row.height, nextY === firstY ? 160 : nextY - laneStep + Math.max(138, maxHalf + 104), contexts.size ? contextBottom : 0);
  return { items, lanes, clusters, height, diagnostics };
}
function placeLabels(items, width, measure, height = 300) {
  var _a, _b, _c;
  const boxes = [];
  const anchors = items.filter((p) => p.isAnchor);
  const minAnchor = Math.min(...anchors.map((p) => p.y)), maxAnchor = Math.max(...anchors.map((p) => p.y));
  const truncate = (value, maxWidth) => {
    if (measure(value) <= maxWidth) return value;
    if (measure("\u2026") > maxWidth) return "";
    const words = value.trim().split(/\s+/u);
    let complete = "";
    for (const word of words) {
      const next = complete ? `${complete} ${word}` : word;
      if (measure(`${next}\u2026`) > maxWidth) break;
      complete = next;
    }
    if (complete) return `${complete}\u2026`;
    const characters = Array.from(value.trim());
    let count = characters.length;
    while (count > 1 && measure(`${characters.slice(0, count).join("")}\u2026`) > maxWidth) count--;
    return `${characters.slice(0, count).join("")}\u2026`;
  };
  const freeSlots = (y) => {
    const blockers = boxes.filter((a) => y < a.y + a.height + 3 && y + 15 + 3 > a.y).map((a) => ({ start: Math.max(4, a.x - 6), end: Math.min(width - 4, a.x + a.width + 6) })).filter((a) => a.end > a.start).sort((a, b) => a.start - b.start);
    const slots = [];
    let cursor = 4;
    for (const blocker of blockers) {
      if (blocker.start > cursor) slots.push({ start: cursor, end: blocker.start });
      cursor = Math.max(cursor, blocker.end);
    }
    if (cursor < width - 4) slots.push({ start: cursor, end: width - 4 });
    return slots;
  };
  const closestStart = (slot, textWidth, sourceX) => {
    const maxStart = slot.end - textWidth;
    const candidates = [sourceX, sourceX - textWidth, sourceX - textWidth / 2].map((x) => Math.max(slot.start, Math.min(maxStart, x)));
    return candidates.sort((a, b) => {
      const distance = (x) => sourceX < x ? x - sourceX : sourceX > x + textWidth ? sourceX - (x + textWidth) : 0;
      return distance(a) - distance(b) || (a < sourceX ? 1 : 0) - (b < sourceX ? 1 : 0);
    })[0];
  };
  for (const p of [...items].sort((a, b) => Number(b.isAnchor) - Number(a.isAnchor) || chronological(a, b))) {
    if (!["adaptive", "always"].includes(p.layer.labels)) continue;
    const category = ((_a = p.integratedAnchors) == null ? void 0 : _a.length) && p.layer.bandShape !== "contour";
    const sx = p.isAnchor ? Math.min(p.xEnd - 4, p.curve.settle + 10) : category ? Math.max(p.x, p.integratedAnchors[0].x) + 8 : isInstantItem(p) ? p.x : p.x + 2;
    const sy = centerAt(p.curve, sx) + (isInstantItem(p) ? p.markerOffset || 0 : 0);
    const anchor = anchors.find((a) => a.key === p.anchorKey);
    const clearance = anchor ? Math.max(anchor.half, ...items.filter((i) => {
      var _a2;
      return ((_a2 = i.integratedAnchors) == null ? void 0 : _a2.includes(anchor)) && i.layer.bandShape !== "contour";
    }).map((i) => categoryHalf(i, anchor))) : p.half;
    const rail = category ? [sy - categoryHalf(p, p.integratedAnchors[0]) + 7] : ((_b = p.integratedAnchors) == null ? void 0 : _b.length) ? [sy + 9, sy - 22] : p.context ? [p.y - 7] : anchor && minAnchor !== maxAnchor && anchor.y === minAnchor ? [anchor.y - clearance - 30, anchor.y - clearance - 52, anchor.y - clearance - 74, anchor.y - clearance - 96] : anchor && minAnchor !== maxAnchor && anchor.y === maxAnchor ? [anchor.y + clearance + 10, anchor.y + clearance + 32, anchor.y + clearance + 54, anchor.y + clearance + 76] : p.isAnchor ? [sy + p.half + 7] : [sy - clearance - 30, sy - clearance - 52, sy - clearance - 74, sy - clearance - 96];
    const kind = p.isAnchor ? "anchor" : p.context || ((_c = p.integratedAnchors) == null ? void 0 : _c.length) ? "context" : "record";
    let region;
    if (p.isAnchor) {
      region = { start: Math.max(4, p.x), end: Math.min(width - 4, p.xEnd) };
    } else if (category || p.context || ["box", "stream", "line"].includes(p.style) && p.xEnd - p.x > 2) {
      region = { start: Math.max(4, p.x - 24), end: Math.min(width - 4, p.xEnd + 24) };
    } else {
      region = { start: Math.max(4, sx - 160), end: Math.min(width - 4, sx + 160) };
    }
    const slots = rail.filter((y) => y >= 4 && y + 15 <= height - 4).flatMap((y, railIndex) => freeSlots(y).map((slot) => ({ start: Math.max(slot.start, region.start), end: Math.min(slot.end, region.end) })).filter((slot) => slot.end > slot.start).map((slot) => ({ y, railIndex, ...slot })));
    if (!slots.length) continue;
    const fullWidth = measure(p.record.title);
    const fullFit = slots.filter((slot) => slot.end - slot.start >= fullWidth).map((slot) => ({
      ...slot,
      x: closestStart(slot, fullWidth, sx),
      text: p.record.title,
      width: fullWidth
    }));
    const candidates = fullFit.length ? fullFit : slots.map((slot) => {
      const available = Math.min(340, slot.end - slot.start);
      const text2 = truncate(p.record.title, available), labelWidth = measure(text2);
      return { ...slot, x: closestStart(slot, labelWidth, sx), text: text2, width: labelWidth };
    }).filter((slot) => slot.width > 0);
    candidates.sort((a, b) => {
      if (!fullFit.length && b.width - a.width !== 0) return b.width - a.width;
      const distance = (slot) => sx < slot.x ? slot.x - sx : sx > slot.x + slot.width ? sx - (slot.x + slot.width) : 0;
      return distance(a) - distance(b) || a.railIndex - b.railIndex || (a.x < sx ? 1 : 0) - (b.x < sx ? 1 : 0);
    });
    const chosen = candidates[0];
    if (!chosen) continue;
    boxes.push({ key: p.key, x: chosen.x, y: chosen.y, width: chosen.width, height: 15, text: chosen.text, sourceX: sx, sourceY: sy, leader: kind === "record", kind });
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
function categoryHalf(band, anchor) {
  return Math.max(band.half, anchor.half + 12);
}
function integratedBandSegments(band) {
  const result = [];
  for (const anchor of band.integratedAnchors || []) {
    if (band.layer.bandShape !== "contour") {
      const from2 = Math.max(band.x, anchor.x), to2 = band.xEnd;
      if (to2 < from2) continue;
      const half = categoryHalf(band, anchor), curve = { ...anchor.curve, offset: 0 };
      const box = { ...band, integratedAnchors: void 0, anchor: void 0, x: from2, xEnd: to2, half, initialHalf: half, isAnchor: false, terminal: false, curve };
      const flat = from2 >= curve.settle || curve.origin === curve.target;
      result.push({ anchor, kind: "category", path: ribbonPath(box), from: from2, to: to2, ...flat ? { rect: { x: from2, y: centerAt(curve, from2) - half, width: Math.max(2, to2 - from2), height: half * 2 } } : {} });
      continue;
    }
    const from = Math.max(band.x, anchor.x), to = Math.min(band.xEnd, anchor.xEnd);
    if (to > from) result.push({ anchor, kind: "overlay", path: ribbonPath(anchor), from, to });
    const tailStart = Math.max(band.x, anchor.xEnd);
    if (band.xEnd > tailStart) {
      const y = centerAt(anchor.curve, anchor.xEnd);
      const tail = { ...band, integratedAnchors: void 0, x: tailStart, xEnd: band.xEnd, isAnchor: true, half: anchor.half, initialHalf: anchor.half, terminal: true, curve: { start: tailStart, settle: tailStart, origin: y, target: y } };
      result.push({ anchor, kind: "continuation", path: ribbonPath(tail), from: tailStart, to: band.xEnd });
    }
  }
  return result;
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
var nextClipId = 0;
function element(tag, attrs = {}, text2) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "aria-label") {
      const id2 = `vt-svg-title-${++nextClipId}`, title = document.createElementNS(NS, "title");
      title.id = id2;
      title.textContent = String(v);
      el.setAttribute("aria-labelledby", id2);
      el.appendChild(title);
    } else el.setAttribute(k, String(v));
  }
  if (text2) el.textContent = text2;
  return el;
}
function renderComposition(parent, view, settings, records, _bounds, open, initialZoom = 1, saveView, toolbarHost) {
  const root = parent.createDiv({ cls: "vt-chart" }), toolbar = (toolbarHost || root).createDiv({ cls: "vt-chart-tools" });
  const button = (host, text2, fn) => {
    const b = host.createEl("button", { text: text2 });
    b.onclick = fn;
    return b;
  };
  const scroll = root.createDiv({ cls: "vt-chart-scroll", attr: { tabindex: "0", "aria-label": "Timeline; scroll to explore. Select a shape for details." } });
  const hint = root.createDiv({ cls: "vt-chart-hint", attr: { "aria-live": "polite" } });
  const defaultHint = "Drag to pan \xB7 Scroll to zoom \xB7 Select for details";
  hint.textContent = defaultHint;
  const inspector = root.createEl("aside", { cls: "vt-inspector", attr: { "aria-label": "Timeline details" } });
  inspector.hidden = true;
  const diagnostics = root.createEl("details", { cls: "vt-diagnostics" });
  let zoom = initialZoom, visible = new Set(records.map((r) => r.id)), selected, returnFocus = null, dead = false, lastWidth = 0;
  const relevant = records.filter((r) => view.rows.some((row) => row.enabled && row.layers.some((l) => matches(r, l))));
  const values = relevant.flatMap((r) => [historicalDate(r.date.start), historicalDate(r.date.end || r.date.start)]).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : 1, max = values.length ? Math.max(...values) : 2;
  const bounds = { min, max: max === min ? min + 1 : max };
  const gutter = view.rows.some((row) => row.layers.some((l) => l.enabled && !l.attachment && records.some((r) => matches(r, l) && !["stream", "band"].includes(styleFor(r, l, settings.categoryStyles))))) ? 160 : 24;
  root.dataset.gutter = String(gutter);
  const minPlot = 1e3, measureCanvas = document.createElement("canvas"), ctx = measureCanvas.getContext("2d");
  if (ctx) ctx.font = `13px ${getComputedStyle(parent).fontFamily}`;
  const measure = (t) => (ctx == null ? void 0 : ctx.measureText(t).width) || t.length * 8;
  const close = () => {
    inspector.hidden = true;
    selected = void 0;
    hint.textContent = defaultHint;
    root.querySelectorAll(".is-selected").forEach((e) => e.classList.remove("is-selected"));
    if (returnFocus instanceof HTMLElement || returnFocus instanceof SVGElement) returnFocus.focus({ preventScroll: true });
  };
  const details = (items, focus = true) => {
    var _a, _b;
    if (focus) returnFocus = document.activeElement;
    inspector.empty();
    inspector.hidden = false;
    const header = inspector.createDiv({ cls: "vt-inspector-header" });
    const title = header.createEl("h3", { text: items.length > 1 ? `${items.length} items in this group` : items[0].record.title, attr: { tabindex: "-1" } });
    if (items.length > 1) {
      for (const p of items) {
        const b = button(inspector, `${p.record.title} \xB7 ${p.record.date.display || p.record.date.start}`, () => details([p]));
        b.addClass("vt-inspector-item");
      }
    } else {
      const p = items[0], r = p.record;
      selected = p;
      const meta = header.createDiv({ cls: "vt-selection-meta" });
      const yearPoint = isInstantItem(p) && r.date.precision === "year";
      meta.createSpan({ text: `${r.date.circa ? "c. " : ""}${yearPoint ? r.date.start : r.date.display || [r.date.start, r.date.end].filter(Boolean).join(" \u2014 ")}` });
      if (yearPoint) meta.createSpan({ text: "Year precision \xB7 exact duration not recorded" });
      if ((_a = p.integratedAnchors) == null ? void 0 : _a.length) meta.createSpan({ text: `Context for: ${p.integratedAnchors.map((a) => a.record.title).join(" \xB7 ")}` });
      else if (p.anchor) meta.createSpan({ text: p.anchor.title });
      const actions = header.createDiv({ cls: "vt-selection-actions" });
      button(actions, "Open note", () => open(r.path));
      const more = inspector.createEl("details", { cls: "vt-selection-more" });
      more.createEl("summary", { text: "Categories and relationships" });
      if (r.categories.length) more.createEl("p", { text: r.categories.join(" \xB7 ") });
      for (const [key, refs] of Object.entries(r.relations)) if (refs.length) {
        more.createEl("h4", { text: key.replace(/_/g, " ") });
        const ul = more.createEl("ul");
        for (const ref of refs) ul.createEl("li", { text: ((_b = records.find((r2) => r2.id === ref || r2.path.replace(/\.md$/, "") === ref)) == null ? void 0 : _b.title) || ref });
      }
      root.querySelectorAll(".vt-composed-record").forEach((e) => e.classList.toggle("is-selected", e.getAttribute("data-key") === p.key));
    }
    button(header, "Close", close);
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
    var _a;
    if (dead) return;
    const previousLeft = scroll.scrollLeft, previousTop = scroll.scrollTop;
    scroll.empty();
    diagnostics.empty();
    const viewport = Math.max(260, scroll.clientWidth), plotWidth = Math.max(minPlot, viewport - gutter) * zoom, total = plotWidth + gutter;
    lastWidth = viewport;
    const canvas = scroll.createDiv({ cls: "vt-chart-canvas" });
    canvas.style.width = `${total}px`;
    const ticks = timeTicks(bounds.min, bounds.max, plotWidth);
    const tickX = (tick) => 24 + (tick - min) / (bounds.max - min) * (plotWidth - 48);
    const axis = canvas.createDiv({ cls: "vt-sticky-axis" });
    axis.style.width = `${total}px`;
    axis.createDiv({ cls: "vt-axis-corner", text: gutter > 24 ? "History" : "" }).style.width = `${gutter}px`;
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
      for (const lane of layout.lanes.filter((l) => !layout.items.some((p) => p.isAnchor && p.key === l.id))) {
        const l = labels.createDiv({ cls: "vt-lane-name", text: lane.title });
        l.style.top = `${lane.y - 14}px`;
      }
      const svg = element("svg", { width: plotWidth, height: layout.height, class: "vt-composition-svg", "aria-label": row.name });
      strip.appendChild(svg);
      const shown = layout.items.filter((p) => visible.has(p.record.id));
      const labelBoxes = placeLabels(layout.items, plotWidth, measure, layout.height).filter((b) => shown.some((p) => p.key === b.key));
      for (const y of [...new Set(layout.items.filter((p) => p.context).map((p) => p.y))]) {
        svg.appendChild(element("line", { x1: 0, x2: plotWidth, y1: y - 22, y2: y - 22, class: "vt-context-rule" }));
      }
      const z = (p) => {
        var _a2;
        return (((_a2 = p.integratedAnchors) == null ? void 0 : _a2.length) ? p.layer.bandShape === "contour" ? 5e3 : -1e4 : p.layer.plane === "background" ? 0 : 1e4) + row.layers.indexOf(p.layer) + (isInstantItem(p) ? 0.5 : 0);
      };
      const shapeGroup = (items, x, y, cluster = false) => {
        const p = items[0], g = element("g", { class: "vt-composed-record", tabindex: 0, role: "button", "aria-label": cluster ? `${items.length} items; select to list` : p.record.title, "data-key": p.key, "data-records": items.map((i) => i.record.id).join("|"), "data-lane": p.laneId, "data-track": p.subtrack });
        const full = cluster ? `${items.length} items` : `${p.record.title} \xB7 ${p.record.date.display || p.record.date.start}`;
        g.querySelector("title").textContent = full;
        const select = () => details(items);
        g.addEventListener("click", select);
        g.addEventListener("focus", () => {
          hint.textContent = full;
        });
        g.addEventListener("mouseenter", () => {
          hint.textContent = full;
        });
        g.addEventListener("keydown", (e) => {
          var _a2;
          const k = e.key;
          if (k === "Enter" || k === " ") {
            e.preventDefault();
            select();
          } else if (k === "ArrowRight" || k === "ArrowLeft") {
            e.preventDefault();
            const all = Array.from(scroll.querySelectorAll(".vt-composed-record")), i = all.indexOf(g);
            (_a2 = all[(i + (k === "ArrowRight" ? 1 : all.length - 1)) % all.length]) == null ? void 0 : _a2.focus();
          }
        });
        if (cluster) {
          g.appendChild(items.every(isInstantItem) ? element("path", { d: diamondPath(x, y, 20), fill: p.layer.color, class: "vt-cluster-shape vt-instant-cluster" }) : element("circle", { cx: x, cy: y, r: 10, fill: p.layer.color, class: "vt-cluster-shape" }));
          g.appendChild(element("text", { x, y: y + 4, fill: contrastText(p.layer.color), "text-anchor": "middle", class: "vt-cluster-text" }, String(items.length)));
        }
        return g;
      };
      for (const p of [...shown].filter((p2) => !p2.clustered).sort((a, b) => z(a) - z(b))) {
        const x = p.x, y = centerAt(p.curve, x), g = shapeGroup([p], x, y);
        const attachedColors = [...new Set(layout.items.filter((i) => i.anchorKey === p.key && ["box", "stream", "line"].includes(i.style)).map((i) => i.layer.color))];
        const color = p.isAnchor && p.layer.tintFromAttached && attachedColors.length === 1 ? attachedColors[0] : p.layer.color;
        const attrs = { fill: color, opacity: p.layer.opacity };
        if ((_a = p.integratedAnchors) == null ? void 0 : _a.length) {
          for (const segment of integratedBandSegments(p)) {
            if (segment.kind === "category") {
              const attrs2 = { fill: p.layer.color, "fill-opacity": p.layer.opacity * 0.18, stroke: p.layer.color, "stroke-opacity": 0.8, "stroke-width": 1, "stroke-dasharray": "5 4", class: "vt-integrated-band vt-category-box", "data-anchor": segment.anchor.record.id, "data-from": segment.from, "data-to": segment.to };
              g.appendChild(segment.rect ? element("rect", { ...attrs2, ...segment.rect, rx: 6 }) : element("path", { ...attrs2, d: segment.path }));
              continue;
            }
            const id2 = `vt-integrated-band-${++nextClipId}`;
            const clip = element("clipPath", { id: id2, clipPathUnits: "userSpaceOnUse" });
            clip.appendChild(element("rect", { x: segment.from, y: 0, width: segment.to - segment.from, height: layout.height }));
            svg.appendChild(clip);
            g.appendChild(element("path", { d: segment.path, fill: p.layer.color, "fill-opacity": p.layer.opacity * (segment.kind === "overlay" ? 0.28 : 0.18), stroke: p.layer.color, "stroke-opacity": 0.65, "stroke-width": 1, "stroke-dasharray": segment.kind === "continuation" ? "5 4" : "none", "clip-path": `url(#${id2})`, class: `vt-integrated-band vt-integrated-${segment.kind}`, "data-anchor": segment.anchor.record.id }));
          }
        } else if (isInstantItem(p)) {
          const markerY = y + (p.markerOffset || 0), hitHeight = p.markerHitHeight || 44;
          g.appendChild(element("rect", { x: x - 22, y: markerY - hitHeight / 2, width: 44, height: hitHeight, fill: "transparent", class: "vt-marker-hit" }));
          if (p.markerOffset) g.appendChild(element("path", { d: `M ${x},${y} V ${markerY}`, class: "vt-marker-pin" }));
          g.appendChild(element("path", { ...attrs, d: diamondPath(x, markerY), class: "vt-instant-shape", style: `--vt-marker-outline:${contrastText(p.layer.color)}`, "data-date-x": x, "data-marker-y": markerY, "data-marker-size": INSTANT_MARKER_SIZE }));
        } else if (p.style === "stream" || p.style === "box") {
          if (p.xEnd === p.x) g.appendChild(element("line", { x1: x, x2: x, y1: y - 6, y2: y + 6, stroke: p.layer.color, "stroke-width": 2 }));
          else g.appendChild(element("path", { ...attrs, d: ribbonPath(p), class: p.isAnchor ? "vt-anchor-shape" : "vt-duration-shape" }));
        } else if (p.style === "dot") g.appendChild(element("circle", { ...attrs, cx: x, cy: y, r: 5 }));
        else if (p.style === "line") g.appendChild(element("path", { d: curvePath(p), stroke: p.layer.color, "stroke-width": 2, fill: "none", opacity: p.layer.opacity }));
        else g.appendChild(element("rect", { ...attrs, opacity: p.context ? p.layer.opacity * 0.18 : p.layer.opacity, x, y: y - p.half, width: Math.max(2, p.xEnd - x), height: p.half * 2, rx: p.context ? 4 : 6, class: "vt-context-band" }));
        if (!p.isAnchor && p.style !== "band" && !isInstantItem(p)) g.appendChild(element("path", { d: curvePath(p), stroke: "transparent", "stroke-width": 20, fill: "none", class: "vt-hit-area" }));
        if (!p.isAnchor && !isInstantItem(p) && ["box", "stream", "line"].includes(p.style)) for (const boundary of [.../* @__PURE__ */ new Set([p.x, p.xEnd])]) {
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
      const leaders = element("g", { class: "vt-leaders" });
      svg.insertBefore(leaders, svg.querySelector(".vt-composed-record"));
      const callouts = element("g", { class: "vt-callouts" });
      svg.appendChild(callouts);
      for (const box of labelBoxes) {
        const p = shown.find((i) => i.key === box.key);
        const endY = box.y > box.sourceY ? box.y - 3 : box.y + 18, targetX = box.x + Math.min(box.width / 2, 8), bendY = endY + (box.y > box.sourceY ? -7 : 7);
        if (box.leader) leaders.appendChild(element("path", { d: `M ${box.sourceX} ${box.sourceY} V ${bendY} H ${targetX} V ${endY}`, class: "vt-label-leader" }));
        const label = element("g", { class: `vt-name-button vt-label-${box.kind}`, tabindex: 0, role: "button", "aria-label": p.record.title });
        label.appendChild(element("rect", { x: box.x - 3, y: box.y - 3, width: box.width + 6, height: box.height + 6, rx: 2, class: "vt-label-backdrop" }));
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
      diagnostics.createEl("summary", { text: `Layer diagnostics \xB7 ${warningCount} items need review` });
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
    const old = zoom, viewport = Math.max(260, scroll.clientWidth), basePlot = Math.max(minPlot, viewport - gutter), oldPlot = basePlot * zoom;
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
  button(toolbar, "+", () => {
    clearWheel();
    zoomBy(2);
  }).setAttribute("aria-label", "Zoom in");
  button(toolbar, "\u2212", () => {
    clearWheel();
    zoomBy(0.5);
  }).setAttribute("aria-label", "Zoom out");
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
    toolbar.remove();
    root.remove();
  }, setVisible(ids) {
    visible = ids;
    draw();
  }, zoomBy, fit };
}

// src/dashboard.ts
var VIEW = "visual-timeline-dashboard";
var TimelineView = class extends import_obsidian6.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.query = "";
    this.layer = "";
    this.records = [];
    this.projectScope = "";
    this.generation = 0;
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
    this.generation++;
    (_a = this.chart) == null ? void 0 : _a.destroy();
  }
  async render() {
    var _a, _b;
    const generation = ++this.generation;
    const root = this.containerEl.children[1];
    let catalog, all;
    try {
      [catalog, all] = await Promise.all([this.plugin.projects.all(), this.plugin.repository.all()]);
    } catch (error) {
      if (generation !== this.generation) return;
      (_a = this.chart) == null ? void 0 : _a.destroy();
      this.chart = void 0;
      root.empty();
      root.createEl("p", { text: `Could not load timelines: ${String(error)}`, attr: { role: "alert" } });
      this.button(root, "Settings", () => this.plugin.openSettings());
      this.button(root, "Retry", () => void this.render());
      return;
    }
    if (generation !== this.generation) return;
    const project2 = activeProject(this.plugin.settings, catalog), scope = (project2 == null ? void 0 : project2.id) || "";
    if (scope !== this.projectScope) {
      this.query = "";
      this.layer = "";
    }
    this.projectScope = scope;
    (_b = this.chart) == null ? void 0 : _b.destroy();
    this.chart = void 0;
    root.empty();
    root.addClass("visual-timeline-dashboard");
    this.records = recordsForTimeline(all, project2);
    const hero = root.createDiv({ cls: "vt-hero" });
    hero.createEl("h1", { text: "Visual Timeline" });
    const actions = hero.createDiv({ cls: "vt-actions" });
    this.button(actions, "New event", () => void this.plugin.openNewEvent());
    this.button(actions, "Configure layout", () => void this.plugin.openComposition());
    this.button(actions, "Refresh", () => void this.render());
    this.button(actions, "Settings", () => this.plugin.openSettings());
    const switcher = root.createDiv({ cls: "vt-timeline-switcher" }), label = switcher.createEl("label", { cls: "vt-timeline-select" });
    label.createSpan({ text: "Timeline project" });
    const timelines = label.createEl("select", { attr: { "aria-label": "Active timeline" } });
    timelines.createEl("option", { text: "All records", value: "" });
    const active = catalog.projects.filter((p) => p.status === "active");
    for (const p of active) timelines.createEl("option", { text: `${p.name}${p.mode === "legacy" ? " \xB7 legacy view" : ""}`, value: p.id });
    timelines.value = scope;
    timelines.onchange = () => {
      timelines.disabled = true;
      void this.plugin.setActiveTimeline(timelines.value).catch(() => {
        timelines.value = scope;
        timelines.disabled = false;
        new import_obsidian6.Notice("Could not switch timeline. Refresh and try again.");
      });
    };
    this.button(switcher, "New project", () => void this.plugin.openTimelineManager(true));
    this.button(switcher, "Manage projects", () => void this.plugin.openTimelineManager());
    if (project2 == null ? void 0 : project2.description) root.createEl("p", { cls: "vt-timeline-description", text: project2.description });
    if (this.plugin.settings.activeTimeline && !project2) root.createEl("p", { cls: "vt-project-error", text: "The selected timeline is unavailable or archived. Showing All records; choose another timeline above." });
    if (catalog.warnings.length) {
      const details = root.createEl("details", { cls: "vt-project-warnings" });
      details.createEl("summary", { text: `${catalog.warnings.length} timeline workspace warning${catalog.warnings.length === 1 ? "" : "s"}` });
      for (const warning of catalog.warnings) details.createEl("p", { text: warning });
    }
    if ((project2 == null ? void 0 : project2.mode) === "legacy") {
      const ids = new Set(all.map((r) => r.id)), missing = project2.recordIds.filter((id2) => !ids.has(id2)).length;
      if (missing) root.createEl("p", { cls: "vt-section-note", text: `${missing} legacy note reference${missing === 1 ? " is" : "s are"} unavailable. References are retained.` });
    }
    const controls = root.createDiv({ cls: "vt-controls" }), layoutLabel = controls.createEl("label", { cls: "vt-layout-select" });
    layoutLabel.createSpan({ text: "Layout" });
    const config = compositionForTimeline(this.plugin.settings, scope), views = layoutLabel.createEl("select", { attr: { "aria-label": "Saved layout" } });
    config.views.forEach((v) => views.createEl("option", { text: v.name, value: v.id }));
    views.value = config.active;
    views.onchange = () => {
      const previous = config.active;
      config.active = views.value;
      views.disabled = true;
      void this.plugin.saveComposition(scope, config).then(() => {
        if (generation === this.generation) {
          views.disabled = false;
          this.draw(root);
        }
      }).catch(() => {
        config.active = previous;
        views.value = previous;
        views.disabled = false;
        new import_obsidian6.Notice("Could not save selected layout.");
      });
    };
    const search = controls.createEl("input", { type: "search", placeholder: "Search names, events, tags, places\u2026", attr: { "aria-label": "Search timeline" } });
    search.value = this.query;
    search.oninput = () => {
      this.query = search.value;
      this.draw(root);
    };
    const select = controls.createEl("select", { attr: { "aria-label": "Filter by record label" } });
    select.createEl("option", { text: "All record labels", value: "" });
    for (const l of [.../* @__PURE__ */ new Set([...this.plugin.settings.layers, ...this.records.flatMap((r) => r.layers)])]) select.createEl("option", { text: l, value: l });
    select.value = this.layer;
    select.onchange = () => {
      this.layer = select.value;
      this.draw(root);
    };
    if (!this.records.length) {
      const empty = root.createDiv({ cls: "vt-project-empty" });
      empty.createEl("h2", { text: (project2 == null ? void 0 : project2.mode) === "project" ? "This project is ready" : "No timeline records yet" });
      empty.createEl("p", { text: (project2 == null ? void 0 : project2.mode) === "project" ? "New items created here will automatically belong to this project." : "Create a timeline project first; new records are always saved inside its folder." });
      this.button(empty, (project2 == null ? void 0 : project2.mode) === "project" ? "New item" : "Create project", () => (project2 == null ? void 0 : project2.mode) === "project" ? void this.plugin.openNewEvent() : void this.plugin.openTimelineManager(true));
      return;
    }
    this.draw(root);
  }
  draw(root) {
    var _a, _b, _c;
    if (!this.records.length) return;
    const q = this.query.toLocaleLowerCase(), records = this.records.filter((r) => (!q || `${r.title} ${r.tags.join(" ")} ${r.categories.join(" ")} ${r.locations.join(" ")} ${r.entities.join(" ")}`.toLocaleLowerCase().includes(q)) && (!this.layer || r.layers.includes(this.layer)));
    const scope = this.projectScope, config = compositionForTimeline(this.plugin.settings, scope), view = config.views.find((v) => v.id === config.active);
    const key = `${scope}:${view.id}`;
    if (((_a = root.querySelector(".vt-body")) == null ? void 0 : _a.getAttribute("data-view")) !== key) {
      (_b = this.chart) == null ? void 0 : _b.destroy();
      root.querySelectorAll(".vt-body").forEach((el) => el.remove());
      const body = root.createDiv({ cls: "vt-body", attr: { "data-view": key } });
      body.createDiv({ cls: "vt-range" });
      this.chart = renderComposition(body, view, config, this.records, rangeOf(this.records), (p) => this.plugin.openNote(p), 1, async (updated) => {
        const current = compositionForTimeline(this.plugin.settings, scope), saved = current.views.find((v) => v.id === updated.id);
        if (!saved) throw new Error("Saved layout unavailable");
        saved.yearGrid = updated.yearGrid;
        await this.plugin.saveComposition(scope, current);
      }, root.querySelector(".vt-controls"));
    }
    const status = root.querySelector(".vt-range"), rows = view.rows.filter((r) => r.enabled).length;
    if (status) status.textContent = `${records.length} matching notes \xB7 ${rows} ${rows === 1 ? "row" : "rows"}`;
    (_c = this.chart) == null ? void 0 : _c.setVisible(new Set(records.map((r) => r.id)));
  }
  button(parent, label, action) {
    const b = parent.createEl("button", { text: label });
    b.onclick = action;
  }
};

// src/modals.ts
var import_obsidian7 = require("obsidian");
var NewEventModal = class extends import_obsidian7.Modal {
  constructor(app, plugin, project2) {
    super(app);
    this.plugin = plugin;
    this.project = project2;
    this.title = "";
    this.start = "";
    this.display = "";
    this.type = "visual-timeline-event";
    this.layer = "general";
    this.category = "event";
    this.circa = false;
    this.busy = false;
  }
  onOpen() {
    this.modalEl.addClass("vt-project-modal");
    this.contentEl.empty();
    this.contentEl.addClass("vt-modal");
    this.contentEl.scrollTop = 0;
    const c = this.contentEl;
    c.createEl("h2", { text: "New timeline record" });
    if (!this.project || this.project.mode !== "project" || !this.project.recordsFolder) {
      c.createEl("p", { cls: "vt-section-note", text: "Records belong to a project from the moment they are created. Select or create a project timeline first; this record will be saved directly into that project." });
      const actions2 = c.createDiv({ cls: "vt-editor-footer" }), manage = actions2.createEl("button", { text: "Choose or create a project" });
      manage.onclick = () => {
        this.close();
        void this.plugin.openTimelineManager(true);
      };
      const close = actions2.createEl("button", { text: "Close" });
      close.onclick = () => this.close();
      return;
    }
    c.createEl("p", { cls: "vt-section-note", text: `This record will be created inside \u201C${this.project.name}\u201D.` });
    new import_obsidian7.Setting(c).setName("Title").addText((t) => t.setValue(this.title).onChange((v) => this.title = v));
    new import_obsidian7.Setting(c).setName("Record type").addDropdown((d) => {
      for (const type of RECORD_TYPES) d.addOption(type, type.replace("visual-timeline-", ""));
      d.setValue(this.type).onChange((v) => this.type = v);
    });
    new import_obsidian7.Setting(c).setName("Start date").setDesc("AD ISO date or a BC year such as 930 BC").addText((t) => t.setValue(this.start).onChange((v) => this.start = v));
    new import_obsidian7.Setting(c).setName("Display date").addText((t) => t.setValue(this.display).onChange((v) => this.display = v));
    new import_obsidian7.Setting(c).setName("Layer").addText((t) => t.setValue(this.layer).onChange((v) => this.layer = v));
    new import_obsidian7.Setting(c).setName("Category").addText((t) => t.setValue(this.category).onChange((v) => this.category = v));
    new import_obsidian7.Setting(c).setName("Circa").addToggle((t) => t.setValue(this.circa).onChange((v) => this.circa = v));
    const error = c.createEl("p", { cls: "vt-project-error", attr: { role: "alert" } }), actions = c.createDiv({ cls: "vt-editor-footer" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.onclick = () => this.close();
    const save = actions.createEl("button", { text: "Create record", cls: "mod-cta" });
    save.onclick = async () => {
      if (this.busy) return;
      if (!this.title.trim() || !Number.isFinite(dateValue(this.start.trim()))) {
        error.textContent = "Enter a title and valid start date.";
        return;
      }
      this.busy = true;
      save.disabled = true;
      cancel.disabled = true;
      error.textContent = "";
      try {
        const date = { start: this.start.trim(), precision: /^\d{4}-\d{2}-\d{2}$/.test(this.start.trim()) ? "day" : "year", circa: this.circa, display: this.display.trim() || this.start.trim() };
        await this.plugin.repository.createEventRecord({ title: this.title.trim(), type: this.type, date, tags: ["timeline"], layers: [this.layer.trim() || "general"], categories: [this.category.trim() || "event"], locations: [], entities: [] }, this.project);
        this.close();
        new import_obsidian7.Notice("Timeline record created.");
        await this.plugin.refreshViews();
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : "Could not create the record.";
      } finally {
        this.busy = false;
        save.disabled = false;
        cancel.disabled = false;
      }
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
var import_obsidian8 = require("obsidian");
var CompositionModal = class extends import_obsidian8.Modal {
  constructor(plugin, records, projectId = "") {
    super(plugin.app);
    this.plugin = plugin;
    this.records = records;
    this.projectId = projectId;
    this.draft = compositionForTimeline(plugin.settings, projectId);
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
    c.createEl("h2", { text: "Configure layout" });
    c.createEl("p", { cls: "vt-section-note", text: "Rows share a date scale. Layers overlay within a row. Changes apply only when you save; historical notes are never changed." });
    const view = this.draft.views.find((v) => v.id === this.draft.active);
    new import_obsidian8.Setting(c).setName("Saved view").addDropdown((d) => {
      for (const v of this.draft.views) d.addOption(v.id, v.name);
      d.setValue(view.id).onChange((id2) => {
        this.draft.active = id2;
        this.draw();
      });
    });
    new import_obsidian8.Setting(c).setName("View name").addText((t) => t.setValue(view.name).onChange((v) => view.name = v));
    new import_obsidian8.Setting(c).setName("Full-height year lines").setDesc("Extend the date ruler ticks vertically behind every row. Saved separately for each view.").addToggle((t) => t.setValue(view.yearGrid === true).onChange((v) => view.yearGrid = v));
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
      new import_obsidian8.Setting(section).setName("Row name").addText((t) => t.setValue(row.name).onChange((v) => row.name = v));
      new import_obsidian8.Setting(section).setName("Position").setDesc("1 is the first row. Changing the number shifts the other rows.").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "1";
        t.inputEl.max = String(view.rows.length);
        t.setValue(String(index + 1));
        t.inputEl.onchange = () => {
          reorder(view.rows, index, (Number(t.getValue()) || 1) - 1);
          this.draw();
        };
      });
      new import_obsidian8.Setting(section).setName("Minimum height").setDesc("CSS pixels, independent of zoom. Only historical lanes add height, never labels.").addText((t) => {
        t.inputEl.type = "number";
        t.inputEl.min = "120";
        t.inputEl.max = "1200";
        t.setValue(String(row.height)).onChange((v) => row.height = Math.max(120, Math.min(1200, Number(v) || 220)));
      });
      new import_obsidian8.Setting(section).setName("Visible overlap tracks").setDesc("Additional overlaps become selectable count markers.").addDropdown((d) => {
        [1, 2, 3, 4, 5, 6].forEach((n) => d.addOption(String(n), String(n)));
        d.setValue(String(row.maxSubtracks || 3)).onChange((v) => row.maxSubtracks = Number(v));
      });
      const order = section.createEl("details");
      order.createEl("summary", { text: "Anchor ordering" });
      new import_obsidian8.Setting(order).setName("Anchor IDs in preferred order").setDesc("Comma-separated stable IDs; unspecified anchors use date and ID order.").addText((t) => t.setValue((row.anchorOrder || []).join(", ")).onChange((v) => row.anchorOrder = v.split(",").map((s) => s.trim()).filter(Boolean)));
      new import_obsidian8.Setting(section).setName("Show row").addToggle((t) => t.setValue(row.enabled).onChange((v) => row.enabled = v));
      row.layers.forEach((layer, i) => {
        const details = section.createEl("details", { cls: "vt-layer-editor" });
        details.createEl("summary", { text: `${i + 1}. ${layer.name} \xB7 ${layer.plane} \xB7 ${layer.style}` });
        new import_obsidian8.Setting(details).setName("Layer name").addText((t) => t.setValue(layer.name).onChange((v) => layer.name = v));
        new import_obsidian8.Setting(details).setName("Show layer").addToggle((t) => t.setValue(layer.enabled).onChange((v) => layer.enabled = v));
        new import_obsidian8.Setting(details).setName("Position within plane").setDesc("Layers later in the list draw on top. Backgrounds always stay behind foregrounds.").addText((t) => {
          t.inputEl.type = "number";
          t.inputEl.min = "1";
          t.inputEl.max = String(row.layers.length);
          t.setValue(String(i + 1));
          t.inputEl.onchange = () => {
            reorder(row.layers, i, (Number(t.getValue()) || 1) - 1);
            this.draw();
          };
        });
        new import_obsidian8.Setting(details).setName("Move to row").addDropdown((d) => {
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
        new import_obsidian8.Setting(details).setName("Attach to anchor layer").setDesc("Follow explicit relationships to records in another layer of this row. No name-based guessing.").addDropdown((d) => {
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
          new import_obsidian8.Setting(details).setName("Relationship field").addDropdown((d) => {
            Object.entries(this.plugin.settings.relationshipLabels).forEach(([k, v]) => d.addOption(k, v));
            d.setValue(a.relationship).onChange((v) => a.relationship = v);
          });
          const overrides = details.createEl("details");
          overrides.createEl("summary", { text: "Explicit anchor overrides" });
          overrides.createEl("p", { cls: "vt-section-note", text: "Overrides affect this display only. Notes are never rewritten." });
          for (const record of this.records.filter((r) => matches(r, layer))) new import_obsidian8.Setting(overrides).setName(record.title).addDropdown((d) => {
            d.addOption("", "Use note relationship");
            if (a.overrides[record.id]) d.addOption(a.overrides[record.id], a.overrides[record.id]);
            for (const r of this.records.filter((r2) => anchor && matches(r2, anchor))) d.addOption(r.id, r.title);
            d.setValue(a.overrides[record.id] || "").onChange((v) => {
              if (v) a.overrides[record.id] = v;
              else delete a.overrides[record.id];
            });
          });
        }
        new import_obsidian8.Setting(details).setName("Display style").addDropdown((d) => {
          d.addOption("default", "Category default");
          STYLES.forEach((s) => d.addOption(s, s === "box" ? "Box / duration bar" : s[0].toUpperCase() + s.slice(1)));
          d.setValue(layer.style).onChange((v) => layer.style = v);
        });
        new import_obsidian8.Setting(details).setName("Placement").addDropdown((d) => d.addOption("background", "Background").addOption("foreground", "Foreground").setValue(layer.plane).onChange((v) => layer.plane = v));
        new import_obsidian8.Setting(details).setName("Band layout").setDesc("Integrated categories share their related streams\u2019 centerlines. Their own dates set the box boundaries; kingdom and ruler dates never change.").addDropdown((d) => d.addOption("integrated", "Integrated with related streams").addOption("context", "Separate context strip").addOption("lane", "Behind the assigned lane").setValue(layer.bandPlacement || "context").onChange((v) => layer.bandPlacement = v));
        new import_obsidian8.Setting(details).setName("Integrated category shape").setDesc("A category box extends above and below the stream. Stream tint keeps the earlier contour-following treatment. Applies to integrated bands.").addDropdown((d) => d.addOption("box", "Category box \u2014 taller than stream").addOption("contour", "Stream tint and continuation").setValue(layer.bandShape || "box").onChange((v) => layer.bandShape = v));
        new import_obsidian8.Setting(details).setName("Shape height (px)").setDesc("Leave blank for automatic: category 88, stream 40, item 14, context strip 32. Category boxes always leave at least 12px above and below their stream. Height never changes dates or zoom.").addText((t) => {
          t.inputEl.type = "number";
          t.inputEl.min = "8";
          t.inputEl.max = "240";
          t.inputEl.placeholder = "Automatic";
          t.setValue(layer.height === void 0 ? "" : String(layer.height)).onChange((v) => {
            if (!v.trim()) delete layer.height;
            else if (Number.isFinite(Number(v))) layer.height = Math.max(8, Math.min(240, Number(v)));
          });
        });
        new import_obsidian8.Setting(details).setName("Tint streams from attached durations").setDesc("When every attached duration uses one color, use it for that anchor stream too. Mixed colors retain the stream layer color.").addToggle((t) => t.setValue(layer.tintFromAttached === true).onChange((v) => layer.tintFromAttached = v));
        new import_obsidian8.Setting(details).setName("Opacity").addSlider((s) => s.setLimits(10, 100, 5).setValue(layer.opacity * 100).setDynamicTooltip().onChange((v) => layer.opacity = v / 100));
        new import_obsidian8.Setting(details).setName("Color").addColorPicker((p) => p.setValue(layer.color).onChange((v) => layer.color = v));
        new import_obsidian8.Setting(details).setName("Labels").setDesc("Names use aligned rails and may truncate in dense periods. Labels never move records. Full names remain in details.").addDropdown((d) => d.addOption("adaptive", "Adaptive: aligned name rails").addOption("always", "Prefer visible names").addOption("selection", "On hover or keyboard focus").addOption("hidden", "Hidden (details remain)").setValue(layer.labels).onChange((v) => layer.labels = v));
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
    for (const category of categories) new import_obsidian8.Setting(defaults2).setName(category).addDropdown((d) => {
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
    var _a;
    parent.createEl("p", { cls: "vt-section-note", text: "No selection means all. Included values within a group match ANY; different groups must ALL match. Excluded categories always hide matching records." });
    const groups = [["types", "Note types", RECORD_TYPES], ["categories", "Categories", [...this.plugin.settings.categories, ...this.records.flatMap((r) => r.categories), ...layer.categories]], ["tags", "Tags", [...this.records.flatMap((r) => r.tags), ...layer.tags]]];
    for (const [key, title, values2] of groups) {
      const field = parent.createEl("fieldset", { cls: "vt-filter-options" });
      field.createEl("legend", { text: title });
      for (const value of [...new Set(values2)].sort()) {
        const label = field.createEl("label");
        const input = label.createEl("input", { type: "checkbox" });
        input.checked = layer[key].includes(value);
        label.createSpan({ text: value.replace("visual-timeline-", "") });
        input.onchange = () => {
          layer[key] = input.checked ? [...layer[key], value] : layer[key].filter((v) => v !== value);
        };
      }
      if (!values2.length) field.createEl("p", { text: "No options found in current notes." });
    }
    const excluded = parent.createEl("details", { cls: "vt-filter-exclusions" });
    excluded.createEl("summary", { text: `Exclude categories${((_a = layer.excludeCategories) == null ? void 0 : _a.length) ? ` \xB7 ${layer.excludeCategories.length}` : ""}` });
    const values = [.../* @__PURE__ */ new Set([...this.plugin.settings.categories, ...this.records.flatMap((r) => r.categories), ...layer.excludeCategories || []])].sort();
    if (!values.length) excluded.createEl("p", { text: "No categories found in current notes." });
    for (const value of values) {
      const label = excluded.createEl("label");
      const input = label.createEl("input", { type: "checkbox" });
      input.checked = (layer.excludeCategories || []).includes(value);
      label.createSpan({ text: value });
      input.onchange = () => {
        const current = layer.excludeCategories || [];
        layer.excludeCategories = input.checked ? [...current, value] : current.filter((v) => v !== value);
        excluded.querySelector("summary").textContent = `Exclude categories${layer.excludeCategories.length ? ` \xB7 ${layer.excludeCategories.length}` : ""}`;
      };
    }
  }
  async save() {
    try {
      await this.plugin.saveComposition(this.projectId, normalizeComposition(this.draft));
    } catch (error) {
      new import_obsidian8.Notice(`Could not save composition: ${String(error)}`);
      return;
    }
    this.close();
    try {
      await this.plugin.refreshViews();
    } catch (e) {
      new import_obsidian8.Notice("Composition saved. Reopen the timeline to refresh the view.");
    }
  }
};

// src/main.ts
var VisualTimeline = class extends import_obsidian9.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
    this.moduleDispose = () => void 0;
    this.widgetDispose = () => void 0;
  }
  async onload() {
    const stored = await this.loadData();
    this.settings = { ...DEFAULT_SETTINGS, ...stored || {}, settingsVersion: 2, relationshipLabels: { ...DEFAULT_SETTINGS.relationshipLabels, ...(stored == null ? void 0 : stored.relationshipLabels) || {} }, layers: Array.isArray(stored == null ? void 0 : stored.layers) ? stored.layers : DEFAULT_SETTINGS.layers, categories: Array.isArray(stored == null ? void 0 : stored.categories) ? stored.categories : DEFAULT_SETTINGS.categories };
    this.settings.composition = normalizeComposition(this.settings.composition);
    if (!this.settings.timelineLayouts || typeof this.settings.timelineLayouts !== "object" || Array.isArray(this.settings.timelineLayouts)) this.settings.timelineLayouts = {};
    this.repository = new TimelineRepository(this.app, this.settings);
    this.projects = new TimelineProjectRepository(this.app, this.settings);
    this.registerView(VIEW, (leaf) => new TimelineView(leaf, this));
    this.addSettingTab(new TimelineSettingsTab(this.app, this));
    this.addCommand({ id: "configure-timeline", name: "Configure timeline rows and layers", callback: () => void this.openComposition() });
    this.addCommand({ id: "open-dashboard", name: "Open Visual Timeline", callback: () => void this.openDashboard() });
    this.addCommand({ id: "open-timeline", name: "Open timeline", callback: () => void this.openDashboard() });
    this.addCommand({ id: "new-timeline", name: "New timeline", callback: () => void this.openTimelineManager(true) });
    this.addCommand({ id: "manage-timelines", name: "Manage timelines", callback: () => void this.openTimelineManager() });
    this.addCommand({ id: "new-event", name: "New timeline event", callback: () => void this.openNewEvent() });
    this.addCommand({ id: "move-legacy-records", name: "Move legacy records into active project", callback: () => void this.openActiveProjectMigration() });
    this.addCommand({ id: "refresh", name: "Refresh timeline", callback: () => void this.refreshViews() });
    this.addCommand({ id: "manage-layers", name: "Manage timeline layers", callback: () => this.openSettings() });
    this.addCommand({ id: "manage-categories", name: "Manage timeline categories", callback: () => this.openSettings() });
    this.addCommand({ id: "open-settings", name: "Open Visual Timeline settings", callback: () => this.openSettings() });
    this.registerDashboardIntegration();
    this.registerEvent(this.app.vault.on("create", () => void this.refreshViews()));
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (file.path.endsWith(".md")) void this.refreshViews();
    }));
    this.registerEvent(this.app.vault.on("rename", () => void this.refreshViews()));
    this.registerEvent(this.app.vault.on("delete", () => void this.refreshViews()));
    this.registerEvent(this.app.metadataCache.on("changed", () => void this.refreshViews()));
    if (this.settings.startup) this.app.workspace.onLayoutReady(() => void this.openDashboard());
  }
  onunload() {
    this.moduleDispose();
    this.widgetDispose();
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async saveComposition(projectId, config) {
    const previous = this.settings.composition, layouts = this.settings.timelineLayouts;
    if (projectId) this.settings.timelineLayouts = { ...layouts, [projectId]: normalizeComposition(config) };
    else this.settings.composition = normalizeComposition(config);
    try {
      await this.saveSettings();
    } catch (error) {
      this.settings.composition = previous;
      this.settings.timelineLayouts = layouts;
      throw error;
    }
  }
  async setActiveTimeline(projectId) {
    if (projectId && !(await this.projects.all()).projects.some((p) => p.id === projectId && p.status === "active")) throw new Error("Timeline is unavailable or archived.");
    const previous = this.settings.activeTimeline;
    this.settings.activeTimeline = projectId;
    try {
      await this.saveSettings();
    } catch (error) {
      this.settings.activeTimeline = previous;
      throw error;
    }
    await this.refreshViews();
  }
  openSettings() {
    var _a, _b;
    (_b = (_a = this.app.setting) == null ? void 0 : _a.open) == null ? void 0 : _b.call(_a);
  }
  openNote(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file) this.app.workspace.getLeaf(false).openFile(file);
  }
  async openNewEvent() {
    try {
      new NewEventModal(this.app, this, await this.projects.activeProject(this.settings.activeTimeline || "")).open();
    } catch (error) {
      new import_obsidian9.Notice(`Could not load project: ${String(error)}`);
    }
  }
  async openTimelineManager(create = false) {
    try {
      const [catalog, records] = await Promise.all([this.projects.all(), this.repository.all()]);
      new TimelineManagerModal(this, catalog, records, create).open();
    } catch (error) {
      new import_obsidian9.Notice(`Could not load timelines: ${String(error)}`);
    }
  }
  async openActiveProjectMigration() {
    try {
      const project2 = await this.projects.activeProject(this.settings.activeTimeline || "");
      if (!project2) {
        new import_obsidian9.Notice("Choose or create a project timeline first.");
        return;
      }
      this.openProjectMigration(project2);
    } catch (error) {
      new import_obsidian9.Notice(`Could not prepare migration: ${String(error)}`);
    }
  }
  openProjectMigration(project2) {
    new ProjectMigrationModal(this, project2).open();
  }
  async openComposition() {
    try {
      const [catalog, records] = await Promise.all([this.projects.all(), this.repository.all()]), project2 = activeProject(this.settings, catalog);
      new CompositionModal(this, recordsForTimeline(records, project2), (project2 == null ? void 0 : project2.id) || "").open();
    } catch (error) {
      new import_obsidian9.Notice(`Could not open layouts: ${String(error)}`);
    }
  }
  async openDashboard() {
    const existing = this.app.workspace.getLeavesOfType(VIEW)[0], leaf = existing || this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
  async refreshViews() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof TimelineView) await leaf.view.render();
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
