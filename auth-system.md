# Auth System (Passcode-based RBAC)

This project implements a simple passcode-based RBAC system backed by Supabase server-side sessions.

Overview
- `access_codes` table stores hashed passcodes and role metadata.
- `sessions` table stores short random tokens, expiration, and a link to an access code.
- Authentication flow: user submits passcode to `/api/unlock` → server verifies bcrypt hash against `access_codes` → server creates a session token in `sessions` and sets an HTTP-only cookie `pos_session`.

Files added
- `lib/supabaseAdmin.ts` — server-side Supabase client (uses `SUPABASE_SERVICE_ROLE_KEY`).
- `lib/session-store.ts` — helpers to create/get/delete/extend sessions.
- `app/api/unlock/route.ts` — unlock endpoint that verifies passcode and issues a cookie.
- `app/api/session/route.ts` — server-side session validation endpoint (reads cookie).
- `app/api/signout/route.ts` — sign out endpoint which deletes session and clears cookie.
- `middleware.ts` — redirects unauthenticated users to `/unlock` and validates sessions server-side.

Environment
Set these in your environment (e.g., `.env` or hosting provider):

- `SUPABASE_URL` — your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only)
- `NODE_ENV` — `production` or `development` (controls cookie `secure` flag)

Seeding access codes
The migration `supabase/migrations/008_seed_access_codes.sql` contains placeholders: `<BCRYPT_HASH_PLACEHOLDER>`.
Generate bcrypt hashes locally and replace the placeholders before applying the seed.

Generate hashes (Node):
```bash
# install bcryptjs if not installed
npm install bcryptjs

# generate two hashes and print them
node -e "const b=require('bcryptjs');console.log(b.hashSync('1234',10));console.log(b.hashSync('0000',10));"
```

Then edit `supabase/migrations/008_seed_access_codes.sql` and replace the two `<BCRYPT_HASH_PLACEHOLDER>` values with the printed hashes.

Applying migrations
- Use Supabase CLI or your preferred migration tool to apply `006_create_access_codes.sql`, `007_create_sessions.sql`, and `008_seed_access_codes.sql` to your database.

Usage
- Visit `/unlock` in the app and enter the passcode (the plaintext you hashed earlier).
- On success, a `pos_session` HTTP-only cookie is issued and the middleware will allow access.
- Use `/api/signout` (the UI includes a sign-out button) to end the session.

Security notes
- Choose strong passcodes and rotate them when needed.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose it to the browser.
- Consider adding rate-limiting to `/api/unlock` to mitigate brute-force.
