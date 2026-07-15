# SPEC 08 — Tetris Game Integration

> **Status:** Approved · **Depends on:** SPEC 05, SPEC 06, SPEC 07 · **Date:** 2026-07-14
> **Objective:** Port the vanilla JS Tetris game from `references/started-games/03-tetris/`
> into Arcade Vault as a fully playable game with Supabase registration, cover art, React
> component, play-page wiring, and leaderboard support.

## Scope

**In:**

- Supabase `games` table row for `id = 'tetris'`
- `GAMES[]` entry in `lib/data.ts`
- `.cover-tetris` CSS class in `app/globals.css` (pure CSS cover art, cyan accent)
- `tetris-touch-controls` CSS rule in `app/globals.css`
- `components/games/TetrisGame.tsx` — React component porting the vanilla JS logic
- `app/games/tetris/play/page.tsx` — play-page wiring (import, flags, JSX branch)

**Out of scope:**

- Next-piece preview on a separate DOM canvas — preview is drawn inside the main canvas
- Theme toggle (dark/light) from the reference — removed; Arcade Vault uses dark mode only
- DOM-based HUD (`updateHUD()` writing to `#score`, `#lines`, `#level`) — removed entirely;
  score/level exposed via `onScoreChange`/`onLevelChange` callbacks to the React HUD bar
- Lives mechanic — Tetris has none; `onLivesChange` is called once at init with `1`
- `KeyP` pause handler inside the component — pause is controlled by the parent page
- Restart button inside the component — parent handles restart via `key` prop bump

## Data model

No new types are introduced. The existing types in `lib/supabase/types.ts` and `lib/data.ts`
cover everything needed.

**Supabase `games` row:**

