# Authentication Architecture Best Practices

**Last Updated**: November 11, 2024
**Status**: Living Document - Update as we learn

---

## Purpose

This document codifies authentication best practices for impactOS multi-tenant platform to prevent common mistakes, ensure performance, and maintain security. It serves as the **source of truth** for all authentication-related architectural decisions.

## Core Principles

### 1. Centralized Auth Checks (Data Access Layer Pattern)

**RULE**: Never check authentication in components. Always check at the data access layer.

**Why**: Prevents scattered auth logic, ensures consistency, makes auditing possible, and centralizes security.

**Pattern**:
```typescript
// ✅ CORRECT - Data Access Layer (DAL)
// src/lib/dal/companies.ts
export async function getCompanies() {
  const supabase = await createClient()

  // Auth check happens HERE at data access layer
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // RLS handles tenant isolation automatically
  const { data, error } = await supabase
    .from('companies')
    .select('*')

  return data
}

// Components just call the DAL
// app/companies/page.tsx
export default async function CompaniesPage() {
  const companies = await getCompanies() // Auth checked in DAL
  return <CompaniesList companies={companies} />
}
```

```typescript
// ❌ WRONG - Auth check in component
export default async function CompaniesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser() // DON'T DO THIS

  if (!user) redirect('/login')

  const { data } = await supabase.from('companies').select('*')
  return <CompaniesList companies={data} />
}
```

**Why the anti-pattern is bad**:
- Auth logic duplicated across components
- Easy to forget auth check in new components
- Harder to audit security
- Performance: Multiple unnecessary `getUser()` calls

### 2. Multi-Layer Protection

**RULE**: Protect at ALL layers, not just one.

**Layers**:
1. **Middleware**: Session validation and refresh
2. **Data Access Layer**: Auth verification before queries
3. **RLS Policies**: Database-level enforcement
4. **Server Actions**: Auth check in every mutation
5. **UI Layer**: Hide sensitive UI elements (defense in depth)

```typescript
// Layer 1: Middleware (session refresh)
// middleware.ts
export async function middleware(request: NextRequest) {
  return await updateSession(request) // Refreshes tokens
}

// Layer 2: Data Access Layer (auth verification)
// src/lib/dal/companies.ts
export async function createCompany(data: CompanyInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Layer 3: RLS enforces tenant isolation automatically
  return await supabase.from('companies').insert(data)
}

// Layer 4: Server Action (auth + validation)
// app/companies/actions.ts
'use server'
export async function createCompanyAction(formData: FormData) {
  // Validate input
  const validated = companySchema.parse(Object.fromEntries(formData))

  // Call DAL (which checks auth)
  return await createCompany(validated)
}

// Layer 5: UI (hide for unauthorized)
// components/CreateCompanyButton.tsx
export function CreateCompanyButton() {
  const { user } = useAuth() // Client-side context

  if (!user || user.role !== 'admin') return null // Hide UI

  return <Button onClick={createCompanyAction}>Create Company</Button>
}
```

### 3. Use getUser() Not getSession() on Server

**RULE**: ALWAYS use `supabase.auth.getUser()` in server code. NEVER use `getSession()`.

**Why**: `getSession()` reads from cookies without validating with Supabase Auth server. Cookies can be spoofed.

```typescript
// ✅ CORRECT - Validates with Auth server
const { data: { user } } = await supabase.auth.getUser()

// ❌ WRONG - Reads cookie only, can be spoofed
const { data: { session } } = await supabase.auth.getSession()
```

**Exception**: `getSession()` is safe in client-side code (browser) because cookies are httpOnly and can't be modified by client JavaScript.

### 4. Single Supabase Client Creation Pattern

**RULE**: Create ONE client per context type. Don't create multiple clients unnecessarily.

**Pattern**:
```typescript
// ✅ CORRECT - Utils pattern from Supabase docs
// utils/supabase/client.ts - For Client Components
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// utils/supabase/server.ts - For Server Components
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(/* ... */)
}

// Usage in components - create ONCE per request
export default async function Page() {
  const supabase = await createClient() // Create once
  const companies = await getCompanies(supabase) // Pass to functions
  const contacts = await getContacts(supabase) // Reuse same client
}
```

