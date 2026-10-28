# Testing

The PRD §19 scenarios, run end to end against the live backend (https://api.usestackly.app) on Stellar Testnet by
`pnpm --filter web e2e:live` (`apps/web/scripts/e2e-live.mts`). The script uses the app's own API layer
(`src/lib/api`: auth, endpoints, flows, adapters), the same code the screens call, with a fresh Friendbot-funded
keypair as the wallet. It buys its Testnet USDC on the Testnet DEX, so it needs no faucet.

## Last run: 2026-10-28 · 30 / 30 passed

| # | Scenario | Result | Evidence |
|---|---|---|---|
| 1 | User connects a wallet (sign-in by signature) | ✅ | challenge → SEP-53 signMessage → JWT (900 s) |
| 2 | User creates a DCA position | ✅ | `pending`, own Stellar account (project-funded reserve) |
| 3 | User configures amount and frequency (preview) | ✅ | 5 USDC daily · 4 purchases for 20 USDC · live quote ≈ 20.149 XLM |
| — | Zero purchase amount rejected | ✅ | 400 Validation failed |
| 4 | User deposits test USDC | ✅ | wallet payment into the position account, booked by ledger sync |
| 5 | Vault balance updates | ✅ | deposited 20 · available 20 |
| — | Purchases pre-authorized | ✅ | 4 signed in one batch |
| 6–9 | Keeper finds the due purchase; the network validates the pre-signed swap; USDC → XLM on the DEX | ✅ | 5 USDC → 20.1493713 XLM at 0.2481467, 0 bps slippage |
| 10 | Purchased asset balance updates | ✅ | spent 5 USDC, holds 20.149 XLM |
| 11 | History displays the swap | ✅ | `swap`, `deposit` |
| 12–13 | Early / duplicate execution rejected | ✅ | one attempt; next signed purchase not valid until the next day (on-chain time bounds, sequence) |
| 14 | Insufficient balance handled | ✅ | withdrawing 1,000 USDC → 409 "exceeds the available balance of 15" |
| 16 | User pauses | ✅ | `paused`; pausing again → 409 |
| 17 | Keeper can't execute a paused position | ✅ (backend) | the keeper skips paused positions; see "Accepted differences" |
| 18 | User resumes | ✅ | `active` |
| 19 | User withdraws available funds | ✅ | 5 USDC and all 20.149 XLM back to the wallet |
| 20 | Unauthorized access fails | ✅ | another wallet: read → 404, withdraw → 404 |
| — | Cancel is final | ✅ | `cancelled`; resume → 409 |
| 21 | Failed / partial activity doesn't corrupt accounting | ✅ | deposited 20 − spent 5 − withdrawn 5 = 10 left |
| — | Portfolio, dashboard, settings, notifications | ✅ | avg cost 0.2481467 USDC/XLM · counts · settings saved · 4 notifications |

Not covered by the script: a slippage failure (needs a market move beyond the signed minimum) and "make up a missed
purchase". Both are wired in the UI (Execution screen) and in `flows.retryMissed`.

## UI against the live backend

The app was served locally (`next dev`), signed in through its `/api/v1` proxy, and the Dashboard, Position,
Execution, History, Portfolio, Settings, Deposit and Withdraw screens were rendered with that live session at 1440
and 390 wide: real balances, the keeper's purchase, signed-purchase counts and Testnet hashes all show.

Still to do by a person: the same flow in the browser with the **Freighter extension** (headless browsers can't run
extensions): connect, sign in, add the USDC trustline, deposit, sign purchases, withdraw.

## Accepted differences from the PRD

No Soroban contract: enforcement comes from pre-signed Stellar transactions (amount, minimum output, destination and
earliest time fixed on chain) plus the backend for pause / resume / cancel. See docs/PLAN.md.
