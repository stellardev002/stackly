# Stackly MVP: Sprint 1 plan

Source: the PRD (linked from CLAUDE.md). Backend: https://api.usestackly.app/docs (built by the backend developer;
this repo is the frontend). Design: Figma, see [DESIGN-PLAN.md](DESIGN-PLAN.md).

**Definition of done (PRD §22):** a user connects a Stellar wallet, creates a DCA position, deposits test USDC into
their vault, and observes at least two distinct scheduled purchases run by the keeper. Purchase amounts, intervals,
supported assets and withdrawal permissions are enforced; the user can pause / resume, see holdings and withdraw.

## Architecture (accepted 2026-10-28)

The backend replaces the PRD's Soroban vault contract with classic Stellar accounts, and this was accepted:

```
 Browser (apps/web)                         Stellar Testnet                        Backend (api.usestackly.app)
 Wallets Kit ── signMessage ─────────────────────────────────────────────────────► /auth (JWT)
           ── signs payment ──► position account (wallet = only signer) ◄── created + reserve funded by /account
           ── signs batch ────► adds pre-authorized swap hashes as signers ◄── prepared by /authorizations
                                position account ──path payment──► Stellar DEX ◄── keeper submits each due swap
 /app/api/v1 (Next proxy) ──────────────────────────────────────────────────────► /v1 reads + state changes
```

- Each pre-signed purchase fixes amount, minimum output, destination and earliest time on chain, so the keeper can
  only submit what the owner signed: no changed amounts, no redirect, no early run, no double run (sequence numbers).
- **Differences from the PRD, accepted:** no Soroban contract (no contract ID or contract unit tests); pause, resume
  and cancel are enforced by the backend, not the chain (signed purchases stay valid until used or their signers are
  removed); a failed purchase isn't retried automatically, the owner can make up a retryable one with a fresh
  signature; at most 19 unused signed purchases per position, so long schedules need re-signing ("Sign more").
- Removed from this repo on acceptance: `contracts/`, `apps/keeper`, `supabase/`, and the mock backend
  (`packages/mock-api`, demo controls). All are in git history (initial commit).

## Screens → routes (live data)

| PRD screen | Route | Backend |
|---|---|---|
| 1 Landing | `apps/landing` `/` | — |
| 2 Wallet connection + sign-in | modal over `/overview` | `/auth/challenge`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| 3 Dashboard | `/overview` | `/dca-positions` (+ `/balance` each), `/portfolio`, `/dashboard`, `/executions` per position |
| 4 Create DCA vault | `/vaults/create` | `/assets`, `/settings` (default slippage) |
| 5 Review strategy | `/vaults/create/review` | `/dca-positions/preview`; confirm → `POST /dca-positions` + `/account` |
| 6 Deposit + sign purchases | `/vaults/[id]/deposit` (`?flow=create`) | `/stellar/balances`, wallet payment → `/ledger/sync`, `/authorizations` (+ `/sync`), `/activate` |
| 7 Position | `/vaults/[id]` | `/dca-positions/{id}`, `/balance`, `/account`, `/executions`, `/pause`, `/resume`, `/cancel`, `/authorizations` |
| 8 Execution | `/vaults/[id]/executions/[eid]` | `/executions/{id}`, `/retry-missed` |
| 9 History | `/transactions` (`?vault=`) | `/history` (type + position filters, offset paging) |
| 10 Portfolio | `/portfolio` | `/portfolio`, `/dashboard` |
| 11 Withdraw | `/vaults/[id]/withdraw` | `/withdrawals` → wallet signs + submits → `/ledger/sync` |
| 12 Settings | `/settings` | `GET/PATCH /settings` |
| — Notifications | bell in the top bar | `/notifications`, `/unread-count`, `/read-all` |

UI changes made for the backend: sign-in step in the connect modal; Review shows the live quote, purchase estimate,
fees and the backend's notices; "Confirm" creates the position and its account (no signature); Deposit adds wallet
readiness (Friendbot, USDC trustline, Circle faucet) and "Sign N purchases & start"; Position shows the vault account,
signed purchases left, "Sign more", cancel; Execution shows failure reasons and "Make up purchase"; History filters
are type and vault only; Settings saves slippage and six notification types to the account; strategy names are
derived ("Weekly USDC → XLM") and ids shown short (`#A1B2C3`).

## Status

- [x] Frontend on the live API, every screen; `pnpm --filter web e2e:live` passes (see docs/TESTING.md)
- [x] Deployed routing: https://usestackly.app (landing) and /app (the app), same-origin API proxy
- [ ] Freighter run-through by a person (sign-in, deposit, sign purchases, withdraw) on the deployed app
- [ ] Two keeper purchases on one position (DoD): use a short interval in a test position or wait a day

## For the backend developer

- Docs say the sign-in message is hashed with `"Stellar Signed Message: "`; the server (correctly) uses SEP-53's
  `"Stellar Signed Message:\n"`. Fix the docs.
- No CORS for browser origins (the app proxies, so not blocking). `/health` requires auth.
- Nice to have: `GET /executions?limit=` across positions (the dashboard fans out per position), balances inside
  `DcaPositionDto` (avoids one `/balance` call per position), a display reference and an optional strategy name,
  history filters for status / asset / date.

## Out of scope (PRD §20)

Mainnet, real-value transactions, custody, other chains, advanced portfolio management, multiple DEXs, advanced
strategies, leverage, yield farming, native mobile apps, tax reporting, production audits.