```typescript
// ❌ WRONG - Creating multiple clients
export default async function Page() {
  const supabase1 = await createClient() // Wasteful
  const companies = await supabase1.from('companies').select('*')

  const supabase2 = await createClient() // Don't create again!
  const contacts = await supabase2.from('contacts').select('*')
}
```

### 5. Avoid Auth Checks in Hooks/Context (Performance)

**RULE**: Don't put `getUser()` calls in React hooks that run on every render.

```typescript
// ❌ WRONG - Calls getUser() on every render
function useAuth() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser() // EXPENSIVE
      setUser(user)
    }
    loadUser()
  }, []) // Runs on mount, but still wasteful

  return { user }
}

// Used in multiple components = multiple getUser() calls
```

```typescript
// ✅ CORRECT - Get user once in layout, pass down via context
// app/layout.tsx (Server Component)
export default async function RootLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser() // Once per page load

  return (
    <AuthProvider user={user}> {/* Pass down via context */}
      {children}
    </AuthProvider>
  )
}

// components/AuthProvider.tsx (Client Component)
'use client'
const AuthContext = createContext<User | null>(null)

export function AuthProvider({ user, children }) {
  // Listen for auth state changes (login/logout)
  const [currentUser, setCurrentUser] = useState(user)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={currentUser}>{children}</AuthContext.Provider>
}

// Usage in any component - no auth call
export function UserProfile() {
  const user = useContext(AuthContext) // Fast, no API call
  return <div>{user?.email}</div>
}
```

**Performance Impact**:
- ❌ Per-component auth checks: 50-100ms per component × N components = 500ms+ overhead
- ✅ Centralized auth: 50ms once per page load

### 6. Middleware is NOT for Auth Logic (2025 Pattern)

**RULE**: Middleware only refreshes sessions. Auth checks belong in Data Access Layer.

**Why** (from Next.js 2025 docs):
- Middleware doesn't protect statically generated routes (content already built)
- Limited access to application context
- Auth logic in middleware conflicts with static optimization
- Middleware runs on every request (performance concern)

```typescript
// ✅ CORRECT - Middleware only refreshes sessions
// middleware.ts
export async function middleware(request: NextRequest) {
  return await updateSession(request) // ONLY refresh, don't check auth
}

// ❌ WRONG - Auth logic in middleware
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser() // DON'T DO THIS

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect('/login') // BAD PATTERN
  }
}
```

**Correct pattern**: Check auth in layout or page Server Components:
```typescript
// app/(dashboard)/layout.tsx
export default async function DashboardLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login') // Check here, not middleware

  return <>{children}</>
}
```

## Supabase-Specific Best Practices

### 1. Use @supabase/ssr (Not Deprecated auth-helpers)

**RULE**: Always use `@supabase/ssr` package. The `@supabase/auth-helpers` is deprecated.

```bash
# ✅ CORRECT
npm install @supabase/ssr

# ❌ DEPRECATED - Do not use
npm install @supabase/auth-helpers-nextjs
```

### 2. Cookie Management: ONLY Use getAll() and setAll()

**RULE**: Only use `getAll()` and `setAll()` for cookie operations in Supabase client config.

**Why**: Using other methods (like `get()`, `set()`) can cause random logouts that are very hard to debug.

```typescript
// ✅ CORRECT - From Supabase docs
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll() // ONLY getAll
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options) // ONLY setAll
            )
          } catch {
            // Server Component case - middleware will handle it
          }
        },
      },
    }
  )
}

// ❌ WRONG - Using get/set individually
cookies: {
  get(name) { return cookieStore.get(name) }, // Can cause bugs
  set(name, value, options) { cookieStore.set(name, value, options) }
}
```

### 3. Call cookies() to Opt Out of Next.js Caching

**RULE**: Call `cookies()` before Supabase queries to prevent caching of authenticated data.

**Why**: Next.js aggressively caches by default. Auth data must never be cached.

```typescript
// ✅ CORRECT - Opts out of caching
export async function getCompanies() {
  const cookieStore = await cookies() // This opts out of caching
  const supabase = await createClient()

  const { data } = await supabase.from('companies').select('*')
  return data
}

// ❌ WRONG - May cache auth data
export async function getCompanies() {
  const supabase = await createClient() // No cookies() call = might cache
  const { data } = await supabase.from('companies').select('*')
  return data
}
```

