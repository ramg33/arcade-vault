# SPEC 05 — Asteroids Game Integration

> **Status:** Approved · **Depends on:** SPEC 04 · **Date:** 2026-06-29
> **Objective:** Port the reference Asteroids canvas game into a self-contained React component and wire it to the existing `/games/asteroids/play` page, with the game reporting score, lives, level, and game-over events back to the platform's React HUD.

## Scope

**In:**

- `components/games/AsteroidsGame.tsx` — new self-contained `'use client'` component that owns the canvas, the full game loop (Bullet, Asteroid, Ship, Particle, PowerUp), the canvas HUD (score / level / lives drawn on canvas), the canvas game-over overlay, and mobile on-screen touch buttons (rotate left, rotate right, thrust, fire). It accepts callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) and a `paused` prop, and fires them whenever game state changes. The component is visually self-contained — React receives values but does not drive the visual display.
- `app/games/[id]/play/page.tsx` — modified: when `id === 'asteroids'`, the React HUD bar is hidden (the canvas owns the HUD) and `<AsteroidsGame>` replaces the CSS `.game-arena` placeholder. The page wires `onGameOver(finalScore)` to trigger the existing save-score modal. `onScoreChange`, `onLivesChange`, and `onLevelChange` update React state (used only for the modal pre-fill and future extensibility, not displayed in the React HUD bar for this game).

**Out of scope (for future specs):**

- Any other game besides Asteroids — other games keep the existing placeholder and React HUD.
- Supabase score persistence — score is saved to `localStorage` via the existing modal.
- Authentication or user sessions — player name comes from `localStorage` as today.
- A reusable `GameAdapter` interface or abstraction layer for future games.
- Sound effects or music.
- High-score display changes on `/games/asteroids` detail page (still uses `seededScores()`).

## Data Model

No new persistent data structures. No database tables or schema changes.

**Component props (`AsteroidsGame`):**

```ts
type AsteroidsGameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};
```

**Internal game state (component-local, not exposed to React):**

All existing classes and globals from the reference `game.js` are ported as-is into the component's module scope and attached to the canvas ref: `Ship`, `Bullet`, `Asteroid`, `Particle`, `PowerUp`, `keys`, `justPressed`, `score`, `lives`, `level`, `state` (`'playing' | 'dead' | 'gameover'`), `deadTimer`.

**Score saved to localStorage (unchanged shape):**

```ts
type ScoreEntry = { game: string; score: number; name: string; at: number };
// game: 'asteroids' — key: 'av_scores' — already defined in lib/data.ts
```

## Implementation Plan

1. **Create `components/games/AsteroidsGame.tsx`** — `'use client'` component with a `<canvas>` ref (800×600). Port all classes and globals from `references/started-games/02-asteroids/game.js` verbatim into the module, replacing `canvas`/`ctx` globals with refs obtained inside `useEffect`. Keep `drawHUD()` and `drawOverlay()` unchanged.

2. **Wire callbacks into the game loop** — inside `update()`, after any state-changing operation, fire the matching callback:
   - `score` changes → `onScoreChange(score)`
   - `lives` changes → `onLivesChange(lives)`
   - `level` changes → `onLevelChange(level)`
   - `state` transitions to `'gameover'` → `onGameOver(score)`

3. **Wire `paused` prop** — if `paused === true` the `loop()` skips calling `update()` but still calls `draw()` so the frame stays visible. The canvas draws a "EN PAUSA" overlay (same style as the existing `drawOverlay()` helper). Store `paused` in a `useRef` kept in sync with the prop to avoid stale closures inside the RAF loop.

4. **Add mobile touch controls** — render four `<button>` elements in a row below the canvas (visible only on `pointer: coarse` via CSS media query). Each button maps `touchstart` → set the corresponding `keys` entry, `touchend` / `touchcancel` → clear it. Buttons: ◁ (ArrowLeft), ▷ (ArrowRight), △ (ArrowUp), ● (Space).

