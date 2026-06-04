<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md: Web Development Rules & Conventions

**Note: For global system rules and inter-service communication, refer to the [Root AGENTS.md](../AGENTS.md).**

## Development Conventions
- **Server Components**: Use Server Components by default for better performance and SEO.
- **Client Components**: Use `"use client"` only for interactive UI elements (e.g., Maps, Charts, Forms).
- **Data Fetching**: Prefer Server Actions with DuckDB for analytical queries. Use Drizzle for user and metadata management.
- **Role-Based Access**: 
  - `superadmin`: Full access to users and system configuration.
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
