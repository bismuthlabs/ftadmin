-- 007_create_sessions.sql
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  access_code_id uuid not null references access_codes(id) on delete cascade,
  created_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_token_idx on sessions(token);
