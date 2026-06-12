-- 006_create_access_codes.sql
create table if not exists access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  role text not null,
  role_name text,
  permission_profile text default '{}',
  active boolean default true,
  created_at timestamptz default now()
);