### 4. Handle Email Verification with Token Hash

**RULE**: Use `token_hash` (not old confirmation code) for email verification.

**Pattern**:
```typescript
// ✅ CORRECT - 2025 pattern
// app/auth/confirm/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      return NextResponse.redirect(new URL('/account', request.url))
    }
  }

  return NextResponse.redirect(new URL('/error', request.url))
}
```

**Don't forget**: Update email template in Supabase Dashboard to use `{{ .TokenHash }}` instead of `{{ .ConfirmationURL }}`.

### 5. Multi-Tenant JWT Claims Pattern

**RULE**: Use Custom Access Token Hook to add `tenant_id` to JWT claims.

**Implementation**:
```sql
-- Database function (already implemented in Epic #2)
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
  declare
    claims jsonb;
    user_tenant_id uuid;
  begin
    select tenant_id into user_tenant_id
    from public.users
    where id = (event->>'user_id')::uuid;

    claims := event->'claims';

    if user_tenant_id is not null then
      claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
    end if;

    event := jsonb_set(event, '{claims}', claims);
    return event;
  end;
$$;
```

**Enable in Dashboard**: Authentication → Hooks (Beta) → Custom Access Token Hook → Select `public.custom_access_token_hook`

**Access in RLS policies**:
```sql
-- RLS policies can now access tenant_id from JWT
CREATE POLICY "Users can only access their tenant's companies"
  ON companies
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

## Common Anti-Patterns & Fixes

### Anti-Pattern 1: Auth Calls in Multiple Components

**Problem**: Each component makes its own `getUser()` call.

**Impact**:
- 5-10 components × 50ms = 250-500ms overhead per page
- Unnecessary load on Supabase Auth server
- Increased connection pool usage

**Fix**: Get user once in layout, distribute via context (see Principle #5).

### Anti-Pattern 2: Using Context API for Auth State Everywhere

**Problem**: Overusing Context causes unnecessary re-renders when auth state changes.

**Impact**:
- Every context consumer re-renders on any auth state change
- Performance degradation with deep component trees
- Difficult to debug render cascades

**Fix**:
- Use Context ONLY for current user info
- Don't put loading states, error states in auth context
- Use separate contexts for different concerns

```typescript
// ✅ CORRECT - Minimal auth context
const AuthContext = createContext<User | null>(null)

// ❌ WRONG - Kitchen sink auth context
const AuthContext = createContext<{
  user: User | null
  loading: boolean
  error: Error | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  // ... 10 more things
}>()
```

### Anti-Pattern 3: Nested Component Re-Definitions

**Problem**: Defining components inside other components.

```typescript
// ❌ WRONG
function ParentComponent() {
  const { user } = useAuth()

  // This component gets redefined on EVERY render
  function ChildComponent() {
    return <div>{user?.email}</div>
  }

  return <ChildComponent />
}

// ✅ CORRECT
function ChildComponent({ email }: { email: string }) {
  return <div>{email}</div>
}

function ParentComponent() {
  const { user } = useAuth()
  return <ChildComponent email={user?.email} />
}
```

### Anti-Pattern 4: Auth Logic in Middleware (2025)

**Problem**: Middleware used for auth checks instead of session refresh.

**Why it's wrong** (Next.js 2025 guidance):
- Doesn't protect statically generated routes
- Limited application context
- Conflicts with static optimization
- Runs on EVERY request (even images, fonts)

**Fix**: Use middleware ONLY for session refresh (see Principle #6).

### Anti-Pattern 5: Not Handling Stale Refresh Tokens

**Problem**: Refresh token sent from browser to server is stale, causing auth failures.

**Fix**: Middleware pattern from Supabase handles this automatically:
```typescript
// utils/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(/* ... */)

  // This call refreshes stale tokens automatically
  await supabase.auth.getUser()

  return supabaseResponse
}
```

### Anti-Pattern 6: Route Prefetching After Login

**Problem**: Next.js prefetching can cause issues with auth tokens in URL fragments.

**Fix**: Redirect to non-prefetched page first:
```typescript
// ✅ CORRECT - Redirect to simple page first
export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(/* ... */)

  if (!error) {
    redirect('/auth/callback') // Simple page, no prefetching
  }
}

