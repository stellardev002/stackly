# Stackly

Non-custodial dollar-cost averaging (DCA) vault on Stellar / Soroban. MVP, Sprint 1, **Testnet only**: connect wallet →
create DCA position → deposit USDC → activate → keeper triggers a due swap → contract validates → swap executes →
dashboard updates. PRD: https://docs.google.com/document/d/1S5PLcwsOmR-oyoCTnClxQRchN2iv3pExmDKbkZ_Lb1s.
**Scope, screen→route map, module status and open decisions: `docs/PLAN.md`. Test scenarios: `docs/TESTING.md`.**
Structure mirrors the Stellance reference repo (github.com/usestellance/stellance-v3); when in doubt about a
convention, check how it did it.

## Monorepo

Turborepo + pnpm 12 (`packageManager`), Node ≥ 22. Rust + Stellar CLI for `contracts/`.

```
apps/landing/       (:3002) public site, PRD Screen 1
apps/web/           (:3000) the app, Screens 2–12: /overview (+ wallet modal), /vaults/*, /transactions, /portfolio, /settings
apps/keeper/        Node keeper: executes due intervals (Module 3), indexes contract events (Module 7)
packages/ui/        @repo/ui — design tokens, shadcn components, motion, fonts, the social card
packages/stellar/   @repo/stellar — network constants, supported assets, vault data model, stroop formatting
packages/mock-api/  @repo/mock-api — the in-browser demo backend (axios adapter + seed data)
packages/eslint-config, packages/typescript-config
contracts/          Cargo workspace: dca-vault (Module 1), swap-adapter (Module 2). Not a pnpm package.
supabase/           Indexer database migrations
```

`pnpm dev` (all) · `pnpm build` · `pnpm check-types` · `pnpm lint` (packages and keeper: `--max-warnings 0`) ·
`pnpm format` (prettier: tabs, width 130) · `pnpm contracts:test` · `pnpm contracts:build`.

## Stack

Next.js 16 (App Router, React Compiler, Turbopack), React 19, Tailwind v4, shadcn/ui (Radix) in `@repo/ui`, TanStack
Query + Table, zustand, react-hook-form + zod 4, axios, lucide + react-icons, sonner, recharts 2,
`@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`, Supabase (keeper + API route handlers), Soroban (Rust).

## Data

- **Source switch** (`apps/web/src/lib/api/source.ts`): **mock by default** until the indexer API exists.
  `NEXT_PUBLIC_API_SOURCE=live` switches to live. Mock mode answers every read *and* write in the browser from
  `@repo/mock-api` (installed as an axios `adapter`), and keeps one JSON document in localStorage
  (`stackly-mock-db`). The seed tells the Figma story (STK-001 "The weekly stack", four 50 USDC → 200 XLM buys, one
  slippage failure + retry) with dates relative to the first run.
- **Simulation** (`packages/mock-api`): `keeper.ts` is a simulated keeper + contract run on every request (Eligible →
  Submitted → Completed / Failed / Skipped, with the contract's rules); `sim.ts` is the demo-controls API (demo clock
  and "Skip to next purchase", next wallet request approve/reject, next swap success/slippage/liquidity, wallet
  installed, story vs new account, forced slow/error screens, reset). The **Demo controls** button
  (`features/demo`, mock only, bottom-left) drives it. `pnpm --filter @repo/mock-api check:flow` runs the PRD §19
  scenarios against it. Mock hashes start with `demo` and the UI never links them to an explorer.
- **Reads** go through `api` (`lib/api/client.ts`) to `/api/v1/*`: this app's own route handlers
  (`src/app/api/v1`, currently a 501 catch-all) querying the indexer database. Endpoints are listed in `apiRoutes`
  (`lib/routes.ts`); `@repo/mock-api` handlers define the response shapes.
- **Writes** are never API calls in live mode: every create / deposit / activate / pause / resume / withdraw is a
  Soroban contract call the user signs in their wallet. `features/vaults/client.ts` (`VaultClient`) is the one seam;
  hooks in `features/vaults/hooks.ts` only use it. Mutations never auto-retry (`retry: false`).
- **Wallet**: `features/wallet/kit.ts` wraps Stellar Wallets Kit (lazy-imported, browser only) behind a custom
  picker (`listWallets`, `connectWallet`). Freighter, xBull and Albedo are always the **real extensions on Testnet**
  (connect refuses another network); mock mode adds a **Demo wallet** (`walletId: "demo"`, simulated prompt driven by
  the demo controls). With a real wallet and mock data, every vault write asks the extension to sign a real no-op
  Testnet transaction (`bumpSequence` to 0, memo "Stackly deposit STK-002", `features/wallet/testnet.ts`); its hash
  is stored on the record and opens on Stellar Explorer, while balances stay demo data (`sim.ensureWallet` gives the
  address 2,500 demo USDC). Unfunded accounts get a Friendbot button (connect step, wallet menu). Only `demo…` hashes
  are treated as off-chain (`isDemoHash`). `features/wallet/store.ts` persists the address
  + wallet id (`stackly-wallet`). With no wallet, `WalletGate` shows `ConnectModal` over a blurred dashboard (Screen 2
  is a modal; `/connect` redirects). Never request, store, log or render a secret key.
- **Writes** go through `useVaultTx()` (`features/vaults/hooks.ts`): stage `signing → submitting → confirmed` or
  `rejected` (declined in wallet, nothing sent) / `failed`. It invalidates every affected query on success.
- **Preferences** (`features/settings/store.ts`, localStorage `stackly-preferences`): default slippage, in-app
  notification toggles (used by `Notifier`), review-before-sign, open-explorer. No notification backend exists.
- **Amounts** are stroop strings everywhere (i128 on chain, 7 decimals). Convert only at the edges with
  `toStroops` / `fromStroops` (`@repo/stellar/format`); never do money math in floating point.
- Shared types: `@repo/stellar/vault` mirrors `contracts/dca-vault/src/types.rs` and `supabase/migrations`. Change all
  three together.

## Domain rules (PRD)

- Testnet assets only. One pair: Testnet USDC → XLM, from `SUPPORTED_PAIRS` (`@repo/stellar/assets`).
- "Monthly" is a fixed 30-day interval; say so wherever it's chosen or shown (`MONTHLY_NOTE`).
- Review must show `EXECUTION_DISCLAIMER`: prices vary, purchases can fail, a failed purchase spends nothing.
- Show each asset's holdings separately; no summed value, P/L or returns without a reliable price source. Never present
  simulated returns as performance.
- **A simulated swap is never presented as a live DEX execution.** Mock mode is labelled "demo data"; a Testnet
  liquidity adapter is labelled as such (`swap-adapter` `kind()`).
- The keeper can only trigger a due interval: it can't withdraw, change parameters or recipients, execute early,
  exceed the amount, or bypass slippage. The contract enforces this; the keeper never relies on its own checks.
- Statuses: position `created · active · paused · closed`; execution `scheduled · eligible · submitted · completed ·
  failed · skipped`; transaction types `deposit · swap · withdrawal · failed_execution`. Labels and colours live only
  in `features/vaults/status.ts`.

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
10. No `Date.now()` during render (React Compiler purity lint); use `useNow()` (`lib/clock.ts`), which follows the
    demo clock in mock mode.
