---
name: Visual Timeline
description: Obsidian-native historical continuity with disciplined adjacent name rails.
colors:
  canvas: "var(--background-primary)"
  surface: "var(--background-secondary)"
  text: "var(--text-normal)"
  muted: "var(--text-muted)"
  border: "var(--background-modifier-border)"
  accent: "var(--interactive-accent)"
  selection: "var(--text-selection)"
  default-stream: "#bb9865"
  default-layer: "#659fa0"
  default-event: "#b98d76"
  count-on-light: "#000000"
  count-on-dark: "#ffffff"
typography:
  headline:
    fontFamily: "var(--font-interface)"
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  headline-compact:
    fontFamily: "var(--font-interface)"
    fontSize: "23px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: "var(--font-interface)"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.4
  body:
    fontFamily: "var(--font-interface)"
    fontSize: "13px"
    lineHeight: 1.5
  label:
    fontFamily: "var(--font-interface, sans-serif)"
    fontSize: "13px"
    fontWeight: 500
  anchor-label:
    fontFamily: "var(--font-interface, sans-serif)"
    fontSize: "13px"
    fontWeight: 650
  utility:
    fontFamily: "var(--font-interface)"
    fontSize: "12px"
  count:
    fontFamily: "var(--font-interface)"
    fontSize: "11px"
    fontWeight: 700
rounded:
  context: "4px"
  frame: "8px"
  layer: "10px"
spacing:
  control-gap: "8px"
  group-gap: "16px"
  panel-inline: "14px"
  panel-block: "12px"
  dashboard-inline: "24px"
  name-rail-step: "22px"
components:
  button-native:
    padding: "6px 12px"
  chart-frame:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.frame}"
  name-label:
    textColor: "{colors.text}"
    typography: "{typography.label}"
  context-band:
    rounded: "{rounded.context}"
    height: "32px"
  selection-strip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.frame}"
    padding: "12px 14px"
  layer-editor:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.layer}"
    padding: "12px 16px"
---

# Design System: Visual Timeline

## Overview

**Creative North Star: "Historical continuity with disciplined adjacent name rails"**

The built explorer preserves the user-approved flowing-stream direction and aligned-name-rail structure. Broad continuity ribbons lead; attached durations and their boundaries come next; adjacent names and selection supply individual detail. This is a native Obsidian tool, not an illustrated history poster or a separate branded application shell.

The host supplies light or dark surfaces, interface typography and native controls. Fixed-pixel chart geometry keeps labels, ribbon thickness and vertical spacing stable while the horizontal time scale changes. Real dense records may need four name-rail levels, abbreviated labels and selectable clusters; the illustrative mockup is not authority for dates, missing records or exact geometry. This document describes the implementation, not pixel-perfect mockup fidelity or real iOS verification.

**Key Characteristics:**

- Host-theme surfaces and native interface typography.
- Flowing continuity ribbons with explicit attachment semantics.
- Fixed-pixel geometry and adjacent, unboxed name rails.
- Quiet, bounded context and selection-led full detail.
- Configurable rows, layers, colors and display styles.

## Colors

The chrome inherits the active Obsidian theme; muted data colors distinguish configured layers without prescribing a universal historical palette.

### Primary

- **Host accent:** focus outlines and the year-line checkbox use the host interactive accent. It is interface feedback, not a historical relationship.

### Secondary

- **Muted stream gold:** the default kingdom-stream color.
- **Muted layer teal:** the default new-layer and person-duration color.
- **Warm event clay:** the default event-marker color.
- Layer colors and opacity are configurable. Gold, teal and lilac in the approved example are example data assignments, not mandatory colors for other histories.
- An anchor may optionally take its tint from attached duration layers when `tintFromAttached` is enabled and their box, stream or line records yield exactly one distinct color. Multiple attached colors retain the anchor's own configured color.

### Neutral

- **Host canvas:** dashboard, chart and sticky date/lane surfaces.
- **Host secondary surface:** selection details and layer-editor groups.
- **Host text and muted text:** record names and primary content versus dates, lane titles, context and supporting metadata.
- **Host border:** fine separators and the chart/selection frames. Selected text uses the host text-selection color.
- **Count foregrounds:** cluster numerals choose black or white from the actual configured marker color using linearized sRGB luminance (threshold `0.179`). They do not inherit the host's foreground color.

