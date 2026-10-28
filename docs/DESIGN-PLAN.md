# Design build plan (mock data)

Figma: `STACKLY (Copy)` — file key `9h2UJAxm3uZYfaeCZgwVsz` (reviewed 2026-10-27, last modified 2026-10-27).
Goal: build every designed screen and state in `apps/landing` and `apps/web` against `@repo/mock-api`, then swap
the data source to live without touching components. PRD gaps are listed at the end; they need a decision before
or during the build.

## What the design establishes

| | Design | Scaffold today | Change |
|---|---|---|---|
| Font | **Source Sans 3** (300 / 400), tight negative tracking on headings | Satoshi | `next/font/google` Source Sans 3; drop Satoshi files |
| Palette | coral `#ff6173` (accent, CTAs, wallet pill), ink `#270c0f` (text, dark buttons), card black `#0e0405`, blush `#ffeff1` (notices, landing bg), rose `#ffced4` (borders, chips), muted `#7c6e70`, page `#fafafa`, divider `#ebe5e6`, warning bg `#ffefe8` | navy placeholder tokens | Replace `packages/ui` tokens; keep token *names* by role (`primary` = ink, `accent` = coral) |
| Radius | pills `100`, cards `14`, large panels `24–30` | shadcn defaults | Set in tokens |
| Navigation | Top bar: logo · pill tabs **Dashboard / Portfolio / History / Settings** · avatar + coral address pill. Mobile: same tabs in a scrolling pill row | Left sidebar with Vaults tab | Replace `AppSidebar` with `TopNav`; no Vaults tab |
| Wallet connection | **Modal** over a blurred dashboard: Freighter / xBull / Albedo cards with status chips (Selected · Available · Not detected · Waiting) | Separate `/connect` page using the kit's built-in modal | Custom picker: `kit.getSupportedWallets()` + `setWallet`; `WalletGate` renders it over the page |
| Create flow | 3-step stepper **Configure → Review → Fund vault** | Separate screens, no stepper | `Stepper` component; Deposit page shows it only in the create flow |
| Type scale (desktop) | 96/74 landing hero · 56 page title & stat values · 32 · 24 · 20 · 16 body · 14 · 12 captions | — | Utility classes in `packages/ui` |

Recurring components to build once in `packages/ui` (or `apps/web/src/components`):
`StatCard` (dark gradient, label / value / caption) · `Panel` (white, radius 14) · `DetailRow` ("Label / value") ·
`StatusChip` · `Notice` (info / warning / error, blush background) · `Stepper` · `Segmented` (Daily/Weekly/Monthly) ·
`Switch` (add Radix switch) · `PillInput` (rounded input with trailing edit icon) · `AssetChoiceCard` (withdraw) ·
`SwapRow` (coral icon + "50 USDC → 200 XLM" + date + chip) · `StepLineChart` (cumulative XLM, recharts `type="stepAfter"`) ·
`Donut` (available vs spent) · `EmptyState` (illustration + title + text) · skeleton blocks · `CoralPromoCard` (illustrated).

Assets to export from Figma (SVG where vector, PNG@2x otherwise) into each app's `public/images`: logo mark +
wordmark, landing hero illustration, "less timing" band illustration, laptop figure, brick-stack photo, avatars,
empty-state folder illustration, withdraw card art, wallet icons (Freighter, xBull, Albedo).

## Screen inventory (Figma node ids)

| PRD screen | Route | Base (desktop / mobile) | Loading | Empty | Error | Validation |
|---|---|---|---|---|---|---|
| 1 Landing | `landing /` | 2003:787 / 2003:496 | — | — | — | — |
| 2 Wallet connection | modal (`WalletGate`) | 28:13768 / 29:16734 | 40:35334 | 40:31023 | 40:32843 | — |
| 3 Dashboard | `/overview` | 28:13262 / 29:17160 | 40:34934 | 40:30831 | 40:32634 | — |
| 4 Create DCA vault | `/vaults/create` | 28:12731 / 29:17926 | — | — | — | 40:29725 |
| 5 Review strategy | `/vaults/create/review` | 28:12499 / 29:21293 | 40:34593 | — | 40:32429 | — |
| 6 Deposit funds | `/vaults/[id]/deposit` | 28:12298 / 29:21412 | 40:34373 | 40:30641 | 40:32253 | 40:29478 |
| 7 Active position | `/vaults/[id]` | 28:11859 / 29:20249 | 40:34065 | 40:30460 | 40:32071 | — |
| 8 Swap execution | `/vaults/[id]/executions/[eid]` | **28:11626** / **29:21500** (both mis-named "Deposit funds") | 40:33759 | — | 40:31891 | — |
| 9 History | `/transactions` | 28:11355 / 29:19926 | 40:33496 | 40:30306 | 40:31743 | — |
| 10 Portfolio | `/portfolio` | 28:11101 / 29:19803 | 40:33263 | 40:30156 | 40:31588 | — |
| 11 Withdraw | `/vaults/[id]/withdraw` | 28:10702 / 29:19186 | 40:33042 | 40:29976 | 40:31405 | 40:29286 |
| 12 Settings | `/settings` | 28:10476 / 29:19447 | — | — | 40:31212 | 40:29082 |

