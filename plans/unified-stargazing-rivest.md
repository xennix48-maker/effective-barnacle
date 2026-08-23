# Plan: Standalone `/admin.html` Entry for Btcak Admin

## Context

The user is locked out of admin: existing `/admin`, `/admin67`, `/access` routes all live inside the Telegram-WebApp-only `HashRouter` SPA (`web/src/routes.tsx:45-57`). `useAuth.ts:57` returns `outsideTelegram:true` when `getInitData()` is empty, and `AdminLayout.tsx:27` redirects on `!isAdmin` — so opening the URL from a normal browser shows "Sign-in required" and bounces. The DB has two non-admin users (`565959993`, `298662777`); no `auth.users` row exists yet for the new admin telegram_id `8915316853`.

Goal: ship a `/admin.html` that opens directly in any browser, lets the admin sign in with **email + password**, and shows the same admin pages (Dashboard, Purchases, Drops, History, Users, UserDetail, Settings) without touching the Telegram-WebApp code path.

Outcome: admin can `https://biteporn.vercel.app/admin.html` → email/password → full admin panel; main mini-app keeps working unchanged from Telegram WebApp.

---

## 1. Auth bootstrap (one-time)

Create the `auth.users` row for `tg_8915316853@btcak.local` and set `public.users.is_admin = true`. Going through `tg-auth` requires Telegram's signed initData; direct `INSERT INTO auth.users` is brittle (encrypted_password format, GoTrue triggers). Cleanest path is a one-shot edge function callable with the service role key.

### New: `supabase/functions/bootstrap-admin/index.ts`

Service-role-only POST. Body: `{ email, password, telegram_id }`.

```ts
// Creates auth.users via admin API, upserts public.users with is_admin=true.
// Idempotent: re-running on an existing email resolves the user_id and re-upserts.
// Service-role-gated — never expose to anon.
```

Deploy via `mcp__supabase__deploy_edge_function` once, then invoke via curl. After invocation the function can be removed (currently no MCP delete, leave auth check in place).

---

## 2. Vite multi-entry

### Modify: `web/vite.config.ts`

Add a second rollup input. Both entries share the React vendor chunk automatically (Vite default heuristics).

```ts
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      admin: resolve(__dirname, 'admin.html'),
    },
  },
},
```

---

## 3. New admin entry points (5 files)

### New: `web/admin.html`
HTML shell — same `<div id="root">` as `index.html`, **omits** the Telegram WebApp CDN script (no TWA needed for admin). Loads `/src/admin-main.tsx`.

### New: `web/src/admin-main.tsx`
Mounts `<AdminApp />` into `#root`. Skips the `ConfigGate` wrapper — admin handles missing-config inline. Imports `./styles/global.css` to reuse the existing dark theme + utility classes.

### New: `web/src/AdminApp.tsx`
Owns its own `BrowserRouter` so URLs are clean (`/admin/purchases`, not `/#/admin/purchases`). Routes:
- `/admin/login` → `Login`
- `/admin` → `AdminShell` with nested `<Outlet />` for `Dashboard`, `Purchases`, `Drops`, `Transactions`, `Users`, `users/:id`, `Settings`
- `*` → redirect to `/admin`
- `<ToastHost />` mounted at root.

Reads `isSupabaseConfigured` early and renders an inline error panel if env missing.

### New: `web/src/hooks/useAdminAuth.ts`
Email/password-aware auth hook. Reuses `supabase.auth.getSession` + `onAuthStateChange`. Derives `isAdmin` from `fetchUserProfile(session.user.id)` (self-read RLS always works — belt-and-suspenders against the Custom Access Token Hook not firing on password grant). Does NOT call `signInWithTelegram`.

```ts
export type AdminAuthState = { loading, session, user, isAdmin };
export function useAdminAuth(): AdminAuthState { … }
```

### New: `web/src/pages/admin/AdminShell.tsx`
Parallel to existing `AdminLayout.tsx` (kept untouched for the TWA flow). Same tab list (Dashboard, Purchases, Drops, History, Users, Settings). Differences:
- Reads from `useAdminAuth`, not `useAuth`.
- Redirects `!session` or `!isAdmin` to `/admin/login`.
- Sign-out button → `supabase.auth.signOut()` + `navigate('/admin/login')`.

