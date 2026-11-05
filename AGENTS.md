# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md`.

## What this is
MarketPulse India: a React 18 + Vite PWA for Indian market event reminders. Hosted on Firebase Hosting (Spark plan). No backend. State lives in the browser (`localStorage` key `mp.state`) and syncs to Firestore `users/{uid}` when signed in.

## Commands
```bash
npm install
npm run dev       # dev server on :5173
npm run build     # production build to dist/
firebase deploy --only hosting,firestore:rules   # project stock-baji, site marketpulseindia
```
There is no test suite or linter yet. Verify changes with `npm run build` and by exercising the UI in a browser.

## Architecture rules
- **Single store:** `src/store.jsx` (`useApp()`). Change state with `update((s) => ({ ...s, ... }))`; return new objects, never mutate. Use functional `setState` for toggles that can fire twice in one tick.
- **Reminders are derived, not stored.** `planReminders` (`src/lib/engine.js`) regenerates them from events + follows on every render; user actions are stored as overrides in `st.rem[id]` (status, snooze, priority, category, due). Never persist generated reminders. IDs are stable (`<eventId>:<stage>`), so revisions update in place without duplicates.
- **Time:** all day maths is in IST via `src/lib/dates.js` (`istParts`, `withTime`, `atIst`). Do not use local-timezone `Date` getters. Trading-day logic uses `isTradingDay`/`HOLIDAYS` (sample list; replace with the official calendar).
- **Snooze:** always go through `snoozeRem` so `clampSnooze` and `relevanceDeadline` guard rails apply.
- **Data:** `src/data/seed.js` is a labelled SAMPLE dataset generated relative to today. Real feeds should replace it behind the same shapes. Do not invent real-looking events and present them as real.
- **Firebase is optional.** `src/lib/firebase.js` exports `firebaseEnabled`; the app must keep working in demo mode without `VITE_FIREBASE_*`.

## Compliance guardrails (do not weaken)
- Information only. No buy/sell/hold language, targets, tips, or "expected gain" headlines.
- Impact copy is neutral: "may affect", never "will rise/fall".
- GMP: keep it behind `prefs.gmpFlag` and keep the "Unofficial, unregulated indicator... Do not deal in the grey market" label.
- Every event fact should show its source and an "as of" time; stale data shows an amber "may be outdated" tag.
- Disclaimer link stays in every footer and on IPO/GMP, factor and article pages.
- Article feed: no specific buy/sell calls from unregistered persons; summaries in original words.

## Style and design system
- Plain CSS in `src/styles.css` with tokens on `:root` (`--bg`, `--ink`, `--accent`, ...) and a `[data-theme='dark']` override. No Tailwind, no UI library. Reuse existing classes (`.card`, `.btn`, `.tag`, `.chip`, `.rem`, `.tabs`).
- Fonts: Bricolage Grotesque (display), Hanken Grotesk (body), JetBrains Mono (dates, ₹, tickers). Do not switch to Inter/Roboto.
- No emoji as icons; use `Icon` from `src/components/ui.jsx` (add paths to its `P` map).
- Category colour is always paired with an icon and label. Dates like `Wed, 4 Nov 2026`, times with `IST`, currency with Indian grouping (`inr()`).
- Keep touch targets ≥ 44px on mobile and no horizontal page scroll at 360px.

## Security
- Never commit `.env.local` or service-account keys. Web config values are public identifiers, but keep them in env.
- `firestore.rules`: users access only `users/{uid}`; `catalog/**` and `auditLog` writes require the `admin` custom claim. The admin UI is currently open to any signed-in user; do not rely on it for access control.
- Destructive or outward-facing actions (deploys, pushes, broadcasting) need explicit user approval.

## Where free server-side jobs could go (not built)
Spark has no Cloud Functions. Options that stay free: a scheduled GitHub Actions workflow (min 5-minute cron) or Cloudflare Workers cron triggers that fetch licensed/official sources and write to Firestore with the Admin SDK; Web Push via VAPID (`web-push`) instead of FCM. Port the planning rules from `engine.js` rather than rewriting them, and keep adapters behind a `SourceAdapter` interface so vendors can be swapped.

## Known gaps
Admin-entered events are local to one browser (needs a Firestore `catalog` collection); admin console has no access control; email and digests are not sent; background push is not wired; Hindi is not implemented; bundle is a single ~800 KB chunk.
