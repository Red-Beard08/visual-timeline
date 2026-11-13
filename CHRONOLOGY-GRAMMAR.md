# Historical Chronology Visual Grammar

## Purpose and reference boundary

This guide defines how Visual Timeline should represent the information hierarchy in the supplied panoramic history chart: a shared chronological axis, parallel continuities, named people and events, periods, places, and supporting interpretation. It adopts the chart's structure and hierarchy, not its antique paper, engraved decoration, tiny print, or static poster constraints. The result remains a native, searchable, accessible Obsidian chart backed by local Markdown notes.

The governing order is:

1. Read time and broad continuities.
2. See periods and changes within those continuities.
3. Find people and events at the right date.
4. Select an item for its full name, evidence, relationships, and source note.

No visual treatment may make a record claim more than its source note supports. Geometry, color, proximity, attachment, and line weight are not evidence of causation, agreement, endorsement, population, or power unless the record explicitly defines and sources that measure.

## Separate the data concepts

These concepts must not be conflated:

- **Record type** says what kind of historical thing a note describes.
- **Category** says which subject or analytical lens applies to that record.
- **Tag** supports project membership, workflow, or cross-cutting search; it is not a second category list.
- **Row** groups a readable historical domain or topic. It is a display grouping, not a relationship claim.
- **Layer** selects and orders matching records within a row.
- **Display style** says how a record is drawn; it never changes the note's meaning or dates.
- **Relationship** records an explicitly supported historical connection. A visual attachment may align records for reading without asserting a historical relationship.
- **Date precision and qualification** communicate what is known. A point, approximate year, or bounded period must not be drawn as a more precise duration.

## Reference elements and representation rules

| Reference element | Historical meaning | Visual rule | Current support and gap |
|---|---|---|---|
| Shared year/era ruler | One comparable chronology across the whole chart | Keep one date scale for all rows; adapt tick density to zoom; preserve BC/AD ordering without year zero. Full-height guides are optional and subdued. | Supported. |
| Parallel geographic or historical sections | Regions, civilizations, communities, or subject domains progressing at the same time | Use named rows with stable order and one shared axis. A row is not an isolated chart or a second timeline. | Rows and layers are supported; ready-made atlas row plans are not. |
| Civilization, kingdom, institution, or community | Continuity over an explicit date span, with possible splits or successors | Use a stream only for a continuing entity or an explicitly stated continuity model. Branch only from explicit references or a reviewed display override. Endpoints and continuation must reflect the source record. | Kingdom/culture types and stream geometry are supported; there is no guided semantic setup. |
| Ruler, bishop, officeholder, dynasty member | A named person's tenure in a role, often with a clear change point | Draw a tenure as a bar/segment on or beside the institution it belongs to. Keep the exact transition date visible. Do not use the person's entire life as the tenure. | Person records and bars exist; life span versus office term is not modeled as a guided distinction. |
| Person and portrait | An individual's life and identity, possibly linked to several events or roles | Place life spans on a people row only when life chronology is the question. A portrait is optional identity detail, not a substitute for a date marker. Roles and life are distinct when their dates differ. | Person records exist; portraits and typed role/tenure records are not displayed. |
| Event or milestone | A dated occurrence such as a battle, council, founding, publication, or migration | Use a date-pinned dot/diamond for a point; use a duration bar only when the source gives a span. Categories distinguish event kinds. A point's marker width is not duration. | Events, categories, point markers, and duration styles are supported; the creation form is generic and omits several useful fields. |
| Era, age, or period | A named contextual interval | Use a quiet background band/category box with its own documented start and end. It can cross several streams only through explicit placement. It does not create a successor or imply every event belongs to it. | Era/period types and context bands are supported; automatic starter views and consistent legend rules are not. |
| Doctrine, movement, controversy, or formal act | A subject that may develop over time and may be discussed by institutions | Keep an idea's lifecycle distinct from the council, ruling, or publication that addresses it. Show only documented stages. Use a separate dated event for the formal act and link it only when sources support the link. | Category inclusion/exclusion can place a record in a parallel analytical row without duplicating its note; no doctrine lifecycle template exists. |
| Place, map, or geographic movement | Where an event occurred, where an institution was centered, or how a boundary changed | Treat location as event/entity metadata by default. Use a map mark only when coordinates or a sourced geographic feature exist. A place name alone must not invent coordinates or a territory. | Location text and a local-map setting exist; the map view/coordinate presentation is not implemented. |
| Illustration, artifact, or portrait set | Supporting visual evidence or orientation | Keep local media attached to a record and reveal it in detail or a deliberate media lane. Never use images as unlabeled decoration or let them obscure time geometry. | Not a first-class rendered record field. |
| Caption, explanatory prose, or note | Interpretation, summary, source excerpt, or editorial guidance | Keep prose outside the dense plot by default. Provide a concise optional annotation/callout linked to a date or record; show the complete text on selection. Attribute quotations and interpretations. | Source notes can be opened, but citations, media, and authored callouts are not surfaced in the chart inspector. |
| Edge catalog, legend, or roster | A way to identify people, streams, symbols, or categories | Generate it from visible rows/layers and records. A roster is a navigation aid, not another historical stream. Every entry must select the corresponding record. | No automatic semantic legend or person index. |

