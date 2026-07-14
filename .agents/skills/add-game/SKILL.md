---
name: add-game
description: Integrates a vanilla JS canvas game into the Arcade Vault platform — React component, play page wiring, Supabase registration, CSS cover art, and leaderboard. Use it when adding a new game to the platform.
disable-model-invocation: true
argument-hint: 'game id slug, e.g. tetris'
---

# /add-game — Game integration skill

This skill ports a vanilla JS canvas game into the Arcade Vault Next.js platform and wires it to the leaderboard. It runs in five phases. **Do not skip phases.**

Read `specs/07-add-game.md` for the full rationale behind every decision made in this skill.

## Phase 1 — Discover

1. Read `CLAUDE.md` and `AGENTS.md` for project conventions.
2. If the user provided a reference path (via `$ARGUMENTS` or inline), read that file and identify:
   - Canvas dimensions (`W × H`)
   - Entity classes: constructor params, `update(dt)`, `draw()` methods, `dead` flag
   - Input: which keyboard key codes the game uses (e.g. `ArrowLeft`, `Space`, `KeyP`)
   - State machine: variable name and string values (e.g. `state: 'playing'|'dead'|'gameover'`)
   - Where `score`, `lives`, and `level` change — every site that modifies them
   - HUD location: drawn on canvas via a `drawHUD()` function, OR via DOM element mutation (e.g. `document.getElementById('score').textContent = score`)
3. Read `components/games/AsteroidsGame.tsx` — this is the canonical example of a correctly ported game. Internalize the `cbRef`/`pausedRef` pattern before writing any component code.

If no reference path was provided, ask the user for one before continuing.

## Phase 2 — Gather metadata

If any field below was not supplied via arguments, ask for all missing ones in a single block before continuing.

| Field   | Type                                      | Example                                     |
| ------- | ----------------------------------------- | ------------------------------------------- |
| `id`    | slug (lowercase, hyphenated)              | `tetris`                                    |
| `title` | UPPERCASE display name                    | `TETRIS`                                    |
| `short` | Spanish one-liner                         | `Apila piezas antes de que te atrapen.`     |
| `long`  | Spanish description (2–3 sentences)       | `Tu tablero se llena de piezas que caen...` |
| `cat`   | `'ARCADE'\|'PUZZLE'\|'SHOOTER'\|'VERSUS'` | `PUZZLE`                                    |
| `color` | `'cyan'\|'magenta'\|'yellow'\|'green'`    | `cyan`                                      |

`cover` is always derived as `cover-[id]` — do not ask for it.

## Phase 3 — Write game spec

Before creating the spec file, read `.agents/skills/spec/SKILL.md` in full. Then follow
its conventions to write a spec for this specific game at `specs/NN-[id]-game.md`, where
`NN` is the next sequential number after the last file in `specs/`.

The spec must include all standard sections from the `/spec` template:

1. **Header** — status `Draft`, depends on SPEC 05 + SPEC 06 + SPEC 07, date, one-sentence objective.
2. **Scope** — what the game integration adds and what is explicitly out of scope.
3. **Data model** — the `DbGame` row values and the `Game` entry shape; reference the types already in `lib/supabase/types.ts` and `lib/data.ts` (no new types needed).
4. **Implementation plan** — the five steps from Phase 4 of this skill, written as numbered spec steps.
5. **Acceptance criteria** — adapt the checklist from `.agents/skills/add-game/checklist.md` into boolean checkboxes.
6. **Decisions** — e.g. why keyboard-only input, why the canvas owns its HUD, why `handleSaveScore` is unchanged.
7. **Risks** — e.g. DOM-based HUD, stale closures, TypeScript strict mode on ported classes.

Show the spec to the user section by section and wait for confirmation before saving, following the `/spec` phase 3 flow. Save the file only after all sections are approved.

**Do not begin Phase 4 until the spec file exists and the user has confirmed it.**

## Phase 4 — Implement

Execute all five steps in order. Do not start a step until the previous one is confirmed complete.

