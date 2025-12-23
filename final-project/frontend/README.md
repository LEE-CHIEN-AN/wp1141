# Shadow Navigation Frontend (React + Vite + TypeScript)

Modern rewrite of the Shadow Map UI powered by:

- **React + Vite + TypeScript** for fast DX and strict typing
- **Tailwind CSS + shadcn/ui** for consistent styling and accessible components
- **Mapbox GL JS** for the 3D building + shadow visualization

The legacy static prototype is preserved under `frontend-legacy/` for reference.

---

## Quick Start

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Make sure the FastAPI backend is running on `http://localhost:8000` when testing routing.

**Note:** Environment variables are now configured in the root `.env` file. See the main README.md for setup instructions.

---

## Environment Variables

Environment variables are configured in the **root `.env` file** (not in `frontend/.env`).

The frontend reads from the root `.env` file via Vite configuration. Required variables:

```bash
# Mapbox Access Token (required)
VITE_MAPBOX_TOKEN=your_mapbox_token_here

# Backend API URL (required for production, defaults to localhost:8000 for local dev)
VITE_API_URL=https://your-backend-url.onrender.com

# Google Maps API Key (optional, for address search and Places API)
VITE_GOOGLE_MAPS_API_KEY=your_google_api_key_here
```

See the root `.env.example` file for all available options.

| Variable                 | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `VITE_MAPBOX_TOKEN`      | Mapbox access token (GL JS) - **Required**                       |
| `VITE_API_URL`           | Backend API base URL - **Required for production** (defaults to `http://localhost:8000` for local development) |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key (for Geocoding & Places) - Optional |

---

## Tech Stack Highlights

| Area        | Details                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| Language    | TypeScript (strict), path alias `@/*` for src imports                   |
| Styling     | Tailwind CSS 3 + shadcn/ui (button, input, card, switch, etc.)          |
| Maps        | Mapbox GL JS 3.16 (3D building extrusions, route overlays)              |
| Linting     | ESLint with `typescript-eslint`, React Hooks, Vite refresh rules        |

The shadcn tokens/components are configured via `components.json` and `tailwind.config.js`.

---

## Local Data

The entire `frontend-legacy/data` folder (building tiles, etc.) is copied into `frontend/public/data`.

- `public/data/4342.json` is the default dataset loaded on startup
- `public/data/shadows.geojson` (optional) is used if present
- Fetching is done over HTTP via Vite dev server → no more `file://` CORS issues

Drop in new GeoJSON files and reference them in `App.tsx` if needed.

---

## Project Layout

```
frontend/
├─ components.json               # shadcn config
├─ public/
│   └─ data/                     # geojson datasets copied from legacy project
├─ src/
│   ├─ components/
│   │   ├─ MapView.tsx           # Mapbox orchestration
│   │   ├─ Sidebar.tsx           # shadcn/Tailwind form & stats
│   │   └─ ui/                   # shadcn ui primitives (button, card, ...)
│   ├─ lib/utils.ts              # cn()
│   ├─ types/                    # shared TypeScript types
│   ├─ App.tsx                   # root layout + data fetching
│   └─ main.tsx                  # React entry
├─ tailwind.config.js            # Tailwind + shadcn tokens
├─ tsconfig.json                 # strict TS config with @ alias
└─ vite.config.ts                # Vite setup
```

---

## Scripts

| Command        | Description                      |
| -------------- | -------------------------------- |
| `npm run dev`  | Start Vite dev server            |
| `npm run build`| Production build (vite build)    |
| `npm run lint` | ESLint (TypeScript aware)        |
| `npm run preview` | Preview built assets          |

---

## Notes

- The UI toggles (3D buildings & shadows) are backed by shadcn `Switch` components.
- The entire layout is Tailwind-based; no legacy CSS files remain.
- Adjust `public/data/` to include whichever building tiles you need during development.
- When backend shadow endpoints are ready, set `shadowData` via API results instead of the static file.
