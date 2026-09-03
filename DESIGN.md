---
version: alpha
name: EnvOcc dashboards
description: Thai public-health surveillance dashboards with dense charts and readable reference notes.
colors:
  dashboard-background: "#0f172a"
  dashboard-panel: "#334155"
typography:
  sans:
    fontFamily: "Kanit, ui-sans-serif, system-ui, sans-serif"
omitted:
  - section: rounded
    reason: "Existing Tailwind and DaisyUI runtime tokens remain canonical."
  - section: spacing
    reason: "Existing responsive Tailwind utilities remain canonical."
components:
  dashboard-notes: {}
---

## Overview

Product register: Thai health-surveillance users comparing PM2.5, HDC and DDS data. Preserve the existing institutional dashboard, not a marketing redesign. Current-task user-provided notes are the content authority; displaying them does not validate or change the pipeline's clinical/counting rules.

Runtime ownership is Model B: `web/src/app/globals.css` (Tailwind/DaisyUI) and `web/src/app/layout.tsx` (Kanit, Thai locale, winter theme) remain canonical. This document records existing design and the shared notes behavior, not a new token generator.

## Colors

Dashboard slate-900 background and slate-700 panels contrast with light reference dialogs. The notes dialog consumes DaisyUI `base-100`, `base-200`, `base-300`, `base-content` and `primary`; do not copy theme values into a second stylesheet. Air-quality swatches use existing blue/green/yellow/orange/red category conventions, always paired with text.

## Typography

Use the existing Kanit font for Thai and Latin. Notes use normal-weight body text with generous line-height and semibold section headings; retain complete English disease names and ICD codes without truncation.

## Layout

Keep dashboard page sizing unchanged. Place the notes trigger in a shared DaisyUI `fab` fixed at the bottom-right with safe-area-aware insets, outside the footer: all three existing pages deliberately hide the footer. The user explicitly selected a black button with white text; retain the visible Thai label and 48px touch target. Keep the dialog outside the FAB container so FAB child visibility and layout rules cannot affect it. Use a white rounded dialog, a compact black source badge, a distinct title and a circular close action. HDC/DDS use a narrower reading width and divided disease rows. Dialog body owns vertical scrolling, header/close action stays visible. Show PM2.5 levels as five stacked cards on mobile and a table on desktop, rendering the same source data and advice in both layouts; it is not a paginated dataset.

## Elevation & Depth

Notes use a compact reading layout: a single-row header, 12px body vertical padding, 14px text with 20px line-height, short list/row spacing, and a viewport-bounded modal. HDC/DDS allow a 5xl width; PM2.5 allows 7xl and places general/risk-group advice side by side on large screens. Target complete notes without vertical scrolling at 1280×720; preserve scrolling on smaller screens and zoom rather than clipping content or shrinking text further.

Use native `dialog.showModal()` top-layer behavior, following the existing SecurityModal's native-modal approach. No additional z-index escalation or backdrop blur is needed.

## Shapes

Reuse DaisyUI button and modal-box recipes and existing rounded table borders.

## Components

Dashboard maps use local GeoJSON on a light background. Do not add external raster basemap tiles or API-key-dependent providers; street/place-label tiles are intentionally omitted. Shared ThailandMap and PM2.5 RegionMap retain their analytical layers, filters, colors and tooltips.

Dashboard navigation owner: `web/src/components/DashboardNavMenu.tsx`. Use DaisyUI `dropdown`/`menu` with native `details`/`summary`, visible Thai destination labels, and `aria-current` for the current page. Align right on all three dashboards, including mobile. Native disclosure owns open/closed state; shared handlers add Escape, outside-pointer, focus-leave and link-selection dismissal. Avoid hover-driven React state, per-item stagger animations and backdrop blur. Preserve Next Link navigation and prefetch behavior; this is a menu rendering improvement, not an analytical-data performance claim.

Canonical notes owner: `web/src/app/dashboard/_components/DashboardNotes.tsx`, mounted by `dashboard/layout.tsx`. Same trigger label “หมายเหตุ” on all three routes; content varies by route. Open on click/keyboard, place focus inside, keep background inert, close with Escape/close/backdrop, and restore trigger focus. Static local content has no network loading or mutation states.

Keep the existing CloudLoader unchanged. Native buttons provide hover/active/focus states. New notes transitions respect reduced motion. Existing app-wide scrollbar and form-ownership inconsistencies found by the premium audit remain outside this notes-only change; do not rewrite unrelated screens to hide audit findings.

## Do's and Don'ts

- Do preserve HDC-only “ผู้ป่วยเฉพาะคนไทย”; do not add it to DDS.
- Do retain complete notes and distinguish colors with text.
- Don't silently correct user-supplied ranges or alter Airflow/DuckDB calculations.
- Don't introduce a second per-dashboard modal implementation.