// app/auth/callback/page.tsx - Extract tokens, then redirect
export default async function AuthCallback() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard') // Now safe to prefetch
  }
}
```

## Architecture Patterns

### Pattern 1: Data Access Layer (DAL)

**Structure**:
```
src/lib/dal/
  ├── companies.ts      # Company data access
  ├── contacts.ts       # Contact data access
  ├── interactions.ts   # Interaction data access
  └── shared.ts         # Shared auth utilities
```

**Template**:
```typescript
// src/lib/dal/shared.ts
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return { user, supabase }
}

// src/lib/dal/companies.ts
export async function getCompanies() {
  const { supabase } = await requireAuth() // Centralized auth check

  const { data, error } = await supabase
    .from('companies')
    .select('*')

  if (error) throw error
  return data
}

export async function createCompany(input: CompanyInput) {
  const { supabase } = await requireAuth() // Centralized auth check

  const { data, error } = await supabase
    .from('companies')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data
}
```

### Pattern 2: Server Actions with Auth

**Template**:
```typescript
// app/companies/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createCompany } from '@/lib/dal/companies'
import { companySchema } from '@/lib/schemas'

export async function createCompanyAction(formData: FormData) {
  try {
    // 1. Validate input
    const validated = companySchema.parse({
      business_name: formData.get('business_name'),
      city: formData.get('city'),
      // ... other fields
    })

    // 2. DAL handles auth check
    const company = await createCompany(validated)

    // 3. Revalidate cache
    revalidatePath('/companies')

    return { success: true, data: company }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### Pattern 3: Protected Route Wrapper

**Template**:
```typescript
// components/ProtectedRoute.tsx
export async function ProtectedRoute({
  children,
  requiredRole
}: {
  children: React.ReactNode
  requiredRole?: 'admin' | 'editor' | 'viewer'
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (requiredRole) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== requiredRole && requiredRole === 'admin') {
      redirect('/unauthorized')
    }
  }

  return <>{children}</>
}

// Usage
// app/admin/page.tsx
export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  )
}
```

## Performance Optimization

### Optimization 1: Cache User Lookups in DAL

```typescript
// src/lib/dal/shared.ts
import { cache } from 'react'

// Cache for the lifetime of the request
export const requireAuth = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  return { user, supabase }
})
```

**Benefit**: Multiple DAL calls in same request share one `getUser()` call.

### Optimization 2: Minimize Auth Context Re-Renders

```typescript
// ✅ CORRECT - Only user object in context
const AuthContext = createContext<User | null>(null)

// If you need loading state, use separate context
const AuthLoadingContext = createContext<boolean>(false)

// Components only subscribe to what they need
function UserEmail() {
  const user = useContext(AuthContext) // Only re-renders when user changes
  return <span>{user?.email}</span>
}

function LoadingSpinner() {
  const loading = useContext(AuthLoadingContext) // Only re-renders when loading changes
  return loading ? <Spinner /> : null
}
```

## Security Best Practices

### Security 1: Never Trust Client-Side Auth State for Security

**RULE**: Client-side auth state is for UX only. Always verify server-side.

```typescript
// ✅ CORRECT
'use server'
export async function deleteCompany(companyId: string) {
  const { supabase } = await requireAuth() // Server-side verification

  // RLS policies enforce tenant isolation
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId)

  if (error) throw error
}

// ❌ WRONG - Trusting client
'use server'
export async function deleteCompany(companyId: string, userRole: string) {
  // DON'T trust userRole from client!
  if (userRole !== 'admin') {
    throw new Error('Unauthorized')
  }
  // ... delete logic
}
```

### Security 2: RLS Policies for Defense in Depth

**RULE**: Always have RLS policies even if you check auth in application layer.

**Why**: Multiple layers of security. If you forget auth check in new code, RLS prevents data leaks.

```sql
-- ✅ CORRECT - RLS enforces even if app code has bugs
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their tenant's companies"
  ON companies
  FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

### Security 3: Input Validation with Zod

**RULE**: Always validate user input with Zod schemas before database operations.

```typescript
// ✅ CORRECT
import { z } from 'zod'

const companySchema = z.object({
  business_name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
})

export async function createCompany(input: unknown) {
  const validated = companySchema.parse(input) // Throws if invalid
  // ... proceed with validated data
}
```

## Testing Strategy

### Test 1: Verify RLS Enforcement

```typescript
// tests/auth/rls-isolation.test.ts
test('RLS prevents cross-tenant access', async () => {
  // Create two test users in different tenants
  const tenant1User = await signUp({
    email: 'user1@test.com',
    metadata: { tenant_id: TENANT_1_ID }
  })

  const tenant2User = await signUp({
    email: 'user2@test.com',
    metadata: { tenant_id: TENANT_2_ID }
  })

  // User 1 creates a company
  const company = await createCompany({
    business_name: 'Test Co',
    tenant_id: TENANT_1_ID
  })

  // User 2 tries to access it
  const tenant2Client = createClientFor(tenant2User)
  const { data, error } = await tenant2Client
    .from('companies')
    .select('*')
    .eq('id', company.id)
    .single()

  // Should return no data (RLS blocks it)
  expect(data).toBeNull()
  expect(error).toBeTruthy()
})
```

### Test 2: Verify Custom JWT Claims

```typescript
test('JWT contains tenant_id claim', async () => {
  const user = await signUp({
    email: 'test@example.com',
    metadata: { tenant_id: TENANT_1_ID }
  })

  const session = await getSession()
  const decoded = jwtDecode(session.access_token)

  expect(decoded.tenant_id).toBe(TENANT_1_ID)
})
```

## Checklist for New Auth-Related Features

Before implementing any feature that touches authentication:

- [ ] Auth check in Data Access Layer (not component)
- [ ] Using `getUser()` not `getSession()` on server
- [ ] Input validation with Zod schema
- [ ] RLS policy covers this data access pattern
- [ ] No auth logic in middleware
- [ ] Using `@supabase/ssr` (not deprecated package)
- [ ] Called `cookies()` to opt out of Next.js caching
- [ ] Client-side auth state used for UX only (not security)
- [ ] Tested with multiple tenants
- [ ] Tested RLS enforcement

## Enforcement Strategy

### 1. Code Review Checklist

Create a `.github/PULL_REQUEST_TEMPLATE.md`:
```markdown
## Auth Security Checklist

If this PR touches authentication or data access:

- [ ] Auth checks in Data Access Layer (not components)
- [ ] Using `getUser()` not `getSession()` on server
- [ ] RLS policies cover new data access patterns
- [ ] Tested with multiple tenants
- [ ] Input validation with Zod
```

### 2. ESLint Rules (Future)

Create custom ESLint rules to detect:
- `getSession()` usage in server code
- Component-level auth checks
- Missing `cookies()` call before Supabase queries

### 3. Architecture Decision Records (ADRs)

Document major auth architecture decisions in `docs/architecture/adr/`:
- `001-use-dal-pattern-for-auth.md`
- `002-custom-jwt-claims-for-tenant-id.md`
- `003-multi-layer-security.md`

### 4. Regular Audits

Weekly/monthly audits:
- Search for `getSession()` in server code
- Search for `getUser()` in component files
- Review new RLS policies
- Check Custom Access Token Hook is enabled

## Quick Reference

### File Structure
```
utils/supabase/
  ├── client.ts       # Browser client
  ├── server.ts       # Server client
  └── middleware.ts   # Session refresh logic
middleware.ts         # Next.js middleware
src/lib/dal/          # Data Access Layer (auth checks here)
src/lib/schemas/      # Zod validation schemas
```

### Key Functions
```typescript
// Get authenticated user (server-side)
const { data: { user } } = await supabase.auth.getUser()

// Sign up with metadata
await supabase.auth.signUp({
  email, password,
  options: { data: { tenant_id, first_name, last_name, role } }
})

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Sign out
await supabase.auth.signOut()
```

### Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx # Server-side only, never expose
```

## Resources

- [Supabase Next.js SSR Auth Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Auth Troubleshooting](https://github.com/orgs/supabase/discussions/27606)
- [Next.js Authentication Guide (2025)](https://nextjs.org/docs/app/guides/authentication)
- [Custom JWT Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)

---

**Maintainers**: Update this document when:
- New auth patterns discovered
- Performance issues identified
- Security vulnerabilities found
- Supabase releases breaking changes
- Next.js auth guidance updates
