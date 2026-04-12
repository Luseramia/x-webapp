# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check with tsc then build for production
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

There are no tests configured in this project.

## Architecture

This is a React 19 + TypeScript + Vite SPA using Tailwind CSS v4 and PrimeReact components.

### Auth Flow

Authentication is session-based using `localStorage`. The `useAuth` hook ([src/hooks/useAuth.ts](src/hooks/useAuth.ts)) reads/writes a `token` key in `localStorage`. The login flow uses the Web Crypto API (ECDSA key pairs) to authenticate against `https://sso-backend.tarchunk.win` — it registers a UUID+public key, then polls `/sso/poll-jwt/v2` every 5 seconds waiting for approval.

### App Shell

- [src/App.tsx](src/App.tsx) — root component, wires together `BrowserRouter`, `MainLayout`, and `AppRoutes` with auth state from `useAuth`
- [src/layouts/MainLayout.tsx](src/layouts/MainLayout.tsx) — persistent header/nav rendered around all pages; nav links only show when logged in
- [src/routes/index.tsx](src/routes/index.tsx) — all routes defined here; unauthenticated users are redirected to `/login`, authenticated users are redirected away from `/login` to `/home`

### Routes

| Path | Component |
|------|-----------|
| `/login` | `Login` — UUID-based SSO login |
| `/home` | `HomeMenu` — dashboard/menu |
| `/upload` | `VideoUpload` — drag-and-drop video upload (currently simulates progress) |
| `/income-expense` | `IncomeExpense` — drag-and-drop image upload, sends to `/ocr/batch` with Bearer token |

### Styling

Tailwind CSS v4 is configured via the Vite plugin (`@tailwindcss/vite`). Custom theme tokens are defined in [src/index.css](src/index.css) using `@theme`:

- `bg-primary` → `#ffffff`
- `text-primary` → `#111827`
- `purple-primary` → `#7c3aed`
- `purple-hover` → `#6d28d9`

Some components (VideoUpload, MainLayout) use dedicated `.css` files with class-based styles instead of Tailwind utilities.

### Shared Utilities (`src/utilities/`)

- `Button` — standard purple button with consistent styling
- `Container` / `ContainerCenter` — layout wrappers
- `toast` — wrapper around `react-hot-toast` for error toasts
