# Visual Timeline

## Bars above streams (1.5.2)

Primary duration bars are now 64px high over 56px background streams, with the same dates and curved centerlines. True overlapping reigns retain compact internal tracks. Labels and boundary marks follow the larger shape edges, while integrated era tint remains visible without intercepting clicks on reigns.

## Integrated context bands (1.5.1)

Choose **Band layout → Integrated with related streams** to incorporate an era or other background context into the main flow. Explicit relationship references (or display overrides) select one or multiple anchor streams. The band tints their exact contours during the overlapping dates; it does not create another historical lane.

When the context outlasts a linked source record, a subdued dashed continuation stays on that stream's centerline until the context's own end date. Original kingdom endpoints and foreground event markers remain unchanged. The continuation represents the context record, not an inferred successor kingdom. Select its name or shaded area for the context's full note details. Ambiguous or missing references produce visible diagnostics while valid targets may still render. If none resolve, the band falls back to a separate strip rather than guessing an attachment. Existing separate-strip and lane modes remain available.

## Aligned name rails (1.5)

The chart emphasizes continuity, then ruler changes, then details. Kingdom names stay inside their flowing streams; reign names use fixed text rails with short orthogonal leaders rather than floating label buttons. Dense names truncate without moving dates. True overlapping durations stay on contained subtracks; every record remains selectable directly or through its named label/count marker.

Selection opens a compact information strip on desktop with full title, dates, anchor, an **Open note** action, and expandable categories/relationships. Narrow screens use a dismissible bottom sheet. Wheel zoom and drag-to-pan remain available, with a shared sticky date ruler and optional full-height year lines.

Bands default to a subdued, bounded context strip. Configure **Band layout** to place a band behind its assigned lane instead; an unresolved band never fills the chart. A context strip describes the whole row and does not pretend a multi-kingdom era belongs to one kingdom. Narrow its note-type/category filters to avoid representing the same event in several layers.

**Tint streams from attached durations** optionally uses the single consistent attached duration color for each anchor stream. Mixed attached colors retain the stream layer's configured color. Other saved colors, filters, row/layer IDs, visibility and source notes are preserved. Extra references to non-anchor records no longer invalidate a single explicit anchor reference. BC ruler ticks use round displayed years, without introducing a year zero.

Visual Timeline is a local, Markdown-first Obsidian plugin for displaying events, eras, kingdoms, places, people, and explicit historical relationships on a scalable timeline.

The plugin does not require a network service or map API. It indexes ordinary Markdown notes and preserves user-authored content. Timeline relationships are explicit: continuity, splits, merges, succession, and parallel relationships are never inferred from names alone.

The first release is timeline-first. Geographic fields and a local map asset setting are included so a bundled offline map view can be added without changing the note model.

## Flowing kingdom streams

Kingdoms can be drawn as filled SVG ribbons, with explicit successors branching from the parent stream. Dates determine horizontal positions; ribbon width is decorative, not a population or power measurement. Select a shape (or focus it and press Enter) for details and an Open note action. Narrow screens can scroll the chart horizontally.

## Relationship-aware layout (1.4)

Version 1.4.5 adds left-button click-and-drag panning across the chart, including item shapes and names. A five-pixel horizontal movement threshold distinguishes panning from a normal detail-selection click. The grab cursor changes while dragging; pointer capture continues the drag outside the chart. Native touch scrolling, the scrollbar, wheel zoom, and keyboard selection remain available. Zoom in first when the entire timeline already fits the available width.

Version 1.4.4 fixes false overlap tracks at succession boundaries. Records with identical start/end coordinates render as instant markers and do not reserve duration tracks. A same-year marker therefore no longer displaces the following reign for its full duration. Genuine overlapping durations still use separate tracks. No dates or historical notes are changed.

Version 1.4.3 adds mouse-wheel zoom over the timeline plot (up = in, down = out), anchored to the date under the pointer. Horizontal wheel/trackpad gestures and Shift+wheel are left to native scrolling. Scrolling over lane names, controls, or the detail inspector is not captured. Wheel input is batched once per animation frame, normalizes pixel/line/page deltas, and stays within the Fit-to-32× zoom range. Fit and the existing zoom buttons remain available.

Version 1.4.2 adds contrasting outlines and exact-date start/end ticks on individual duration segments, making changes of ruler visible even when adjacent reigns share a color. Toggle **Year lines** beside Fit/Zoom, or **Full-height year lines** in Configure timeline, to extend the ruler's displayed date ticks continuously behind all rows. The grid follows zoom and is saved per composition; existing views default to off. It changes display only, never note data or temporal positions.

Version 1.4.1 uses exact shared cubic segments for anchor ribbons, ruler segments, and lines, so long durations do not flatten a branch curve. Primary reigns follow the centerline; genuine overlaps use contained subtracks. Adaptive labels use truncated names and clickable callouts, including names for clustered records. Narrow screens use a horizontally scrollable minimum canvas to avoid crushing all names into a phone-width chart. Explicitly hidden label settings remain respected.

In Configure timeline, attach a layer to another layer using explicit relationships, and optionally provide per-record anchor overrides. Unresolved or ambiguous attachments appear in an Unassigned lane with diagnostics. Adaptive labels never shift historical positions; overlapping items remain accessible in selectable count markers. Fit and zoom control horizontal scale without changing lane height. Selection opens an inspector, rather than immediately navigating away. Settings upgrade in memory without rewriting historical notes.

## Rows, layers, and saved views (1.3)

Open **Configure timeline** on the dashboard, or run `visual-timeline:configure-timeline`.

- Add any number of named rows, change their numeric position, set minimum height, or hide/remove them. Rows grow to accommodate collision lanes instead of clipping records.
- Add layers to each row. Filter by note type, category, and tag. An empty filter means all; choices within a group match any value, while groups combine with AND.
- Place layers in the background or foreground. Numeric order controls stacking within each plane; backgrounds always draw first. Move layers between rows without rebuilding their filters.
- Choose streams, lines, dots, boxes/duration bars, or shaded bands. Set color, opacity, and label visibility. Dots mark the start date, while the other styles show duration.
- Set category display defaults, then let individual layers inherit or override them. The first configured category in a note's category list wins; the note type is the fallback.
- Save, duplicate, rename, and remove compositions. Cancel discards the entire editing draft. All changes are stored in plugin settings, never in historical notes.

Three initial views are included: **Kingdom succession**, **Separate rows**, and **Kings and kingdoms**. Select a view beside search. To show only battles rather than all events, choose your battle category/tag in the event layer.

All rows share one date scale and horizontal scroll surface. Search and filters do not shift the scale. Zoom expands the canvas. Foreground collisions stack in internal lanes; background layers deliberately overlay. Explicit stream links are drawn only between visible records in the same layer whose parent end and successor start dates meet. No historical relationship is inferred.

## Validation

Run `npm ci` and `npm test` for type checking, production build, date utilities, stream geometry, composition persistence/filtering/order/collision checks, and portability validation. Optional `npm run test:ui` requires Playwright and Chrome (Playwright can be supplied via `NODE_PATH`). It renders synthetic data, tests Save/Cancel and keyboard navigation, and checks a narrow editor; it does not replace desktop Obsidian or real iOS testing.
