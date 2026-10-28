# Contracts

Soroban (Rust) workspace. Not part of the pnpm workspace.

| Crate | PRD | What |
|---|---|---|
| `dca-vault` | Module 1 | Holds deposits per position and enforces the DCA rules. Interface only so far. |
| `swap-adapter` | Module 2 | The one swap interface the vault calls: a verified Testnet DEX route, or a labelled Testnet liquidity adapter. |

```bash
cargo test                 # unit tests (scenarios are #[ignore] until implemented)
stellar contract build     # wasm in target/wasm32v1-none/release
```

Deploy to Testnet (after `stellar keys generate --network testnet deployer --fund`):

```bash
stellar contract deploy --wasm target/wasm32v1-none/release/swap_adapter.wasm --source deployer --network testnet
stellar contract deploy --wasm target/wasm32v1-none/release/dca_vault.wasm --source deployer --network testnet
stellar contract invoke --id <VAULT_ID> --source deployer --network testnet -- initialize \
  --admin <DEPLOYER_G> --keeper <KEEPER_G> --swap_adapter <ADAPTER_ID>
```

Then set `NEXT_PUBLIC_VAULT_CONTRACT_ID` (apps/web) and `VAULT_CONTRACT_ID` (apps/keeper), and record the ids in
docs/PLAN.md. Generate the web app's typed client with
`stellar contract bindings typescript --network testnet --contract-id <VAULT_ID> --output-dir ...`.

`packages/stellar/src/vault.ts` and `supabase/migrations` mirror `dca-vault/src/types.rs`; change them together.
