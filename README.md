# Bloom — Your Personal Menstrual Wellness Companion

Bloom is a full-stack, privacy-first menstrual cycle tracking and women's wellness web application built with **React, TypeScript, Vite, Tailwind CSS, Recharts, Node.js, Express, and MongoDB Atlas (Mongoose)**, with an automatic persistent SQLite (`node:sqlite`) fallback when `MONGODB_URI` is omitted during local evaluation.

> **Health & Cycle Disclaimer:** Bloom provides personal tracking and educational wellness guidance only. All cycle phase labels, upcoming period dates, fertile window dates, and ovulation estimates are statistical estimates and **must never be relied upon for contraception, pregnancy prevention, or medical diagnosis**.

---

## Key Features

- **Public Landing Page:** Editorial overview of cycle tracking, interactive four-phase showcase, phase nutrition overview, privacy protections, FAQ, and light/dark mode.
- **Real Authentication & Recovery:** Registration with age eligibility (13+) and consent, bcrypt password hashing, 6-digit email verification OTP (15-minute expiry, max 5 attempts), HTTP-only signed session cookies (`rememberMe` support), rate limiting, CSRF verification, and OTP password reset.
- **Guided Onboarding:** Optional last period start date, average cycle length, average period duration, cycle regularity, tracking preferences, and skip-with-clear-estimates support.
- **Cycle Calculation Engine (`shared/cycleEngine.ts`):** Dynamically computes cycle day, four phases (Menstrual, Follicular, Ovulation, Luteal), cycle variability, irregular cycle detection, and calendar projections from actual user records—never assuming a fixed 28-day cycle or Day 14 ovulation.
- **Interactive Menstrual Calendar & Period Tracker:** Confirmed logged periods vs. estimated future periods, fertile window, estimated ovulation, date inspector, quick logging, and duplicate/overlap prevention.
- **Symptom, Mood & Daily Wellness Trackers:** Log physical & emotional symptoms with severity, 8 daily mood states with a 30-day mood calendar, and daily water intake, sleep hours, activity minutes, exercise type, energy level, and self-care notes.
- **Phase-Based Nutrition & Wellness:** Expandable phase guides (*Rest and Restore*, *Rise and Renew*, *Shine and Connect*, *Slow and Steady*) with vegetarian and non-vegetarian alternatives.
- **Insights, Export & Account Deletion:** Recharts visualizations strictly from database records, JSON & CSV personal data export, timezone-aware in-app + optional browser notifications, and cascading account deletion.
- **Zero Admin Dashboard:** Strictly personal user-owned records with no admin roles, admin routes, or cross-user visibility.

---

## Project Structure

- `shared/` — Domain types (`types.ts`), cycle calculation engine (`cycleEngine.ts`), and seeded phase nutrition data (`nutritionData.ts`).
- `server/` — Express app (`app.ts`), env config (`config.ts`), Mongoose models (`models/mongoose.ts`), unified DB service (`db/database.ts`), cycle/notification service (`services/cycleService.ts`), Brevo email service (`services/emailService.ts`), security middleware (`middleware/auth.ts`), and REST API routers (`routes/*`).
- `server.ts` — Full-stack entry point serving API routes + Vite dev middleware or production `dist/`.
- `src/` — React frontend pages, components, context providers, and typed API helper.
- `tests/` — Vitest unit tests (`cycleEngine.test.ts`) and API integration tests (`api.integration.test.ts`).

---

## 1. Installing Dependencies

```bash
npm install
```

## 2. Configuring Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Configuring MongoDB Atlas
1. Create a free M0 cluster in [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and add your IP (or `0.0.0.0/0` for cloud hosts) to Network Access.
3. Set `MONGODB_URI` in `.env`:
   ```env
   MONGODB_URI="mongodb+srv://<username>:<password>@<cluster>.mongodb.net/bloom?retryWrites=true&w=majority"
   ```
   *(If `MONGODB_URI` is left blank in local development, Bloom stores data persistently in `./data/bloom.sqlite`.)*

### Configuring Brevo Email
1. Create a free account on [Brevo](https://www.brevo.com/), verify your sender email address, and create an API v3 key.
2. Set in `.env`:
   ```env
   EMAIL_PROVIDER=brevo
   BREVO_API_KEY="xkeysib-..."
   EMAIL_FROM="verified-sender@yourdomain.com"
   EMAIL_FROM_NAME="Bloom"
   ```
   *(When `BREVO_API_KEY` is omitted in development, Bloom transparently notes that live email is unconfigured and surfaces a preview OTP so verification and password recovery can still be tested.)*

## 3. Running Locally

```bash
npm run dev
```
The full-stack app runs at `http://localhost:3000`.

## 4. Running Tests & Type-Checking

```bash
npm run lint
npm test
```

## 5. Building for Production

```bash
npm run build
npm start
```

## 6. Deploying to Live Hosting (Free Tier)

Bloom runs as a single Node.js service serving both the REST API and the built Vite frontend (`dist/`), which avoids cross-origin cookie issues:

1. **Render / Railway / Fly.io (Recommended Full-Stack Host):**
   - Connect your Git repository.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Set environment variables: `NODE_ENV=production`, `PORT=3000` (or host default), `SESSION_SECRET`, `MONGODB_URI`, `APP_URL`, `CORS_ORIGIN`, `EMAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME=Bloom`.
   - Health check path: `/api/health` and readiness `/api/ready`.
2. **Split Hosting (Vercel Frontend + Render/Railway Backend):**
   - If hosting the frontend separately, configure `CORS_ORIGIN` to the exact frontend origin and ensure HTTPS is enabled so `Secure; SameSite=Lax` cookies work cleanly.
