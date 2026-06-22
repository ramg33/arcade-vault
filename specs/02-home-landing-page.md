# SPEC 02 — Home Landing Page

> **Status:** Implemented · **Depends on:** SPEC 01 · **Date:** 2026-06-22
> **Objective:** Replace `/` with the marketing landing page from `references/templates/home-about/home.jsx`, and move the Library to `/games`.

## Scope

**In:**

- `app/page.tsx` — replaced with the Home landing page (`'use client'`), 7 sections: Hero, Why Arcade Vault, Games Preview, Stats, Live Activity, Pricing, Final CTA
- `app/games/page.tsx` — new file; Library content moved from current `app/page.tsx`
- `components/Nav.tsx` — BIBLIOTECA link updated from `/` to `/games`; logo click confirmed to point to `/`
- `app/games/[id]/page.tsx` — "VOLVER" back-link updated from `/` to `/games`
- `app/hall/page.tsx` — "VOLVER A LA BIBLIOTECA" updated from `/` to `/games`
- `useReveal`, `FloatingSilhouettes`, `FeatureIcon`, `MiniCard` defined inline in `app/page.tsx`

**Out of scope (for future specs):**

- About page (`about.jsx` exists in the reference but is deferred)
- Real data for the Live Activity section (stays hardcoded inline as in the reference)
- Any new CSS (all required classes are already in `globals.css`)
- Credits mechanic changes

## Data Model

No new data structures. This feature reuses the model from SPEC 01.

- `GAMES` from `lib/data.ts` — used by the Games Preview mini-rail (`GAMES.slice(0, 6)`)
- Live Activity section (recent scores ticker, top players list) — hardcoded inline mock data copied verbatim from `home.jsx`; not tied to `seededScores` or `PLAYERS`

## Implementation Plan

1. **Create `app/games/page.tsx`** — copy the entire content of the current `app/page.tsx` (Library). Confirm the page renders correctly at `/games` before touching anything else.

2. **Update `app/games/[id]/page.tsx`** — change the "VOLVER" navigation target from `/` to `/games`.

3. **Update `app/hall/page.tsx`** — change the "VOLVER A LA BIBLIOTECA" navigation target from `/` to `/games`.

4. **Update `components/Nav.tsx`** — change the BIBLIOTECA link href from `/` to `/games`; confirm the logo already links to `/` (add it if not).

5. **Replace `app/page.tsx`** — port `home.jsx` as a single `'use client'` component with all 7 sections; define `useReveal`, `FloatingSilhouettes`, `FeatureIcon`, and `MiniCard` as inline functions in the same file; wire all CTA buttons and card clicks to `useRouter` / `<Link>` pointing to the correct Next.js routes.

## Acceptance Criteria

- [ ] `/` renders the home landing page with all 7 sections visible: Hero, Why Arcade Vault, Games Preview, Stats, Live Activity, Pricing, Final CTA
- [ ] Hero "EXPLORAR JUEGOS" button navigates to `/games`; "CREAR CUENTA" button navigates to `/auth`
- [ ] Games Preview mini-rail shows exactly 6 cards; clicking a card navigates to `/games/[id]`
- [ ] "VER TODOS LOS JUEGOS" button navigates to `/games`
- [ ] "VER SALÓN" button in Live Activity navigates to `/hall`
- [ ] "EMPEZAR GRATIS" button in Pricing navigates to `/auth`; "INSERTAR MONEDA" Final CTA navigates to `/games`
- [ ] 8 floating pixel silhouettes are visible in the hero section
- [ ] Sections with `.reveal` class animate in on scroll via `IntersectionObserver`
- [ ] `/games` renders the Library page identically to how `/` rendered before this spec
- [ ] Nav BIBLIOTECA link points to `/games`; logo navigates to `/`
- [ ] "VOLVER" in `/games/[id]` navigates to `/games`
- [ ] "VOLVER A LA BIBLIOTECA" in `/hall` navigates to `/games`
- [ ] `tsc --noEmit` passes with no errors

## Decisions

- **Yes: Library moves to `/games`** — consistent with the existing `/games/[id]` and `/games/[id]/play` hierarchy. Alternative `/library` was considered and rejected for symmetry.
- **Yes: sub-components inline in `app/page.tsx`** — `FloatingSilhouettes`, `FeatureIcon`, `MiniCard`, and `useReveal` are small and used only by the home page; extracting them to `components/` adds indirection with no benefit.
- **Yes: Live Activity data hardcoded in component** — matches the reference exactly; no `seededScores` integration to keep scope minimal.
- **No: About page** — `about.jsx` exists in the reference templates but is deferred to its own spec.

## Risks

| Risk                                                                                                                           | Mitigation                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sections already in the viewport on initial load may not trigger `.reveal` because `IntersectionObserver` fires only on scroll | The reference uses `threshold: 0.12`, which is low enough that a small scroll triggers most sections; acceptable for a visual-only page                               |
| Moving the Library from `/` to `/games` could silently break any hardcoded `/` links not covered by the plan                   | Audit is contained: only `Nav.tsx`, `app/games/[id]/page.tsx`, and `app/hall/page.tsx` link back to the library — all three are explicitly in the implementation plan |
