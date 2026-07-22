# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online gaming platform for competing on scoreboards. Built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS v4**, with **Supabase** for game/score persistence and **Resend** for contact email.

UI copy is in **Spanish** — game titles, descriptions, and button labels all follow suit.

## Commands

| Command            | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Dev server (Turbopack)                             |
| `npm run build`    | Production build                                   |
| `npm run lint`     | ESLint via flat config (`eslint`, not `next lint`) |
| `npm run format`   | Prettier over the repo                             |
| `npx tsc --noEmit` | Type check — run before declaring work done        |

Prettier settings live in `.prettierrc`: single quotes, semicolons, 2-space tabs, `es5` trailing commas, 100-char width.

## Key Next.js 16 Breaking Changes

Before writing any code, consult `node_modules/next/dist/docs/` for accurate API details. This version has significant differences from v13/v14/v15:

**Async Request APIs (fully breaking)** — synchronous access is removed. `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are all async:

```ts
// Page props
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
// Run `npx next typegen` to generate PageProps / LayoutProps helpers
```

**`middleware` → `proxy`** — the `middleware.ts` filename and `middleware` export are deprecated; use `proxy.ts` with a `proxy` named export instead. Config flags like `skipMiddlewareUrlNormalize` are now `skipProxyUrlNormalize`.

**Turbopack by default** — custom `webpack` config in `next.config.ts` will break the build. Migrate to Turbopack config or pass `--webpack` to opt out.

**`revalidateTag` requires a second arg** — a `cacheLife` profile. Single-argument form is a TypeScript error.

**`cacheLife` / `cacheTag`** — stable; drop the `unstable_` prefix.

**`next/image` changes** — `images.domains` is deprecated (use `remotePatterns`); local images with query strings need `images.localPatterns.search`; `next/legacy/image` is deprecated.

**ESLint** — uses flat config (`eslint.config.mjs`), not `.eslintrc`. Run via `eslint` CLI, not `next lint`.

**Parallel Routes `default.js`** — now required when using parallel routes.

## Skills

Project skills live in `.agents/skills/` (not `~/.claude/`). `skills-lock.json` pins the ones vendored from `Klerith/fernando-skills`.

- **`/spec`** — write a feature spec before implementing. Read `.agents/skills/spec/SKILL.md` in full rather than guessing the format.
- **`/spec-impl`** — implement an approved spec.
- **`/add-game`** — port a vanilla JS canvas game into the platform. Five mandatory phases (discover → metadata → spec → implement → verify) covering the React component, play-page wiring, Supabase row, CSS cover art, and leaderboard. Use it for every new game; it encodes rules that are easy to get wrong (entity classes inside `useEffect`, the `cbRef`/`pausedRef` pattern, never touching `handleSaveScore`).
- **`/frontend-design`** — always use when designing user-facing UI.

## Architecture

Uses the **App Router** exclusively (`app/` directory). No Pages Router.

### Routes

| Route                          | Kind          | Purpose                                                 |
| ------------------------------ | ------------- | ------------------------------------------------------- |
| `app/page.tsx`                 | Server        | Home / landing                                          |
| `app/games/page.tsx`           | Server        | Game grid, cards driven by `GAMES[]` and `.cover-*` CSS |
| `app/games/[id]/page.tsx`      | Server        | Detail page — plays, global best, top-10 from Supabase  |
| `app/games/[id]/play/page.tsx` | Client        | Canvas host, HUD, pause, game-over modal, score save    |
| `app/hall/page.tsx`            | Server        | Hall of fame — one tab per game, top-12 from Supabase   |
| `app/auth/page.tsx`            | Client        | Name-only sign-in                                       |
| `app/about/page.tsx`           | Client        | About + contact form                                    |
| `app/actions/contact.ts`       | Server Action | Sends the contact form via Resend                       |

`app/layout.tsx` is the root layout (Geist fonts, full-height flex body). `app/globals.css` holds every style — Tailwind v4 plus the hand-written arcade theme.

**Path alias**: `@/` maps to the project root.

**CSS**: Tailwind v4 syntax — use `@import "tailwindcss"` and `@theme` blocks, not `tailwind.config.js` or `@tailwind base/components/utilities`.

**Components**: Server Components by default. Add `'use client'` only when state, event handlers, lifecycle hooks, or browser APIs are needed.

### Data layer

- `lib/data.ts` — `GAMES[]` catalog plus the shared `Game`, `ScoreRow`, `User`, and `ScoreEntry` types. Every game needs an entry here alongside its Supabase row.
- `lib/auth.ts` — name-only "auth" over `localStorage` (`av_user`). No passwords, no sessions.
- `lib/supabase/client.ts` — browser client (`createBrowserClient`).
- `lib/supabase/server.ts` — async server client; awaits `cookies()` and swallows `setAll` failures because Server Components cannot set cookies.
- `lib/supabase/types.ts` — `DbGame` and `DbScore` row types.

Both Supabase clients throw at import time if their env vars are missing. Env vars are listed in `.env.template`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`.

**Supabase tables**: `games` (the registry mirrored by `GAMES[]`) and `scores` (`game_id`, `player_name`, `score`, `achieved_at`). The project's Supabase MCP server is configured in `.mcp.json` — use it for SQL rather than hand-rolling a client.

**Scores are written twice**: to `localStorage` under `av_scores` and to the Supabase `scores` table. A Supabase insert failure must not block the modal or the saved-score toast.

### Games

Each game is a client component in `components/games/` ( like`AsteroidsGame`, `TetrisGame`, `BloqueBusterGame`, `SerpentinaGame`) (see references/implemented-games.md when you need to check which games are implemented and how to implement them), ported from a vanilla JS canvas reference in `references/`. `AsteroidsGame.tsx` is the canonical example — read it before writing another.

The shared contract: props are `paused` plus `onScoreChange` / `onLivesChange` / `onLevelChange` / `onGameOver`. Callbacks are synced through a `cbRef` and `paused` through a `pausedRef`, both assigned inline at render, so the RAF loop never restarts and never reads a stale closure. Entity classes live inside `useEffect` to capture `ctx`, `W`, and `H`. The React HUD in the play page owns score/level/lives display — ported games must not write to the DOM.

Per-game CSS in `app/globals.css`: a `.cover-[id]` class for the card art and a `.[id]-touch-controls` block shown only on `pointer: coarse` devices.

## Spec-Driven Development

Design features with a spec before implementing — this is the project's default workflow, not an optional step. Specs live in `specs/`, numbered sequentially (`01-mvp-visual-screens.md` through `10-serpentina-game.md`), each carrying a status that moves from `Draft` to `Implemented` only once the work type-checks and its checklist passes.

Foundational specs worth reading before related work: `04` (Supabase integration), `06` (leaderboard and game registry), and `07` (the `/add-game` contract).
