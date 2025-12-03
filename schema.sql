-- profiles: store subscription level and basic metadata
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  subscription_level text default 'free',
  created_at timestamptz default now()
);

-- compliance results
create table if not exists compliance_results (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text,
  industry text,
  province text,
  tasks jsonb,
  created_at timestamptz default now()
);

-- categories: user managed categories (starter+)
create table if not exists categories (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- transactions: bookkeeping entries
create table if not exists transactions (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text check (type in ('income','expense')),
  amount numeric(12,2),
  desc text,
  category text,
  tdate date,
  created_at timestamptz default now()
);

-- add index for quick listing
create index if not exists idx_transactions_user_date on transactions (user_id, tdate desc);
