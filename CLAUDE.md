# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault is an online gaming platform for competing on scoreboards. Built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

## Commands

```bash
npm run dev      # start dev server (Turbopack by default in v16)
npm run build    # production build (also Turbopack by default)
npm run start    # serve production build
npm run lint     # ESLint via the ESLint CLI (not `next lint` — changed in v16)
```

## Key Next.js 16 Breaking Changes

Before writing any code, consult `node_modules/next/dist/docs/` for accurate API details. This version has significant differences from v13/v14/v15:

**Async Request APIs (fully breaking)** — synchronous access is removed. `params`, `searchParams`, `cookies()`, `headers()`, and `draftMode()` are all async:
```ts
// Page props
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

## Architecture

Uses the **App Router** exclusively (`app/` directory). No Pages Router.

- `app/layout.tsx` — root layout with Geist fonts and full-height flex body
- `app/page.tsx` — home page (Server Component by default)
- `app/globals.css` — Tailwind CSS v4 imported via `@import "tailwindcss"` (not `@tailwind` directives); theme tokens defined with `@theme inline`

**Path alias**: `@/` maps to the project root.

**CSS**: Tailwind v4 syntax — use `@import "tailwindcss"` and `@theme` blocks, not `tailwind.config.js` or `@tailwind base/components/utilities`.

**Components**: Server Components by default. Add `'use client'` only when state, event handlers, lifecycle hooks, or browser APIs are needed.

## Spec-Driven Development

This project follows `/spec` and `/spec-impl` skills from `Klerith/fernando-skills`. Design features with specs before implementing.
