# Testing

The 21 scenarios the team must demonstrate (PRD §19). "Contract" scenarios are unit tests in
`contracts/dca-vault/src/test.rs`; the rest are demonstrated end to end on Testnet and recorded below with
transaction hashes.

| # | Scenario | Where | Result | Evidence (tx hash / test) |
|---|---|---|---|---|
| 1 | User connects a Stellar wallet | E2E | | |
| 2 | User creates a DCA position | Contract + E2E | | |
| 3 | User configures purchase amount and frequency | Contract + E2E | | |
| 4 | User deposits test USDC | E2E | | |
| 5 | Vault balance updates correctly | Contract + E2E | | |
| 6 | Keeper identifies an eligible purchase | Keeper | | |
| 7 | Swap execution is triggered | Keeper + E2E | | |
| 8 | Contract validates execution timing | Contract | | |
| 9 | USDC is swapped for the target asset through the selected mechanism | Contract + E2E | | |
| 10 | Purchased asset balance updates | Contract + E2E | | |
| 11 | Transaction history displays the swap | E2E | | |
| 12 | Early execution is rejected | Contract | | |
| 13 | Duplicate interval execution is rejected | Contract + Keeper | | |
| 14 | Insufficient balance is handled | Contract + E2E | | |
| 15 | Excessive slippage causes execution rejection | Contract | | |
| 16 | User pauses the position | Contract + E2E | | |
| 17 | Keeper cannot execute a paused position | Contract | | |
| 18 | User resumes the position | Contract + E2E | | |
| 19 | User withdraws available funds | Contract + E2E | | |
| 20 | Unauthorized withdrawals fail | Contract | | |
| 21 | Failed executions do not corrupt vault accounting | Contract | | |

Definition of done also requires **two distinct keeper-triggered executions** on one position; record both hashes.
