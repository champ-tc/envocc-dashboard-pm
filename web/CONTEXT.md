# CONTEXT.md: PM2.5 Patient Database & Dashboard

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
- `npm run dev`: Start the development server.
- `npm run build`: Build the production application.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint for code quality checks.
- `npx drizzle-kit push`: Sync Drizzle schema with the database.
- `npx drizzle-kit studio`: Open the database GUI.

## Key Files
- `src/db/schema.ts`: Drizzle ORM table definitions.
- `src/middleware.ts`: Authentication and route protection logic.
- `src/lib/auth.ts`: Helper functions for role verification and user scoping.
- `src/app/dashboard/hdc/actions.ts`: Core DuckDB query logic for the HDC dashboard.
- `public/duckdb/`: Contains the large datasets (`hdc.parquet`, `pm25.csv`, etc.).
- `src/lib/constants.ts`: Global constants, including disease mappings and Thai month names.
