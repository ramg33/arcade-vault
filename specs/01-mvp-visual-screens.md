---
id: 01
title: Arcade Vault MVP — All Screens (Visual)
state: Implemented
date: 2026-06-21
objective:
  Port all five template screens (Library, Detail, Player, Auth, Hall of Fame)
  into the Next.js 16 App Router as visual-only pages with no real game logic.
---

## Scope

### In

- 5 pages mapped to URL routes:
  - `/` → Library (game grid, search, category filter)
  - `/games/[id]` → Game Detail (cover, stats, mini-leaderboard)
  - `/games/[id]/play` → Player (CRT fake animation, HUD, pause, game-over modal)
  - `/auth` → Auth (login/register tabs, fake submit, guest option)
  - `/hall` → Hall of Fame (podium, full leaderboard table, per-game tabs)
- Persistent nav with logo, links, credit counter (hardcoded 03), auth button
- Mobile nav (hamburger + slide-out panel)
- Background layers: perspective grid, scanlines, noise (already in globals.css)
- Shared mock data in `lib/data.ts` (8 games, 18 player names, seededScores helper)
- Fake auth: form submit stores `{ name }` in localStorage, clears on sign-out
- Fake score save: game-over modal saves entry to localStorage (no persistence across sessions required beyond that)
- All CSS already in `globals.css` — no new styles needed

### Not in

- Real game logic of any kind
- Backend, database, or API routes
- Real authentication (NextAuth, OAuth, sessions)
- Credits mechanic (counter stays hardcoded at 03)
- Animations beyond what the template already defines
- Tests
- Any screen not present in the template files

## Data Model

Single file: `lib/data.ts`

### Game

```ts
type Game = {
  id: string; // slug used in URL: /games/[id]
  title: string;
  short: string; // one-line description for card
  long: string; // paragraph for detail page
  cat: "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
  cover: string; // CSS class name: e.g. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number; // global best score (mock)
  plays: string; // display string: e.g. "12.4K"
};
```

### ScoreRow (returned by seededScores)

```ts
type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
};
```

### User (localStorage key: `av_user`)

```ts
type User = { name: string } | null;
```

### Score entry (localStorage key: `av_scores`, array)

```ts
type ScoreEntry = {
  game: string; // game id
  score: number;
  name: string;
  at: number; // Date.now()
};
```

### Constants

- `GAMES: Game[]` — 8 entries ported from data.jsx
- `CATS: string[]` — ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
- `PLAYERS: string[]` — 18 player name strings
- `seededScores(seed: number, count?: number): ScoreRow[]` — deterministic mock

## Implementation Plan

Each step leaves the app in a working, renderable state.

1. **Create `lib/data.ts`** — port GAMES, CATS, PLAYERS, and seededScores from
   data.jsx into typed TypeScript exports.

2. **Create `lib/auth.ts`** — two thin helpers:
   `getUser(): User` and `saveUser(u: User): void` that read/write `av_user`
   in localStorage. Used only on the client.

3. **Update `app/layout.tsx`** — add the background layers (`av-bg`, `av-noise`
   divs), wrap children in a flex column, add the footer. Import a client
   `<Nav>` component (step 4).

4. **Create `components/Nav.tsx`** (`'use client'`) — port nav.jsx:
   logo, desktop links, credit counter, auth button, hamburger,
   mobile panel + backdrop. Reads user from localStorage on mount.
   Accepts no props; drives navigation via `useRouter` / `<Link>`.

5. **Replace `app/page.tsx`** — port biblioteca.jsx as a Client Component:
   search input, category chips, game grid with `GameCard` sub-component
   (tilt effect, cover art, score badge, JUGAR button).
   Navigates to `/games/[id]` on card or button click.

6. **Create `app/games/[id]/page.tsx`** — port detalle.jsx as a Client Component:
   cover art, tags, title, description, stat strip, detail actions
   (JUGAR → `/games/[id]/play`, VOLVER → `/`), mini-leaderboard aside.

7. **Create `app/games/[id]/play/page.tsx`** (`'use client'`) — port
   reproductor.jsx: HUD (player name, score, lives, level), CRT frame with
   fake game arena animation, pause overlay, game-over modal with score save
   to localStorage. No real game engine — score auto-increments via interval.

8. **Create `app/auth/page.tsx`** (`'use client'`) — port auth.jsx:
   login/register tabs, username + password fields (+ email for register),
   fake submit calls `saveUser` then navigates to `/`, guest button clears
   user, social buttons (Google, GitHub) are visual-only with no action.

