# Stackly

Non-custodial dollar-cost averaging on Stellar (Testnet): deposit USDC into your own vault account, sign a schedule of
purchases once, and the keeper buys XLM on the Stellar DEX on time, exactly as you signed.

Live: **https://usestackly.app** (landing) · **https://usestackly.app/app** (the app). Backend:
https://api.usestackly.app/docs.

Turborepo + pnpm monorepo:

| Path | What | Dev URL |
|---|---|---|
| `apps/landing` | Public site | http://localhost:3002 |
| `apps/web` | The app: wallet sign-in, dashboard, vaults, history, portfolio, settings | http://localhost:3000 |
| `packages/ui` | `@repo/ui`: design tokens, shadcn components, motion, fonts | — |
| `packages/stellar` | `@repo/stellar`: network constants, assets, the UI data model | — |
| `packages/eslint-config`, `packages/typescript-config` | Shared configs | — |

## Getting started

Requires Node ≥ 22 and pnpm 12 (`corepack enable` picks the version from `package.json`).

```bash
pnpm install
pnpm dev                     # landing on :3002, app on :3000, against the live Testnet backend
```

To use the app you need a Stellar wallet extension set to **Testnet** (Freighter recommended):

1. Open http://localhost:3000, connect Freighter and sign the free sign-in message.
2. New account? Use **Fund with Friendbot** (test XLM), then on the Deposit screen **Add USDC trustline** and get
   Testnet USDC from Circle's faucet (https://faucet.circle.com, choose Stellar).
3. **Create New DCA** → Review → Confirm (creates your vault account) → Deposit → **Sign purchases & start**.
4. The keeper runs each purchase when it's due; the dashboard, position, history and the bell update on their own.

## Checks

```bash
pnpm check-types
pnpm lint
pnpm build
pnpm --filter web e2e:live   # end-to-end on Testnet with a throwaway wallet (~3 min, waits for a real keeper purchase)
```

Conventions, data flow and deployment: [CLAUDE.md](CLAUDE.md). Scope, status and the backend notes:
[docs/PLAN.md](docs/PLAN.md). Test scenarios and the last live run: [docs/TESTING.md](docs/TESTING.md).
