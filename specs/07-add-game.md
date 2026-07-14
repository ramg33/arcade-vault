# SPEC 07 — `/add-game` Skill

> **Status:** Implemented · **Depends on:** SPEC 05, SPEC 06 · **Date:** 2026-07-13
> **Objective:** Create a project-local `/add-game` Claude Code skill that guides
> the full integration of a vanilla JS canvas game into Arcade Vault — React
> component, play page wiring, Supabase registration, CSS cover art, and
> leaderboard — so any future game can be added consistently without
> re-deriving the pattern from SPEC 05 and SPEC 06.

## Scope

**In:**

- `.agents/skills/add-game/SKILL.md` — multi-phase skill instructions
  (Discover → Gather metadata → Implement 5 steps → Verify)
- `.agents/skills/add-game/checklist.md` — per-game integration acceptance
  checklist, adapted from SPEC 05 + SPEC 06 criteria
- `.claude/skills/add-game` symlink → `../../.agents/skills/add-game`

**Out of scope (for future specs):**

- Implementing any specific game (Tetris, Arkanoid) — the skill is a guide only
- Changes to `app/`, `components/`, `lib/`, or Supabase schema in this spec
- A game-specific spec-writing skill (`/spec` already covers this)
- Mouse-driven input games (e.g. Arkanoid paddle) — keyboard + touch only
- Multi-player or networked games

## Skill Interface

The skill is invoked as `/add-game` (optionally `/add-game [game-id]`).

**Inputs collected from the user:**

| Field          | Type                                      | Notes                                                       |
| -------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `id`           | slug                                      | e.g. `tetris`, `arkanoid`                                   |
| `title`        | UPPERCASE string                          | e.g. `TETRIS`                                               |
| `short`        | Spanish one-liner                         | e.g. `Apila piezas antes de que te atrapen.`                |
| `long`         | Spanish description                       | 2–3 sentences                                               |
| `cat`          | `'ARCADE'\|'PUZZLE'\|'SHOOTER'\|'VERSUS'` |                                                             |
| `color`        | `'cyan'\|'magenta'\|'yellow'\|'green'`    | accent color                                                |
| reference path | optional string                           | e.g. `references/started-games/03-tetris/game.js` or `none` |

`cover` is always derived as `cover-[id]` — no extra input required.

**Files the skill produces for each game:**

| File                                    | Action                                           |
| --------------------------------------- | ------------------------------------------------ |
| Supabase `games` table                  | `INSERT` via `mcp__supabase__execute_sql`        |
| `lib/data.ts` `GAMES[]`                 | Append entry                                     |
| `app/globals.css`                       | Add `.cover-[id]` CSS class + touch-control rule |
| `components/games/[PascalName]Game.tsx` | New `'use client'` React component               |
| `app/games/[id]/play/page.tsx`          | Add game branch + score-ticker guard + `restart` |

## SKILL.md Content

### Phase 1 — Discover

1. If the user provided a reference path, read that file and identify:
   - Canvas dimensions (`W × H`)
   - Entity classes: constructor params, `update(dt)`, `draw()` methods, `dead` flag
   - Input: keyboard key codes used (e.g. `ArrowLeft`, `Space`, `KeyP`)
   - State machine: variable name and string values (e.g. `'playing'|'dead'|'gameover'`)
   - Where `score`, `lives`, and `level` change
   - HUD location: drawn on canvas via `drawHUD()`, or via DOM element mutation
2. Read `components/games/AsteroidsGame.tsx` to internalize the mandatory porting
   pattern: `cbRef`, `pausedRef` inline sync, classes defined inside `useEffect`,
   empty deps array.

### Phase 2 — Gather metadata

If not supplied via arguments, ask the user for all fields in the skill interface table
above. Confirm `cover = cover-[id]` before proceeding.

### Phase 3 — Implement

Execute all five steps in order. Confirm each step before starting the next.

#### Step 1 — Supabase `games` table

```sql
INSERT INTO games (id, title, short, long, cat, cover, color)
VALUES ('[id]', '[TITLE]', '[short]', '[long]', '[CAT]', 'cover-[id]', '[color]');
```

Use `mcp__supabase__execute_sql`. Verify with
`SELECT * FROM games WHERE id = '[id]'` before continuing.

#### Step 2 — `lib/data.ts` GAMES array

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

#### Step 3 — CSS in `app/globals.css`

