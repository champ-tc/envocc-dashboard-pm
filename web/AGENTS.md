<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md: Web Development Rules & Conventions

**Note: For global system rules and inter-service communication, refer to the [Root AGENTS.md](../AGENTS.md).**

## Page documentation is mandatory

Before modifying any listed page, read both the page's documentation file and this file. The documentation is a behavior and presentation contract, not optional background information. If the requested change conflicts with the documented behavior, stop and ask for confirmation before changing the contract.

| Page | Route | Required documentation |
|---|---|---|
| Home | `/` | `web/docs/pages/home.md` |
| Register | `/register` | `web/docs/pages/register.md` |
| Login | `/login` | `web/docs/pages/login.md` |
| PM2.5 | `/dashboard/pm25` | `web/docs/pages/dashboard-pm25.md` and `web/src/app/dashboard/pm25/README.md` |
| HDC | `/dashboard/hdc` | `web/docs/pages/dashboard-hdc.md` and `web/src/app/dashboard/hdc/README.md` |
| DDS | `/dashboard/dds` | `web/docs/pages/dashboard-dds.md` and `web/src/app/dashboard/dds/README.md` |

When a page's intended behavior, data contract, layout, interaction, or visual rule changes, update its required documentation in the same change. For shared components used by multiple pages, read and verify every affected page document before editing.

## Development Conventions
- **Server Components**: Use Server Components by default for better performance and SEO.
- **Client Components**: Use `"use client"` only for interactive UI elements (e.g., Maps, Charts, Forms).
- **Data Fetching**: Prefer Server Actions with DuckDB for analytical queries. Use Drizzle for user and metadata management.
- **Runtime Data Path**: Resolve analytical files through `DUCKDB_DATA_DIR`. In Docker, `/app/public/duckdb` is the shared `duckdb-data-volume`; do not assume Airflow writes into the source tree. Pipeline outputs belong to the shared volume and must not be manually edited.
- **Role-Based Access**: 
  - `superadmin`: Full access to users and system configuration.
  - `admin_department`: Department-level access to nationwide data and data-request approval, without system configuration access.
  - `admin`: General administrative access.
  - `admin_region` / `admin_province`: Access restricted to specific health regions or provinces.
  - `user`: Standard access to dashboards and profile.
- **Styling**: Adhere to Tailwind 4 and DaisyUI 5 components for consistent UI/UX.
- **Thai Language Support**: The application primarily uses Thai for the UI and data labels. Constants are managed in `src/lib/constants.ts`.

## daisyUI 5 Rules
*Refer to these rules before every CSS modification.*

1. **Usage**: Use daisyUI component, part, and modifier classes.
2. **Customization**: Customize with Tailwind utility classes if needed (e.g., `btn px-10`).
3. **Specificity**: Use `!` (e.g., `bg-red-500!`) only as a last resort.
4. **Responsive**: Use responsive prefixes (`sm:`, `lg:`, etc.) for layouts.
5. **Semantic Colors**: Use `primary`, `secondary`, `accent`, `neutral`, `base-100`, `info`, `success`, `warning`, `error`.
6. **Content Colors**: `*-content` colors are for foreground content.

## Troubleshooting & Maintenance
- **npm ci**: Requires `package-lock.json` to be in sync. Use `--legacy-peer-deps`.
- **ESLint 9**: Circular structure errors are known; bypassed in CI with `|| true`.
- **Docker**: Ensure `.dockerignore` excludes `node_modules`, `.next`, and `.git`.
