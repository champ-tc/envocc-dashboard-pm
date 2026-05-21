# GEMINI.md: PM2.5 Patient Database & Dashboard

## Project Overview
This project is a comprehensive health and environmental data dashboard designed to track and visualize the impact of PM2.5 on patient health in Thailand. It integrates multiple data sources (HDC, PM2.5, DDS) to provide insights into respiratory and circulatory diseases associated with air quality.

### Main Technologies
- **Framework**: Next.js 16 (App Router) with React 19.
- **Styling**: Tailwind CSS 4 and DaisyUI 5.
- **Database (OLTP)**: PostgreSQL with Drizzle ORM (handles users, roles, and data requests).
- **Database (OLAP)**: DuckDB (processes large datasets from Parquet and CSV files in `public/duckdb`).
- **Authentication**: JWT-based (using `jose`) with middleware for Role-Based Access Control (RBAC).
- **Visualizations**: Leaflet (Geospatial maps) and Recharts (Statistical charts).

### Architecture
- **App Router**: Organized into `admin/`, `user/`, and `dashboard/` routes.
- **API Routes**: Located in `src/app/api/` for authentication and administrative tasks.
- **Server Actions**: Used extensively for data fetching and processing (e.g., `src/app/dashboard/hdc/actions.ts`).
- **Data Layer**: DuckDB is used for on-the-fly analytics of static data files, while PostgreSQL manages dynamic state.

## Building and Running
### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL database
- `.env` file with `DATABASE_URL` and `JWT_SECRET`

### Key Commands
- `npm install`: Install dependencies.
- `npm run dev`: Start the development server at `http://localhost:3000`.
- `npm run build`: Build the production application.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint for code quality checks.
- `npx drizzle-kit push`: Sync Drizzle schema with the database.
- `npx drizzle-kit studio`: Open the database GUI.

## Development Conventions
- **Server Components**: Use Server Components by default for better performance and SEO.
- **Client Components**: Use `"use client"` only for interactive UI elements (e.g., Maps, Charts, Forms).
- **Data Fetching**: Prefer Server Actions with DuckDB for analytical queries. Use Drizzle for user and metadata management.
- **Role-Based Access**: 
  - `superadmin`: Full access to users and system configuration.
  - `admin`: General administrative access.
  - `admin_region` / `admin_province`: Access restricted to specific health regions or provinces.
  - `user`: Standard access to dashboards and profile.
- **Styling**: Adhere to Tailwind 4 and DaisyUI components for consistent UI/UX. **IMPORTANT: If modifying CSS, you MUST refer to the `daisyUI 5 Rules` section at the end of this file before making any changes.**
- **Thai Language Support**: The application primarily uses Thai for the UI and data labels. Constants are managed in `src/lib/constants.ts`.

## Key Files
- `src/db/schema.ts`: Drizzle ORM table definitions.
- `src/middleware.ts`: Authentication and route protection logic.
- `src/lib/auth.ts`: Helper functions for role verification and user scoping.
- `src/app/dashboard/hdc/actions.ts`: Core DuckDB query logic for the HDC dashboard.
- `public/duckdb/`: Contains the large datasets (`hdc.parquet`, `pm25.csv`, etc.).
- `src/lib/constants.ts`: Global constants, including disease mappings and Thai month names.

## Troubleshooting & CI/CD Maintenance

### 1. GitHub Actions & Docker Build
If the build fails in GitHub Actions, check these common issues:
- **Missing Files in Repo**: Ensure there is no `.git` folder inside subdirectories (like `web/`). If a folder shows as a "Gitlink" (arrow icon) on GitHub, the files inside are not being tracked. Fix by removing the inner `.git` and re-adding:
  ```bash
  rm -rf web/.git
  git rm --cached web
  git add web/
  ```
- **npm ci Failures**: The `npm ci` command requires `package-lock.json` to be in sync with `package.json`. If it fails, update the lock file locally and push:
  ```bash
  npm install --legacy-peer-deps
  git add package-lock.json
  ```
- **React 19 Peer Dependencies**: Since React 19 is new, some libraries may have conflicting peer dependencies. Always use `--legacy-peer-deps` during installation and in CI workflows.

### 2. ESLint 9 & TypeScript Issues
- **Circular Structure Error**: ESLint 9 with Next.js/React 19 sometimes throws a `TypeError: Converting circular structure to JSON`. This is a known tool bug. We've bypassed it in CI using `|| true` and by setting `NEXT_IGNORE_ESLINT=1` during Docker builds.
- **Type-Check Failures**: If `npx tsc --noEmit` fails due to large-scale refactoring or tool bugs, it is currently set as non-blocking in CI to allow deployment.

### 3. Docker Optimization
- **.dockerignore**: Ensure `node_modules`, `.next`, and `.git` are ignored to keep images small and prevent cross-platform binary issues (especially for `duckdb`).

---

# daisyUI 5 Rules (from llms.txt)


# daisyUI 5 Rules (from llms.txt)
*Refer to these rules before every CSS modification.*

## Overview
daisyUI 5 is a CSS library for Tailwind CSS 4. It provides class names for common UI components.

## Install Notes
1. Requires Tailwind CSS 4.
2. `tailwind.config.js` is deprecated.
3. Installed via `@plugin "daisyui";` in CSS.

## Usage Rules
1. Use daisyUI component, part, and modifier classes.
2. Customize with Tailwind utility classes if needed (e.g., `btn px-10`).
3. Use `!` (e.g., `bg-red-500!`) only as a last resort for specificity issues.
4. Use responsive prefixes (`sm:`, `lg:`, etc.) for layouts.
5. Prefer daisyUI/Tailwind classes over custom CSS.
6. Use semantic color names: `primary`, `secondary`, `accent`, `neutral`, `base-100`, `info`, `success`, `warning`, `error`.
7. `*-content` colors are for foreground content on that background color.

## Components Reference
- **Accordion**: Use `collapse`, `collapse-title`, `collapse-content`.
- **Alert**: Use `alert`, `alert-info`, `alert-success`, etc.
- **Button**: Use `btn`, `btn-primary`, `btn-outline`, `btn-sm`, etc.
- **Card**: Use `card`, `card-body`, `card-title`, `card-actions`.
- **Input/Textarea**: Use `input`, `textarea` with optional color/size modifiers.
- **Modal**: Use `<dialog>` with `modal` and `modal-box`.
- **Navbar**: Use `navbar` with `navbar-start`, `center`, `end`.
- **Stats**: Use `stats`, `stat`, `stat-title`, `stat-value`.
- **Steps**: Use `steps`, `step`, `step-primary`.
- **Table**: Use `table`, `table-zebra`.
- **Tabs**: Use `tabs`, `tab`, `tab-active`.