**The Host-Theme Rule.** Preserve Obsidian's active theme; no fixed dark canvas, imported font or example palette is required.

## Typography

**Display and body font:** the host interface font. No web-font asset or second display family is introduced.

The hierarchy is compact and task-led. The frontmatter records the implemented sizes: headline and compact headline for the dashboard title, title for the selection heading, body for supporting prose and metadata, label for chart names, utility for dates and chrome, and count for cluster numerals. The editor's heading also uses the title size but inherits its native heading weight and line height.

Chart names retain their screen-space size at every zoom. Anchor names use the stronger anchor-label weight; context names use muted text. Names stay in normal case. Dates and the matching-note status use tabular numerals. Selection prose has the body line height; explanatory section notes are bounded at `72ch`.

**The Stable-Label Rule.** Zoom the time axis, not the font or vertical geometry; use truncation, available rail slots, selection and zoom instead of shrinking names.

## Layout

The dashboard has a compact title/actions strip, one wrapping filter/control row, a matching-note status and the dominant scrollable chart. Desktop padding is `20px 24px`; the title strip has a fine lower divider. Control groups use the frontmatter's control gap. Search flexes from a `220px` basis with a `150px` minimum; selectors are capped at `320px` until the narrow layout applies.

The chart has one shared horizontal time scale. Its sticky date ruler is `38px` high. A sticky lane gutter is `24px` for the stream-led composition or `160px` when independent non-stream/non-band records require lane labels. The base plot is at least `1000px`; Fit returns to base scale and zoom is bounded from `1` to `32`. Horizontal overflow is intentional, including on narrow screens.

Historical positions are calculated from note dates, with `24px` plot insets. Anchors start with a `28px` half-thickness; attached durations use a `5px` half-thickness. Independent/terminal lane centers are separated by `192px`. Configured row height remains a minimum, not a reason to compress names or ribbons. Zoom changes x positions and recomputes the curves without stretching y coordinates or thicknesses.

Attached names use up to four fixed levels separated by the name-rail step. Uppermost and lowermost branches place their rails outside their own stream; other records use the upper rail. Orthogonal leaders tie labels back to their actual shapes. Collision placement may use space along the duration, abbreviate a name or use a nearby remaining text slot; it never invents another historical lane. Not every full name is guaranteed to fit in an overview.

Context bands are bounded strips below the historical lanes, separated by a fine rule. Each context layer has a `48px` vertical step; its band is `32px` high and rendered at configured opacity multiplied by `0.18`. A band explicitly placed in a lane instead retains its `56px` height and configured opacity.

The optional **Integrated with related streams** mode allocates no extra strip or lane. Explicit references select one or multiple anchors. It reuses each anchor's exact ribbon contour with a time-range clip, tinting the overlap at configured opacity multiplied by `0.28`. Context that outlasts an anchor continues on its centerline at `0.18` opacity with a `5 4` dashed outline. Source endpoints and dates remain unchanged; the dashed portion represents the context, not an inferred historical successor. One context name and selection target represent the record across its linked paths. Ambiguous/missing references are diagnosed even when other targets resolve; no resolved targets produces the separate-strip fallback.

At viewport widths up to `700px`, the title/actions stack, dashboard padding becomes `16px 12px`, search takes a full row, selectors can flex and primary dashboard controls have a `40px` minimum height. At chart-container widths up to `650px`, the selection strip becomes a fixed bottom sheet with `10px` side insets, a `12px` safe-area-aware bottom offset and a `48dvh` maximum height; its buttons have a `44px` minimum height. Chart scrolling is capped at `62dvh` there. At viewport widths up to `600px`, editor fields stack and editor/modal buttons have a `44px` minimum height. Safe-area padding keeps the dashboard and editor content reachable.

## Elevation & Depth

The chart and desktop chrome are flat. Borders, muted text, controlled layer opacity and foreground/background ordering distinguish roles; chart shapes do not receive decorative shadows. The narrow-layout selection sheet alone is lifted with `0 8px 28px #0003`. The sticky ruler and lane gutter stay above chart content; the optional year grid is a quiet, pointer-transparent layer underneath it.

## Shapes

