# Stackly

Non-custodial dollar-cost averaging (DCA) on Stellar. MVP, Sprint 1, **Testnet only**: connect wallet → sign in →
create DCA position → deposit USDC → sign purchases → activate → keeper submits each due swap → dashboard updates.
PRD: https://docs.google.com/document/d/1S5PLcwsOmR-oyoCTnClxQRchN2iv3pExmDKbkZ_Lb1s. Backend (separate repo, external
dev): https://api.usestackly.app/docs (OpenAPI at `/docs-json`). **Scope, status and decisions: `docs/PLAN.md`. Test
scenarios and the last live run: `docs/TESTING.md`.** Structure mirrors the Stellance reference repo
(github.com/usestellance/stellance-v3).

**Architecture (backend, accepted in place of the PRD's Soroban contract):** each DCA position has its own classic
Stellar account; the project funds its reserve and the owner's wallet is its only signer. Deposits are payments into
it. Purchases are swap transactions the wallet pre-authorizes in batches (≤ 19 unused per account) with the amount,
minimum output, destination and earliest time fixed on chain; the backend's keeper submits them to the Stellar DEX
when due. Pause / resume / cancel are backend state (already-signed purchases stay valid on chain).

## Monorepo

Turborepo + pnpm 12 (`packageManager`), Node ≥ 22.

```
apps/landing/       (:3002) public site, PRD Screen 1
apps/web/           (:3000) the app, Screens 2–12: /overview (+ wallet modal), /vaults/*, /transactions, /portfolio, /settings
apps/admin/         (:3001) operations dashboard: overview, users, positions, purchases, ledger, reconciliation, audit, system
packages/ui/        @repo/ui — design tokens, shadcn components, motion, fonts, the social card
packages/stellar/   @repo/stellar — network constants, assets, the UI data model (vault.ts), stroop formatting
packages/eslint-config, packages/typescript-config
```

`pnpm dev` (both apps) · `pnpm build` · `pnpm check-types` · `pnpm lint` · `pnpm format` (prettier: tabs, width 130) ·
`pnpm --filter web e2e:live` (live end-to-end run on Testnet, `apps/web/scripts/e2e-live.mts`).

## Deployment (Vercel Services)

One Vercel project, routed by the root `vercel.json`: `/app` and `/app/*` → `apps/web`, `/admin` and `/admin/*` →
`apps/admin` (`basePath: "/admin"` on Vercel; `ADMIN_BASE_PATH=""` for its own domain), everything else →
`apps/landing`. Production: **https://usestackly.app** (landing) · https://usestackly.app/app (the app); dev host
https://stackly-topaz.vercel.app. `apps/web` sets `basePath: "/app"` on every Vercel build (`VERCEL` is set); set
`APP_BASE_PATH=""` once the app has its own domain. `src/lib/site.ts` in each app picks https://usestackly.app in
production for canonical / OG URLs. Landing links into the app with plain `<a>`s to `APP_URL` (`/app`) and redirects
bare app paths (`/overview`, `/vaults/*`…) to `/app/…`. Turborepo only passes declared env vars to builds: keep
`VERCEL`, `APP_BASE_PATH`, `ADMIN_BASE_PATH` and `API_PROXY_TARGET` in `turbo.json`.

## Stack

Next.js 16 (App Router, React Compiler, Turbopack), React 19, Tailwind v4, shadcn/ui (Radix) in `@repo/ui`, TanStack
Query, zustand, react-hook-form + zod 4, axios, lucide, sonner, recharts 2, `@stellar/stellar-sdk`,
`@creit.tech/stellar-wallets-kit`.

## Data (`apps/web/src/lib/api`)

- **Live backend only** (no mock). The browser calls `<basePath>/api/v1/*`, which `next.config.ts` rewrites to
  `https://api.usestackly.app/v1/*` (`API_PROXY_TARGET`): the backend sends no CORS headers for browser origins.
  Envelope `{ statusCode, message, data }`; lists `{ results, paginationMeta }` with `limit` / `offset`; errors
  `{ statusCode, code, message, details?, requestId }` (`errorMessage()` in `errors.ts`).
- **Layers:** `dto.ts` (backend shapes) → `adapters.ts` (→ the UI model in `@repo/stellar/vault`: snake_case, amounts
  as stroop strings, ISO → unix) → `endpoints.ts` (every read) and `flows.ts` (every write). Endpoints and flows are
  plain functions of an axios instance (+ a `Signer`), so `scripts/e2e-live.mts` runs the exact same code with a
  Testnet keypair. Screens use them through hooks (`features/*/hooks.ts`) and `features/vaults/client.ts`.
- **Auth** (`auth.ts`, `features/auth`): `POST /auth/challenge` → wallet `signMessage` (SEP-53, base64) →
  `POST /auth/login` → access + single-use refresh token, persisted in `stackly-session`. `client.ts` adds the bearer
  token and does one shared refresh on 401 (never in parallel), then clears the session; `WalletGate` then reopens the
  connect modal at "Sign in again". `useSignOut()` revokes the refresh token.
- **Writes** (`flows.ts`): create = `POST /dca-positions` + `POST …/account`; deposit = wallet payment of the source
  asset to the position account, then `POST …/ledger/sync`; sign purchases = `POST …/authorizations {count}` → wallet
  signs + submits the XDR to Horizon → `POST …/authorizations/sync`; activate / pause / resume / cancel = plain POSTs;
  withdraw = `POST …/withdrawals` → sign + submit → ledger sync; make up a missed purchase = `POST …/retry-missed` +
  a fresh signed batch; USDC trustline = `changeTrust` signed by the wallet. Horizon result codes become readable
  errors (`TrustlineMissingError`, `InsufficientFundsError`). Mutations never auto-retry.
- **Wallet** (`features/wallet/kit.ts`): Stellar Wallets Kit v2, lazy-imported, Testnet only (refuses another network).
  Varial (formerly Freighter, https://docs.varialwallet.com; kit ids keep `freighter`) is recommended. Desktop: the
  Varial extension (install prompt when missing), Varial Mobile by QR (WalletConnect → Reown AppKit, project id
  `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`; needs HTTPS), xBull. Phones: Varial Mobile only; Stackly opens the app
  (`freighterwallet://wc-redirect/wc?uri=…`) and, if the page is still in front after ~2.5 s, offers the App Store /
  Play link (no browser can tell whether an app is installed). Inside Varial's in-app browser (`window.stellar.platform
  === "mobile"`) only Varial is offered. Every wallet must support `signMessage` (sign-in), so no Albedo / Rabet.
  `walletSigner(address)` is the `Signer` for flows. Never request, store, log or render a secret key.
- `useVaultTx()` stages: `signing → submitting → confirmed`, or `rejected` (declined, nothing sent) / `failed`; it
  invalidates every affected query. Actions without a signature call `onSigned` immediately.
- **Settings**: default slippage and muted notifications are server-side (`GET/PATCH /settings`); review-before-sign
  and open-explorer are local (`stackly-preferences`). Notifications: `GET /notifications` (bell + `Notifier` toasts).
- **Amounts** are stroop strings in the UI; the backend takes and returns 7-decimal strings. Convert only at the edges
  (`decimalToStroops` in adapters, `decimal()` in `vaults/client.ts`); never do money maths in floating point.

## Admin (`apps/admin`)

- Backend routes tagged Admin · Reconciliation · Audit (`/admin/*`, `/reconciliation*`, `/audit-logs*`) plus `/health`
  (proxied at `<basePath>/api/health`). Shapes in `src/lib/api/dto.ts`, one function per route in `endpoints.ts`.
- Sign-in is the same wallet flow as the app (Varial extension / Varial Mobile / xBull, a small `features/wallet/kit.ts`;
  sign message only), session in `stackly-admin-session`. `AdminGate` lets only `GET /auth/me` `role: "admin"` through;
  admins are promoted by another admin (`PATCH /admin/users/{id}/role`) or `ADMIN_WALLET_ADDRESSES` on the backend.
- List filters live in the URL (route files read `searchParams`, `lib/params.ts`); `DataList` renders a table from `md`
  (`xl` for > 6 columns) and stacked cards below; filters fold behind a button on phones. Sidebar from `lg`, drawer below.
- Writes: role change, keeper / indexer run, ledger repair (books `adjustment` rows, moves no funds): always confirmed.

## Domain rules (PRD, as implemented by the backend)

- Testnet assets only. One pair: Testnet USDC (Circle, `GBBD47…LFLA5`) → XLM, from `GET /assets`.
- "Monthly" is a fixed 30-day interval; say so wherever it's chosen or shown (`MONTHLY_NOTE`).
- Review shows `EXECUTION_DISCLAIMER` plus the backend preview's `notices`.
- Show each asset's holdings separately; no summed value, P/L or returns. Average price = cost from real executions.
- Failed purchases debit nothing and aren't retried automatically (one attempt per interval); the owner can make up a
  retryable one. An active position with no signed purchases left can't run ("Needs signatures").
- Statuses: position `pending · active · paused · cancelled · completed`; execution `submitted · completed · failed ·
  skipped` (+ derived `scheduled` / `eligible`); history `deposit · swap · withdrawal · failed_execution ·
  adjustment`. Labels, tones and failure-reason copy live only in `features/vaults/status.ts`. Backend ids are UUIDv7;
  show `shortId()`.

## Design system (`packages/ui`)

Source: Figma `STACKLY` (file key `9h2UJAxm3uZYfaeCZgwVsz`); node ids per screen and state in `docs/DESIGN-PLAN.md`.
Tokens in `src/styles/globals.css`: `ink` #270C0F (text, dark buttons), `night` #0E0405 (stat cards), `coral` #FF6173
(accent; `coral-ink` for small coral text), `blush` / `rose` / `peach` (notices, chips), `muted` (secondary text),
`subtle`, `line`, `page` #FAFAFA, plus `success` / `warning` / `danger` (+ `-bg`). Radii `rounded-card` 14,
`rounded-panel` 24, pills `rounded-full`. Use token names, never hex. Font: **Source Sans 3**, self-hosted via
`@fontsource/source-sans-3` (imported in each app's root layout; OG cards read the woff files in
`packages/ui/src/assets/fonts/og`). Type utilities: `display`, `h-page`, `h-section`, `h-card`, `stat-value`,
`caption`; layout: `app-container`, `landing-container`, `scroll-row`.

Components: `button` (variants primary · accent · outline · ghost · danger; `isLoading` + `loadingText`), `brand`
(`StacklyMark`, `StacklyLogo`, `StackLoader`), `surface` (`Panel`, `PanelHeader`, `Notice`, `Chip`, `DetailRow` (inside
a `<dl>`), `StatCard`), `field` (`Field`, `PillInput`), `choice` (`Segmented`, `Stepper`), `switch`, `skeleton`,
`spinner`, `dialog`, `select`, `popover`, `sonner`. Import as `@repo/ui/<file>`. Toasts via `useToast()`
(`lib/use-toast.ts`, accepts sonner options: description, action).

Motion (CSS, all off for reduced motion): `.animate-rise` (stagger with `style={{ "--i": n }}`), `.animate-page`
(every `template.tsx`), `.animate-pop` (a settled result), `.animate-signal` (only while waiting on the network or
wallet), `.animate-check` (drawn tick), `.animate-stack` (`StackLoader`: the mark's layers dropping into place),
`.animate-float`, `.shimmer` (skeletons), `.reveal` (landing scroll-in via `Reveal`), and `AnimatedNumber` / `Amount`
for stats. Wallet-signed actions show `TxProgress` (Approve in wallet → Submitting → Confirmed).

## Conventions

- Feature folders: `src/features/<domain>/{hooks.ts, components/, store.ts, schema.ts, status.ts, client.ts}`.
  `src/app/**` pages stay thin; layout pieces in `src/components/layouts`, providers in `src/components/providers`.
- Route files are server components that set `metadata` and await `params` / `searchParams`, then render one client
  feature component with plain props (no `useSearchParams`).
- Every data screen handles loading (skeletons matching the Figma "Loading" frames), empty, error (`ErrorState` with
  retry) and not-found (`VaultNotFound`). App-wide: `loading.tsx` (`StackLoader`), `error.tsx` / `global-error.tsx`
  (`ErrorScreen`), `not-found.tsx`.
- Check responsive layouts at 390 and 1440 wide (the Figma frame widths).
- Imports use `@/…` inside an app and `@repo/<pkg>/…` across packages, never long `../../..` chains.
- Named exports for components; route files keep default exports.
- Every `<form>` using `form.handleSubmit` needs `noValidate`.
- Never `setState` synchronously in `useEffect`, and never read `ref.current` during render.
- A component using `useSearchParams` needs a `<Suspense>` boundary above it.
- Flex children that hold tables or long text need `min-w-0`.

## Landmines

1. pnpm strict linking: a package imported in a file must be a dependency of _that_ workspace package. `next/*` imports
   stay in the apps, never in `@repo/*` packages.
2. Restart the dev server after `pnpm install`.
3. New dependency with build scripts → list it under `allowBuilds` in `pnpm-workspace.yaml`.
4. Never run `next build` into `.next` while `pnpm dev` runs. Use `NEXT_DIST_DIR=.next-verify npx next build`.
5. Next 16 error boundaries get `retry()` (not `reset()`). Route params are Promises (`PageProps<"/route/[id]">`).
6. Keep all `@radix-ui/*` packages on the same release. `recharts` stays on 2.x.
7. App tsconfigs target ES2020: `@repo/stellar` uses BigInt literals.
8. Stellar Wallets Kit touches `window` on import: only import it dynamically from client code (`kit.ts`).
9. `muted` is the text token; don't reintroduce shadcn's `--color-muted` mapping (it made secondary text invisible).
10. No `Date.now()` during render (React Compiler purity lint); use `useNow()` (`lib/clock.ts`).
11. Zustand v5 selectors must return stable values: select fields one by one, never `(s) => ({ … })` (render loop).
12. Refresh tokens are single-use: only `client.ts` refreshes, through one shared promise.
13. The backend docs say the sign-in prefix is `"Stellar Signed Message: "`; the backend actually verifies SEP-53
    (`"Stellar Signed Message:\n"`), which is what wallets sign. Don't "fix" the e2e script to match the docs.