Mobile ids for the state frames are in the same Figma sections ("Loading", "Empty", "Error", "Validation").

## Mock data: match the design's story

Reshape `packages/mock-api/src/seed.ts` so every screen shows the designed numbers, and they add up:

- Wallet `GCL7…9Q2M` (Freighter), 2,500 USDC wallet balance.
- Position **STK-001 "The weekly stack"**: USDC → XLM, 50 USDC every 7 days, max slippage 0.50%, started 29 Sep,
  one 1,000 USDC deposit (DP-001, 28 Sep 16:00).
- Executions EX-001…EX-004 on 29 Sep, 6, 13, 20 Oct at 09:00: each 50 USDC → 200 XLM (0.25 USDC/XLM, fee 0.00001
  XLM). On 20 Oct, attempt **EX-004-A fails on slippage** (no funds move), then EX-004 completes at 09:05.
- Totals: deposited 1,000 · spent 200 · remaining 800 (16 purchases funded) · acquired 800 XLM · next eligible
  27 Oct 09:00.
- Keep seed dates relative to "now" (current behaviour) so "next purchase" is always in the future; the design's
  fixed dates are illustrative.

Model additions this needs (mirror in `@repo/stellar/vault`, the contract types where relevant, and the SQL):
`Position.name`, display ids (`STK-001`, `EX-004`, `DP-001`), `Execution.attempt` + `Execution.events[]`
(eligible · quote checked · submitted · failed · completed, with timestamps) for the timeline, wallet provider id,
and a persisted local `settings` store (default slippage, notification toggles, review-before-sign, open explorer).

**State switch for building and review:** in mock mode, `?state=loading|empty|error` on any app route forces that
state (delayed queries, an empty DB for the wallet, or a forced 500), so every designed frame can be reproduced
and compared side by side.

## Build order

Each phase ends with the screen compared against its Figma frames at 1440 and 390 wide.

0. **Foundations**: tokens, Source Sans 3, `TopNav` + wallet pill, the component kit above, Figma asset export,
   reshaped seed, `?state=` switch.
1. **Landing** (desktop + mobile).
2. **Wallet connection modal**: base, loading (connecting), empty (no wallet detected → install link), error
   (rejected → retry). Demo wallet in mock mode.
3. **Dashboard**: base, loading, empty (new wallet), error.
4. **Create → Review → Deposit** flow with stepper: validation on Create; loading / error on Review; base,
   loading, empty, error, validation on Deposit; plus the missing pending + success states (see gaps).
5. **Active position** and **Swap execution details** (completed + failed variants, timeline).
6. **Transaction history** (filters: type, asset, status, date range, search) and **Portfolio** (step chart,
   donut, holdings).
7. **Withdraw** (asset choice, review card, validation) and **Settings** (local preferences, disconnect).
8. Pass over every screen: empty / loading / error, keyboard + screen-reader labels, reduced motion, 390px.

## PRD vs design: misalignments

Severity: **High** = a PRD requirement isn't designed · **Med** = conflicts with PRD rules or the data model ·
**Low** = copy or consistency.

