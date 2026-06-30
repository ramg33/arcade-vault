# SPEC 06 — Supabase Leaderboard and Game Registry

> **Status:** Approved · **Depends on:** SPEC 04, SPEC 05 · **Date:** 2026-06-29
> **Objective:** Create a `games` table (id + title) and a `scores` table in
> Supabase, wire the Asteroids game-over modal to persist scores to the database,
> and replace `seededScores()` in `/hall` with live per-game top-12 queries.

## Scope

**In:**

- Supabase migration: create `games` table (`id text PRIMARY KEY`, `title text NOT NULL`)
  and `scores` table (`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`,
  `game_id text REFERENCES games(id)`, `player_name text NOT NULL`,
  `score integer NOT NULL`, `achieved_at timestamptz DEFAULT now()`)
- Seed `games` with one row: `{ id: 'asteroids', title: 'ASTEROIDS' }`
- `app/games/[id]/play/page.tsx` — `handleSaveScore` inserts into Supabase `scores`
  in addition to localStorage (dual-write; localStorage unchanged for backwards compat)
- `app/hall/page.tsx` — replace `seededScores()` with a Supabase query returning
  top 12 rows per selected game, ordered by score descending
- Inline TypeScript types for the two new tables (no `supabase gen types` tooling)

**Out of scope (for future specs):**

- Supabase Auth / real user IDs — `player_name` stays as free text from localStorage
- TypeScript DB types via `supabase gen types typescript`
- The mini-leaderboard on `/games/[id]` detail page (still uses `seededScores()`)
- Row Level Security policies
- Realtime score subscriptions
- Pagination or infinite scroll beyond top 12
- Adding any game other than `asteroids` to the `games` table

## Data Model

**Supabase `games` table:**

```sql
CREATE TABLE games (
  id          text        PRIMARY KEY,
  title       text        NOT NULL,
  short       text        NOT NULL,
  long        text        NOT NULL,
  cat         text        NOT NULL CHECK (cat IN ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover       text        NOT NULL,  -- CSS class name, e.g. 'cover-rocas'
  color       text        NOT NULL CHECK (color IN ('cyan','magenta','yellow','green')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO games (id, title, short, long, cat, cover, color) VALUES (
  'asteroids',
  'ASTEROIDS',
  'Pulveriza asteroides en gravedad cero.',
  'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir rocas
   en fragmentos cada vez más pequeños. Recoge el power-up 3x para triplicar tu
   cadencia de disparo.',
  'SHOOTER',
  'cover-rocas',
  'yellow'
);
```

**Supabase `scores` table:**

```sql
CREATE TABLE scores (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      text        NOT NULL REFERENCES games(id),
  player_name  text        NOT NULL,
  score        integer     NOT NULL,
  achieved_at  timestamptz NOT NULL DEFAULT now()
);
```

**Inline TypeScript types (new file `lib/supabase/types.ts`):**

```ts
export type DbGame = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: 'ARCADE' | 'PUZZLE' | 'SHOOTER' | 'VERSUS';
  cover: string;
  color: 'cyan' | 'magenta' | 'yellow' | 'green';
  created_at: string;
};

export type DbScore = {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  achieved_at: string; // ISO string as returned by Supabase
};
```

**Mapping to existing `ScoreRow`** — `app/hall/page.tsx` converts `DbScore[]`
to the existing `ScoreRow[]` shape (add rank, format date as `DD/MM/YYYY`)
so the render template is unchanged.

No changes to `lib/data.ts` — `GAMES`, `PLAYERS`, and `seededScores` stay as-is;
`seededScores` is only removed from the `/hall` import, not deleted.

## Implementation Plan

1. **Apply Supabase migration** — create the `games` and `scores` tables via a
   single migration SQL file. Seed the `games` table with the `asteroids` row.
   Verify both tables appear in the Supabase dashboard before proceeding.

2. **Create `lib/supabase/types.ts`** — add `DbGame` and `DbScore` as defined
   in the data model. No other file imports them yet; this is a pure addition.

3. **Wire score saving in `app/games/[id]/play/page.tsx`** — inside
   `handleSaveScore`, after the existing `localStorage` write, add a Supabase
   insert using the browser client from `lib/supabase/client.ts`:

   ```ts
   const sb = createClient();
   await sb.from('scores').insert({
     game_id: id, // resolved from awaited params
     player_name: name, // same name used for localStorage entry
     score: finalScore,
   });
   ```

   The localStorage write is kept unchanged (dual-write). Errors from the
   Supabase insert are caught and logged to console — they must not block
   the modal flow or the localStorage save.

