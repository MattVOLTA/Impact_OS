# Multi-Organization Security Analysis & Refactoring Plan

**Created**: 2025-11-16
**Issue**: Data not properly isolated between organizations when user switches
**Severity**: 🚨 CRITICAL SECURITY ISSUE

---

## 🔴 Current Problem

**Symptom**: User on "Acme 3" organization can see "Volta's" data

**Root Cause**: Cookie vs JWT mismatch
- **Active org stored in**: HTTP cookie (`active_organization_id`)
- **RLS policies check**: JWT claims (`auth.jwt() ->> 'tenant_id'`)
- **Custom Access Token Hook reads from**: `users.tenant_id` (old single-tenant column)
- **Result**: Cookie says "Acme 3", JWT says "Volta", RLS uses JWT ❌

---

## 📚 Research Findings from Supabase Documentation

### Key Insights:

1. **"RLS policies use information contained in a JWT"** (Glossary)
   - Policies can ONLY see what's in the JWT
   - Cookies are invisible to RLS
   - Server-side variables are invisible to RLS

2. **"Store tenant_id on User's app_metadata"** (Custom Claims guide)
   - Should be in `app_metadata` (secure, immutable by user)
   - NOT in `user_metadata` (user-modifiable)
   - Accessible via `auth.jwt() ->> 'tenant_id'`

3. **Security Definer Functions Pattern** (Slack Clone example, RBAC guide)
   ```sql
   create function get_user_org_role(org_id bigint, user_id uuid)
   returns text
   security definer  -- Bypasses RLS
   as $$
     select role from org_members where ...
   $$;

   -- Use in RLS policy
   create policy "..." using (
     get_user_org_role(org_id, auth.uid()) = 'admin'
   );
   ```

4. **"Avoid RLS recursion by using security definer functions"** (RLS Performance guide)
   - Don't query the SAME table in its own RLS policy
   - Use separate function marked `security definer`
   - Function bypasses RLS, returns result to policy

5. **JWT Refresh Limitation**
   - "Token remains valid for 1 hour...policies continue to allow access"
   - Custom Access Token Hook only runs on token issuance
   - Organization switch needs token refresh OR different approach

---

## ❌ What We Got Wrong

### Issue 1: Cookie-Based Active Organization
**Current**: Store `active_organization_id` in HTTP cookie
**Problem**: RLS policies can't read cookies, only JWT
**Impact**: Users see data from JWT's `tenant_id`, not cookie's `active_organization_id`

### Issue 2: Stale Custom Access Token Hook
**Current**: Hook reads `users.tenant_id` (nullable, deprecated)
**Problem**: Returns old single-tenant ID, not current active org
**Impact**: JWT contains wrong organization ID

### Issue 3: Incomplete RLS Migration
**Updated**: Only `companies` table uses multi-org RLS pattern
**Not Updated**: 18 other tables still use old pattern
**Impact**: Mixed data visibility (companies from multiple orgs, contacts from old org)

### Issue 4: No Token Refresh on Org Switch
**Current**: Switch org → Update cookie → Redirect
**Problem**: JWT not refreshed, still contains old `tenant_id`
**Impact**: RLS policies use stale JWT data

---

## ✅ Three Solution Approaches (Supabase-Recommended)

### Option A: JWT-Based Active Organization (Simplest but Limited)

**How it works:**
1. Store active org in database `user_sessions` table
2. Update Custom Access Token Hook to read active org from table
3. Add `active_organization_id` to JWT `app_metadata`
4. RLS policies use `auth.jwt() -> 'app_metadata' ->> 'active_organization_id'`
5. Force token refresh when switching orgs

**Pros:**
- ✅ Uses JWT (what RLS sees)
- ✅ Supabase-recommended pattern for tenant_id

**Cons:**
- ❌ Requires token refresh on every org switch (slow UX)
- ❌ Hook runs on every token issuance (performance cost)
- ❌ 1-hour JWT lifetime = stale data window

**Verdict**: Not ideal for multi-org switching UX

---

### Option B: Security Definer Function (Supabase-Recommended) ⭐

**How it works:**
1. Create `user_sessions` table (user_id, active_organization_id)
2. Update session on org switch (instant)
3. Create security definer function:
   ```sql
   create function get_active_organization_id()
   returns uuid
   security definer
   as $$
     select active_organization_id
     from user_sessions
     where user_id = auth.uid()
   $$;
   ```
