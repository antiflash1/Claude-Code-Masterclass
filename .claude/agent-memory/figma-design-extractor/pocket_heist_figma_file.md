---
name: pocket-heist-figma-file
description: Location and structure of the Pocket Heist Figma file, plus the HeistCard component's key design tokens
metadata:
  type: project
---

Figma file "Page Designs" (key `tELPsOMKJdcWNnJJHAwu5q`), page "Dashboard", frame "Heists Dashboard for Pocket Heist" contains the dashboard mockups for the Pocket Heist app (this repo). Sections inside that frame: `ActiveHeists` (node 14:15), `AssignedHeists` (node 14:128), `HeistHistory` (node 14:242) — each has a header row + a card grid container (layout mode "none", cards manually positioned).

**HeistCard component** — node `54:60` (also instanced as 14:23, 14:58, etc.). Link: https://www.figma.com/design/tELPsOMKJdcWNnJJHAwu5q/Page-Designs?node-id=54-60&m=dev

Design tokens observed (raw hex — file defines no Figma variables/design tokens, `get_variable_defs` returns empty):
- Card background: `#101828` (near Tailwind slate-950/gray-900)
- Card border: `#1e2939` (near Tailwind slate-800), ~1px, border-radius 10px
- Title text: `#ffffff`, Inter 400, 16px/24px line-height, letter-spacing -0.3125px
- Secondary/meta text (labels "To:", "By:", date, and icon color): `#99a1af` (gray-400), Inter 400, 14px/20px, letter-spacing -0.15px
- "To:" recipient handle (e.g. `@StealthyPanda`): purple `#c27aff`
- "By:" assigner handle (e.g. `@MidnightCoder`): pink `#fb64b6`
- Status/time-remaining trailing text after the date bullet (e.g. "Overdue", "4h 42m", "2d 0h"): purple `#c27aff` in every sample observed across ActiveHeists and AssignedHeists sections — **not** semantically color-coded (no red for overdue vs green for on-track was seen); treat as a single accent color unless a variant frame proves otherwise.
- Top-right corner card icon: small clock glyph, purple `#c27aff`, 16x16px, consistent across all HeistCard instances.
- Row icons for "To:"/"By:"/date rows: person-outline and calendar-outline, both `#99a1af`, ~12x12px.

Card sizing (as measured in this Figma frame's zoom level, values were slightly non-integer, e.g. padding 20.83px, gap 11.99px/7.99px, border 0.83px — likely a scaled/zoomed capture rather than intentional design decimals): card ~378×178px, padding ~21px (top/sides) with the bottom edge effectively flush, internal gap between title block and meta block ~12px, gap between the three meta rows ~8px. Grid gap between card instances in this mockup (2-column layout only, at time of inspection) is ~16px both horizontally and vertically.

**Icon matching**: person/calendar/clock glyphs are simple line icons consistent with `lucide-react` (already the project's icon library per CLAUDE.md) — likely `User`, `Calendar`, `Clock` — but not 100% confirmed since Figma vector paths don't carry lucide icon names. Flag as "high-confidence guess, not exact match" in reports rather than certain fact.

See also [[icon-color-semantics-note]] if created later for any status-color variants discovered in other frames (e.g. HeistHistory section, which may show "Completed" states).
