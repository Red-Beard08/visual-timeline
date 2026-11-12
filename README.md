# Visual Timeline

## Local adaptive name labels (1.8.2)

Timeline labels first search collision-free space inside the item's nearby date neighborhood. Point labels are bounded by adjacent entries and a 320px maximum neighborhood, so distant empty stretches can no longer produce long callouts over unrelated dates. Duration and category labels can use their own recorded span. When the full title cannot fit locally, the label truncates at a word boundary with an ellipsis; a single long word is shortened only when needed. The full title remains available through selection and accessibility text. Label changes never affect historical position, lane assignment, or zoom geometry.

## Project-owned timelines (1.8)

Each timeline is now a standalone project folder. Choose the active project from the selector at the top; **New item** automatically saves into that project's `Records/` folder. The creation form has no timeline picker, and records cannot be assigned to multiple projects. The folder is the source of ownership, with `timeline_project_id` stored automatically as a readable cross-check.

```text
Collections/Visual Timeline/Timelines/
  Israelite Monarchy/
    Timeline.md
    Records/
  Church History/
    Timeline.md
    Records/
```

Each `Timeline.md` has a version-2 `visual-timeline-project` frontmatter record with its stable project ID, name, status and records-folder path. Layouts remain separate per project. **All records** is still available as a browse view for older notes; creating a note requires an active project. Version-1 collection notes remain readable as legacy views, but no longer expose an item-membership editor.

The **Move legacy records** preview moves the recognized notes in the old shared Records folder into the active project. Before moving, it makes and hash-verifies copies of those records and any notes that link to them, then uses Obsidian's file manager so internal links are repaired. Backups and a manifest are retained under `.obsidian/plugins/visual-timeline/migration-backups/`. Destination collisions, unrecognized Markdown, duplicate stable IDs, or changed sources stop the move before it starts. Existing records are not migrated automatically.

New project folders are never renamed implicitly when a project display name changes. Archiving hides a project from the active selector but preserves its folder, records and layout. Changing the configured Timelines folder does not move existing project folders.

If project creation succeeds but copying its layout or activating it fails, the dialog reports the saved state and offers **Retry setup** or **Close**. Retrying never creates a second project or repeats completed stages.

Additional commands: `visual-timeline:new-timeline`, `visual-timeline:manage-timelines`, and `visual-timeline:move-legacy-records`. Existing dashboard and creation command IDs remain valid.

## Diamond point markers and closer lanes (1.6.1)

Bar/line records with equal start and end coordinates now use an **18px date-pinned diamond**, rather than a nearly invisible divider. Known nonzero durations remain bars; the marker's width never invents additional time. A year-precision point shows its recorded year and clarifies that an exact duration was not recorded.

Nearby diamonds separate vertically with short pins back to their original dates. Up to three marker positions stay visible; denser overflow uses an explicit selectable diamond group. Names remain independently selectable. Zoom can separate crowded callouts, while filtering leaves date anchors and historical lanes stable. Dot layers keep their existing event markers.

Default lane-center spacing is **128px instead of 192px**, one-third smaller. Shape heights, font sizes and label-rail spacing are unchanged. Extra clearance remains available for unusually tall configured categories. No note migration or settings-file rewrite is needed.

## Taller category boxes (1.6)

Integrated category bands now draw behind their related streams as taller boxes on the same centerline. The default visual hierarchy is **88px category box → 40px stream → 14px item bar**. A category can begin while a stream is still active and continue after it ends: its own dates set its box boundaries, while the kingdom and ruler records keep their original endpoints. One category may attach to several explicitly related streams without adding a new row.

In **Configure timeline**, use **Band layout → Integrated with related streams** and **Integrated category shape → Category box — taller than stream**. Flat stretches use rounded rectangles; a category crossing a fork follows its anchor's actual curve until it settles. Choose **Stream tint and continuation** to keep the earlier contour treatment. The optional **Shape height (px)** field adjusts a layer without changing dates or horizontal zoom; blank restores automatic sizing. Category boxes always leave at least 12px above and below the associated stream. Existing layer IDs, filters, saved views, colors, notes and settings remain intact.

## Integrated context bands (1.5.1)

Choose **Band layout → Integrated with related streams** to incorporate an era or other background context into the main flow. Explicit relationship references (or display overrides) select one or multiple anchor streams. Version 1.6 defaults to taller category boxes; the **Stream tint and continuation** shape retains the original contour behavior described below. Neither creates another historical lane.

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