Add `.cover-[id]` after the last existing `.cover-*` class. Use pure CSS:
gradients, geometric shapes, and `var(--[color])` as the accent. Read the
existing `.cover-rocas` and `.cover-bloques` classes for style reference.
Use `/frontend-design` if visual judgment is needed.

Also add the touch-control rule:

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

#### Step 4 — React game component

Create `components/games/[PascalName]Game.tsx`.

**Mandatory structure — do not deviate:**

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

    // --- Input ---
    const keys: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => { keys[e.code] = true; };
    const handleKeyUp   = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);

    // --- Port all entity classes here (verbatim from reference, with TS types added) ---
    // class Piece { x: number; ... constructor(...) { ... } update(dt: number) {} draw() {} }

    // --- Game state ---
    let score = 0;
    let lives = 3;
    let level = 1;
    let state: 'playing' | 'dead' | 'gameover' = 'playing';

    // Fire callbacks at every state-change site:
    //   cbRef.current.onScoreChange(score)
    //   cbRef.current.onLivesChange(lives)
    //   cbRef.current.onLevelChange(level)
    //   cbRef.current.onGameOver(score)   ← only on gameover transition

    function update(dt: number) { /* ported update logic */ }

    function draw() { /* ported draw logic */ }

    function drawOverlay(title: string, sub: string) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 46px monospace';
      ctx.fillText(title, W / 2, H / 2 - 18);
      ctx.font = '18px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(sub, W / 2, H / 2 + 22);
    }

    // --- RAF loop ---
    let lastTime: number | null = null;
    let rafHandle: number;

    function loop(ts: number) {
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
        {/* One button per input action */}
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
- Internal `let` locals can rely on inference; only the class boundary needs explicit types
- Suppress the `react-hooks/exhaustive-deps` lint warning with the inline comment shown
  above — do not disable it globally

#### Step 5 — Wire `app/games/[id]/play/page.tsx`

Make four targeted edits in order:

**a) Import** (after the `AsteroidsGame` import line):

```ts
import [PascalName]Game from '@/components/games/[PascalName]Game';
```

**b) Flags and level state** (after `const isAsteroids = id === 'asteroids'`):

```ts
const is[PascalName] = id === '[id]';
const [[id]Key, set[PascalName]Key] = useState(0);
const [[id]Level, set[PascalName]Level] = useState(1);
```

Update the `level` computed value:

```ts
const level = isAsteroids   ? asteroidsLevel
            : is[PascalName] ? [id]Level
            : Math.floor(score / 2500) + 1;
```

**c) Score-ticker guard and `restart()`**:

```ts
// In the useEffect guard — add || is[PascalName]:
if (isAsteroids || is[PascalName] || over || paused) return;

// In restart() — add key bump:
if (is[PascalName]) set[PascalName]Key(k => k + 1);
```

Also reset `[id]Level` to `1` inside `restart()`.

**d) JSX branch** (between the Asteroids closing `</div>` and the generic `<>` fallback):

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

### Phase 4 — Verify

Run `tsc --noEmit`. Fix all errors, then manually confirm:

- [ ] Game card appears in `/games` grid with its cover art and accent color
- [ ] `/games/[id]` detail page loads; PARTIDAS and MEJOR GLOBAL pull from Supabase
- [ ] `/games/[id]/play` renders the canvas with no console errors
- [ ] Game-over modal auto-opens and `handleSaveScore` writes to both localStorage and Supabase

## Implementation Plan

1. Read `.agents/skills/spec/SKILL.md` to confirm directory conventions used by the
   existing skills before writing anything.
2. Create `.agents/skills/add-game/SKILL.md` — content as defined in the
   "SKILL.md Content" section above.
3. Create `.agents/skills/add-game/checklist.md` — content as defined in the
   "checklist.md Content" section below.
4. Create the symlink:
   ```bash
   ln -s ../../.agents/skills/add-game .claude/skills/add-game
   ```
5. Confirm the symlink resolves with `ls -la .claude/skills/`.

No changes to `app/`, `components/`, `lib/`, or Supabase in this spec.

## checklist.md Content