5. **Modify `app/games/[id]/play/page.tsx`** — add a branch for `id === 'asteroids'`:
   - Hide the React HUD bar (the canvas owns it).
   - Replace the `.crt` block with `<AsteroidsGame>` passing `paused`, and callbacks that update `score`, `lives`, `level` state (for modal pre-fill) and set `over = true` on `onGameOver`.
   - The existing game-over modal and `handleSaveScore` remain untouched.
   - The PAUSA / FIN / SALIR button row is kept; PAUSA toggles `paused` state passed to the component; FIN sets `over = true` directly (with whatever score React last received).

6. **Verify TypeScript** — run `tsc --noEmit`. The ported JS classes need explicit type annotations on constructor params and return types to satisfy strict mode.

## Acceptance Criteria

- [ ] Navigating to `/games/asteroids/play` renders the canvas game immediately with no console errors
- [ ] The canvas HUD (score, level, lives) updates correctly during gameplay
- [ ] Asteroids split on hit; ship explodes and respawns on collision; level advances when all asteroids are cleared
- [ ] Triple-shot power-up spawns, can be collected, and expires correctly
- [ ] The React HUD bar is not visible when playing Asteroids
- [ ] The PAUSA button pauses the game loop; the canvas shows "EN PAUSA"; REANUDAR resumes
- [ ] The FIN button sets `over = true` and opens the game-over modal with the last reported score pre-filled
- [ ] The game-over modal appears automatically when the canvas fires `onGameOver`
- [ ] Score can be saved to `localStorage` via the modal; the toast "PUNTUACIÓN GUARDADA" appears after saving
- [ ] All four mobile touch buttons are visible on the page; holding each button produces the correct in-game action (rotate left, rotate right, thrust, fire)
- [ ] All other games (bloque-buster, caída, etc.) are unaffected — their play pages still render the existing placeholder and React HUD
- [ ] The game ID in localStorage entries is `'asteroids'` (not `'rocas'`)
- [ ] `tsc --noEmit` passes with no errors

## Decisions

- **Yes: canvas keeps its own HUD and overlays** — the game is visually self-contained; duplicating HUD logic in React would create two sources of truth and coupling between the platform shell and each game's internal state machine.
- **Yes: callbacks over a shared state store** — callbacks (`onScoreChange`, `onLivesChange`, `onLevelChange`, `onGameOver`) are the minimal interface between the isolated game and the platform shell. No context, no global store, no event bus needed at this scale.
- **Yes: React HUD bar hidden for Asteroids only** — the canvas owns the display; showing both would duplicate information. Other games keep the React HUD bar since they have no canvas HUD.
- **Yes: port game.js verbatim into the component** — avoids a two-file split and keeps the game logic co-located with its React wrapper. The reference file is already 420 lines; no abstraction is needed.
- **Yes: localStorage score saving unchanged** — Supabase schema does not exist yet; adding it here would pull in infrastructure decisions outside this spec's scope.
- **No: GameAdapter interface or abstraction** — YAGNI; other games are not specced yet and their integration patterns may differ.
- **No: iframe embedding** — would break the callback / paused-prop interface and make mobile controls harder to position.
- **No: sound effects** — deferred; no audio system exists in the platform yet.

## Risks

| Risk                                                                                                                           | Mitigation                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stale closure on `paused` prop inside the RAF loop — `requestAnimationFrame` captures the initial value and never sees updates | Store `paused` in a `useRef` that is kept in sync with the prop via a `useEffect`; the loop reads `pausedRef.current` instead of the prop directly       |
| Global keyboard listeners (`keydown`/`keyup`) leak if the component unmounts mid-game                                          | The `useEffect` cleanup function removes all event listeners and cancels the pending `requestAnimationFrame` handle                                      |
| Fixed 800×600 canvas overflows on small mobile screens                                                                         | Apply `max-width: 100%; height: auto` via CSS on the `<canvas>` element; the game's internal coordinates stay at 800×600 (the browser scales the bitmap) |
| TypeScript strict mode rejects the ported vanilla JS classes (implicit `any`, missing return types)                            | Add minimal explicit annotations to constructor params and public methods; internal locals can use inferred types                                        |
| Touch buttons positioned over the canvas obscure game content on small screens                                                 | Render touch buttons in a separate row below the canvas, not as an overlay; show only on `pointer: coarse` media query so desktop users never see them   |