4. **Update `app/hall/page.tsx`** — replace the `useMemo(() => seededScores(...))`
   call with a `useState<ScoreRow[]>` + `useEffect` that fires on `tab` change:
   - Set a `loading` boolean to `true` before fetching.
   - Query: `.from('scores').select('player_name, score, achieved_at').eq('game_id', tab).order('score', { ascending: false }).limit(12)`
   - Map the result to `ScoreRow[]` (assign `rank` by index, format
     `achieved_at` as `DD/MM/YYYY`).
   - Set `loading` to `false` after the query resolves.
   - While loading, render a placeholder row with "CARGANDO…" text in place
     of the podium and table. The rest of the page layout is unchanged.
   - If the query returns zero rows, render an empty-state message
     "AÚN NO HAY PUNTUACIONES" in place of the podium.
   - The logged-in user's personal best row (`youRank`, `youScore`) is
     removed — those values were fabricated; real per-user ranking is out of
     scope for this spec.

5. **TypeScript check** — run `tsc --noEmit` and fix any errors before
   marking the spec implemented.

## Acceptance Criteria

- [ ] `games` and `scores` tables exist in Supabase with the columns defined
      in the data model
- [ ] The `games` table contains exactly one row: `asteroids`
- [ ] Playing Asteroids to game-over and saving via the modal inserts a row
      into `scores` with the correct `game_id`, `player_name`, and `score`
- [ ] The existing localStorage write still works after the dual-write change
      (entry appears in `av_scores` as before)
- [ ] A Supabase insert error does not block the modal flow or the toast
      "PUNTUACIÓN GUARDADA"
- [ ] `/hall` tab for ASTEROIDS shows the real top-12 rows from Supabase,
      ordered by score descending, with correct rank numbers
- [ ] `/hall` shows "CARGANDO…" while the query is in flight
- [ ] `/hall` shows "AÚN NO HAY PUNTUACIONES" when the `scores` table has
      no rows for the selected game
- [ ] Switching tabs in `/hall` triggers a fresh Supabase query for that game
- [ ] The logged-in user's personal best row is no longer rendered in `/hall`
- [ ] `/games/[id]` detail page mini-leaderboard still uses `seededScores()`
      and is unaffected
- [ ] `tsc --noEmit` passes with no errors

## Decisions

- **Yes: dual-write (Supabase + localStorage) for score saving** — keeps the
  existing modal flow and toast intact; localStorage entries remain valid for
  the `/games/[id]` detail page mini-leaderboard which still reads from
  `seededScores()`. A hard cutover to Supabase-only would break that page
  without benefit.

- **Yes: browser client for `/hall` fetches** — the page is already
  `'use client'` and switches tabs interactively; a Server Component would
  require a full navigation on each tab change. The browser client keeps the
  tab-switch instant.

- **Yes: `player_name` text column, no `user_id`** — real Supabase Auth is a
  future spec; forcing a FK now would block score saving for guest players and
  require auth to be implemented first.

- **Yes: `lib/supabase/types.ts` inline types** — `supabase gen types` requires
  a stable, finalized schema and a dedicated tooling step; inline types are
  sufficient for two tables and avoid the tooling dependency.

- **Yes: keep `seededScores()` in `lib/data.ts`** — it is still used by the
  `/games/[id]` detail page mini-leaderboard. Deleting it now would break that
  page; removal is deferred to the spec that wires the detail page to real data.

- **No: removing the logged-in user's personal best row from `/hall`** — the
  `youRank` and `youScore` values were fabricated from the seeded data; no real
  per-user ranking query is in scope. The row is removed rather than replaced
  with a real query to avoid scope creep.

- **No: Row Level Security policies** — deferred; anonymous inserts are
  acceptable for now. RLS belongs in the Auth spec.

## Risks

| Risk                                                                                                              | Mitigation                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase insert in `handleSaveScore` is slow and delays the "PUNTUACIÓN GUARDADA" toast                           | Fire the Supabase insert without `await` (fire-and-forget); the localStorage write and toast run immediately regardless of insert outcome |
| `achieved_at` UTC timestamps shift the displayed date by one day for users in non-UTC timezones                   | Format `achieved_at` consistently using UTC (`toLocaleDateString('es-ES', { timeZone: 'UTC' })`) across all renders                       |
| No RLS — the anon key allows anyone to insert arbitrary scores into `scores`                                      | Accepted for this spec; RLS is deferred to the Auth spec                                                                                  |
| `/hall` client-side fetch exposes the Supabase anon key in the browser bundle                                     | `NEXT_PUBLIC_SUPABASE_ANON_KEY` is already public by design (`NEXT_PUBLIC_` prefix); the anon key is intentionally safe to expose         |
| Switching tabs rapidly fires multiple simultaneous queries; a slow earlier response overwrites a faster later one | Track the current `tab` value in a ref; on query resolution, discard the result if `tabRef.current !== queriedTab`                        |