### Step 1 — Supabase `games` table

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES ('[id]', '[TITLE]', '[short]', '[long]', '[CAT]', 'cover-[id]', '[color]');
```

Use `mcp__supabase__execute_sql`. Verify the row was inserted:

```sql
SELECT * FROM games WHERE id = '[id]';
```

Do not proceed until the SELECT returns one row.

### Step 2 — `lib/data.ts` GAMES array

Append to the `GAMES: Game[]` constant in `lib/data.ts`:

```ts
{
  id: '[id]',
  title: '[TITLE]',
  short: '[short]',
  long: '[long]',
  cat: '[CAT]',
  cover: 'cover-[id]',
  color: '[color]',
  best: 0,
  plays: '0',
},
```

### Step 3 — CSS in `app/globals.css`

**a) Cover art** — add `.cover-[id]` after the last existing `.cover-*` class. Use pure CSS: gradients, layered shapes, and `var(--[color])` as the accent. Read `.cover-rocas` and `.cover-bloques` for style reference. Use `/frontend-design` if visual judgment is needed.

**b) Touch controls** — add immediately after the cover class:

```css
.[id]-touch-controls {
  display: flex;
  gap: 8px;
}
@media (pointer: fine) {
  .[id]-touch-controls {
    display: none;
  }
}
```

### Step 4 — React game component

Create `components/games/[PascalName]Game.tsx`. The structure below is **mandatory** — do not reorganize it.

```tsx
'use client';

import { useEffect, useRef } from 'react';

export type [PascalName]GameProps = {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
};

export default function [PascalName]Game(props: [PascalName]GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Sync all callbacks without restarting the RAF loop
  const cbRef = useRef(props);
  cbRef.current = props;
  // Inline sync avoids stale closure inside the loop
  const pausedRef = useRef(props.paused);
  pausedRef.current = props.paused;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = [reference_width];
    const H = [reference_height];

    // ── Input ──────────────────────────────────────────────────────────────────
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const handleKeyUp   = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    // ── Entity classes (port verbatim from reference, add TS types) ────────────
    // All classes go here, inside useEffect — they capture ctx, W, H via closure.
    // Every class must have explicit types on properties and constructor params.
    // Internal let locals may use inference.
    //
    // class Piece {
    //   x: number; y: number; ...
    //   constructor(x: number, y: number) { ... }
    //   update(dt: number): void { ... }
    //   draw(): void { ... }
    // }

    // ── Game state ─────────────────────────────────────────────────────────────
    let score = 0;
    let lives = 3;
    let level = 1;
    let state: 'playing' | 'dead' | 'gameover' = 'playing';

    // Fire callbacks at every state-change site:
    //   cbRef.current.onScoreChange(score)    — after score changes
    //   cbRef.current.onLivesChange(lives)    — after lives changes
    //   cbRef.current.onLevelChange(level)    — after level changes
    //   cbRef.current.onGameOver(score)       — only on the gameover transition

    function initGame(): void { /* initialise all game state */ }
    function update(dt: number): void { /* port update logic */ }
    function draw(): void { /* port draw logic */ }

    function drawOverlay(title: string, sub: string): void {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 46px monospace';
      ctx.fillText(title, W / 2, H / 2 - 18);
      ctx.font = '18px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(sub, W / 2, H / 2 + 22);
    }

    // ── RAF loop ───────────────────────────────────────────────────────────────
    let lastTime: number | null = null;
    let rafHandle: number;

    function loop(ts: number): void {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      if (!pausedRef.current) update(dt);
      draw();
      if (pausedRef.current) drawOverlay('EN PAUSA', 'PULSA REANUDAR PARA CONTINUAR');
      rafHandle = requestAnimationFrame(loop);
    }

    initGame();
    rafHandle = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafHandle);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup',   handleKeyUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const touchBtn = (label: string, code: string) => ({
    onTouchStart:  (e: React.TouchEvent) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true })); },
    onTouchEnd:    (e: React.TouchEvent) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup',   { code, bubbles: true })); },
    onTouchCancel: (e: React.TouchEvent) => { e.preventDefault(); window.dispatchEvent(new KeyboardEvent('keyup',   { code, bubbles: true })); },
    children: label,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
      <div className="[id]-touch-controls">
        {/* One <button> per input action, mapped to the key codes the game uses */}
        <button {...touchBtn('◁', 'ArrowLeft')} />
        <button {...touchBtn('▷', 'ArrowRight')} />
        <button {...touchBtn('△', 'ArrowUp')} />
        <button {...touchBtn('▼', 'ArrowDown')} />
      </div>
    </div>
  );
}
```

**TypeScript porting rules:**

- Add explicit types to every class property and constructor parameter
- Internal `let` locals can use inference
- Suppress the `react-hooks/exhaustive-deps` warning with the inline comment shown above — do not disable it globally

**If the reference game has a DOM-based HUD** (e.g. `document.getElementById('score').textContent = score`):

- Remove those DOM writes entirely
- The React HUD bar in the play page will display score/level/lives instead
- Do not render DOM elements from inside the component

### Step 5 — Wire `app/games/[id]/play/page.tsx`

Make four targeted edits in this exact order:

**a) Import** (after the existing `AsteroidsGame` import):

```ts
import [PascalName]Game from '@/components/games/[PascalName]Game';
```

**b) Flags and state** (after `const isAsteroids = id === 'asteroids'`):

```ts
const is[PascalName] = id === '[id]';
const [[id]Key, set[PascalName]Key] = useState(0);
const [[id]Level, set[PascalName]Level] = useState(1);
```

Update the `level` computed value to cover the new game:

```ts
const level = isAsteroids    ? asteroidsLevel
            : is[PascalName] ? [id]Level
            : Math.floor(score / 2500) + 1;
