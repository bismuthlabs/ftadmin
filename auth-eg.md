# Authentication & Access Control Overview

This document provides a comprehensive guide to how authentication and access control work in the Bunny Spa Admin application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Flow (Login)](#authentication-flow-login)
3. [Session Management](#session-management)
4. [Permission Profiles](#permission-profiles)
5. [Authorization & Access Control](#authorization--access-control)
6. [Access Codes Management](#access-codes-management)
7. [Session Invalidation](#session-invalidation)
8. [Security Features](#security-features)

---

## Architecture Overview

The app uses a **passcode-based authentication system** with role-based access control (RBAC). There is no traditional username/password login. Instead:

- **Access Codes** are stored in the database (Supabase `access_codes` table)
- **Passcodes** are hashed using bcrypt and compared during login
- **Sessions** are created as HMAC-signed tokens stored in secure HTTP-only cookies
- **Permissions** are enforced via permission profiles attached to each access code

### Key Components

| Component | Purpose |
|-----------|---------|
| `lib/session.ts` | Session cookie creation, signing, verification |
| `lib/permissions.ts` | Permission profile definitions and authorization checks |
| `lib/authz.ts` | API-level authorization middleware |
| `lib/server-session.ts` | Server-side session validation (page-level) |
| `app/api/unlock/route.ts` | Login endpoint (POST `/api/unlock`) |
| `app/api/session/route.ts` | Session retrieval endpoint (GET `/api/session`) |
| `app/api/admin/access-codes/*` | Admin endpoints for managing access codes |
| `components/auth-context.tsx` | Client-side auth context provider |
| `components/unlock-form.tsx` | Login UI component |

---

## Authentication Flow (Login)

### Step 1: User Enters Passcode

The user navigates to the **unlock page** (`/unlock`) and enters their access code via the `UnlockForm` component.

### Step 2: Frontend Submits to `/api/unlock`

```typescript
// components/unlock-form.tsx
const response = await fetch("/api/unlock", {
  method: "POST",
  credentials: "same-origin",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ passcode, rememberMe: true|false }),
})
```

**Request payload:**
- `passcode` (string): The access code entered by the user
- `rememberMe` (boolean, optional): If true, session TTL is extended (default: 24x normal TTL)

### Step 3: Backend Validates Passcode

The `/api/unlock` endpoint (`app/api/unlock/route.ts`):

1. **Fetches all active access codes** from `access_codes` table
2. **For each code**, uses bcrypt to compare the provided passcode with stored hashed code:
   ```typescript
   const match = await bcrypt.compare(passcode, c.hashed_code)
   ```
3. **On first match**:
   - Extracts `id`, `role`, `permission_profile`
   - Creates session payload:
     ```typescript
     const payload = {
       role: permissionProfile,
       roleName: c.role,
       permissionProfile,
       issuedAt: Date.now(),
       expiresAt: Date.now() + ttl * 1000,
       accessCodeId: c.id,  // ✅ Essential for validation
     }
     ```
   - Signs the payload and sets as HTTP-only, SameSite=Strict cookie

### Step 4: Session Cookie Set

```typescript
// lib/session.ts - createSessionCookie()
const cookie = `bsa_session=<SIGNED_TOKEN>; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=<TTL>`
```

**Cookie Properties:**
- **HttpOnly**: Prevents JavaScript access (XSS protection)
- **Secure**: Only sent over HTTPS in production
- **SameSite=Strict**: Prevents CSRF attacks
- **Max-Age**: Set to session TTL (default: 3600s = 1 hour, or 24x that if "Remember Me")

### Step 5: Redirect to Dashboard

On success, frontend redirects to `/b/sales`:
```typescript
window.location.assign("/b/sales")
```

---

## Session Management

### Session Token Format

Sessions use a custom **HMAC-signed token** format (not JWT):

```
TOKEN = BASE64URL(PAYLOAD).BASE64URL(HMAC)
```

**Encoding/Decoding:**
- `base64url()`: Standard base64 encoding with URL-safe characters (`-` and `_` instead of `+` and `/`, no padding)
- `ALGO`: SHA-256 HMAC
- **Secret**: Environment variable `SESSION_SECRET` (must be set in production)

### Signing a Session

```typescript
// lib/session.ts - sign()
function sign(payload: object) {
  const json = JSON.stringify(payload)
  const payloadB64 = base64url(Buffer.from(json))  // Base64-encode payload
  const hmac = crypto.createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest()  // Compute HMAC
  const sig = base64url(hmac)  // Base64-encode HMAC
  return `${payloadB64}.${sig}`  // Return token
}
```

### Verifying a Session

```typescript
// lib/session.ts - verify()
function verify(token: string) {
  const [payloadB64, sig] = token.split('.')
  const expected = base64url(
    crypto.createHmac('sha256', SESSION_SECRET)
      .update(payloadB64)
      .digest()
  )
  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected)
  )
  if (!valid) return null
  const json = Buffer.from(payloadB64, 'base64').toString('utf8')
  return JSON.parse(json)
}
```

### Session Type Definition

```typescript
// lib/session.ts
type SessionPayload = {
  role: PermissionProfile                    // e.g., "owner", "manager"
  roleName: string                           // e.g., "Owner", "Front Desk"
  permissionProfile: PermissionProfile        // Normalized version of role
  issuedAt: number                           // Timestamp (milliseconds)
  expiresAt: number                          // Timestamp (milliseconds)
  accessCodeId: string                       // Foreign key to access_codes table
}
```

### TTL Configuration

```typescript
// Defaults from app/api/unlock/route.ts
const DEFAULT_TTL = 3600                        // 1 hour (seconds)
const REMEMBER_TTL = DEFAULT_TTL * 24           // 24 hours
```

Configurable via environment variables:
- `SESSION_TTL_SECONDS`: Override default session TTL
- `SESSION_TTL_REMEMBER_SECONDS`: Override "remember me" TTL

### Retrieving Session on Frontend

The `AuthContext` fetches the session from the API on mount:

```typescript
// components/auth-context.tsx
useEffect(() => {
  fetch('/api/session')
    .then(r => r.json())
    .then(json => setSession(json.session))
    .catch(() => setSession(null))
    .finally(() => setLoading(false))
}, [])
```

The `/api/session` endpoint simply returns the parsed session if valid:
```typescript
// app/api/session/route.ts
export async function GET(req: Request) {
  const payload = parseSessionFromRequest(req)
  if (!payload) return NextResponse.json({ session: null })
  if (payload.expiresAt < Date.now()) return NextResponse.json({ session: null })
  return NextResponse.json({ session: payload })
}
```

---

## Permission Profiles

### Defined Profiles

Four permission profiles exist, ordered by privilege level:

```typescript
// lib/permissions.ts
export const PERMISSION_PROFILES = ["owner", "manager", "investor", "receptionist"] as const
export type PermissionProfile = (typeof PERMISSION_PROFILES)[number]
```

| Profile | Purpose | Access Level |
|---------|---------|--------------|
| **owner** | Full control, admin settings | Highest |
| **manager** | Operational management | High |
| **investor** | Read-only financial & analytics | Medium |
| **receptionist** | Basic client & sales operations | Lowest |

### Permission Mapping

Each profile has specific capabilities:

| Feature | Owner | Manager | Investor | Receptionist |
|---------|:-----:|:-------:|:--------:|:----------:|
| **Admin Settings** | ✅ | ❌ | ❌ | ❌ |
| **Read Overview** | ✅ | ✅ | ✅ | ❌ |
| **Read Sales** | ✅ | ✅ | ✅ | ✅ |
| **Write Sales** | ✅ | ✅ | ❌ | ✅ |
| **Delete Sales** | ✅ | ✅ | ❌ | ❌ |
| **Read Clients** | ✅ | ✅ | ✅ | ✅ |
| **Write Clients** | ✅ | ✅ | ❌ | ✅ |
| **Delete Clients** | ✅ | ✅ | ❌ | ❌ |
| **Read Services** | ✅ | ✅ | ✅ | ✅ |
| **Write Services** | ✅ | ❌ | ❌ | ❌ |
| **Read Staff** | ✅ | ✅ | ✅ | ❌ |
| **Read Expenses** | ✅ | ✅ | ✅ | ❌ |
| **Write Expenses** | ✅ | ✅ | ❌ | ❌ |
| **Read Payouts** | ✅ | ✅ | ✅ | ❌ |
| **Read Marketing** | ✅ | ✅ | ✅ | ❌ |
| **Write Marketing** | ✅ | ✅ | ❌ | ❌ |
| **Read Reports** | ✅ | ✅ | ✅ | ❌ |

### Permission Helper Functions

```typescript
// lib/permissions.ts - Examples
export function canAccessAdmin(profile: PermissionProfile) {
  return profile === "owner"
}

export function canWriteSales(profile: PermissionProfile) {
  return profile === "owner" || profile === "manager" || profile === "receptionist"
}

export function canDeleteSales(profile: PermissionProfile) {
  return profile === "owner" || profile === "manager"
}

// ... more functions for each feature
```

### Normalizing Permission Profiles

The `normalizePermissionProfile()` function handles backward compatibility:

```typescript
// lib/permissions.ts
export function normalizePermissionProfile(
  value: unknown,
  roleName?: unknown
): PermissionProfile {
  // Normalize string input
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : ""
  const normalizedRoleName = typeof roleName === "string" ? roleName.trim().toLowerCase() : ""

  // Check if value directly matches a profile
  if (PERMISSION_PROFILES.includes(normalized as PermissionProfile)) {
    return normalized as PermissionProfile
  }

  // Infer from role name (for older migration records)
  if (normalized === "manager") {
    if (normalizedRoleName === "owner") return "owner"
    if (normalizedRoleName === "investor") return "investor"
  }
  if (normalizedRoleName.includes("reception")) return "receptionist"
  if (normalizedRoleName === "owner") return "owner"
  if (normalizedRoleName === "manager") return "manager"
  if (normalizedRoleName === "investor") return "investor"

  return "manager"  // Default fallback
}
```

---

## Authorization & Access Control

### Two-Level Authorization

#### Level 1: API Middleware (`lib/authz.ts`)

Used in API routes to enforce authentication and authorization before processing requests.

**`requireValidSession(req: Request)`**
- Parses session from cookie
- Checks if session exists and not expired
- **Validates access code still exists and is active** (critical for revocation)
- Returns `{ session, deny }` tuple

```typescript
export async function requireValidSession(req: Request) {
  const session = parseSessionFromRequest(req)
  if (!session) {
    return { session: null, deny: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  if (session.expiresAt < Date.now()) {
    return { session: null, deny: NextResponse.json({ error: "Session expired" }, { status: 401 }) }
  }

  // ✅ Verify access code still active
  const { data, error } = await supabaseAdmin
    .from("access_codes")
    .select("id, active")
    .eq("id", session.accessCodeId)
    .maybeSingle()

  if (!data || data.active !== true) {
    console.warn(`[authz] Access code invalid or revoked: ${session.accessCodeId}`)
    return { session: null, deny: NextResponse.json({ error: "Access revoked" }, { status: 401 }) }
  }

  return { session, deny: null }
}
```

**`requireOwner(req: Request)`**
- Calls `requireValidSession()` first
- Additionally checks `session.permissionProfile === "owner"`
- Returns 403 Forbidden if not owner

```typescript
export async function requireOwner(req: Request) {
  const { session, deny } = await requireValidSession(req)
  if (deny) return { session: null, deny }
  if (session!.permissionProfile !== "owner") {
    return { session: null, deny: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { session, deny: null }
}
```

**Example API Route:**
```typescript
// app/api/admin/access-codes/route.ts
export async function GET(req: Request) {
  const { deny } = await requireOwner(req)
  if (deny) return deny  // Reject if not owner

  // ... proceed with owner-only operation
}
```

#### Level 2: Page-Level Authorization (Server Components)

Used in Next.js page components to redirect unauthorized users before rendering.

**`lib/server-session.ts`** provides utilities:
```typescript
export async function getValidatedSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value
  return getValidatedSessionFromCookieValue(cookieValue)
}
```

**Example Page:**
```typescript
// app/b/admin/page.tsx
export default async function AdminPage() {
  const session = parseSessionFromRequest(req)
  
  // Check authentication
  if (!session || session.expiresAt < Date.now() || session.permissionProfile !== "owner") {
    redirect("/unlock")
  }

  // ✅ Page-level invalidation check
  const { data: code, error } = await supabaseAdmin
    .from("access_codes")
    .select("id, active")
    .eq("id", session.accessCodeId)
    .maybeSingle()

  if (error || !code || code.active !== true) {
    redirect("/unlock")  // Access revoked
  }

  // Safe to render admin page
  return <div>...</div>
}
```

### Client-Side Authorization

Permission checks in React components use the `AuthContext`:

```typescript
// components/my-component.tsx
import { useAuth } from "@/components/auth-context"
import { canAccessAdmin } from "@/lib/permissions"

export default function MyComponent() {
  const { session } = useAuth()

  if (!canAccessAdmin(session?.permissionProfile)) {
    return <p>Access Denied</p>
  }

  return <div>Admin Content</div>
}
```

---

## Access Codes Management

### Database Schema

Access codes are stored in the Supabase `access_codes` table:

```sql
CREATE TABLE access_codes (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL,                    -- e.g., "Receptionist", "Owner"
  permission_profile TEXT,               -- "owner" | "manager" | "investor" | "receptionist"
  hashed_code TEXT NOT NULL,             -- bcrypt hash of passcode
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP,                  -- When code was last rotated
)
```

### Creating Access Codes (Owner-Only)

**Endpoint:** `POST /api/admin/access-codes`

**Request:**
```json
{
  "role": "Receptionist",
  "passcode": "1234567890",
  "permissionProfile": "receptionist",
  "active": true
}
```

**Backend Process:**
1. Verify requester is owner
2. Bcrypt-hash the passcode with cost 12
3. Insert into database
4. Return created code record

```typescript
// app/api/admin/access-codes/route.ts
const hashed = await bcrypt.hash(passcode, 12)
const { data } = await supabaseAdmin
  .from("access_codes")
  .insert({
    role,
    permission_profile: permissionProfile,
    hashed_code: hashed,
    active: active === undefined ? true : !!active,
  })
  .select()
  .single()
```

### Listing Access Codes (Owner-Only)

**Endpoint:** `GET /api/admin/access-codes`

Returns all access codes with metadata (excludes hashed passcode).

### Deleting Access Codes (Owner-Only)

**Endpoint:** `DELETE /api/admin/access-codes/:id`

**Important:** Deletion invalidates **all active sessions** using that code.

**Confirmation UI:**
```typescript
if (!confirm("Delete this access code? Anyone logged in using it will be logged out.")) return
```

### Rotating Access Codes (Owner-Only)

**Endpoint:** `POST /api/admin/access-codes/:id/rotate`

Generates a new passcode for an existing access code. The new passcode is shown **only once**.

```typescript
// app/api/admin/access-codes/[id]/rotate/route.ts
// Generates new passcode, hashes it, updates record, returns plaintext passcode
```

**One-Time Display Dialog:**
```typescript
// components/access-settings.tsx
<Dialog open={rotateOpen} onOpenChange={(open) => {
  setRotateOpen(open)
  if (!open) {
    setNewPasscode("")  // Wipe from state when closing
    setRotatedCode(null)
  }
}}>
  {/* Shows new passcode with copy button */}
</Dialog>
```

---

## Session Invalidation

### Scenarios Where Sessions Are Invalidated

1. **Access Code Deleted**
   - All sessions using that code are immediately invalid
   - Checked on next API call or page load

2. **Access Code Deactivated**
   - `active` set to `false` in database
   - Sessions fail validation on next request

3. **Access Code Rotated**
   - New passcode generated for code
   - Old sessions remain valid (same `accessCodeId`)
   - Only new logins with old passcode fail

4. **Session Expired**
   - `expiresAt` timestamp passed
   - Checked in `parseSessionFromRequest()`

5. **Cookie Tampered**
   - HMAC verification fails
   - `timingSafeEqual()` used to prevent timing attacks

### Validation Points

**On Every API Request:**
```typescript
const { session, deny } = await requireValidSession(req)
// Checks: session exists, not expired, access code still active
```

**On Page Load (Server Component):**
```typescript
const { data: code } = await supabaseAdmin
  .from("access_codes")
  .select("id, active")
  .eq("id", session.accessCodeId)
  .maybeSingle()
if (!code || code.active !== true) redirect("/unlock")
```

**On Client-Side Session Fetch:**
```typescript
// /api/session endpoint checks expiration
if (payload.expiresAt < Date.now()) return { session: null }
```

---

## Security Features

### Authentication Security

1. **Bcrypt Hashing**
   - Passcodes hashed with bcrypt (cost 12)
   - Timing-safe comparison: `bcrypt.compare()`
   - No plaintext passcodes stored

2. **HMAC-Signed Tokens**
   - Sessions signed with SHA-256 HMAC
   - Requires `SESSION_SECRET` environment variable
   - Token tampering detected immediately

3. **Constant-Time Comparison**
   ```typescript
   const valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
   ```
   - Prevents timing attacks on signature verification

4. **Session Secret Management**
   - Must be set in environment (`SESSION_SECRET`)
   - Production: Must be strong, random, 32+ bytes
   - Rotate regularly for maximum security

### Cookie Security

1. **HttpOnly Flag**
   ```
   HttpOnly  → Prevents JavaScript access (XSS protection)
   ```

2. **Secure Flag** (Production Only)
   ```
   Secure    → Only sent over HTTPS
   ```

3. **SameSite=Strict**
   ```
   SameSite=Strict → Cross-site requests cannot include cookie (CSRF protection)
   ```

4. **Path Restriction**
   ```
   Path=/    → Cookie sent to all routes
   ```

### Access Control Security

1. **Role-Based Access Control (RBAC)**
   - Fine-grained permission matrix
   - Enforced at both API and page levels
   - Multiple profiles for different operational needs

2. **Immediate Revocation**
   - Deleting/deactivating access code instantly prevents further access
   - No grace period for old sessions

3. **Accesss Code Validation on Every Request**
   - Not just checking token validity
   - Also verifying underlying access code is still active
   - Prevents use after deletion/deactivation

### Defense-in-Depth

```
Layers of Protection:

1. HTTPS/TLS (production)
   ↓
2. Cookie HttpOnly + Secure + SameSite flags
   ↓
3. HMAC signature verification
   ↓
4. Session expiration check
   ↓
5. Access code active status verification
   ↓
6. Permission profile validation (API + page level)
```

---

## Logout

### Client-Side Logout

Accessed via `AuthContext.signOut()`:

```typescript
// components/auth-context.tsx
const signOut = async () => {
  await fetch('/api/logout', { method: 'POST' })
  setSession(null)
}
```

### API Logout

**Endpoint:** `POST /api/logout`

Clears the session cookie:

```typescript
export function clearSessionCookie(res: any) {
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  // Sets Max-Age=0 to delete cookie
}
```

---

## Flow Diagrams

### Authentication Flow

```
User → Unlock Page → Enter Passcode → POST /api/unlock
                                        ↓
                                   Fetch Active Codes
                                        ↓
                                   Bcrypt Compare
                                        ↓
                            Match Found? → Sign Session Token
                                   ↓             ↓
                                  No        Set HttpOnly Cookie
                            Return 401       ↓
                                        Return 200
                                             ↓
                                    Redirect to /b/sales
```

### Authorization Flow (API Request)

```
Client Request → Cookie in Headers
                        ↓
                   parseSessionFromRequest()
                        ↓
              Verify HMAC Signature
                        ↓
              Check Expiration Time
                        ↓
           Query access_codes Table
                        ↓
           Is code active? → requireValidSession()
                        ↓
              Permission Check? → requireOwner() / etc.
                        ↓
         Allow/Deny → Return 200/401/403
```

### Session Invalidation Flow

```
Access Code Deleted/Deactivated
            ↓
    User Makes API Request
            ↓
requireValidSession() Called
            ↓
    Query access_codes Table
            ↓
      active !== true?
            ↓
  Return 401 Unauthorized
            ↓
    Redirect to /unlock
```

---

## Environment Variables Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SESSION_SECRET` | HMAC signing secret (32+ bytes) | `"your-random-secret-string"` |
| `SESSION_TTL_SECONDS` | Normal session TTL | `3600` |
| `SESSION_TTL_REMEMBER_SECONDS` | "Remember Me" TTL | `86400` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `"https://xxx.supabase.co"` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin API key | `"eyJ..."` |

---

## Common Tasks

### Adding a New Permission

1. Add check function to `lib/permissions.ts`:
   ```typescript
   export function canDoNewThing(profile: PermissionProfile) {
     return profile === "owner" || profile === "manager"
   }
   ```

2. Use in component:
   ```typescript
   if (!canDoNewThing(session?.permissionProfile)) {
     return <AccessDenied />
   }
   ```

3. Enforce in API:
   ```typescript
   if (!canDoNewThing(session.permissionProfile)) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 })
   }
   ```

### Creating Multiple Access Codes

Use the `AccessSettings` component admin UI or POST to `/api/admin/access-codes` multiple times with different passcodes and roles.

### Implementing Session Persistence Across Tab Closures

Sessions expire based on `MAX_AGE` and `expiresAt` time. To implement longer persistence:
1. Increase `SESSION_TTL_REMEMBER_SECONDS`
2. Or use browser storage (with caution for sensitive data)
3. Or store session refresh tokens (not currently implemented)

### Debugging Authentication Issues

**Check logs:**
- Browser console: Network tab for `/api/unlock` and `/api/session` responses
- Server logs: Look for `[unlock]`, `[authz]`, `[server-session]` prefixed messages

**Common issues:**
- `SESSION_SECRET` not set → HMAC verification fails
- Missing `accessCodeId` in session → Backward compatibility issue
- `access_codes` table missing `permission_profile` column → Migration issue

---

## References

- **Session Library:** Node.js `crypto` module for HMAC
- **Hashing:** bcryptjs package (bcrypt.compare, bcrypt.hash)
- **HTTP Cookies:** HTTP/HTTPS standards (HttpOnly, Secure, SameSite flags)
- **OWASP Guidelines:** Session management, CSRF protection, XSS prevention
