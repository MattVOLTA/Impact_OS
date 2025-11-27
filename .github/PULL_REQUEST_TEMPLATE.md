# Pull Request

## Description

<!-- Describe what this PR accomplishes and why -->

**Related Issue**: #[issue-number]

## Changes

<!-- List the key changes made in this PR -->

-
-
-

## Auth Security Checklist

<!-- If this PR touches authentication or data access, complete this checklist -->

**Skip this section if PR doesn't touch auth or data access**

- [ ] Auth checks centralized in Data Access Layer (`src/lib/dal/*`)
- [ ] Using `getUser()` not `getSession()` on server-side code
- [ ] RLS policies cover all new data access patterns
- [ ] Tested with multiple tenants (tenant isolation verified)
- [ ] Input validation implemented with Zod schemas
- [ ] No auth logic in middleware (session refresh only)
- [ ] Using `@supabase/ssr` (not deprecated `@supabase/auth-helpers`)
- [ ] Called `cookies()` before Supabase auth queries
- [ ] Senior developer specialist reviewed (for significant auth changes)
- [ ] Followed patterns from `docs/architecture/auth-best-practices.md`

## Test-Driven Development Checklist

<!-- Verify TDD process was followed -->

- [ ] Tests written BEFORE implementation code
- [ ] Watched each test fail before implementing
- [ ] Tests failed for correct reason (feature missing, not typo)
- [ ] Wrote minimal code to pass tests
- [ ] All tests pass
- [ ] Test data cleanup implemented (no database pollution)
- [ ] Tests can run multiple times without manual cleanup

**For Supabase Auth features specifically**:
- [ ] Tenant isolation tested (cross-tenant access blocked)
- [ ] JWT claims tested (tenant_id in access token)
- [ ] Database triggers tested (if applicable)
- [ ] Auth test users cleaned up using admin client

## Test Results

```
<!-- Paste test output showing all tests pass -->
```

**Coverage**: [X]% (if measured)

## Documentation

- [ ] Updated related GitHub issue with completion status
- [ ] Created/updated ADR if architectural decision made (see `docs/architecture/adr/`)
- [ ] Added code comments referencing `auth-best-practices.md` for critical sections
- [ ] Updated relevant documentation files (README, API docs, etc.)

## Breaking Changes

<!-- List any breaking changes and migration notes -->

- [ ] No breaking changes
- [ ] Breaking changes documented below:

## Deployment Notes

<!-- Any special deployment considerations -->

- [ ] No special deployment steps needed
- [ ] Requires database migration (see migration file)
- [ ] Requires environment variable changes
- [ ] Requires Supabase Dashboard configuration (describe below)

---

## Reviewer Checklist

**For reviewers** (can be the AI developer or human):

- [ ] Code follows project standards (`PRINCIPLES.md`)
- [ ] Auth patterns match `auth-best-practices.md`
- [ ] Tests exist and cover new functionality
- [ ] No anti-patterns detected
- [ ] Documentation updated appropriately
- [ ] GitHub issue updated with completion status
