# MarketPulse India

Responsive PWA for Indian market event reminders (PRD: *MarketPulse India — Stock Market Event Reminders & Alerts*). Informs, never advises.

Built for the **Firebase Spark (free) plan**: static React app on Hosting, optional Auth + Firestore sync. No servers.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173, demo mode (no Firebase needed)
```

Demo mode simulates sign-in (the 6-digit code is shown on screen) and keeps data in the browser.

## Connect Firebase (Auth + Firestore)

1. Firebase console: create/choose a project, add a **Web app**, copy its config.
2. Auth: enable **Google** and **Email link (passwordless)**; add your domain under Authorized domains.
3. Firestore: create a database (production mode).
4. `cp .env.example .env.local` and fill the values.

## Deploy

```bash
firebase use <project-id>
npm run build
firebase deploy --only hosting,firestore:rules
```

## What runs where

| Concern | Spark (this build) | Blaze upgrade |
|---|---|---|
| Reminder planning, snooze, quiet hours, repeats | Client (`src/lib/engine.js`) | `functions/` scheduler |
| Delivery | In-app + browser notifications while the app is open | FCM web push in background |
| Event data | Labelled **sample dataset** (`src/data/seed.js`) | Ingestion functions (PRD section 6) |
| Email, digests | Not sent | Functions + email provider |

## Notes
- All dates in the sample set are generated relative to today and labelled "Sample data".
- GMP is behind `prefs.gmpFlag` (Tweaks panel) and always carries the unofficial-indicator label.
- The admin console is open in this prototype; lock it with custom claims before real use.
