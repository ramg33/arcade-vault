# 09 — Bloque Buster Game Integration

> **Status:** Approved · **Depends on:** SPEC 05, SPEC 06, SPEC 07 · **Date:** 2026-07-14
> **Objective:** Port the vanilla JS Arkanoid game from `references/started-games/04-arkanoid/`
> into Arcade Vault as the `bloque-buster` game — reusing its existing GAMES[] placeholder,
> registering it in Supabase, and wiring a fully playable page with spritesheet/sound assets,
> React component, and leaderboard support.

## Scope

**In:**

- Supabase `games` table row for `id = 'bloque-buster'` (reusing the existing `lib/data.ts`
  placeholder's `title`/`short`/`long`/`cat`/`cover`/`color` values verbatim)
- `GAMES[]` entry in `lib/data.ts` updated with `best: 0, plays: '0'` (matching how `asteroids`
  and `tetris` were registered — the seeded placeholder stats are replaced once the game is real)
- `.cover-bricks` CSS class — already exists in `app/globals.css`, no changes needed
- `bloque-buster-touch-controls` CSS rule in `app/globals.css`
- Spritesheet image and two sound effects copied from the reference into
  `public/games/bloque-buster/` (`spritesheet-breakout.png`, `sounds/ball-bounce.mp3`,
  `sounds/break-sound.mp3`)
- `components/games/BloqueBusterGame.tsx` — React component porting the vanilla JS logic,
  loading the spritesheet/audio assets client-side inside `useEffect`
- `app/games/bloque-buster/play/page.tsx` — play-page wiring (import, flags, JSX branch)

**Out of scope:**

- Mouse-move paddle control — keyboard (`ArrowLeft`/`ArrowRight`) + touch buttons only
- Click-to-jump-to-level buttons on the pause overlay — pause uses the shared
  "EN PAUSA" / "PULSA REANUDAR" overlay like every other game
- `KeyP`/`Escape` pause handling inside the component — pause is controlled by the parent
  page's PAUSA button only
- A "win" ending after level 5 — on clearing level 5 the game loops back to level 1 with
  ball speed reset to the level-1 base, keeping score, so the session stays infinite like
  Asteroids/Tetris instead of ending
- Restart button inside the component — parent handles restart via `key` prop bump

## Data model

No new types are introduced. The existing types in `lib/supabase/types.ts` and `lib/data.ts`
cover everything needed.

**Supabase `games` row** (values taken from the existing `bloque-buster` placeholder in
`lib/data.ts`):

| Field   | Value                                                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | `bloque-buster`                                                                                                                                                                           |
| `title` | `BLOQUE BUSTER`                                                                                                                                                                           |
| `short` | `Rebota la pelota y destruye muros de neón.`                                                                                                                                              |
| `long`  | `Pilota una nave-paleta y rebota un núcleo de plasma para pulverizar muros de bloques cromáticos. Cada nivel reorganiza la grilla en patrones imposibles. ¿Hasta dónde llegará tu racha?` |
| `cat`   | `ARCADE`                                                                                                                                                                                  |
| `cover` | `cover-bricks`                                                                                                                                                                            |
| `color` | `cyan`                                                                                                                                                                                    |

**`lib/data.ts` `Game` entry** — unchanged from the current placeholder, `best`/`plays` stay
seeded values (`28450`/`'12.4K'`) exactly as they are today; no edits needed to this file.

## Implementation plan

1. **Supabase `games` row** — `INSERT` the Bloque Buster row via `mcp__supabase__execute_sql`
   using the values from the Data model section; verify with
   `SELECT * FROM games WHERE id = 'bloque-buster'` before continuing.

2. **`lib/data.ts` entry** — no changes needed; the `bloque-buster` entry already exists
   with the correct shape.

3. **CSS** — `.cover-bricks` already exists, no changes; add `bloque-buster-touch-controls`
   display/media rules after the last touch-controls block in `app/globals.css`.

4. **Assets** — copy `assets/spritesheet-breakout.png`, `assets/sounds/ball-bounce.mp3`,
   and `assets/sounds/break-sound.mp3` from the reference into `public/games/bloque-buster/`
   (image at the root of that folder, sounds under `sounds/`).

5. **`components/games/BloqueBusterGame.tsx`** — create the React component:
   - Canvas 800×600, matching the reference and AsteroidsGame
   - Load the spritesheet (`new Image()` → offscreen canvas, same technique as the
     reference's `spritesheet.js`) and the two `Audio()` objects inside `useEffect`;
     `initGame()` and the RAF loop only start once the image `onload` fires
   - Paddle, ball, blocks, and explosion-frame rendering ported verbatim using
     `ctx.drawImage()` against the loaded spritesheet, with TypeScript types added to
     every entity property
   - 5 level patterns and speed curve ported verbatim from `levels.js`; on clearing
     level 5, loop back to level 1 (speed multiplier resets to 1.0), score keeps accumulating
   - Ball-bounce and block-break sounds played via `.cloneNode().play()` exactly as the
     reference does, guarded so playback errors (e.g. autoplay policy) don't throw
   - All DOM-free — the reference already draws its HUD directly on canvas with
     `ctx.fillText`, but score/level/lives are additionally surfaced via
     `cbRef.current.onScoreChange` / `onLevelChange` / `onLivesChange` for the React HUD bar
   - `cbRef.current.onGameOver(score)` called on the `gameover` transition (ball lost with
     0 lives remaining)
   - `cbRef` / `pausedRef` inline-sync pattern (mandatory; no extra `useEffect`)
   - Pause overlay drawn by `drawOverlay('EN PAUSA', 'PULSA REANUDAR PARA CONTINUAR')` when
     `pausedRef.current` is `true` — no level-select buttons
   - Touch buttons: `◁ ArrowLeft`, `▷ ArrowRight`

6. **`app/games/bloque-buster/play/page.tsx`** — four targeted edits in order:
   - **a)** Import `BloqueBusterGame` after the `AsteroidsGame`/`TetrisGame` imports
   - **b)** Add `isBloqueBuster`, `bloqueBusterKey`, `bloqueBusterLevel` flags/state; update
     the `level` computed value to cover the Bloque Buster branch
   - **c)** Add `|| isBloqueBuster` to the score-ticker guard; add key bump + level reset to
     `restart()`
   - **d)** Insert the JSX branch rendering the `player-hud` bar and `<BloqueBusterGame>`
     component