```markdown
## Integration checklist for [id]

- [ ] Row in Supabase `games` table: id=[id], correct title/short/long/cat/cover/color
- [ ] `GAMES[]` in `lib/data.ts` contains an entry for `[id]`
- [ ] `.cover-[id]` CSS class exists in `app/globals.css` and renders in the `/games` grid
- [ ] `components/games/[PascalName]Game.tsx` compiles with `tsc --noEmit`
- [ ] `/games/[id]/play` renders the canvas with no console errors
- [ ] Canvas HUD (score, level, lives) updates correctly during play
- [ ] PAUSA button pauses the loop; canvas shows "EN PAUSA"; REANUDAR resumes
- [ ] FIN button opens the game-over modal with the last score pre-filled
- [ ] `onGameOver` callback opens the modal automatically on game end
- [ ] GUARDAR PUNTUACIÓN writes to `localStorage` (key `av_scores`) AND `scores` in Supabase
- [ ] A Supabase insert failure does not block the modal or "PUNTUACIÓN GUARDADA" toast
- [ ] `/games/[id]` detail page shows PARTIDAS and MEJOR GLOBAL from real Supabase data
- [ ] `/hall` includes a tab for `[id]` showing real top-12 scores
- [ ] Mobile touch controls appear only on `pointer: coarse` devices
- [ ] All other games are unaffected — their play pages still render correctly
- [ ] `tsc --noEmit` passes with no errors
```

## Acceptance Criteria

- [ ] `.agents/skills/add-game/SKILL.md` exists and covers all four phases
- [ ] `.agents/skills/add-game/checklist.md` exists with all integration checkpoints
- [ ] `.claude/skills/add-game` symlink resolves to `.agents/skills/add-game/`
- [ ] Typing `/add-game` in a Claude Code session loads the skill without errors
- [ ] The SKILL.md Phase 3 Step 4 component skeleton compiles with `tsc --noEmit`
      when the placeholder comments are replaced with real game logic
- [ ] Smoke-testing the skill against `references/started-games/03-tetris/game.js`
      produces a working `/games/tetris/play` page

## Decisions

- **Yes: skill lives in `.agents/skills/` (project-local), symlinked from `.claude/skills/`** —
  matches the existing `spec` and `spec-impl` layout; keeps the skill tracked in git
  alongside the specs it operationalizes and avoids polluting the global `~/.claude/`.

- **Yes: `cbRef` + inline ref sync instead of per-prop `useEffect`** — syncing all
  callbacks and `paused` via `ref.current = props` at render time avoids restarting
  the RAF loop on every prop change. This is the exact pattern in `AsteroidsGame.tsx`
  and is mandatory in the skill to prevent stale-closure bugs (stale scores on game-over,
  delayed pause response).

- **Yes: entity classes defined inside `useEffect`, not module scope** — captures `ctx`,
  `W`, and `H` via closure rather than globals; keeps multiple game instances
  independent and avoids cross-mount leaks.

- **Yes: empty `useEffect` deps array with inline eslint suppress** — intentional; all
  mutable state is accessed through refs. The warning is a false positive here and must
  be suppressed inline, not disabled globally.

- **Yes: `handleSaveScore` unchanged for new games** — it reads `id` from params for
  both localStorage and Supabase; adding a new game requires no edits to the save logic.

- **No: mouse-driven games in scope** — Arkanoid's paddle uses `mousemove`, not keyboard
  codes; the touch-button dispatch helper dispatches `KeyboardEvent`s and is incompatible.
  Mouse-driven games require a separate skill extension.

- **No: a game-specific spec written inside the skill** — `/spec` already handles
  spec-writing; the skill's purpose is direct implementation.

## Risks

| Risk                                                                                                 | Mitigation                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference game uses DOM-based HUD (Tetris mutates `#score` DOM element instead of drawing on canvas) | Phase 1 explicitly identifies HUD location; if DOM-based, the skill instructs removing those DOM writes and relying on the React HUD bar stats — do not mix DOM mutation with React renders |
| Ported JS classes have implicit `any` (reference files are untyped JS)                               | Step 4 rules require explicit types on all class properties and constructor params; internal locals may use inference                                                                       |
| Stale `paused` prop inside the RAF loop                                                              | Mandatory `pausedRef` inline sync (`pausedRef.current = props.paused` at render) eliminates this; no separate `useEffect` needed                                                            |
| Cover CSS art looks inconsistent with existing covers                                                | Step 3 instructs reading `.cover-rocas` and `.cover-bloques` for style reference and invoking `/frontend-design` if visual judgment is needed                                               |
| Supabase row added but `lib/data.ts` entry forgotten, game missing from `/games` grid                | Checklist item covers both; the skill runs Step 2 before Step 4 so the gap surfaces immediately on grid check                                                                               |
| Many games accumulate many `is[X]` flags in the play page                                            | Accepted for now; a future refactor can extract a `<GameRenderer>` that maps `id → component` via a registry                                                                                |