### New: `web/src/pages/admin/Login.tsx`
Minimal email/password form using `supabase.auth.signInWithPassword({ email, password })`. On success, navigates to `/admin` (or `location.state.from`). On error → `pushToast`.

---

## 4. Vercel routing

### Modify: `vercel.json`

Order matters — admin-specific rewrites first, catch-all last. Headers get their own stricter CSP for `/admin*` (no Telegram, `frame-ancestors 'self'` only) and the original Telegram-friendly headers stay on the catch-all.

```json
"rewrites": [
  { "source": "/admin.html", "destination": "/admin.html" },
  { "source": "/admin(?:/.*)?$", "destination": "/admin.html" },
  { "source": "/(.*)", "destination": "/index.html" }
]
```

The `/admin(?:/.*)?$` regex anchors end-of-string so `/admin67` and `/access` (TWA aliases) fall through to `index.html`, preserving the HashRouter redirects in `routes.tsx:56-57`.

Headers — two header blocks: one for `/admin*` with no Telegram in CSP, one for `/(.*)` with the original Telegram-friendly CSP.

---

## 5. Verification

```bash
# Build
cd web && npm run build
ls web/dist/                        # expect: admin.html, index.html, assets/

# Local preview
cd web && npm run preview &          # http://localhost:4173

# Static asset checks
curl -sI http://localhost:4173/admin.html           # 200, content-type text/html
curl -s  http://localhost:4173/admin.html | grep admin-main   # script tag present

# Auth flow
# (after bootstrap-admin run + password set on the user)
curl -X POST "https://ktbhtglybkrahqaxhmrp.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"tg_8915316853@btcak.local","password":"<pw>"}'
# Expect: access_token. Decode JWT and confirm is_admin:true claim is injected.

# RLS smoke test with the access_token:
curl "https://ktbhtglybkrahqaxhmrp.supabase.co/rest/v1/users?select=id,is_admin&limit=2" \
  -H "apikey: $ANON" -H "Authorization: Bearer <access_token>"

# Final E2E in browser: https://biteporn.vercel.app/admin.html → sign in → click each tab.
```

---

## Risks

| Risk | Mitigation |
|---|---|
| Custom Access Token Hook inactive on password grant → JWT has no `is_admin` claim | `useAdminAuth` derives `isAdmin` from `fetchUserProfile` (self-read RLS), not the JWT claim. |
| Vercel regex matches `/admin67` or `/adminpanel` accidentally | Regex anchored at end-of-string after `/admin`; `/admin67` does not match. |
| Shared chunk bloat — admin pulls `@twa-dev/sdk` transitively | SDK is no-op-safe outside TWA. Optimize later if size matters. |
| Auth state shared between main app and admin (same Supabase localStorage) | Acceptable for sole-admin threat model. Sign-out from admin signs out from main. |
| First sign-in race — brief "not admin" flash while `useAdminAuth` resolves | Self-corrects in ~50ms. Acceptable. |

---

## File summary

**New (7):**
- `supabase/functions/bootstrap-admin/index.ts`
- `web/admin.html`
- `web/src/admin-main.tsx`
- `web/src/AdminApp.tsx`
- `web/src/hooks/useAdminAuth.ts`
- `web/src/pages/admin/AdminShell.tsx`
- `web/src/pages/admin/Login.tsx`

**Modified (2):**
- `web/vite.config.ts`
- `vercel.json`

**Unchanged:** all existing `web/src/pages/admin/*.tsx` page components, `web/src/lib/api.ts`, `web/src/lib/supabase.ts`, `web/src/hooks/useAuth.ts`, `web/src/routes.tsx`, existing `AdminLayout.tsx`. The TWA HashRouter path keeps working as-is.

---

## Open question (will resolve at execution time)

Initial admin password: I'll generate a 24-char random one and post the plaintext once in chat. User can rotate it via Supabase dashboard later (no `/change-password` endpoint in scope).
