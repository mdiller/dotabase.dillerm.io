# PROMPT: OpenDota Match Explorer Page

Add a new page to the dotabase Vue app: an **OpenDota Match Explorer** that lets users interactively build and execute queries against the OpenDota `/players/{account_id}/matches` endpoint, preview the returned JSON, and copy the generated URL.

---

## Overview

This is a self-contained page — either a new HTML entry point (like `vpk_browser.html`) or a new route added if routing is introduced. The simplest approach is a new standalone HTML file at `src/opendota.html` with its own Vue app in `src/opendota_app.vue`.

Follow the same patterns as the existing `src/index.html` + `src/App.vue`:
- Load dillerm.css from `https://tools.dillerm.io/lib/dillerm.css?version=dev`
- Load dillerm.umd.js and call `DillermWebUtils.init()` for the navbar
- Mount a Vue 3 app into `#vueapp`
- Use `DillermSelect`, `DillermText` from `@dillerm/webutils`

---

## Layout

### Top Section: URL Bar
A prominent bar at the top showing the currently constructed API URL. Should:
- Be a large, readable, copyable element (full-width)
- Update live as params change
- Have a "Copy" button that copies the URL to clipboard and briefly shows "Copied!"
- Show the full URL including `https://api.opendota.com/api/players/{account_id}/matches?...`
- Use `background-color: var(--background-color3)` and a monospace font

### Middle Section: Parameter Controls
A grid or two-column layout of filter controls. Each control corresponds to a param from `src/assets/opendota_matchfilter.json`. Use that JSON file as the source of truth for all available params, their types, options, and descriptions.

Control types to support:
- `text` → `DillermText` component
- `number` → `DillermText` with `type="number"` or `<input type="number">`
- `select` → `DillermSelect` with options from the JSON
- `multiselect` → multiple checkboxes or a multi-select component for `project` fields (each selected value becomes a separate `project=value` query param)

Each control should show:
- A label
- The control itself
- A small description/hint below (from the JSON `description` field)
- A `notes` badge if the field has a `notes` property (e.g. "Requires parsed matches")

Param controls layout:
- `account_id` always at the top, full-width, prominent
- Group remaining params visually: Core (limit, offset, win, lobby_type), Game (game_mode, significant), Match (hero_id, with_hero_id, against_hero_id, party_size, lane_role), Players (included_account_id, excluded_account_id), Time/Place (date, region), Advanced (project fields)

### Fetch Button
A big "Fetch Matches" button. Clicking it:
1. Makes a real `fetch()` call to `https://api.opendota.com/api/players/{account_id}/matches?{params}`
2. Shows a loading state
3. On success: displays the result count and renders the JSON response

### Bottom Section: Results
After fetching, show:
- A summary bar: "X matches returned in Yms"
- A **table** using the existing `ResultTable.vue` component pattern (or a simplified inline version if easier) showing the match data
- The raw JSON in a `<pre>` tag inside a collapsible `<details>` block below the table

---

## URL Construction Logic

Build the query string from active params:
- Skip params with null/empty values
- For `project` (multiselect): emit multiple `project=value` params, one per selected field
- For path param `account_id`: substitute into the URL path, not the query string
- Encode values properly with `encodeURIComponent`

Example output:
```
https://api.opendota.com/api/players/87287966/matches?win=1&lobby_type=7&hero_id=75&date=30&limit=20&project=kills&project=deaths&project=assists
```

---

## Presets / Examples

Load the `examples` array from `opendota_matchfilter.json`. Show them as a row of clickable preset buttons (or a dropdown). Clicking a preset:
- Populates all param controls from the preset's `params` object
- Triggers a live URL update (and optionally auto-fetches)

---

## State

```javascript
data() {
  return {
    account_id: "",      // string, typed by user
    params: {},          // { key: value } for all active query params
    project_fields: [],  // array of selected project field strings
    result: null,        // raw response array
    status: "idle",      // "idle" | "loading" | "success" | "error"
    status_text: "",
    copied: false,       // for copy button feedback
  }
}
```

---

## Server Setup

No backend changes needed — this page calls the OpenDota API directly from the browser. The Express server (`server.js`) just needs to serve the new HTML file as a static file from the `build/` directory (which Vite handles automatically).

Add the new entry point to `vite.config.js`:
```javascript
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  root: "src",
  build: {
    rollupOptions: {
      input: {
        main: "src/index.html",
        opendota: "src/opendota.html"   // add this
      },
      outDir: "../build"
    }
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/vpk": "http://localhost:3000"
    }
  }
});
```

---

## Styling Notes

- Use the same dark theme CSS variables as the rest of the project (`--background-color1` through `--background-color4`, `--highlight-color1`, `--text-color`, `--input-highlight-color`)
- URL bar: `background-color: var(--background-color4)`, `border: 1px solid var(--highlight-color1)`, `padding: 12px 16px`, `border-radius: 5px`, `font-family: monospace`
- Param groups: `background-color: var(--background-color2)`, `border-radius: 5px`, `padding: 15px`, `margin-bottom: 10px`
- "Fetch" button: `background-color: var(--highlight-color1)`, `color: white`, large and prominent
- Result table: reuse `ResultTable.vue` or style similar to it
- Notes badges: small inline chip, `background-color: var(--background-color4)`, amber/yellow text

---

## Files to Create

| File | Purpose |
|---|---|
| `src/opendota.html` | New page entry point (mirrors `index.html` pattern) |
| `src/OpenDotaApp.vue` | Main Vue component for the page |

## Files to Modify

| File | Change |
|---|---|
| `vite.config.js` | Add `opendota.html` as a build entry point |

## Reference Files (do not modify)

| File | Why it's useful |
|---|---|
| `src/assets/opendota_matchfilter.json` | Source of truth for all params and examples |
| `src/index.html` | Copy navbar/app setup pattern |
| `src/App.vue` | Component patterns, DillermSelect/DillermText usage |
| `src/components/ResultTable.vue` | Reuse for displaying match rows |
| `src/components/StatusBar.vue` | Reuse for fetch status |

---

## Nice-to-haves (implement if straightforward)

- Link each match_id in the results to `https://www.opendota.com/matches/{match_id}`
- Auto-fetch when account_id is typed (debounced, 800ms)
- Show a warning if `lane_role` is selected but `lane` and `is_roaming` are not in project fields
- Link to the OpenDota docs URL from the JSON (`docs_url`) in the header
- Show the OpenDota rate limit remaining (returned in response headers as `x-rate-limit-remaining-month`)