```

**c) Score-ticker guard and `restart()`**:

```ts
// In the useEffect guard — add || is[PascalName]:
if (isAsteroids || is[PascalName] || over || paused) return;

// In restart() — add key and level reset:
if (is[PascalName]) { set[PascalName]Key(k => k + 1); set[PascalName]Level(1); }
```

**d) JSX branch** — insert between the Asteroids closing `</div>` and the generic `<>` fallback:

```tsx
) : is[PascalName] ? (
  <div style={{ maxWidth: [W], width: '100%', margin: '0 auto' }}>
    <div className="player-hud">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div className="hud-stat">
          <div className="l">Jugador</div>
          <div className="v" style={{ color: 'var(--ink)' }}>{name}</div>
        </div>
        <div className="hud-stat">
          <div className="l">Puntuación</div>
          <div className="v">{score.toLocaleString('es-ES')}</div>
        </div>
        <div className="hud-stat level">
          <div className="l">Nivel</div>
          <div className="v">{String(level).padStart(2, '0')}</div>
        </div>
      </div>
      <div className="hud-actions">
        <button className="btn yellow" onClick={() => setPaused(p => !p)}>
          {paused ? 'REANUDAR' : 'PAUSA'}
        </button>
        <button className="btn magenta" onClick={endGame}>FIN</button>
        <button className="btn ghost" onClick={() => router.push(`/games/${id}`)}>SALIR</button>
      </div>
    </div>
    <[PascalName]Game
      key={[id]Key}
      paused={paused}
      onScoreChange={setScore}
      onLivesChange={setLives}
      onLevelChange={set[PascalName]Level}
      onGameOver={(finalScore) => { setScore(finalScore); setOver(true); }}
    />
  </div>
```

`handleSaveScore` requires **no changes** — it already reads `id` from params,
so `game_id` is correct for every game automatically.

## Phase 5 — Verify

Run `tsc --noEmit`. Fix all type errors before reporting done.

Then confirm each item in `.agents/skills/add-game/checklist.md` is satisfied.

Finally, update the game's spec file status from `Draft` to `Implemented`.

## Hard rules

- **Never begin Phase 4 without a confirmed spec file from Phase 3.** The spec is the contract; implementation follows from it.
- **Always read `.agents/skills/spec/SKILL.md` before writing the spec in Phase 3.** Do not guess the format from memory.
- **Never skip the Supabase verification SELECT in Phase 4 Step 1.** If the INSERT fails, stop and report the error.
- **Never put entity classes outside `useEffect`.** They must capture `ctx`, `W`, `H` via closure, not via module globals.
- **Never add a separate `useEffect` for `paused` sync.** The inline `pausedRef.current = props.paused` at render is sufficient and correct.
- **Never modify `handleSaveScore`.** It is already game-agnostic.
- **Never mark the spec as `Implemented` until `tsc --noEmit` passes and the checklist is complete.**
