# Stackly MVP — Sprint 1 plan

Source: the PRD (Google Doc linked from CLAUDE.md). This file tracks scope, where each piece lives, and what's done.

**Definition of done (PRD §22):** a user connects a Stellar wallet, creates a DCA position, deposits test USDC into the
Soroban vault, and observes **at least two distinct scheduled swap executions triggered by the keeper**. The contract
enforces amounts, intervals, supported assets and withdrawal permissions; the user can pause/resume, see holdings and
withdraw. Priority: Vault Funding → DCA Configuration → Keeper Trigger → Contract Validation → Swap Execution →
Portfolio Update, on one pair (Testnet USDC → XLM).

## Architecture

```
 Browser (apps/web)                       Stellar Testnet                       Off-chain
 ─────────────────                        ───────────────                       ─────────
 Wallets Kit ── signs ──► create/deposit/ ──► dca-vault ──swap──► swap-adapter
                          pause/withdraw         │  events
 read API (/api/v1) ◄── Supabase ◄── indexer ◄───┘                apps/keeper
                                     keeper ── execute(id, interval) ──► dca-vault
```

- The **contract** is the source of truth and enforces every rule. The database is a cache the indexer reconciles.
- The **keeper** holds one key, which can only call `execute`. It never sees user keys.
- The **web app** reads through its own `/api/v1` route handlers and writes through the user's wallet.

## Screens → routes

Design (Figma), build order and PRD-vs-design gaps: [DESIGN-PLAN.md](DESIGN-PLAN.md).

| PRD screen | Route | Status |
|---|---|---|
All screens are built to the Figma design on mock data, desktop and mobile, with their loading / empty / error /
validation states and the pending + success states the design lacked. Live data needs Module 4 (writes) and Module 7
(reads).

| PRD screen | Route | Status |
|---|---|---|
| 1 Landing | `apps/landing` `/` | Built (+ supported assets, how it works, purchase preview, vault explainer, JSON-LD) |
| 2 Wallet Connection | modal over `/overview` (`/connect` redirects) | Built: picker, connecting, not detected, rejected, connected |
| 3 Main Dashboard | `/overview` | Built; "Active strategies" lists every vault incl. paused / not started |
| 4 Create DCA Vault | `/vaults/create` | Built (+ name, planned deposit, 30-day note) |
| 5 Review DCA Strategy | `/vaults/create/review` | Built; Confirm is a signed create with progress |
| 6 Deposit Funds | `/vaults/[vaultId]/deposit` (`?flow=create`) | Built (+ confirmed state, Explorer, signed "Start schedule") |
| 7 Active DCA Position | `/vaults/[vaultId]` | Built (+ paused state, Resume, low-balance warning) |
| 8 Swap Execution Details | `/vaults/[vaultId]/executions/[executionId]` | Built for all six statuses, timeline |
| 9 Transaction History | `/transactions` (`?vault=`) | Built: type / asset / status / date / search filters, table + mobile cards |
| 10 Portfolio Overview | `/portfolio` | Built (units and execution prices only) |
| 11 Withdraw Funds | `/vaults/[vaultId]/withdraw` | Built (+ review toggle, confirmed state) |
| 12 Settings | `/settings` | Built (+ network row; preferences stored locally) |

## Modules

### Module 1 — DCA vault contract (`contracts/dca-vault`)
- [x] Interface, types, error codes, event table, test list (`src/test.rs`, all `#[ignore]`)
- [ ] Storage + `initialize`, `add_pair`, `create_position`, `deposit`, `activate`/`pause`/`resume`
- [ ] `execute` with interval, duplicate, balance and slippage enforcement; balances untouched on a failed swap
- [ ] `withdraw` (owner only, ≤ available, to owner)
- [ ] Events; unit tests for every PRD §19 contract scenario
- [ ] Testnet deployment; record the contract id here

### Module 2 — Swap integration (`contracts/swap-adapter`)
- [ ] **Decision needed:** verify a Soroban DEX router on Testnet supports contract-to-contract USDC→XLM swaps with
      usable liquidity. If yes, the adapter forwards to it; if not, deploy a labelled Testnet liquidity adapter and
      document the limitation here (PRD §11).
- [ ] `quote`, `swap` (fails without moving funds below `min_out`), `kind`

### Module 3 — Keeper (`apps/keeper`)
- [x] Loop, config, idempotent claim per (position, interval), result recording
- [ ] `executeOnChain` via `@stellar/stellar-sdk`; retry policy for `RetryableError`
- [ ] Hosting (PRD: "Keeper Hosting", separate from Vercel)

### Module 4 — Wallet & vault integration (`apps/web/src/features`)
- [x] Wallets Kit connection, persisted wallet, `WalletGate`
- [x] `VaultClient` seam with the mock implementation
- [ ] Live `VaultClient`: contract bindings (`stellar contract bindings typescript`), sign, submit, confirm, tx hash
- [ ] Wallet balances from Horizon in live mode

### Module 5 — Dashboard · Module 6 — Portfolio
- [x] Query hooks for positions, executions, transactions, portfolio, clock
- [x] Screens, on mock data (see the table above)

### Backend contract for the API developer
The web app reads these endpoints under `/api/v1` (`apiRoutes` in `apps/web/src/lib/routes.ts`); the response shapes
are exactly what `packages/mock-api/src/handlers/*` return, wrapped in `{ status_code, message, data }`:
`GET /clock` · `GET /wallets/:address` · `GET /positions?owner=` · `GET /positions/:id` · `GET /positions/:id/executions`
· `GET /executions?owner=&limit=` · `GET /executions/:id` · `GET /transactions?owner&type&status&asset&position_id&from&to&q&page&limit`
(→ `{ items, meta }`) · `GET /portfolio?owner=`. Types: `packages/stellar/src/vault.ts`. Writes are contract calls
(`VaultClient`), not endpoints.

### Module 7 — Monitoring / indexer
- [x] Database schema (`supabase/migrations/0001_init.sql`)
- [ ] Event indexer + reconciliation (`apps/keeper/src/indexer.ts`)
- [ ] `/api/v1` route handlers replacing the 501 catch-all

## Open decisions

1. **Swap mechanism** (Module 2, above). Blocks Module 1's `execute`.
2. **Dependency versions**: `@stellar/stellar-sdk`, `@creit.tech/stellar-wallets-kit`, `@supabase/supabase-js` and
   `soroban-sdk` ranges were set at scaffold time without network access to npm/crates.io; confirm on first install.
3. **Keeper host** (Railway, Fly, a VPS…).
4. **Domains** for landing and app (set `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL`, extend `vercel.json`).

## Out of scope (PRD §20)

Mainnet, real-value transactions, custody, other chains, advanced portfolio management, multiple DEXs, advanced
strategies, leverage, yield farming, native mobile apps, tax reporting, production audits.