## Rules by record type

The current record types should receive predictable starter behavior. These defaults are presentation only; users can still compose custom views.

| Markdown type | Default interpretation | Default style | Required authoring distinction |
|---|---|---|---|
| `visual-timeline-kingdom` | Political continuity | Stream | Record explicit predecessors/successors, splits, and mergers; do not infer from matching names. |
| `visual-timeline-culture` | Community, people group, or institution-like continuity | Stream when the note describes continuity; otherwise a point/span in a relevant row | State the model's scope and date basis. Do not imply uniform identity or governance. |
| `visual-timeline-era` | Broad historical context | Background band/category box | Use its own sourced date range; remain visually subordinate. |
| `visual-timeline-period` | A bounded movement, reign/tenure, campaign, or other interval | Duration bar by default; band only when it is genuinely contextual | Specify what the interval measures. A person’s life, office tenure, and event span are not interchangeable. |
| `visual-timeline-person` | Person and, when selected, life chronology | Person marker or life-span bar in a people row | Use a separate linked tenure/office record when the role dates differ materially from the life dates. |
| `visual-timeline-event` | Dated occurrence | Dot/diamond for a point; bar for a documented span | A one-date record stays a point, including year-precision dates. Categories describe the event, not the renderer. |
| `visual-timeline-place` | Geographic entity/reference | Map/location detail, not an event marker by default | A place becomes a dated timeline item only when the note describes a dated change or interval at that place. |

When existing note types cannot state a necessary distinction cleanly, add a documented optional property or a new type only after confirming a real use case. Do not multiply types just to get a color or shape; those belong in composition presets.

## Shared visual rules

### Continuity and change

- Streams are the chart's backbone; use a small number of meaningful streams rather than one stream per person or event.
- Use bars or slim segments for bounded tenures and durations. Borders and transition ticks must make adjacent officeholders distinguishable even when colors match.
- Branches, reunifications, and successors need explicit source relationships or reviewed composition overrides. An unresolved record stays visible as unassigned and is listed in diagnostics.
- Stream width is decorative and stable. It does not encode strength, size, territory, or confidence without an explicit numeric field, documented scale, and legend.

### Context and events

- Periods sit behind the records they contextualize, with lower opacity and a distinct outline. Their own dates control their extent.
- A context item may span several institutions when sources justify that scope. Do not force a multi-entity era onto one anchor merely because it is convenient.
- Event categories may be combined. A council note can be one record with several supported categories; do not duplicate it to populate multiple rows.
- Alignment to a stream can communicate “read alongside” only. If alignment might be mistaken for causation or participation, label that convention in the view description and inspector.

### Labels, density, and navigation

