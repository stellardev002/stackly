# Stackly

Non-custodial dollar-cost averaging on Stellar (Testnet): deposit USDC into a Soroban vault, choose an asset, an amount
and a schedule, and a keeper triggers each purchase while the contract enforces your rules.

Turborepo + pnpm monorepo:

| Path | What | Dev URL |
|---|---|---|
| `apps/landing` | Public site | http://localhost:3002 |
| `apps/web` | The app: wallet connection, dashboard, vaults, history, portfolio, settings | http://localhost:3000 |
| `apps/keeper` | Keeper and event indexer (Node) | — |
| `packages/ui` | `@repo/ui`: design tokens, shadcn components, motion, fonts | — |
| `packages/stellar` | `@repo/stellar`: network constants, assets, vault types | — |
| `packages/mock-api` | `@repo/mock-api`: the in-browser demo backend | — |
| `contracts` | Soroban contracts: `dca-vault`, `swap-adapter` (Rust) | — |
| `supabase` | Indexer database migrations | — |

## Getting started

Requires Node ≥ 22 and pnpm 12. Frontend work needs nothing else. (Contracts need Rust with the `wasm32v1-none`
target and the [Stellar CLI](https://developers.stellar.org/docs/tools/cli).)

```bash
pnpm install
pnpm dev                     # landing on :3002, app on :3000, on demo data (no config needed)
```

## Simulating the flow (demo data)

The app runs on **mock data** by default. Everything happens in your browser; nothing touches the network, and every
demo transaction is labelled as such.

1. Open http://localhost:3000 and connect **Freighter** in the wallet modal (a demo wallet, "The weekly stack" story).
2. **Create New DCA** → configure → **Review Strategy** → tick the box → **Confirm Strategy** (simulated signature).
3. **Deposit** the planned amount, then **Start schedule**.
4. Open **Demo controls** (bottom-left) → **Skip to next purchase**. The simulated keeper submits the purchase; it
   completes about 4 seconds later and a toast confirms it.
5. Try the failure paths from the same panel: next purchase **Slippage fail** / **Liquidity fail**, wallet **Rejects
   next**, wallet **not installed**, **New wallet** (empty states), screen state **Slow** / **Error**, **Reset demo
   data**.

`pnpm --filter @repo/mock-api check:flow` runs the PRD's test scenarios against the simulation. Set
`NEXT_PUBLIC_API_SOURCE=live` once the contract and the API are deployed (see each app's `.env.example`; the expected
endpoints are listed in [docs/PLAN.md](docs/PLAN.md)). The keeper needs its own `.env` and runs with
`pnpm --filter keeper dev`.

```bash
pnpm check-types
pnpm lint
pnpm build
pnpm format
```

Conventions and data flow: [CLAUDE.md](CLAUDE.md). Scope, status and decisions: [docs/PLAN.md](docs/PLAN.md). Test
scenarios: [docs/TESTING.md](docs/TESTING.md).
