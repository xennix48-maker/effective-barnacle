# Btcak — Telegram Mini App (Bitcoin Mining Machines)

A Telegram Mini App that sells virtual "Bitcoin mining machines" priced in Myanmar Kyat (MMK). Each machine yields a fixed daily MMK income that accrues **per-second, live, 24/7**. Users buy machines via Wave Money / KBZ Pay, withdraw earnings ("Drop"), and earn referral bonuses. Admins approve purchases / drops and toggle global Drop availability from an in-app Admin Panel.

---

## Stack

- **Frontend**: Vite + React + TypeScript, `react-router-dom` v6 (`HashRouter`), `@twa-dev/sdk`, `@supabase/supabase-js`
- **Backend**: Supabase — Postgres 15, RLS, 3 Edge Functions (Deno/TS), Custom Access Token Hook
- **Hosting**: Vercel (single project; admin routes under `/admin/*` guarded by JWT `is_admin` claim)
- **Auth**: Telegram WebApp `initData` only — HMAC-SHA256 verified server-side, Supabase session minted by `tg-auth`

---

## Per-second math

| Level  | Price MMK | Daily MMK | Rate / sec              |
|--------|-----------|-----------|-------------------------|
| L1     | 25,000    | 2,000     | 0.023148 MMK/s          |
| L2     | 50,000    | 4,000     | 0.046296 MMK/s          |
| L3     | 84,000    | 7,000     | 0.081019 MMK/s          |
| L5     | 130,000   | 11,000    | 0.127315 MMK/s          |
| Super  | 200,000   | 24,000    | 0.277778 MMK/s          |

`1 day = 86,400 s`. Stored as `NUMERIC(18,8)` in Postgres — no floating-point drift.

Live balance is **computed-on-read**: `v_user_balance` view sums `rate_per_sec × EXTRACT(EPOCH FROM (now() − start_time))` over active machines. The client fetches a snapshot every 30 s and interpolates at 1 Hz between fetches — no cron job, no drift.

---

## Setup

### 1. Create Supabase project

The Supabase project creation in this environment was blocked by an OAuth scope issue. Create the project manually:

1. Go to <https://supabase.com/dashboard/new>
2. Organization: `xennix48-maker's Org`
3. Name: `btcak`
4. Region: `ap-southeast-1` (closest to Myanmar)
5. Database password: pick a strong one, save it.

Note the **Project URL** and **`anon` public key** from Project Settings → API.

### 2. Link & push migrations

```bash
# Once: install Supabase CLI
npm install -g supabase

# Link to your remote project
supabase link --project-ref <PROJECT_REF>

# Apply all migrations
supabase db push
```

This applies the five SQL files in `supabase/migrations/` in order.

### 3. Activate Custom Access Token Hook

In Supabase Dashboard:

1. **Authentication → Hooks → Custom Access Token**
2. Toggle **Enable custom access token hook**
3. URI: `pg-functions://postgres/public/custom_access_token_hook`
4. Save.

This wires the JWT to read `users.telegram_id` + `users.is_admin` so RLS works.

### 4. Deploy Edge Functions

```bash
supabase functions deploy tg-auth
supabase functions deploy admin-approve-purchase
supabase functions deploy admin-approve-drop
```

### 5. Set Edge Function secrets

```bash
supabase secrets set BOT_TOKEN=<from @BotFather>
supabase secrets set ADMIN_TG_IDS=<your-telegram-id>
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected.
```

**Find your Telegram ID**: message `@userinfobot` on Telegram.

### 6. Create the Telegram bot

1. Open Telegram, message `@BotFather`
2. `/newbot` → choose a name + username (current value: `BITCOIN_MININGMACHINE_BOT`)
3. Save the **bot token** (used in step 5) and the **bot username** (used in step 7)
4. `/setmenubutton` → text `Open Btcak`, URL = your deployed Vercel domain

### 7. Configure the web app

Create `web/.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_BOT_USERNAME=BITCOIN_MININGMACHINE_BOT
```

### 8. Run locally

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

To test from Telegram, you need a public HTTPS URL. Easiest: `vercel dev`, or `ngrok http 5173` and update the BotFather menu button URL.

### 9. Deploy to Vercel

```bash
cd web
vercel link --yes
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_BOT_USERNAME production
vercel --prod
```

Then update BotFather's menu button URL to your Vercel production domain.

---

## Repo layout

```
.
├── .env.example
├── vercel.json
├── web/                              # Vite + React + TS frontend
│   └── src/
│       ├── lib/                      # supabase, telegram, auth, api, format
│       ├── hooks/                    # useAuth, useLiveBalance, useSettings
│       ├── components/               # BalanceTicker, MachineCard, Toast, etc.
│       └── pages/                    # Home, Buy, MyMachines, Drop, Refer
│           └── admin/                # AdminLayout, Dashboard, Purchases, Drops, Settings, Users
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_init_schema.sql
    │   ├── 0002_rls.sql
    │   ├── 0003_views.sql
    │   ├── 0004_seed.sql
    │   └── 0005_auth_hook.sql
    └── functions/
        ├── _shared/                  # cors, auth (admin guard)
        ├── tg-auth/                  # validate initData → mint session
        ├── admin-approve-purchase/   # approve/reject purchase (+ referral bonus)
        └── admin-approve-drop/       # approve/reject drop (+ balance check)
```

---

## Adding a new admin

1. Have the new admin open the Mini App once (their `users` row is created).
2. Add their Telegram ID to `ADMIN_TG_IDS`:
   ```bash
   supabase secrets set ADMIN_TG_IDS=123456789,987654321
   ```
3. Have them sign out and re-enter the Mini App — the Custom Access Token Hook will inject `is_admin: true` into their next JWT.

---

## Tuning

All editable from `/admin/settings` in the deployed app:

- **Drop toggle** (open/close withdrawals globally)
- **Refer bonus** (default 5,000 MMK per successful referral — no cap)
- **Payment numbers** (Wave + KBZ phone/name)
- **Machine catalog** (price / daily income / active per level)

The "successful referral" trigger is **the referred user's first machine purchase being approved**. Each distinct successful referral credits the bonus — no upper limit, configurable per-bonus amount.

---

## Verification

Local without Telegram: easiest path is `supabase functions serve` and a `DEV_SKIP_HMAC=true` flag — for v1, manual Telegram testing via ngrok is the supported path.

Inside Telegram:
- `/` — live balance ticker (1 Hz)
- `/buy/L1` — submit a purchase; admin approves at `/admin/purchases`; balance starts ticking
- `/machines` — per-machine accrued income grows ~`daily/86400` MMK per second
- `/drop` — toggled by admin; shows waiting card when closed
- `/refer` — `t.me/<bot>?startapp=ref_<tgid>`; on referred user's first approved purchase, referrer sees +1 successful refer + bonus credited