4. RLS policies call function:
   ```sql
   tenant_id IN (
     SELECT organization_id
     FROM organization_members
     WHERE user_id = auth.uid()
     AND organization_id = get_active_organization_id()
   )
   ```

**Pros:**
- ✅ Instant org switching (no token refresh)
- ✅ Supabase-recommended pattern (Slack clone, RBAC guide)
- ✅ Bypasses RLS recursion via `security definer`
- ✅ Works with existing cookie (read from session table instead)

**Cons:**
- ⚠️ Adds database lookup to every RLS policy evaluation
- ⚠️ Needs session cleanup (expired sessions)

**Verdict**: **RECOMMENDED** - Best balance of security, UX, and Supabase best practices

---

### Option C: Session Table + JWT Hybrid (Most Flexible)

**How it works:**
1. Use security definer function (Option B)
2. ALSO add to JWT via hook for read-heavy operations
3. Function checks both JWT and session table (JWT = fast path, table = accurate path)

**Pros:**
- ✅ Performance optimization (JWT cache for reads)
- ✅ Accurate writes (session table for mutations)

**Cons:**
- ❌ Most complex
- ❌ Overkill for MVP

**Verdict**: Post-MVP optimization

---

## 🎯 Recommended Solution: Security Definer Function Pattern

Based on Supabase documentation (Slack clone, RBAC guide, RLS performance guide), here's the architecture:

### Architecture Diagram:

```
User switches org → Update user_sessions table → Instant
                    ↓
RLS Policy executes → Calls get_active_organization_id()
                    ↓
Function (security definer) → Queries user_sessions (bypasses RLS)
                    ↓
Returns active_organization_id → Policy uses for filtering
                    ↓
User sees only active org's data ✅
```

---

## 📋 Refactoring Plan (Step-by-Step)

### Phase 1: Create Session Management Infrastructure

**1.1 Create user_sessions table**
```sql
CREATE TABLE user_sessions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_organization_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  last_switched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_org ON user_sessions(active_organization_id);

-- RLS: Users can only see/update their own session
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own session"
  ON user_sessions FOR ALL
  USING (user_id = auth.uid());
```

**1.2 Create security definer function**
```sql
CREATE OR REPLACE FUNCTION get_active_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_org_id uuid;
BEGIN
  -- Query user's active organization (bypasses RLS via security definer)
  SELECT active_organization_id INTO active_org_id
  FROM user_sessions
  WHERE user_id = auth.uid();

  -- If no session found, get first organization user belongs to
  IF active_org_id IS NULL THEN
    SELECT organization_id INTO active_org_id
    FROM organization_members
    WHERE user_id = auth.uid()
    LIMIT 1;
  END IF;

  RETURN active_org_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_active_organization_id() TO authenticated;
```

**1.3 Migrate existing cookie data to session table**
```sql
-- Populate user_sessions with current active org from organization_members
INSERT INTO user_sessions (user_id, active_organization_id)
SELECT DISTINCT ON (user_id)
  user_id,
  organization_id
FROM organization_members
ON CONFLICT (user_id) DO NOTHING;
```

---

### Phase 2: Update RLS Policies (ALL 19 tables)

**Pattern to apply to EVERY data table:**

```sql
-- Example for companies table
DROP POLICY IF EXISTS "Users can access data in their organizations" ON companies;

CREATE POLICY "Users can access current organization's data"
  ON companies FOR ALL
  USING (
    tenant_id IN (
      SELECT organization_id
      FROM organization_members
      WHERE user_id = auth.uid()
      AND organization_id = get_active_organization_id()
    )
  );
```

**Tables requiring update:**
1. ✅ companies (already partial)
2. ❌ contacts
3. ❌ contact_demographics
4. ❌ company_contacts
5. ❌ interactions
6. ❌ interaction_companies
7. ❌ interaction_contacts
8. ❌ meeting_transcripts
9. ❌ programs
10. ❌ company_program_enrollments
11. ❌ company_updates
12. ❌ support_summary
13. ❌ forms
14. ❌ form_submissions
15. ❌ update_form_reminders
16. ❌ program_contacts
17. ❌ advisor_profiles
18. ❌ reports
19. ❌ report_sessions

---

### Phase 3: Update DAL Functions

