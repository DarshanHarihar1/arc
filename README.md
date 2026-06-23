# Arc — Personal Fitness & Consistency Tracker

An installable, offline-first PWA for staying consistent with workouts, food, medicine,
and steps. See [`design/`](./design) for the full spec and the phased implementation plan.

## Stack

React 18 + TypeScript · Vite + `vite-plugin-pwa` · Tailwind + shadcn-style UI ·
TanStack Query · Supabase (Postgres + RLS, Auth, Storage, Edge Functions).

## Local development

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

- `npm run build` — typecheck + production build (emits the service worker + manifest).
- `npm run preview` — serve the production build locally.

## Backend

Database schema, RLS, and storage live in [`supabase/migrations`](./supabase). See
[`supabase/README.md`](./supabase/README.md) for how to apply them.

## Status

Phase 1 (Foundation): backend schema + RLS, magic-link auth, route guard, and an
installable PWA shell. Subsequent phases are tracked in
[`design/implementation-plan.md`](./design/implementation-plan.md).
