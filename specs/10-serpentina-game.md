# SPEC 10 — Serpentina (Snake) Game

> Status: Approved · Depends on: SPEC 05, SPEC 06, SPEC 07 · Date: 2026-07-14
> Objective: Implement a classic grid-based Snake game as "Serpentina" — filling the
> existing roster placeholder — with sprite-rendered fruit as food, wired to Supabase
> and the shared leaderboard following the /add-game pattern.

## Scope

**In:**

- Supabase `games` row for `id=serpentina` (title SERPENTINA, cat ARCADE, color green,
  cover cover-snake, using the short/long copy already in `lib/data.ts`)
- `components/games/SerpentinaGame.tsx` — grid-based snake: arrow-key input, tick-based
  movement (not per-frame), growing tail, wall/self collision → game over, speed ramps
  up with level, food rendered from a fruit sprite atlas
- `public/games/serpentina/fruits.png` — copied from
  `references/source-assets/snake-assets/fruits.png`; sprite coordinates for the
  pixel-art fruit row hardcoded into the component (from the reference `sprites.js`)
- `.serpentina-touch-controls` CSS + 4 directional touch buttons (↑ ↓ ← →)
- Wiring `app/games/[id]/play/page.tsx`: `isSerpentina` flag, level state, score-ticker
  guard, `restart()`, JSX branch

**Out:**

- Changing the `serpentina` id/title/short/long/color/cat/cover metadata already defined
  in `lib/data.ts` — reused as-is
- New `.cover-serpentina` CSS — the existing `.cover-snake` class is reused
- Edge-wraparound variant, obstacles, multiplayer, or a difficulty-select menu
- Sound effects — the reference assets provided contain no audio
- New `DbGame`/`Game`/`DbScore` TypeScript types — the existing ones from SPEC 06 cover
  this game as-is

## Data model

No new types. This game reuses existing structures:

- `DbGame` (lib/supabase/types.ts) — the Supabase row: `{ id: 'serpentina', title: 'SERPENTINA',
short: <existing>, long: <existing>, cat: 'ARCADE', cover: 'cover-snake', color: 'green' }`
- `Game` (lib/data.ts) — the `serpentina` entry already present in `GAMES[]`; no edit needed,
  since id/title/short/long/cat/cover/color/best/plays are already correct
- `DbScore` — score rows are written by the existing game-agnostic `handleSaveScore`,
  unchanged

Component-internal types (not persisted, live only in `SerpentinaGame.tsx`):

- `Segment = { x: number; y: number }` — one grid cell of the snake body
- `Fruit = { x: number; y: number; kind: string }` — current food cell + which sprite to draw
- `SpriteFrame = { sx: number; sy: number; sw: number; sh: number }` — atlas cutout, same
  shape as `BloqueBusterGame.tsx`'s `SpriteFrame`

## Implementation plan

1. **Supabase row** — `INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES ('serpentina', 'SERPENTINA', <existing short>, <existing long>, 'ARCADE',
'cover-snake', 'green')` via `mcp__supabase__execute_sql`; verify with a `SELECT`
   before continuing.

2. **`lib/data.ts`** — no edit. Confirm the existing `serpentina` entry already matches
   (id/title/short/long/cat/cover/color) and leave `best`/`plays` as-is.

3. **Assets & CSS** —
   a. Copy `references/source-assets/snake-assets/fruits.png` to
   `public/games/serpentina/fruits.png`.
   b. Confirm `.cover-snake` already renders correctly in the `/games` grid (no new CSS).
   c. Add `.serpentina-touch-controls` (flex row, hidden on `pointer: fine`) to
   `app/globals.css`, same pattern as the other games' touch-control rules.