**3.1 Update switch-org API route**
```typescript
// app/api/switch-org/[id]/route.ts

// BEFORE: Only update cookie
cookieStore.set('active_organization_id', organizationId, {...})

// AFTER: Update session table (source of truth)
await supabase
  .from('user_sessions')
  .upsert({
    user_id: user.id,
    active_organization_id: organizationId,
    last_switched_at: new Date().toISOString()
  })

// Cookie still useful for server components, but table is authoritative
cookieStore.set('active_organization_id', organizationId, {...})
```

**3.2 Update getCurrentOrganizationId()**
```typescript
// lib/dal/shared.ts

// BEFORE: Read from cookie
const cookieValue = (await cookieStore).get('active_organization_id')

// AFTER: Read from session table (matches what RLS sees)
const { data } = await supabase
  .from('user_sessions')
  .select('active_organization_id')
  .eq('user_id', user.id)
  .single()

return data?.active_organization_id || fallback
```

---

### Phase 4: Testing & Validation

**4.1 Update multi-org isolation tests**
```typescript
test('user can only see active organization data', async () => {
  // User belongs to Org A and Org B
  // Switch to Org A
  // Verify ONLY Org A data visible
  // Switch to Org B
  // Verify ONLY Org B data visible
})
```

**4.2 Test all 19 tables**
- Verify each table respects active org
- Test switching between orgs
- Verify no cross-org data leakage

---

## 🔒 Security Considerations

### Defense-in-Depth Layers:

1. **RLS Policies** - Database-level enforcement (primary)
2. **Security Definer Function** - Bypasses RLS recursion safely
3. **Membership Check** - Verifies user belongs to org before showing data
4. **Active Org Check** - Only shows data from CURRENT active org

### Why This is Secure:

- ✅ Function marked `SECURITY DEFINER` + `SET search_path = public` (prevents SQL injection)
- ✅ RLS still checks membership (`user_id = auth.uid()` in organization_members)
- ✅ Can't access org you're not a member of
- ✅ Can't see other users' session data (RLS on user_sessions)

---

## ⚡ Performance Considerations

### Concern: Function call on every RLS check

**Supabase says**:
> "Use security definer functions for complex role checks to avoid RLS penalties on joined tables"

**Optimization strategies:**
1. **Connection pooling** - Reuses function compilation
2. **Session table index** - Fast user_id lookup (already planned)
3. **Inline caching** - Postgres caches function results within transaction
4. **Explicit filters** - Add `.eq('tenant_id', activeOrgId)` in queries to help query planner

**Benchmark from docs**: Security definer pattern is FASTER than subquery RLS

---

## 📊 Migration Strategy

### Approach: Phased rollout with testing

**Step 1**: Create infrastructure (session table, function) - **Non-breaking**
**Step 2**: Update ONE table's RLS (e.g., contacts) - **Test thoroughly**
**Step 3**: Update remaining tables incrementally - **Verify each**
**Step 4**: Remove deprecated `users.tenant_id` column - **Cleanup**

### Rollback Plan:

If issues arise:
- Security definer function can be modified without touching policies
- Can revert individual table policies independently
- Session table is additive (doesn't break existing functionality)

---

## 🎯 Success Criteria

After refactoring, verify:

- [ ] User on "Acme 3" sees ONLY Acme 3 data (all tables)
- [ ] User on "Volta" sees ONLY Volta data (all tables)
- [ ] Switching orgs changes data visibility instantly
- [ ] Users cannot access orgs they're not members of
- [ ] Direct URL access respects active organization
- [ ] Performance acceptable (<100ms for filtered queries)
- [ ] All 19 tables properly scoped

---

## 📖 Reference Documentation

**Supabase Patterns Used:**
- Custom Claims & RBAC: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
- RLS Performance: https://github.com/orgs/supabase/discussions/14576
- Security Definer Functions: https://supabase.com/docs/guides/database/postgres/row-level-security#using-functions
- Slack Clone Example: https://github.com/supabase/supabase/tree/master/examples/slack-clone
- Multi-Tenant Guide: https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/

**Key Quotes:**
> "Use security definer functions for complex role checks to avoid RLS penalties"
> "Store tenant_id on User's app_metadata...easily accessible in RLS policies"
> "Avoid RLS recursion issues by using security definer"

---

## 🚀 Next Steps

1. Review this plan
2. Decide on implementation approach (recommend Option B)
3. Create GitHub issue to track refactoring
4. Implement with TDD (write failing tests first)
5. Deploy incrementally with rollback plan ready

---

**CRITICAL**: Do not deploy to production until this is fixed. Current state allows cross-organization data access.
