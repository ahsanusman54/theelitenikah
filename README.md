# theelitenikah

Monorepo layout:

```
apps/
  web/       — Next.js website (TypeScript, Tailwind, App Router)
packages/
  shared/    — framework-agnostic code shared with the future mobile app
```

## Getting started

```
cd apps/web
npm install
npm run dev
```

Requires a `.env.local` in `apps/web` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Visit `/supabase-check` after starting the dev server to confirm the Supabase connection is working.

See `dating-site-tech-report-v3.md` (project owner's Desktop) for the full product spec, database schema, and build plan.
