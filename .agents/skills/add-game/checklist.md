# Integration checklist for [id]

Replace `[id]` and `[PascalName]` with the game's actual values before using this checklist.

## Supabase & data

- [ ] Row in Supabase `games` table: `id=[id]`, correct `title`/`short`/`long`/`cat`/`cover`/`color`
- [ ] `GAMES[]` in `lib/data.ts` contains an entry for `[id]`

## Visual

- [ ] `.cover-[id]` CSS class exists in `app/globals.css` and renders in the `/games` grid
- [ ] Game card appears in `/games` with the correct accent color

## Component

- [ ] `components/games/[PascalName]Game.tsx` exists
- [ ] `tsc --noEmit` passes with no errors

## Play page — gameplay

- [ ] `/games/[id]/play` renders the canvas with no console errors
- [ ] Canvas HUD (score, level, lives) updates correctly during play
- [ ] PAUSA button pauses the game loop; canvas shows "EN PAUSA"; REANUDAR resumes
- [ ] FIN button opens the game-over modal with the last score pre-filled
- [ ] `onGameOver` callback opens the modal automatically on game end

## Play page — score saving

- [ ] GUARDAR PUNTUACIÓN writes to `localStorage` (key `av_scores`)
- [ ] GUARDAR PUNTUACIÓN writes to Supabase `scores` table
- [ ] A Supabase insert failure does not block the modal or "PUNTUACIÓN GUARDADA" toast

## Detail & hall pages

- [ ] `/games/[id]` detail page shows PARTIDAS and MEJOR GLOBAL from real Supabase data
- [ ] `/games/[id]` mini-leaderboard shows real top-10 scores
- [ ] `/hall` includes a tab for `[id]` showing real top-12 scores

## Mobile

- [ ] Touch controls appear only on `pointer: coarse` devices (hidden on desktop)

## Regression

- [ ] All other games are unaffected — their play pages still render correctly