Flowing succession ribbons express continuity and taper at terminal ends. Foreground duration boundaries use a canvas-colored under-stroke plus a fine text-colored cap, preserving separation without disconnected card silhouettes. Line records use a `2px` stroke; duration hit areas use a transparent `20px` stroke for selection.

The frontmatter's corner tokens describe context strips, chart/selection frames and layer-editor groups. Event dots are circles with a `5px` radius; cluster markers are circles with a `10px` radius. These are marker radii, not extra corner tokens. The transparent name-focus rectangle has a `2px` corner radius and no resting fill or border. Native control corners remain the host's responsibility.

## Components

### Native controls and forms

Buttons, search, selectors, checkboxes and disclosure controls keep native Obsidian appearance and behavior. Plugin overrides supply wrapping groups, spacing and target geometry rather than a second button system. Dashboard/chart/selection buttons have a `34px` minimum height; chart buttons also have a `34px` minimum width. Editor/modal buttons start at `36px`. Narrow-layout increases are described in Layout. Hover and disabled styling remain host-owned.

Visible keyboard focus uses a `2px` host-accent outline with `3px` offset. The transactional composition editor keeps settings in familiar grouped fields and uses a separate save/cancel footer; layer groups use the secondary surface and layer radius. No custom pill or card-navigation system is introduced.

### Shared-scale chart

The bordered, rounded scroll frame contains sticky dates, configurable rows and layers, and streams, boxes, lines, dots or bands. Fine attached-duration caps make succession readable independently of color. Missing/ambiguous attachments and invalid succession produce explicit diagnostics rather than invented relationships. Filtering changes visibility without repacking the underlying historical layout.

Mouse/pen drag pans horizontally after a `5px` movement threshold; it suppresses the resulting click, not ordinary item clicks. Touch keeps native scrolling. Vertical wheel input over the plot zooms around the pointer; Shift/horizontal wheel input and the pinned gutter retain scrolling. Fit and zoom buttons provide explicit alternatives. Year lines are optional, saved per composition and rolled back with a visible hint if saving fails.

### Aligned name rails

Names are unboxed text with subdued orthogonal leaders. Anchor names sit within the broad ribbon; attached names occupy their branch's fixed text rails. Hover underlines a name; focus outlines its transparent backing rectangle. The label and shape are independently selectable, and full titles remain available through accessible labels, native SVG titles and the selection strip.

### Clusters and selection

Clusters are count-marked hit-target groups, never discarded records. Selecting one lists its members; selecting a member reveals the individual record. The contrast-safe numeral follows the cluster fill, not the theme.

Desktop selection is a slim, secondary-surface information strip below the chart, with a `320px` maximum height and internal scrolling. It presents title, dates, optional anchor, a separate **Open note** action and **Close**. Categories and relationships are collapsed behind a native disclosure. Narrow layouts use the bottom-sheet treatment described in Layout.

Chart records and names are keyboard-focusable buttons. Enter or Space selects; Left/Right arrows move cyclically between rendered shape groups. Opening details focuses its heading. Escape or Close hides details, clears shape selection and returns focus to the previous element when it is still available. Shape focus/selection uses a `2px` host-text stroke in addition to the interface focus outline. Hints announce focused/hovered record names and dates through a polite live region.

The only authored reveal motion is the selection panel translating upward from `3px` over `0.16s` with `cubic-bezier(.16,1,.3,1)`. It runs only when reduced motion is not requested; there is no reduced-motion animation fallback or continuous chart animation.

## Do's and Don'ts

### Do:

- Do preserve the host theme, interface font and native controls.
- Do preserve explicit succession and attachment semantics while making boundaries and names legible.
- Do keep text and vertical geometry fixed in screen pixels while zooming the shared time axis.
- Do use up to four aligned name-rail levels, abbreviation, clusters and selection for real dense records.
- Do keep context bounded and subordinate, with full detail available separately.
- Do calculate cluster numeral contrast against its configured marker fill.

### Don't:

- Don't force a dark theme or make the example history's colors universal.
- Don't turn label collisions into invented historical lanes or relationships.
- Don't give resting name labels button backplates or replace continuity ribbons with disconnected cards.
- Don't hide records merely because their full names cannot fit in an overview.
- Don't reproduce illustrative mockup chronology or claim pixel-perfect fidelity or real iOS verification from this design record.