- The overview prioritizes stream names, major period names, and readable event/person labels. Full long-form text belongs in selection details, not in the plotting area.
- Show the complete title when a collision-free nearby label slot exists; abbreviate only when space is genuinely unavailable. Never move a date to make a label fit.
- Cluster only markers that cannot remain separately legible at the current zoom. Each cluster must open an item list; no record disappears because of density.
- Filtering and zooming do not reshuffle historical lanes or change dates. Use saved views to emphasize a period/topic while retaining the canonical records.
- Color is redundant with shape, text, and legend. Keep it theme-safe, restrained, and consistent within a semantic layer; never use color alone for status or doctrine judgments.
- All shapes, labels, and roster entries remain keyboard/touch selectable. Selection provides the full title, date precision/uncertainty, applicable category, explicit links, source/evidence references when available, and a separate Open note action.

## Low-overhead authoring and setup

The intended experience is **choose a chart recipe once, then add source-backed notes normally**. Users should not have to hand-build every row, layer, filter, color, and display style for every project.

### Proposed starter recipe: Historical Atlas

On project creation, offer this optional recipe, alongside a blank project and the existing succession recipe. It creates a first draft composition, not historical records:

1. **Continuities** — kingdom/culture/institution streams.
2. **Periods and context** — quiet background bands.
3. **People and offices** — life spans and explicitly linked tenures.
4. **Events** — date-pinned points and sourced duration bars.
5. **Places** — an optional geographic layer reserved for notes with supported location data.

Each generated layer has a clear name, type filter, default style, stable color, label policy, and legend entry. Empty rows/layers stay hidden in the first view but are ready when matching notes are created. The recipe must never migrate or rewrite existing records, settings, or saved compositions.

### Proposed type-aware record form

Keep the initial form short and reveal relevant fields from the selected record type:

- Common: title, type, start date, precision/circa, category, and source/evidence link.
- Span-capable types: optional end date, with a clear note that leaving it blank creates a point.
- Event: optional people/participants, place, and explicitly related stream/period.
- Person: life dates; optional linked office/tenure records rather than mixing life and office dates.
- Continuity: end date, predecessor/successor, split/merge targets, and scope note.
- Period: its own dates, context scope, and explicitly related stream(s).
- Place: optional local coordinates or map reference, with provenance; no inferred map pin.

Reuse autocomplete from existing records and known categories. Make advanced relationships and display overrides collapsible. Prefill the active project, selected row/layer, current chart date, and obvious referenced record when the user starts creation from the chart. Nothing should require manually editing YAML for the common path.

## Feature priorities

### First: make the current primitives easy to use

1. **Project recipes and generated legends.** Address the highest-overhead gap: turn rows/layers/filters/styles into reusable named presets, with a preview and safe blank option.
2. **Type-aware quick entry.** Add date end/precision, category suggestions, source link, and selected subject/place/anchor without a large generic form.
3. **Semantic defaults.** Make record type select an appropriate row/layer and style automatically; retain per-view overrides.
4. **Clear evidence in selection.** Surface date qualification and source/evidence references, with Open note always separate.

### Then: add reference-chart material the plugin cannot show yet

5. **Office/tenure subrecords.** Represent ruler, bishop, or other office terms separately from person life ranges, with one-step creation linked to the person and institution.
6. **Local geographic view.** Add a synchronized map panel using local map assets and explicit coordinates/regions; selecting a map mark selects the same timeline record.
7. **Local media and annotations.** Support optional portraits/illustrations and concise authored callouts attached to records, revealed by zoom or selection rather than permanently cluttering the overview.

These are proposals, not commitments to copy the poster's every annotation or image. Implement only after the core recipe and type semantics are approved.

## Acceptance checks for future implementation

- A new Historical Atlas project yields a useful, labeled draft without manually adding each row/layer/filter.
- A new one-date event remains a point; adding a sourced end date changes it to a duration without changing its start date.
- A person’s life and an office term can be displayed separately and linked without duplicate or contradictory dates.
- Streams branch only from explicit references or reviewed overrides; ambiguity remains visible and actionable.
- Periods keep their documented bounds, stay behind events/streams, and never imply a successor or cause.
- The legend is generated from what is shown and remains understandable in light and dark themes.
- Zoom, filtering, and narrow screens preserve every record, selection path, and full source note access.
- Optional locations/media/annotations never require a network connection and never become mandatory fields.
- Existing projects, records, and saved compositions remain unchanged unless a user explicitly migrates or edits them.
