# ADR-001: Use Data Access Layer (DAL) Pattern for Authentication

**Date**: November 11, 2024
**Status**: Accepted
**Deciders**: Development Team
**Related Issue**: #3 (Authentication & Next.js Application Setup)

---

## Context

In previous projects, we experienced significant problems with scattered authentication logic:

**Problems Encountered**:
1. **Performance**: Components individually calling `getUser()` resulted in 500ms+ overhead (50-100ms per call × 5-10 components)
2. **Inconsistency**: Some components checked auth, others didn't, leading to security gaps
3. **Maintenance**: Auth logic spread across 20+ component files, difficult to audit
4. **Duplication**: Same auth patterns reimplemented differently in each component

**The Question**: How do we centralize authentication checks while maintaining Next.js 15 Server Component patterns and Supabase RLS integration?

## Decision

We will use the **Data Access Layer (DAL) pattern** for all authentication checks and data access.

**Core Principle**: **Never check authentication in components. Always check at the data access layer.**

### Implementation

```typescript
// src/lib/dal/shared.ts
import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

// Cached for request lifetime
export const requireAuth = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return { user, supabase }
})

// src/lib/dal/companies.ts
export async function getCompanies() {
  const { supabase } = await requireAuth() // Auth check HERE

  const { data, error } = await supabase
    .from('companies')
    .select('*')

  if (error) throw error
  return data
}

// app/companies/page.tsx
export default async function CompaniesPage() {
  const companies = await getCompanies() // No auth logic in component
  return <CompaniesList companies={companies} />
}
```

## Consequences

### Positive

1. **Performance**: One `getUser()` call per request (cached with React's `cache()`) instead of N calls
   - Before: 5-10 components × 50ms = 250-500ms
   - After: 1 call × 50ms = 50ms
   - **Improvement**: 5-10x faster

2. **Security**: Centralized auth logic is easier to audit and maintain
   - All auth checks in `src/lib/dal/` directory
   - Can't accidentally forget auth check (DAL always checks)
   - Defense in depth: DAL + RLS policies

3. **Consistency**: One pattern used everywhere
   - No "which auth pattern should I use?" questions
   - Easier for AI developers to follow
   - Clearer code reviews

4. **Maintainability**: Auth logic in one place
   - Update auth pattern once, affects all features
   - Easy to find all auth-related code
   - Simpler debugging

5. **Testability**: Easy to test auth logic separately
   - Mock DAL functions in component tests
   - Test DAL auth logic in isolation
   - Clear separation of concerns

### Negative

1. **Learning Curve**: Team needs to learn DAL pattern
   - Mitigation: Documented in `auth-best-practices.md`
   - Mitigation: Skills auto-enforce pattern
   - Mitigation: Examples in every DAL file

2. **Boilerplate**: Need to create DAL functions for each data operation
   - Mitigation: Create templates/generators
   - Mitigation: Benefit outweighs cost (performance + security)

3. **Indirection**: One more layer between component and data
   - Mitigation: Better separation of concerns
   - Mitigation: Easier testing (benefit outweighs cost)

## Alternatives Considered

### Alternative 1: Component-Level Auth Checks

**Approach**: Each component calls `getUser()` and handles auth.

```typescript
// Each component does this
export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase.from('companies').select('*')
  return <List data={data} />
}
```

**Why we rejected**:
- ❌ Performance: Multiple `getUser()` calls per page
- ❌ Duplication: Auth logic repeated everywhere
- ❌ Error-prone: Easy to forget auth check
- ❌ Maintenance: Changes require updating all components

### Alternative 2: Middleware-Only Auth

**Approach**: Put all auth logic in Next.js middleware.

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect('/login')
  }
}
```

**Why we rejected**:
- ❌ **2025 Next.js guidance**: Middleware not recommended for auth logic
- ❌ Doesn't protect statically generated routes
- ❌ Limited application context
- ❌ Conflicts with Next.js static optimization
- ❌ Runs on every request (even static assets)
- ❌ Can't do granular checks (role-based, data-specific)

### Alternative 3: React Context with useAuth() Hook

**Approach**: Create auth context, use `useAuth()` hook in every component.

```typescript
function useAuth() {
  const { user } = useContext(AuthContext)
  if (!user) throw new Error('Unauthorized')
  return user
}

function Component() {
  const user = useAuth() // Every component calls this
  // ...
}
```

**Why we rejected**:
- ❌ Still requires checking in every component
- ❌ Client Components only (doesn't work in Server Components)
- ❌ Context re-renders all consumers
- ❌ Can't enforce at compile-time

### Alternative 4: HOC (Higher-Order Component) Pattern

**Approach**: Wrap components with `withAuth()` HOC.

```typescript
const ProtectedPage = withAuth(Page)
```

**Why we rejected**:
- ❌ Outdated pattern (pre-hooks era)
- ❌ Doesn't work well with Next.js Server Components
- ❌ Still allows unprotected pages (opt-in, not enforced)
- ❌ Less explicit than DAL

## Why DAL is Best for Our Use Case

**Our Requirements**:
1. Next.js 15 Server Components (primary pattern)
2. Supabase Auth with RLS
3. Multi-tenant isolation (tenant_id in JWT)
4. High performance (minimize auth calls)
5. Easy for AI developers to follow

**DAL Matches All Requirements**:
- ✅ Works perfectly with Server Components
- ✅ Integrates with Supabase RLS (auth check + RLS = defense in depth)
- ✅ Single `getUser()` call per request (cached)
- ✅ Clear, consistent pattern for AI to follow
- ✅ Enforced by project structure (all data access through DAL)

**Additional Benefits**:
- Recommended by Next.js 2025 documentation
- Aligns with current best practices
- Scales well as app grows
- Easy to test in isolation

## Implementation Plan

### Phase 1: Setup (Epic #3)
- Create `src/lib/dal/` directory structure
- Implement `requireAuth()` helper
- Create first DAL modules (companies, contacts)

### Phase 2: Expansion (Epic #4-7)
- Add DAL modules for each feature
- All data access goes through DAL
- Zero component-level auth checks

### Phase 3: Validation (Ongoing)
- Test suite validates DAL usage
- Senior developer specialist reviews enforce pattern
- PR template checklist catches violations

## Monitoring Success

**Metrics to track**:
- Auth call count per page load (should be 1)
- Lines of auth code in components (should be 0)
- Auth-related bugs (should trend to zero)
- Performance: Time to first byte (should improve)

**Review quarterly**: Is DAL pattern still serving us well? Any issues discovered?

## References

- `docs/architecture/auth-best-practices.md` - Full implementation patterns
- [Next.js Authentication Guide (2025)](https://nextjs.org/docs/app/guides/authentication)
- [Supabase Server-Side Auth](https://supabase.com/docs/guides/auth/server-side/nextjs)
- GitHub Issue #3 - Where this will be implemented

---

**Decision Authority**: This ADR represents accepted standard practice for all authentication in impactOS multi-tenant platform.

**Supersedes**: None (first ADR)

**Superseded By**: None (current)
