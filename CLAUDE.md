# CLAUDE.md - vue.dotabase.dillerm.io

## Project Overview

A Vue 3 web interface for browsing Dota 2 game data from the [dotabase](https://github.com/mdiller/dotabase) SQLite database. Users can run predefined or custom SQL queries and view results with rich formatting (images, audio, colors, etc.).

## Architecture

**Frontend:** Vue 3 + Vite (multi-page app, no router — page switching handled in App.vue)
**Backend:** Express.js server on port 3000
**Database:** SQLite via `better-sqlite3` (read-only, auto-synced from GitHub)

### Dev Setup
```bash
npm run dev        # starts both Express (port 3000) and Vite dev server concurrently
npm run prod       # builds Vite bundle then starts Express
```

Vite proxies `/api` and `/vpk` to `http://localhost:3000`.

> **VPK asset URLs in templates:** Always use dynamic binding (`:src`, `:href`) for `/vpk/...` and `/dota-vpk/...` URLs in Vue templates — never static `src=` or `href=`. Static attributes cause Vite/Rollup to attempt bundling those paths, which fails at build time. Example: `:src="'/vpk/path/to/image.png'"` not `src="/vpk/path/to/image.png"`.

## Pages

Pages are defined in [`src/pages/index.js`](src/pages/index.js) as a `PAGES` array — this is the single place to add, rename, or reorder pages. Each entry has:
- `label` — display name shown in the page selector
- `value` — unique string identifier
- `icon` — MDI icon (from `@mdi/js`), converted to an SVG data URL via `mdiSvgUrl()`
- `component` — the Vue component to render for that page

Page components live in `src/pages/`. The page selector is a `DillermSelect` in App.vue, fixed-positioned over the right side of the dillerm navbar (64px from the right edge).

**Current pages:**
| Label | Icon | Component |
|-------|------|-----------|
| Database Query | `mdiDatabase` | `DatabaseQuery.vue` |
| Axe | `mdiAxeBattle` | `Axe.vue` |
| Resource Calculator | `mdiCalculatorVariant` | `ResourceCalculator.vue` |

## Key Files

| File | Purpose |
|------|---------|
| [src/App.vue](src/App.vue) | Root component — page selector + dynamic page rendering |
| [src/pages/index.js](src/pages/index.js) | **Page definitions** — add/edit pages here |
| [src/pages/DatabaseQuery.vue](src/pages/DatabaseQuery.vue) | Query page — query selection, arg parsing, query execution |
| [src/pages/Axe.vue](src/pages/Axe.vue) | Axe page (stub) |
| [src/pages/ResourceCalculator.vue](src/pages/ResourceCalculator.vue) | Resource Calculator page (stub) |
| [src/server.js](src/server.js) | Express backend — SQL API, VPK serving, dotabase sync |
| [src/components/ResultTable.vue](src/components/ResultTable.vue) | Formats query results (images, audio, colors, etc.) |
| [src/components/SqlInput.vue](src/components/SqlInput.vue) | Prism-highlighted SQL editor |
| [src/components/OrderSelector.vue](src/components/OrderSelector.vue) | Sort field + ASC/DESC toggle |
| [src/components/StatusBar.vue](src/components/StatusBar.vue) | Query status indicator |
| [src/assets/queries.sql](src/assets/queries.sql) | Predefined queries (Responses, Heroes, Items, etc.) |
| [src/assets/arg_queries.sql](src/assets/arg_queries.sql) | Queries that populate dropdown arguments |
| [src/utils/prism_sql_custom.js](src/utils/prism_sql_custom.js) | Custom Prism.js SQL highlighting rules |
| [vite.config.js](vite.config.js) | Vite config (root: `src/`, output: `build/`) |

## SQL Query Metadata Format

Queries in `.sql` files use comment directives to generate dynamic UI controls:

```sql
-- {name Query Title}
-- {arg argName type label}
SELECT * FROM table WHERE col = '{argName}'
```

**Arg types:** `select`, `text`, `color`, `order`

**Substitution patterns in SQL:**
- `{argName}` — direct value substitution
- `{argName.propName}` — nested property (e.g. `{color.r}` for RGB)
- `{if argName}...{endif}` — conditional SQL block

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET/POST /api/sql?q=<query>` | Execute SQL, return JSON array |
| `GET /api/version` | Dotabase git commit hash |
| `GET /api/dotaversion` | Current Dota 2 patch number |
| `GET /api/icon/:type/:id` | Redirect to VPK asset |
| `GET /dota-vpk/` or `/vpk/` | Serve VPK game assets |
| `POST /githook` | Webhook to re-sync dotabase repo |

## ResultTable Formatting

The table auto-formats cell values:
- `.png` paths → clickable thumbnail images
- `strength`/`agility`/`intelligence` → attribute icons
- `#RRGGBB` hex strings → colored text
- JSON strings → collapsible `<details>`
- Long text (>100 chars) → collapsed
- `.mp3`/`.wav` → HTML5 audio player
- `NULL` → `<pre>NULL</pre>`

## Data Source

On startup, `server.js` clones/pulls `https://github.com/mdiller/dotabase.git` into `_dotabase/` and reads `_dotabase/dotabase/dotabase.db` (read-only). The database contains extracted Dota 2 game data: heroes, items, abilities, responses (voice lines), loading screens, etc.

## Deployment

- **Docker:** `Dockerfile` uses Node 22, runs `npm run prod`
- **Environment variables:** `PORT` (default 3000), `VPK_DIR` (VPK assets path)
- **Build output:** `build/` directory (served by Express at `/`)

## External Dependencies

- `@dillerm/webutils` — custom UI components (DillermSelect, DillermText, DillermColor)
- Dillerm CSS loaded from `https://tools.dillerm.io/lib/dillerm.css`
