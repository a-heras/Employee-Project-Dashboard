# Employee & Project Dashboard

Vanilla JavaScript dashboard for managing employees, projects, and monthly assignments with financial projections. Data is stored in `localStorage` under the key `monthlyData`.
[Open Project](https://a-heras.github.io/Employee-Project-Dashboard/)
## Features

- Monthly snapshots (employees and projects per year/month)
- Projects and Employees views with sorting and column filters
- Assignment popups, vacation calendar, seed data from another month
- Estimated income / revenue / cost calculations per ТЗ formulas

## Tech stack

- HTML, CSS, JavaScript (ES modules)
- No frameworks or libraries (no React/Vue/jQuery)

## How to run

1. Clone or download the repository.
2. Serve the folder over HTTP (required for ES modules), for example:
   - **VS Code:** Live Server extension, open `index.html`
   - **Node:** `npx serve .` or `npx http-server .`

3. Open the URL in a browser (e.g. `http://localhost:8080`).

Opening `index.html` directly via `file://` may block modules; use a local server.

## Implementation notes

- Default period follows the browser’s current date (`period-state.js`), synced with the sidebar selectors on load.
- Sample data is created only when `localStorage` has no `monthlyData` entries.

## Deployment

Build is static files only: upload the project root (including `index.html` and `src/`) to GitHub Pages or any static host.
