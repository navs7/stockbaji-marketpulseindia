# MarketPulse India

Responsive, installable web app (PWA) that turns Indian market events into timely, categorised, snoozable reminders: corporate actions, IPOs, sector and stock news, global macro events and curated reading. It **informs, it never advises**: no buy/sell/hold calls, target prices or tips.

Live: https://marketpulseindia.web.app (Firebase project `stock-baji`, Hosting site `marketpulseindia`)

Built from the PRD "MarketPulse India — Stock Market Event Reminders & Alerts" for the **Firebase Spark (free) plan**: a static React app on Hosting with optional Auth and Firestore sync. There is no server.

## Features (MVP)

- **Account:** Google and email-link sign-in, 4-step onboarding, "information only" acknowledgement, JSON export and account deletion.
- **Reminders:** inbox (Today / Upcoming / Snoozed / Done), bulk actions, custom reminders with repeat rules (including "every trading day"), edit and history.
- **Snooze:** presets, custom time, and a guard rail that stops a snooze going past an event's deadline (IPO close, last day to buy). Prompt after 3 snoozes.
- **Delivery rules:** categories with colour + icon, mute, digest, quiet hours (default 22:00–07:00 IST), High-priority bypass, tag-to-category rules.
- **Corporate actions:** dividend, bonus, split, rights, buyback, AGM, board meetings; "last day to buy" computed from the trading-holiday calendar (T+1).
- **IPOs:** tabs, detail page, status timeline, subscription tables, GMP behind a feature flag with the unofficial-indicator label, "Remind me" and "I applied".
- **Explore:** calendar (month/list), watchlists with CSV import, stock / industry / factor pages, global events with "why it matters for India", curated tiered reading feed, subscriptions manager.
- **Admin console:** review queue, add events, article curation checklist, broadcast with two-person approval for all-user sends, source health, audit log.
- **UX:** Ctrl/Cmd+K search, light and dark themes, responsive (360 / 768 / 1280), Tweaks panel.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
```

With no Firebase config the app runs in **demo mode**: sign-in is simulated (the code is shown on screen) and data stays in the browser.

## Connect Firebase

1. Firebase console → add a **Web app** and copy its config.
2. Authentication → enable **Google** and **Email/Password → Email link (passwordless)**. Add your domain under Authorized domains.
3. Firestore → create a database.
4. `cp .env.example .env.local` and fill the `VITE_FIREBASE_*` values (never commit `.env.local`).

## Deploy

```bash
npm run build
firebase deploy --only hosting,firestore:rules
```

`firebase.json` targets the `marketpulseindia` Hosting site; `.firebaserc` sets the default project to `stock-baji`.

## Project layout

```
src/
  App.jsx            routes, shell, auth/onboarding guards
  store.jsx          app state, persistence, Firestore sync, clock tick
  lib/engine.js      reminder planner, snooze rules, quiet hours, repeats
  lib/dates.js       IST date maths, trading-day logic, formatting
  lib/firebase.js    optional Firebase wiring
  data/seed.js       SAMPLE dataset (instruments, events, IPOs, articles)
  pages/             Public, Home, Reminders, Calendar, Ipos, Stocks, Explore, Settings, Admin
  components/ui.jsx  shared UI (icons, drawer, snooze menu, search, tweaks)
public/sw.js         service worker (offline shell, push + notification actions)
functions/           Blaze-ready scheduler/FCM scaffold (not deployed)
firestore.rules      per-user access rules
```

## Spark plan limits

| Concern | Today | Needs |
|---|---|---|
| Reminder planning, snooze, quiet hours | Runs in the browser (`engine.js`) | — |
| Delivery | In-app + browser notifications while the app is open | Background push needs a server |
| Event data | Labelled **sample dataset** | Ingestion job + data source |
| Email and digests | Not sent | Server job + email provider |

Free server options without Blaze: scheduled GitHub Actions, Cloudflare Workers cron, or Supabase. See `AGENTS.md` for guidance.

## Entering events by hand (admin)

Admin → **Events** adds a dividend, bonus or split. Currently these are stored **in that browser only**, so other users do not see them. To publish events to everyone, move the catalogue to a Firestore `catalog` collection (rules already restrict writes to users with the `admin` custom claim).

## Data and compliance notes

- Every screen shows "Sample data" until real feeds are connected. Remove the banner (`.sample-bar` in `src/App.jsx`) only after that.
- GMP is unofficial and unregulated; it is never used to compute an expected gain. Keep the label and the `prefs.gmpFlag` switch.
- Impact language is neutral ("may affect"); never "will rise/fall".
- Use licensed or official sources for anything that triggers a reminder; scraping exchange pages is a legal and reliability risk.
