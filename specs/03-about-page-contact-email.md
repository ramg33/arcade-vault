# SPEC 03 — About Page with Contact Form and Resend Email

> **Status:** Approved · **Depends on:** SPEC 02 · **Date:** 2026-06-23
> **Objective:** Add an `/about` page ported from the reference template, with a working contact form that sends emails to rodrigo.moza24@gmail.com via Resend using a Next.js Server Action.

## Scope

**In:**

- `app/about/page.tsx` — new `'use client'` page porting `about.jsx` exactly: About hero section (mission + 3 highlight cards) + contact form with success and error terminal states
- `app/actions/contact.ts` — new Server Action that calls the Resend API and sends the form data to rodrigo.moza24@gmail.com
- `components/Nav.tsx` — new "ABOUT US" link pointing to `/about`, following the existing nav link pattern
- `.env.local` — add `RESEND_API_KEY=` placeholder (empty value, user will fill it)
- `package.json` — add `resend` as a dependency

**Out of scope (for future specs):**

- Resend domain/sender verification setup (user handles it externally)
- Rate limiting or spam protection on the contact form
- Storing submitted messages in a database
- Email reply-to configuration or auto-responder to the sender
- Any visual changes to the About section content (text, icons, layout must match the reference template exactly)

## Data Model

No new persistent data structures. The form state lives in component memory only.

**Form state (component-local):**

```ts
type ContactForm = { name: string; email: string; msg: string };
type SendState =
  | { ok: true; name: string }
  | { ok: false; error: string }
  | null;
```

**Server Action signature:**

```ts
// app/actions/contact.ts
export async function sendContactEmail(
  data: ContactForm,
): Promise<{ ok: boolean; error?: string }>;
```

**Environment variable:**

```
RESEND_API_KEY=   # set in .env.local; user provides the key
```

## Implementation Plan

1. **Install `resend`** — run `npm install resend`. Confirm `package.json` reflects the new dependency.

2. **Add env variable** — append `RESEND_API_KEY=` (empty) to `.env.local`. The app will not crash at build time; the action will return an error at runtime if the key is missing.

3. **Create `app/actions/contact.ts`** — Server Action marked `'use server'`. Reads `RESEND_API_KEY`, instantiates `new Resend(key)`, calls `resend.emails.send()` with `to: 'rodrigo.moza24@gmail.com'`, `from` set to the Resend default sandbox sender (`onboarding@resend.dev`), `subject` derived from the sender's name, and `text` body from the message field. Returns `{ ok: true }` on success or `{ ok: false, error: string }` on failure.

4. **Create `app/about/page.tsx`** — `'use client'` component. Port `about.jsx` exactly: `useReveal` via `IntersectionObserver`, About hero with mission text and 3 highlight cards (`HighlightIcon` inline), pixel divider, and contact form. Replace the local `setSent` mock with a call to the `sendContactEmail` Server Action. Map the action result to `SendState`: on `ok: true` show the existing green terminal success block; on `ok: false` show a red terminal error block (same terminal chrome, red accent, error message text, and a "REINTENTAR" button that resets state). Add a loading state that disables the submit button while the action is in-flight.

5. **Update `components/Nav.tsx`** — add an "ABOUT US" `<Link href="/about">` entry following the same pattern as existing nav links (same element type, same class names, same order position — after the last existing link).

## Acceptance Criteria

- [ ] `/about` renders without console errors, showing the About hero and contact form
- [ ] About hero displays the mission text and all 3 highlight cards (HEART, BROWSER, PLANT icons)
- [ ] Pixel divider and contact section animate in on scroll via `IntersectionObserver`
- [ ] Submitting the form with any empty field triggers the shake animation and does not call the Server Action
- [ ] Submitting a valid form disables the submit button while the action is in-flight
- [ ] On successful send, the green terminal success block appears with the sender's name in the confirmation line
- [ ] On Resend failure, a red terminal error block appears with a "REINTENTAR" button that resets the form to its initial state
- [ ] Nav displays an "ABOUT US" link that navigates to `/about`
- [ ] All existing Nav links remain functional after the Nav update
- [ ] `RESEND_API_KEY=` is present (empty) in `.env.local`
- [ ] `tsc --noEmit` passes with no errors

## Decisions

- **Yes: Server Action over Route Handler** — the form is a single call with no streaming or custom headers needed; a Server Action keeps the code co-located and removes the need for a separate API file.
- **Yes: `onboarding@resend.dev` as sender** — Resend's sandbox sender works without a verified domain; switching to a custom domain is a future ops task outside this spec's scope.
- **Yes: error terminal matches success terminal chrome** — keeps the UI consistent with the arcade aesthetic instead of introducing a generic alert or toast component.
- **No: rate limiting** — deferred; the contact form is low-traffic and adding a limiter (e.g. Upstash) would pull in infrastructure decisions outside this spec's scope.
- **No: storing submissions in a database** — email is the only record needed for now; a persistence layer goes in a future spec if required.
- **No: auto-responder to the sender** — out of scope; would require a verified sender domain and a separate Resend template.

## Risks

| Risk                                                                                                                     | Mitigation                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Resend sandbox sender (`onboarding@resend.dev`) can only deliver to emails verified in the Resend dashboard in test mode | User must verify `rodrigo.moza24@gmail.com` in the Resend dashboard before the first real send; the error terminal will surface any delivery rejection |
| Missing `RESEND_API_KEY` at runtime causes an unhandled exception                                                        | The Server Action wraps the Resend call in try/catch and returns `{ ok: false, error }` — the error terminal displays instead of crashing the page     |
