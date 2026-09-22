---
version: alpha
name: EnvOcc PM2.5 Patient Database
description: Thai public-health surveillance product for connecting PM2.5 exposure context with HDC, DDS and Air4Thai data.
colors:
  ink: "#0f172a"
  slate-panel: "#334155"
  primary-blue: "#2563eb"
  sky-accent: "#38bdf8"
  surface: "#ffffff"
  muted-surface: "#f8fafc"
  alert-red: "#ef4444"
  success-green: "#10b981"
typography:
  sans:
    fontFamily: "Kanit, ui-sans-serif, system-ui, sans-serif"
    lineHeight: "1.7"
rounded:
  auth-card: "2.5rem"
  dashboard-card: "2rem"
  hero-card: "3rem"
  control: "1rem"
omitted:
  - section: spacing
    reason: "Existing responsive Tailwind utilities remain canonical."
  - section: elevation
    reason: "Elevation is expressed by existing Tailwind/DaisyUI shadow utilities and route-specific surface treatment."
components:
  guest-navbar: {}
  auth-card: {}
  definition-block: {}
  dashboard-navbar: {}
  dashboard-nav-menu: {}
  dashboard-notes: {}
  data-map: {}
  chart-panel: {}

## Overview

Product register is hybrid: the home page explains and routes users into the product; login and registration are trust-sensitive entry flows; authenticated dashboards are operational tools. The north star is a Thai public-health control room: institutional, calm and data-forward, with the atmosphere of a cool blue monitoring screen rather than a consumer finance app or a marketing landing page.

The memorable signature is the shared PM2.5 atmospheric image and blue-to-sky gradient language. It establishes continuity across home, login and register, while the dashboard switches to a light, high-contrast working canvas so maps, tables and charts remain readable. Preserve this identity; do not introduce a second brand palette per route.

Runtime ownership is Model B: `web/src/app/layout.tsx` owns the single font loader; the `:root` block in `web/src/app/globals.css` owns typography values and adapts them to Tailwind, semantic elements and maps. `globals.css` remains canonical for theme and shared utilities. `DESIGN.md` documents intent and normative roles but must not become a competing token generator.

## Colors

Use `ink`/slate tones for analytical chrome and text, `surface`/`muted-surface` for readable content panels, and `primary-blue` plus `sky-accent` for actions, links, focus and brand emphasis. The atmospheric background image is always darkened with a slate overlay on auth surfaces so white text and form affordances remain legible.

Semantic colors are not decorative: `alert-red` marks PM2.5 red-risk definitions or critical states; `success-green` marks completed/verified items. Air-quality categories retain the existing blue/green/yellow/orange/red convention and must always be paired with a text label or value, never color alone.

Home uses a translucent white information card over the background. Login uses a dark glass auth card. Register uses a lighter glass-white card because the flow is longer and more information-dense. Dashboards use slate/navy analytical headers with white or slate panels and light page backgrounds.

## Typography

Kanit remains the single shared Thai/Latin family, loaded once by `web/src/app/layout.tsx`. Change the font loader there; edit the `:root` block in `web/src/app/globals.css` for title/subtitle/section/body sizes, weights, line heights and letter spacing. Keep the generic `--font-app` name when switching fonts. Appearance is selected explicitly with `.typo-title` (large title), `.typo-subtitle` (subtitle), `.typo-section` (small section heading) and `.typo-body` (content), independent of HTML tag. Keep semantic heading levels for accessibility; do not use tag selectors to style text roles. All four typography properties (size, weight, line height and letter spacing) come from one explicit `typo-*` role. Page-local `text-*` size, `font-*` weight, `leading-*` and `tracking-*` utilities are retired. Color/alignment/wrapping utilities remain allowed. Additional roles are `typo-hero`, `typo-metric`, `typo-body-sm`, `typo-label`, `typo-caption` and `typo-chart`; their responsive sizes and all numeric values are owned by the same `:root` block. Nested text inherits its parent role unless it explicitly selects another role. Generated Leaflet HTML, tooltips, tables, form controls and navigation participate in this policy. Use `.text-content` around consecutive `.typo-body` elements to opt into the central paragraph gap without changing card/table layout margins. Inline emphasis (`strong`, labels and actions) retains its contextual weight. All rendered application text uses this same family, including form controls, code/preformatted text, SVG labels, Leaflet controls and framework fallback pages. The global family-only override is intentional because third-party and framework inline font declarations otherwise bypass inheritance. Tailwind sans/serif/mono aliases all resolve to the same central family. All numeric typography values are owned by `globals.css`, not copied into this document.

Use sentence case and direct Thai verbs: `เข้าสู่ระบบ`, `สมัครสมาชิกใหม่`, `ดูข้อมูลเพิ่มเติม`, `หมายเหตุ`. English appears only when it clarifies a known product term such as `Login`, `Patient Database`, HDC, DDS or Air4Thai. Do not truncate disease names, ICD codes or official source names.

## Layout

The home page is a centered, scrollable explainer: guest navigation at the top, a high-contrast hero title and two primary routes, then the definitions card and official-source links. The hero is intentionally spacious; the definition list is denser and left-aligned for reading. On mobile, CTA buttons stack full-width and definition content collapses to one column.

