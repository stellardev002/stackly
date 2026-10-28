-- Stackly indexer database. The vault contract is the source of truth; these tables cache its state
-- (written by apps/keeper's indexer) for the web app's read API. Shapes mirror packages/stellar/src/vault.ts.
-- Amounts are stroops (i128 on chain) stored as numeric(39,0). PostgREST returns numeric as a JSON
-- number, so select amount columns as ::text in the API to keep precision.

create table positions (
	id text primary key,                     -- contract position id
	owner text not null,                     -- G... account
	source_asset text not null,              -- "USDC:G..." or "XLM"
	target_asset text not null,
	purchase_amount numeric(39, 0) not null check (purchase_amount > 0),
	interval_seconds integer not null check (interval_seconds > 0),
	start_ts bigint not null,
	end_ts bigint,
	next_execution_ts bigint not null,
	max_slippage_bps integer not null,
	total_deposited numeric(39, 0) not null default 0,
	total_spent numeric(39, 0) not null default 0,
	source_balance numeric(39, 0) not null default 0,
	target_balance numeric(39, 0) not null default 0,
	execution_count integer not null default 0,
	status text not null check (status in ('created', 'active', 'paused', 'closed')),
	updated_ledger bigint,
	updated_at timestamptz not null default now()
);

create index positions_owner_idx on positions (owner);
create index positions_due_idx on positions (status, next_execution_ts);

create table executions (
	id uuid primary key default gen_random_uuid(),
	position_id text not null references positions (id),
	interval_index integer not null,
	source_amount numeric(39, 0) not null,
	received_amount numeric(39, 0),
	execution_price numeric,
	min_received numeric(39, 0),
	slippage_bps integer,
	fee numeric(39, 0),
	status text not null check (status in ('scheduled', 'eligible', 'submitted', 'completed', 'failed', 'skipped')),
	failure_reason text,
	tx_hash text,
	attempts integer not null default 0,
	scheduled_at timestamptz not null,
	executed_at timestamptz,
	-- The keeper's idempotency key: one row per interval (the contract also rejects duplicates).
	unique (position_id, interval_index)
);

create table transactions (
	id uuid primary key default gen_random_uuid(),
	position_id text not null references positions (id),
	type text not null check (type in ('deposit', 'swap', 'withdrawal', 'failed_execution')),
	asset text not null,
	amount numeric(39, 0) not null,
	status text not null check (status in ('pending', 'confirmed', 'failed')),
	tx_hash text,
	ledger bigint,
	event_id text unique,                    -- RPC event id: re-indexing the same event is a no-op
	created_at timestamptz not null default now()
);

create index transactions_position_idx on transactions (position_id, created_at desc);

-- Where the indexer resumes reading contract events.
create table indexer_cursor (
	id integer primary key default 1 check (id = 1),
	cursor text,
	ledger bigint,
	updated_at timestamptz not null default now()
);

-- Only the service role (keeper, API route handlers) reads or writes; nothing is exposed to anon clients.
alter table positions enable row level security;
alter table executions enable row level security;
alter table transactions enable row level security;
alter table indexer_cursor enable row level security;