| # | Where | Issue | Sev | Proposed resolution |
|---|---|---|---|---|
| 1 | Deposit (6) | No transaction confirmation / success state and no **View on Stellar Explorer** button | High | Add a "Deposit confirmed" state (amount, new vault balance, tx hash, Explorer link), styled like the Swap "Stellar reference" panel |
| 2 | Withdraw (11) | No **transaction status** after Confirm (pending / success) | High | Same pattern as #1 |
| 3 | All flows (PRD §7) | No **pending** (wallet signing / submitted) or **success** states; "Loading" frames are data skeletons | High | One shared "Waiting for wallet signature → Submitted → Confirmed" treatment for every write |
| 4 | Wallet (2) | No **Stellar Testnet indicator**, connected-address confirmation or **Continue to Dashboard** | High | Testnet chip in the modal header; after connecting, show the address and close into the dashboard |
| 5 | Dashboard (3) | 4 summary cards; PRD lists 5 (missing **Active DCA Positions**) | Med | Add a 5th card, or make the count prominent in "Active strategies" (design shows a small "1 active" chip) |
| 6 | Position (7) | **Paused** state and **Resume DCA** not designed | High | Paused chip + "Resume strategy" in place of "Pause strategy"; next-interval card shows "Paused" |
| 7 | Swap (8) | Only Completed and Failed designed; **Scheduled, Eligible, Submitted, Skipped** missing | Med | Chip + one-line explanation per status; Submitted uses the waiting animation |
| 8 | Dashboard / Vaults | Only one strategy shown; no list of multiple or **paused positions** (PRD Module 5) | Med | "Active strategies" becomes a list (or add a Vaults view); confirm with design |
| 9 | Create (4) | "Planned funding 1,000 USDC / 20 funded purchases" is shown but there is **no deposit amount field** | Med | Add a "Planned deposit" field (used for the estimate on Review), or drop the numbers until step 3 |
| 10 | Create (4) | Strategy **name** ("The weekly stack") shown later but no name input | Low | Optional name field, default "The weekly stack/daily/monthly" |
| 11 | Create (4) | **Monthly = fixed 30-day** explanation not visible (PRD requires) | Med | Helper text under the segmented control when Monthly is selected |
| 12 | Review (5) | Edit icon on **Network** row, but the network is fixed to Testnet | Low | Remove the icon |
| 13 | Deposit (6) | In the create flow it shows "Current vault balance 800 USDC" for a brand-new vault | Low | Create flow: 0 USDC and stepper; "Deposit More": real balance, no stepper |
| 14 | Swap (8) / History (9) | Failed attempt shows a hash (`demo-fail…7a20`) in History but "No hash · not submitted" on the detail page | Med | A rejected-before-submission attempt has no hash; show "Not submitted" in both |
| 15 | History (9) | Lists a **wallet-rejected withdrawal** (WD-001, "No funds moved"). A rejection never reaches the chain, so the indexer can't record it | Med | Show it only as the inline error on Withdraw; History lists on-chain activity |
| 16 | Landing (1) | Missing **Supported Assets** and **Automated Purchase Preview** sections; **Explore Demo** button replaced by "Launch Testnet app"; non-custodial explanation only in the FAQ | Med | Add a compact assets strip (USDC → XLM) and a schedule preview card; decide on Explore Demo |
| 17 | Landing (1) | "**2.8k+ People**" social proof with avatars, unverifiable for a Testnet MVP | Med | Remove, or replace with a factual line ("Runs on Stellar Testnet") |
| 18 | Landing footer | "No live wallet connection or real transactions are represented" contradicts the MVP, which makes real Testnet transactions (PRD §22) | Med | "Testnet demonstration. Test assets only; not financial advice." |
| 19 | Settings (12) | No **Stellar network** row (PRD requires) | Med | Add "Network / Stellar Testnet" under Connected wallet |
| 20 | Settings (12) | Notifications have no delivery channel in the PRD (no email, no backend notifications) | Low | Store locally; in-app toasts only |
| 21 | Dashboard (3) | "**Hey, Dean!**": a wallet-only app has no user name | Low | "Welcome back" + short address |
| 22 | Portfolio (10) | PRD "Asset allocation chart" is designed as USDC available-vs-spent | Low | Keep: it respects the no-valuation rule; note it in PLAN |
| 23 | Copy | Deposit, Swap and History reuse "Check the details before creating your testnet vault"; "Deposited **USCC**" typo; "Sample snapshot…", "illustrative", "sample" labels | Low | Fix copy; keep "demo" labels only in mock mode |
| 24 | Global | Nav shows **Dashboard** active on every frame | Low | Active tab follows the route |
| 25 | Palette | PRD suggests navy / blue / green; design is coral / ink / blush | Low | Follow the design (PRD says "suggested") |

Recommend sending #1–#9 and #16–#19 back to the designer; the rest can be resolved in code.

## Build status (2026-10-27)

All 25 items are resolved in code as proposed, so the designer can confirm or restyle them rather than start from
scratch: #1–3 `TxProgress` + confirmed panels on Review / Deposit / Withdraw · #4 Testnet chip + connected step in
`ConnectModal` · #5 the active-position count sits in the "Purchased XLM" caption and the strategies chip (no 5th card,
to keep the design's grid) · #6 paused title, chip, Resume · #7 all statuses in `EXECUTION_STATUS` · #8 strategies
list · #9–11 Create fields + Monthly note · #12 no edit on Network · #13 stepper only with `?flow=create` · #14–15
consistent "No hash · not submitted"; rejected wallet requests stay inline, never in History · #16–18 landing
sections, Testnet badge, corrected footer · #19 network row · #20 local in-app notifications · #21 "Welcome back" ·
#23 copy fixed · #24 active tab follows the route. Gap fills to review with design are marked "(+ …)" in PLAN.md.