Login is a focused single-column task with a max-width form card, back-to-home affordance, icon-supported fields and a single full-width primary action. Registration is a wide two-column form on desktop and one column on mobile. Keep the back link, section hierarchy, field labels, validation feedback and PDPA/approval confirmation visible without relying on hover.

Authenticated dashboard pages use a shared header/nav owner, responsive analytical panels, maps and charts. Preserve document scrolling; bound overflow only to a table or dialog body that owns it. Keep the footer and dashboard notes behavior consistent across HDC, DDS and PM2.5 routes.

## Elevation & Depth

Depth comes from layered translucent surfaces, backdrop blur, restrained blue glows and large soft shadows. Auth cards use a dark or light glass treatment over the shared image; content cards on the home page use white translucency; dashboard panels are flatter and more stable for comparison work. Never add heavy blur behind charts, tables or small text.

Use stable geometry during loading and submission. Buttons preserve their dimensions while busy and show the existing spinner/toast pattern. Native modal top-layer behavior is preferred for app-owned dialogs; no z-index escalation or backdrop blur is needed for dashboard notes.

## Shapes

The shape language is soft but institutional: pill-shaped navigation/CTA controls, `auth-card` rounding for major auth surfaces, `hero-card` rounding for the large home information container, and `dashboard-card` rounding for icon tiles and analytical cards. Inputs and selects use the existing control radius. Avoid sharp editorial rules, excessive circles, or playful sticker-like decoration.

## Components

`GuestNavbar` owns public navigation and should keep home/login/register destinations recognizable. Home primary CTA is the blue-to-sky filled button; register is the outlined neutral companion. `SecurityModal` remains the app-owned security explanation dialog.

Auth fields must use real labels, semantic autocomplete values, visible focus, preserved values on error, masked passwords by default, and an accessible show/hide control. Login errors are inline/toast-supported and actionable; registration validates identity/phone data, handles duplicate checks, confirms the approval expectation, then returns to login on success.

`web/src/components/dashboard/` owns the shared dashboard shell components: navbar, navigation disclosure, loading state, busy alert, notes and deferred chart wrapper. `DashboardNavbar.tsx` is the single shared owner for dashboard logos, titles and the compact right-aligned navigation disclosure. It preserves Thai destination labels, `aria-current`, keyboard/Escape/outside dismissal and no hover-only behavior. `DashboardNotes` is the shared notes owner with a consistent `หมายเหตุ` trigger, focus restoration, escape/backdrop close, readable body scroll and route-specific content. Maps use local GeoJSON only; do not add external raster tiles or API-key-dependent basemaps.

Dashboard province multi-selects keep `เลือกทั้งหมด` as a distinct action and provide local Thai-name search with an explicit clear button and no-results message. Searching narrows only the visible choices; it must not silently change the current selection or the meaning of selecting all provinces.

Iconography uses Lucide for controls and simple inline SVG for existing informational marks. Icons support labels rather than replacing them. Motion is limited to CTA hover lift, focus transitions, card hover feedback and the existing cloud loader; all non-essential motion must respect `prefers-reduced-motion`.

## Do's and Don'ts

- Do preserve the public-health/institutional tone and Thai-first content.
- Do use the shared background image and gradient accent as the cross-route signature.
- Do keep WCAG 2.2 AA basics: semantic controls, visible focus, contrast, keyboard access and 44–48px touch targets.
- Do preserve official source links and distinguish HDC, DDS and Air4Thai.
- Do keep the dashboard analytical canvas quieter than auth and home surfaces.
- Don't turn the product into a generic SaaS dashboard, fintech UI or decorative marketing page.
- Don't invent new colors, fonts, radius systems or one-off auth layouts without updating this durable context and the runtime owner together.
- Don't communicate PM2.5 risk, validation or permission state by color alone.
- Don't manually edit runtime DuckDB/CSV outputs to support a visual change.

## DaisyUI component ownership

DaisyUI 5 owns standard button, input, native select, table, badge, card and inline loading appearance. Use `btn` with semantic intent (`btn-primary`, `btn-success`, `btn-error`, `btn-neutral`) and `btn-soft` for secondary row actions. Native disabled state drives DaisyUI appearance; do not duplicate it with conditional background classes. Use `input`, `select`, `table`, `badge`, `card card-border`, and `loading loading-spinner` before adding utilities. Keep responsive widths, icon offsets, calendar geometry and brand-specific glass/gradient surfaces as explicit modifiers. Native select and existing date-picker logic remain their current behavior owners. Modal backdrops remain full-screen dismissal surfaces, not `.btn` controls. The shared CloudLoader remains the branded page loader. Do not reintroduce retired DaisyUI 4 `input-bordered`, `select-bordered`, `form-control` or `label-text` aliases.

This migration changes presentation only; existing confirmation, validation and API behavior is outside its scope. Semantic colors follow the winter theme, explicitly enabled in the DaisyUI plugin to match root layout’s `data-theme="winter"`. Existing `typo-*` classes and Kanit remain the typography owners.
