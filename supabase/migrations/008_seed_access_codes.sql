-- 008_seed_access_codes.sql
-- Replace <BCRYPT_HASH_PLACEHOLDER> with a bcrypt hash generated locally.
insert into access_codes (id, code, role, role_name, permission_profile, active)
values
  ('00000000-0000-0000-0000-000000000001', '<BCRYPT_HASH_PLACEHOLDER>', 'admin', 'Administrator', '{}', true),
  ('00000000-0000-0000-0000-000000000002', '<BCRYPT_HASH_PLACEHOLDER>', 'cashier', 'Cashier', '{}', true);
