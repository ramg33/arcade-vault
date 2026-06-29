# SPEC 04 — Supabase Client Integration

> **Status:** Implemented · **Depends on:** SPEC 03 · **Date:** 2026-06-28
> **Objective:** Install `@supabase/supabase-js` and `@supabase/ssr`, add the project's env vars to `.env.local`, and expose two typed client factories at `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server) for future specs to import.

## Scope

**In:**

- `package.json` — add `@supabase/supabase-js` and `@supabase/ssr` as dependencies
- `.env.local` — add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `.env.template` — add the same two keys as empty placeholders
- `lib/supabase/client.ts` — new file; exports `createClient()` using `createBrowserClient`
- `lib/supabase/server.ts` — new file; exports async `createClient()` using `createServerClient` with Next.js cookie handlers

**Out of scope (for future specs):**

- Supabase Auth (sign-up, sign-in, session management)
- Any database schema, tables, or migrations
- Replacing `lib/auth.ts` (localStorage auth stays untouched)
- Replacing `seededScores()` or any hardcoded data in `lib/data.ts`
- Realtime subscriptions
- Edge Functions
- Row Level Security policies
- Middleware / proxy.ts cookie refresh logic (deferred to the Auth spec)

## Data Model

No new data structures. This spec introduces no tables, types, or schema changes.

The two additions are client factories:

```ts
// lib/supabase/client.ts — for Client Components
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

```ts
// lib/supabase/server.ts — for Server Components, Server Actions, Route Handlers
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {} // Server Components cannot set cookies; safe to ignore
        },
      },
    }
  );
}
```

Future specs will import `createClient` from the appropriate file and layer their own types on top.

## Implementation Plan

1. **Install packages** — run `npm install @supabase/supabase-js @supabase/ssr`. Confirm both appear in `package.json` dependencies.

2. **Add env vars to `.env.local`** — append the two variables with their real values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://bypmahezbenruqrzwcwu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<legacy anon key>
   ```

3. **Add placeholders to `.env.template`** — append both keys as empty values so any new developer knows they are required:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

4. **Create `lib/supabase/client.ts`** — browser client factory using `createBrowserClient` from `@supabase/ssr`. Throw a clear error at module load time if either env var is missing.

5. **Create `lib/supabase/server.ts`** — async server client factory using `createServerClient` from `@supabase/ssr` with Next.js `cookies()` handlers. Throw a clear error at module load time if either env var is missing.

## Acceptance Criteria

- [ ] `@supabase/supabase-js` and `@supabase/ssr` are listed in `package.json` dependencies
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present in `.env.local` with real values
- [ ] Both keys are present as empty placeholders in `.env.template`
- [ ] `lib/supabase/client.ts` exists and exports a `createClient` function
- [ ] `lib/supabase/server.ts` exists and exports an async `createClient` function
- [ ] Importing `createClient` from either file in a Server or Client Component does not throw at build or runtime
- [ ] `tsc --noEmit` passes with no errors
- [ ] No existing pages or components are modified

## Decisions

- **Yes: both `@supabase/supabase-js` and `@supabase/ssr`** — `@supabase/ssr` provides the `createBrowserClient` and `createServerClient` factories needed for the App Router split; `@supabase/supabase-js` is kept as an explicit dependency for direct use in future specs.
- **Yes: two client factories over one singleton** — Server Components and Client Components run in different contexts. A single singleton cannot satisfy both; splitting into `client.ts` and `server.ts` makes the boundary explicit and prevents misuse.
- **Yes: full cookie handlers in `server.ts` now** — wiring the `getAll`/`setAll` pattern now costs nothing and makes the Auth spec a drop-in addition. A bare client without cookie support would require a breaking refactor later.
- **Yes: legacy anon key over publishable key** — both are active on the project; the legacy anon key (`eyJ…`) is the format expected by `@supabase/supabase-js` and the format all Supabase guides use.
- **Yes: fail fast on missing env vars** — throwing at module load time makes misconfiguration visible immediately rather than at the first query.
- **No: TypeScript database types via `supabase gen types`** — deferred to the Database spec once a schema exists.
- **No: Middleware / proxy.ts cookie refresh** — deferred to the Auth spec; not needed for read-only data access.