| Field   | Value                                                                                                                                                                   |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`    | `tetris`                                                                                                                                                                |
| `title` | `TETRIS`                                                                                                                                                                |
| `short` | `Rota y encaja piezas para limpiar líneas.`                                                                                                                             |
| `long`  | `Las piezas caen sin parar y el tablero no perdona. Rota y coloca cada bloque en el lugar exacto para limpiar líneas y ganar puntos. ¿Hasta qué nivel puedes aguantar?` |
| `cat`   | `PUZZLE`                                                                                                                                                                |
| `cover` | `cover-tetris`                                                                                                                                                          |
| `color` | `cyan`                                                                                                                                                                  |

**`lib/data.ts` `Game` entry:**

```ts
{
  id: 'tetris',
  title: 'TETRIS',
  short: 'Rota y encaja piezas para limpiar líneas.',
  long: 'Las piezas caen sin parar y el tablero no perdona. Rota y coloca cada bloque en el lugar exacto para limpiar líneas y ganar puntos. ¿Hasta qué nivel puedes aguantar?',
  cat: 'PUZZLE',
  cover: 'cover-tetris',
  color: 'cyan',
  best: 0,
  plays: '0',
}
```

## Implementation plan

1. **Supabase `games` row** — `INSERT` the Tetris row via `mcp__supabase__execute_sql`;
   verify with `SELECT * FROM games WHERE id = 'tetris'` before continuing.

2. **`lib/data.ts` entry** — append the `Game` object above to the `GAMES[]` constant.

3. **CSS** — add `.cover-tetris` after the last existing `.cover-*` class in
   `app/globals.css` (pure CSS, gradients and geometric shapes, `var(--cyan)` accent);
   add `tetris-touch-controls` display/media rules immediately after.

4. **`components/games/TetrisGame.tsx`** — create the React component:
   - Canvas 420×600: left 300 px = 10×20 board (BLOCK=30), right 120 px = next-piece
     preview panel drawn directly on the same canvas
   - All game logic (board matrix, piece objects, collision, rotation with wall kicks,
     ghost piece, line clearing, scoring, level speed) ported verbatim from `game.js`
     with TypeScript types added
   - `cbRef` / `pausedRef` inline-sync pattern (mandatory; no extra `useEffect`)
   - All DOM writes from `updateHUD()` replaced by `cbRef.current.onScoreChange`,
     `onLevelChange`, `onLivesChange` (called once at init with `1`)
   - `cbRef.current.onGameOver(score)` called on the `endGame` transition
   - Pause overlay drawn by `drawOverlay()` when `pausedRef.current` is `true`
   - Touch buttons: `◁ ArrowLeft`, `▷ ArrowRight`, `△ ArrowUp` (rotate), `▼ ArrowDown`,
     `⬛ Space` (hard drop)

5. **`app/games/tetris/play/page.tsx`** — four targeted edits in order:
   - **a)** Import `TetrisGame` after the `AsteroidsGame` import
   - **b)** Add `isTetris`, `tetrisKey`, `tetrisLevel` flags/state; update the `level`
     computed value to cover the Tetris branch
   - **c)** Add `|| isTetris` to the score-ticker guard; add key bump + level reset to
     `restart()`
   - **d)** Insert the JSX branch between the Asteroids `</div>` and the generic `<>`
     fallback, rendering the `player-hud` bar and `<TetrisGame>` component

## Acceptance criteria

### Supabase & data

- [ ] Row in Supabase `games` table: `id=tetris`, correct `title`/`short`/`long`/`cat`/`cover`/`color`
- [ ] `GAMES[]` in `lib/data.ts` contains an entry for `tetris`

### Visual

- [ ] `.cover-tetris` CSS class exists in `app/globals.css` and renders in the `/games` grid
- [ ] Tetris game card appears in `/games` with cyan accent color

### Component

- [ ] `components/games/TetrisGame.tsx` exists
- [ ] `tsc --noEmit` passes with no errors

### Play page — gameplay

- [ ] `/games/tetris/play` renders the 420×600 canvas with no console errors
- [ ] Score, level, and lines-cleared update correctly in the React HUD bar during play
- [ ] Next-piece preview draws in the right-hand 120 px panel on the canvas
- [ ] Ghost piece appears below the active piece at 20% opacity
- [ ] Hard drop (`Space`) locks the piece immediately and awards +2 pts per cell
- [ ] Soft drop (`ArrowDown`) awards +1 pt per row
- [ ] PAUSA button pauses the game loop; canvas shows "EN PAUSA"; REANUDAR resumes
- [ ] FIN button opens the game-over modal with the last score pre-filled
- [ ] `onGameOver` callback opens the modal automatically when the board fills

### Play page — score saving

- [ ] GUARDAR PUNTUACIÓN writes to `localStorage` (key `av_scores`)
- [ ] GUARDAR PUNTUACIÓN writes to Supabase `scores` table
- [ ] A Supabase insert failure does not block the modal or "PUNTUACIÓN GUARDADA" toast

### Detail & hall pages

- [ ] `/games/tetris` detail page shows PARTIDAS and MEJOR GLOBAL from real Supabase data
- [ ] `/games/tetris` mini-leaderboard shows real top-10 scores
- [ ] `/hall` includes a tab for `tetris` showing real top-12 scores

### Mobile

- [ ] Touch controls (◁ ▷ △ ▼ ⬛) appear only on `pointer: coarse` devices

### Regression

- [ ] All other games are unaffected — their play pages still render correctly

## Decisions

- **Canvas extended to 420×600 instead of 300×600** — the reference uses a separate
  120×120 `<canvas id="next-canvas">` for the next-piece preview. A second canvas ref
  in the React component would complicate the mandatory structure; drawing the preview
  in the right-hand 120 px strip of a single wider canvas keeps the component clean and
  matches the one-canvas pattern established by AsteroidsGame.

- **DOM-based HUD removed entirely** — `updateHUD()` writes to `#score`, `#lines`,
  `#level` DOM elements that do not exist in the React render tree. All three values
  are surfaced via `onScoreChange`, `onLevelChange`, and `onLivesChange` callbacks
  instead; the React HUD bar already renders them correctly.

- **`onLivesChange(1)` called once at init** — Tetris has no lives mechanic. Calling
  it once keeps the play-page contract satisfied without adding dead state.

- **`KeyP` not handled inside the component** — pause is toggled by the parent page
  via the PAUSA button; the component reads `pausedRef.current` each frame. Adding a
  second `KeyP` handler inside the component would conflict with the parent.

- **`handleSaveScore` unchanged** — it already reads `id` from URL params for both
  localStorage and Supabase; no edits needed for any new game.

- **`cbRef` + inline ref sync, empty deps array** — mandatory pattern from SPEC 07;
  avoids restarting the RAF loop on every prop change and eliminates stale-closure bugs.

## Risks

| Risk                                                                                                           | Mitigation                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Ported JS has no types — all variables are implicit `any`                                                      | Add explicit types to all piece-object properties (`type`, `shape`, `x`, `y`) and board array; internal `let` locals may use inference |
| `drawGrid()` reads `getComputedStyle(document.body)` for `--grid-line` CSS var — unavailable in canvas context | Replace with a hardcoded `rgba(255,255,255,0.08)` grid color matching the dark theme                                                   |
| `dropAccum` is ms-based in the reference but the RAF loop in the component passes `dt` in seconds              | Convert: accumulate `dt` in seconds, compare against `dropInterval / 1000`                                                             |
| Stale `paused` prop inside RAF loop                                                                            | Mandatory `pausedRef.current = props.paused` inline sync at render eliminates this                                                     |
| Cover CSS art looks inconsistent with existing covers                                                          | Read `.cover-rocas` and `.cover-bloques` for reference; invoke `/frontend-design` if visual judgment is needed                         |