## Acceptance criteria

### Supabase & data

- [ ] Row in Supabase `games` table: `id=bloque-buster`, correct `title`/`short`/`long`/`cat`/`cover`/`color`
- [ ] `GAMES[]` in `lib/data.ts` still contains the `bloque-buster` entry unchanged

### Visual

- [ ] `.cover-bricks` renders correctly in the `/games` grid (already exists, verify no regression)
- [ ] Bloque Buster game card appears in `/games` with cyan accent color

### Assets

- [ ] `public/games/bloque-buster/spritesheet-breakout.png` and the two `.mp3` files load
      without 404s in the browser network tab

### Component

- [ ] `components/games/BloqueBusterGame.tsx` exists
- [ ] `tsc --noEmit` passes with no errors

### Play page — gameplay

- [ ] `/games/bloque-buster/play` renders the 800×600 canvas with no console errors
- [ ] Paddle moves with ArrowLeft/ArrowRight; touch buttons work on mobile viewport
- [ ] Ball bounces off walls/paddle/blocks; block-break awards +10 pts and plays the break sound
- [ ] Score, level, and lives update correctly in the React HUD bar during play
- [ ] Clearing all 5 levels loops back to level 1 with ball speed reset, without ending the game
- [ ] Losing all 3 lives triggers `onGameOver` and opens the game-over modal automatically
- [ ] PAUSA button pauses the game loop; canvas shows "EN PAUSA"; REANUDAR resumes
- [ ] FIN button opens the game-over modal with the last score pre-filled