4. **`components/games/SerpentinaGame.tsx`** — new `'use client'` component following the
   mandatory `cbRef`/`pausedRef` structure:
   - 800×800 canvas, 32px tiles, 25×25 grid
   - Hardcoded `FRUIT_SPRITES` atlas map (22 entries) ported from the reference
     `sprites.js`, image loaded async via `new Image()` → offscreen canvas, same pattern
     as `BloqueBusterGame.tsx`
   - Snake starts length 3, center of grid, moving right
   - Movement driven by an accumulator (`moveTimer += dt`); step the snake one cell each
     time it crosses the current move interval — not once per animation frame
   - Arrow-key input buffers the next direction and rejects 180° reversals
   - Eating a fruit: snake grows by one segment, `score += 10 * level`, a new fruit spawns
     on a random empty cell with a random sprite kind, `onScoreChange` fires
   - Every 5 fruits eaten: `level++`, move interval shortens (min-clamped), `onLevelChange`
     fires
   - Wall or self collision → `state = 'gameover'`, `onGameOver(score)` fires once
   - `onLivesChange(1)` fires once at init (Snake has no lives concept — mirrors
     `TetrisGame.tsx`'s pattern of a constant single "life")
   - Canvas HUD: score (top-left), level (top-center); `drawOverlay('GAME OVER', ...)` and
     the mandatory `EN PAUSA` overlay when `pausedRef.current` is true
   - Touch controls: 4 buttons mapped to `ArrowUp/Down/Left/Right`

5. **Wire `app/games/[id]/play/page.tsx`** — the four targeted edits from the skill:
   import, `isSerpentina` flag + `serpentinaKey`/`serpentinaLevel` state (folded into the
   `level` computed value), score-ticker guard, `restart()` reset, and the JSX branch
   between the `BloqueBuster` block and the generic `<>` fallback.

## Acceptance criteria

- [ ] Row in Supabase `games` table: `id=serpentina`, title/short/long/cat/cover/color correct
- [ ] `GAMES[]` in `lib/data.ts` still has the `serpentina` entry unchanged
- [ ] `public/games/serpentina/fruits.png` exists and loads in the browser
- [ ] `.serpentina-touch-controls` CSS exists; buttons hidden on `pointer: fine`, shown on `pointer: coarse`
- [ ] `components/games/SerpentinaGame.tsx` exists and `tsc --noEmit` passes
- [ ] `/games/serpentina/play` renders an 800×800 canvas with no console errors
- [ ] Arrow keys move the snake; 180° reversal into the snake's own neck is rejected
- [ ] Eating a fruit grows the snake, updates score, and spawns a new fruit elsewhere
- [ ] Every 5 fruits, level increases and the snake visibly speeds up
- [ ] Hitting a wall or the snake's own body ends the game and opens the game-over modal
- [ ] Canvas HUD (score, level) updates during play; React HUD bar mirrors it
- [ ] PAUSA button pauses the loop; canvas shows "EN PAUSA"; REANUDAR resumes
- [ ] FIN button opens the game-over modal with the last score pre-filled
- [ ] GUARDAR PUNTUACIÓN writes to `localStorage` (`av_scores`) AND Supabase `scores`
- [ ] A Supabase insert failure does not block the modal or the "PUNTUACIÓN GUARDADA" toast
- [ ] `/games/serpentina` detail page shows PARTIDAS and MEJOR GLOBAL from real Supabase data
- [ ] `/hall` includes a `serpentina` tab showing real top-12 scores
- [ ] All other games' play pages still render correctly (no regressions)

## Decisions

- **Yes: reuse the existing `serpentina` placeholder instead of a new id/metadata** —
  it's already the intended Snake slot in the roster (title, copy, color, and cover CSS
  all exist and fit); creating a parallel `snake` entry would duplicate the concept.
  Confirmed with the user before drafting this spec.

- **Yes: tick-based movement via an accumulator, not per-frame stepping** — classic Snake
  feel requires discrete grid steps at a controlled cadence; stepping every RAF frame
  would move the snake at 60 cells/sec, unplayable. The RAF loop still runs every frame
  for input/pause/draw, but `update(dt)` only advances the snake when `moveTimer` crosses
  the current interval.

- **Yes: solid walls, no edge-wrap** — matches the existing copy ("un movimiento en falso
  y se devora a sí misma") which frames self-collision as the main hazard; walls add a
  second clear failure mode without changing the tone. Wraparound is explicitly out of
  scope (noted in Scope).

- **Yes: single constant life (`onLivesChange(1)` once, `0` on game over)** — Snake has no
  native lives concept; mirrors the exact pattern already used in `TetrisGame.tsx` rather
  than inventing a new convention.

- **Yes: sprite atlas coordinates hardcoded from the reference `sprites.js`, not loaded as
  a script** — `sprites.js` assigns to `window.SPRITE_ATLAS`, a browser-global pattern
  from the original static-HTML game; porting it as a plain TS `const` inside the
  component keeps it self-contained and matches how `BloqueBusterGame.tsx` inlines its
  `SPRITES`/`BLOCK_SPRITES` maps.

- **Yes: random fruit sprite kind per spawn** — purely cosmetic variety using the 22
  available fruit cutouts; no gameplay effect (all fruits worth the same score) to keep
  scope minimal.

- **No: sound effects** — the provided reference assets (`fruits.png`, `sprites.js`)
  contain no audio, unlike Bloque Buster's reference. Out of scope per the Scope section.

- **No: `handleSaveScore` changes** — already game-agnostic, reads `id` from route params.

## Risks

| Risk                                                                                      | Mitigation                                                                                                                                         |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fruit sprite image loads asynchronously; game could start drawing before it's ready       | Follow `BloqueBusterGame.tsx`'s pattern exactly: `initGame()` and the first `requestAnimationFrame` only fire inside `rawImg.onload`               |
| Fast double key-press could queue a 180° reversal before the next tick processes it       | Buffer only the _last_ valid (non-reversing) direction per tick; validate against the current heading, not the previous buffered one               |
| Off-by-one in grid math (32px tiles × 25 cells) could misalign the snake/fruit with walls | Derive `COLS`/`ROWS` from `W`/`H`/`TILE` as constants (`W / TILE`), never hardcode 25 separately, so canvas size and grid always agree             |
| Fruit could spawn on top of the snake's own body                                          | Rejection-sample random empty cells: pick a random `(x, y)`, retry if it's occupied by any snake segment                                           |
| Ported sprite atlas coordinates could be mistyped (22 manual entries)                     | Copy `sprites.js`'s `fruits` object values verbatim into the TS map — no recalculation — then eyeball one rendered fruit against the reference PNG |