9. **Create `app/hall/page.tsx`** (`'use client'`) — port salon.jsx:
   heading, per-game tab chips, podium (gold/silver/bronze slots),
   full leaderboard table with animated rows, logged-in user's personal
   best row (yellow highlight), VOLVER button.

10. **Smoke-test all routes** — verify each page renders without errors,
    nav links work, mobile panel opens/closes, fake login persists across
    page navigations, game-over modal saves to localStorage.

## Acceptance Criteria

- [ ] `/` renders the game grid with all 8 games; search by title filters cards
      in real time; category chips filter by ARCADE / PUZZLE / SHOOTER / VERSUS /
      TODOS; empty state message appears when no results match
- [ ] `/games/[id]` renders for every game id; shows correct cover art, title,
      description, stats, and 10 seeded leaderboard rows; JUGAR navigates to
      `/games/[id]/play`; VOLVER navigates to `/`
- [ ] `/games/[id]/play` shows HUD with player name, score (auto-incrementing),
      lives (3), and level; PAUSA button freezes score and shows pause overlay;
      REANUDAR resumes; FIN button triggers game-over modal; game-over modal
      allows entering initials and saving score to localStorage; JUGAR DE NUEVO
      resets HUD; VOLVER AL VAULT navigates to `/`
- [ ] `/auth` renders login tab by default; switching to CREAR CUENTA shows the
      email field; form submit stores `{ name }` to localStorage and redirects to
      `/`; JUGAR COMO INVITADO clears user and redirects to `/`; Google and
      GitHub buttons are present but perform no action
- [ ] `/hall` renders with first game selected by default; switching tabs changes
      podium and leaderboard data; logged-in user's row appears in yellow at the
      bottom of the table; VOLVER A LA BIBLIOTECA navigates to `/`
- [ ] Nav shows correct active state for the current route; auth button shows
      user name when logged in and triggers sign-out on click; hamburger opens
      mobile panel on narrow viewports; mobile panel links navigate correctly
- [ ] Background layers (perspective grid, scanlines, noise) are visible on all
      pages; all CSS cover art classes render correctly; neon glow effects and
      pixel font are applied throughout
- [ ] No TypeScript errors (`tsc --noEmit` passes)

## Decisions Taken and Discarded

- **URL routing over hash-based SPA router** — chose Next.js file-based routes
  (`/`, `/games/[id]`, `/games/[id]/play`, `/auth`, `/hall`) over replicating
  the template's `location.hash` router. Reason: native to App Router, supports
  direct linking, no custom router to maintain.

- **Fake player screen included** — the CRT animation, auto-incrementing score,
  pause/resume, and game-over modal are ported as-is from reproductor.jsx.
  Discarded: showing a "PRÓXIMAMENTE" placeholder or skipping the route
  entirely. Reason: the template already provides the full visual; excluding it
  would make the MVP incomplete.

- **Fake auth with localStorage** — no NextAuth or any auth library. Discarded:
  real authentication. Reason: out of scope for a visual MVP; adding a real
  auth layer would introduce backend dependencies and session handling.

- **Constants file (`lib/data.ts`) over API routes** — all game data lives in
  a typed TypeScript module. Discarded: Next.js API routes serving the same
  data. Reason: no network overhead, simpler to maintain for a mock dataset.

- **Credits counter hardcoded at 03** — purely decorative. Discarded: a
  decrement mechanic on JUGAR clicks. Reason: no gameplay is in scope.

- **No new CSS** — all styles are already in `globals.css` (ported from
  styles.css in a previous PR). Discarded: component-scoped CSS modules or
  Tailwind utility classes for the arcade UI. Reason: the full stylesheet is
  already present and verified.

## Identified Risks

- **Next.js 16 async `params`** — `[id]` pages receive `params` as a
  `Promise<{ id: string }>` and must `await` it before use. Forgetting this
  is a silent runtime error, not a build error. All dynamic pages must follow
  the async page pattern from CLAUDE.md.

- **localStorage on the server** — any component that reads `av_user` or
  `av_scores` must be a Client Component (`'use client'`) and must access
  localStorage inside `useEffect` or a client-only guard. Accessing it at
  module level or in a Server Component will throw during SSR.

- **Tailwind preflight vs. existing CSS** — `globals.css` imports Tailwind v4
  via `@import "tailwindcss"`, which includes a preflight reset. Generic class
  names already in globals.css (`.btn`, `.card`, `.chip`, `.field`) must be
  verified to not get clobbered by preflight or Tailwind utility conflicts.
  This was handled in the previous styles PR but should be confirmed during
  smoke-testing.