### Play page — score saving

- [ ] GUARDAR PUNTUACIÓN writes to `localStorage` (key `av_scores`)
- [ ] GUARDAR PUNTUACIÓN writes to Supabase `scores` table
- [ ] A Supabase insert failure does not block the modal or "PUNTUACIÓN GUARDADA" toast

### Detail & hall pages

- [ ] `/games/bloque-buster` detail page shows PARTIDAS and MEJOR GLOBAL from real Supabase data
- [ ] `/games/bloque-buster` mini-leaderboard shows real top-10 scores
- [ ] `/hall` includes a tab for `bloque-buster` showing real top-12 scores

### Mobile

- [ ] Touch controls (◁ ▷) appear only on `pointer: coarse` devices

### Regression

- [ ] All other games are unaffected — their play pages still render correctly

## Decisions

- **Reused the `bloque-buster` placeholder instead of a new id** — its `title`/`short`/`long`/
  `cat`/`color`/`cover` in `lib/data.ts` already describe this exact paddle-and-ball gameplay,
  and `.cover-bricks` is already styled as a brick wall. Reusing it avoids a duplicate/orphaned
  placeholder card in `/games`.

- **Ported the spritesheet + sounds instead of vector redraw** — unlike AsteroidsGame and
  TetrisGame, this port keeps the reference's PNG-based rendering and the two MP3 effects,
  copied into `public/games/bloque-buster/`. This is a deliberate deviation from the
  no-external-assets convention used by the other two games, per explicit user choice.

- **Mouse-move paddle control and pause-screen level-select buttons dropped** — every other
  ported game is keyboard+touch-button only, and pause is a single shared "EN PAUSA" overlay
  controlled by the parent page. Keeping mouse input and a custom pause UI would diverge from
  the established `cbRef`/`pausedRef` contract and complicate touch-control wiring.

- **Loop back to level 1 after level 5 instead of a "win" ending** — no other ported game has
  a finite win condition; all are infinite until lives run out. Looping keeps `bloque-buster`
  consistent with that pattern while preserving the reference's 5 distinct block layouts and
  speed curve.

- **`handleSaveScore` unchanged** — it already reads `id` from URL params for both
  localStorage and Supabase; no edits needed for any new game.

- **`cbRef` + inline ref sync, empty deps array** — mandatory pattern from SPEC 07; avoids
  restarting the RAF loop on every prop change and eliminates stale-closure bugs.

## Risks

| Risk                                                                                                            | Mitigation                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Spritesheet image loads asynchronously, but `useEffect` starts `initGame()`/RAF synchronously                   | Gate `initGame()` and `requestAnimationFrame(loop)` behind the image's `onload` callback, same as the reference's `loadSpritesheet(cb)` |
| `Audio().play()` can throw/reject under browser autoplay restrictions or rapid `cloneNode()` calls              | Wrap playback calls so a rejected promise is swallowed and never crashes the game loop                                                  |
| Ported JS has no types — all variables are implicit `any`                                                       | Add explicit types to `paddle`, `ball`, `block`, `explosion` object shapes; internal `let` locals may use inference                     |
| Canvas `drawImage` calls reference sprite coordinates hardcoded to the specific PNG layout                      | Port `SPRITES`/`EXPLOSION_FRAMES` constants verbatim from `assets/spritesheet.js` inside the component, unchanged                       |
| Asset paths differ between the reference (`assets/...`) and Next.js (`/games/bloque-buster/...` from `public/`) | Rewrite all asset `src`/URL strings to the new `public/` path when porting                                                              |
| Stale `paused` prop inside RAF loop                                                                             | Mandatory `pausedRef.current = props.paused` inline sync at render eliminates this                                                      |
