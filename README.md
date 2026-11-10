# Visual Timeline

Visual Timeline is a local, Markdown-first Obsidian plugin for displaying events, eras, kingdoms, places, people, and explicit historical relationships on a scalable timeline.

The plugin does not require a network service or map API. It indexes ordinary Markdown notes and preserves user-authored content. Timeline relationships are explicit: continuity, splits, merges, succession, and parallel relationships are never inferred from names alone.

The first release is timeline-first. Geographic fields and a local map asset setting are included so a bundled offline map view can be added without changing the note model.

## Flowing kingdom streams

Kingdoms can be drawn as filled SVG ribbons, with explicit successors branching from the parent stream. Dates determine horizontal positions; ribbon width is decorative, not a population or power measurement. Select a shape (or focus it and press Enter) for details and an Open note action. Narrow screens can scroll the chart horizontally.

## Relationship-aware layout (1.4)

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
