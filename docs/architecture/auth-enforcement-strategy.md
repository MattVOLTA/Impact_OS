# Authentication Best Practices Enforcement Strategy

**Created**: November 11, 2024
**Status**: Active Standard
**Owner**: Development Team

---

## Purpose

This document outlines our multi-layered strategy for ensuring authentication best practices are followed consistently throughout the impactOS multi-tenant platform development.

## The Problem We're Solving

**Historical Issues**:
- Components making individual auth calls instead of centralizing
- Performance overhead from scattered authentication checks
- Security gaps from inconsistent auth patterns
- Difficulty auditing auth logic spread across codebase

**Root Cause**: Lack of codified architectural patterns and enforcement mechanisms.

## Our Solution: Multi-Layered Enforcement

### Layer 1: Documentation (Source of Truth)

**Primary Document**: `docs/architecture/auth-best-practices.md`

**What it contains**:
- 6 core authentication principles
- 6 common anti-patterns with fixes
- 3 architecture patterns (DAL, Server Actions, Protected Routes)
- Performance optimization strategies
- Security best practices
- Testing strategies
- Supabase-specific patterns (2025 latest)

**Usage**:
- Reference BEFORE implementing any auth feature
- Update when we discover new patterns/anti-patterns
- Link from code comments for critical sections

### Layer 2: Skills Integration

**Enhanced Skills**:

1. **`senior-developer-specialist`**
   - Auth architecture is now highest priority in Supabase expertise
   - Auto-references `auth-best-practices.md` for all auth reviews
   - 8-point anti-pattern detection checklist
   - Quick validation patterns built-in

2. **`test-driven-development`**
   - Supabase auth-specific testing section added
   - Tenant isolation testing requirements
   - JWT claims testing patterns
   - Data Access Layer testing approach
   - Auth test data cleanup strategies

**How to use**:
```
Before auth implementation:
1. Invoke test-driven-development skill → Write tests first
2. Implement following auth-best-practices.md patterns
3. Invoke senior-developer-specialist → Review before commit
```

### Layer 3: Test-Driven Development

**Mandatory Tests for Auth Features**:

1. **Tenant Isolation Tests**
   - Cross-tenant access attempts
   - RLS policy enforcement
   - JWT claim validation

2. **Data Access Layer Tests**
   - Unauthenticated request rejection
   - Authenticated request success
   - Proper error handling

3. **Integration Tests**
   - Signup → trigger → public.users creation
   - Login → JWT claims → RLS enforcement
   - Multi-tenant data scoping

**Enforcement**: No auth feature is "done" without passing all test categories.

### Layer 4: Pull Request Template

**File**: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Changes

[Description]

## Auth Security Checklist (if PR touches auth or data access)

- [ ] Auth checks in Data Access Layer (`src/lib/dal/*`)
- [ ] Using `getUser()` not `getSession()` on server
- [ ] RLS policies cover new data access patterns
- [ ] Tested with multiple tenants (tenant isolation verified)
- [ ] Input validation with Zod schemas
- [ ] No auth logic in middleware (session refresh only)
- [ ] Using `@supabase/ssr` (not deprecated `@supabase/auth-helpers`)
- [ ] Called `cookies()` before auth queries (opts out of Next.js caching)
- [ ] Senior developer specialist reviewed (for significant auth changes)
- [ ] TDD followed (test written first, watched fail, then implemented)

## Test Results

- [ ] All tests pass
- [ ] Test coverage for new code
- [ ] Auth isolation tests pass (if applicable)

## Documentation

- [ ] Updated relevant GitHub issue with completion status
- [ ] Created/updated ADR if architectural decision made
- [ ] Code comments reference `auth-best-practices.md` for critical sections
```

### Layer 5: Architecture Decision Records (ADRs)

**Location**: `docs/architecture/adr/`

**Purpose**: Document WHY we made specific auth architectural decisions.

**Template for Auth ADRs**:
```markdown
# ADR-XXX: [Decision Title]

**Date**: YYYY-MM-DD
**Status**: Accepted | Superseded | Deprecated
**Deciders**: [Who made decision]

## Context

[Problem we're solving]

## Decision

[What we decided to do]

## Consequences

**Positive**:
- [Benefit 1]
- [Benefit 2]

**Negative**:
- [Trade-off 1]
- [Trade-off 2]

## Alternatives Considered

- **Alternative 1**: [Why we didn't choose this]
- **Alternative 2**: [Why we didn't choose this]

## References

- `docs/architecture/auth-best-practices.md`
- Related GitHub issues
- Supabase documentation links
```

**Initial ADRs to Create**:
1. `001-use-dal-pattern-for-auth.md` - Why we centralize auth checks
2. `002-custom-jwt-claims-for-tenant-id.md` - Why we use Custom Access Token Hook
3. `003-multi-layer-security.md` - Why we enforce at multiple layers
4. `004-supabase-ssr-package.md` - Why we use @supabase/ssr not auth-helpers

### Layer 6: Code Review Workflow

**Standard Process for Auth-Related Changes**:

```
┌─────────────────────────────────────┐
│ Developer starts auth feature       │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Invoke test-driven-development skill│
│ - Review auth testing patterns      │
│ - Write tests FIRST                 │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Watch tests FAIL                    │
│ - Verify failure reason is correct  │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Implement using auth-best-practices │
│ - Follow DAL pattern                │
│ - Use latest Supabase patterns      │
│ - Reference patterns in comments    │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Watch tests PASS                    │
│ - All auth tests green              │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Invoke senior-developer-specialist  │
│ - Review auth architecture          │
│ - Check against anti-patterns       │
│ - Validate performance              │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Create PR with checklist filled     │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Update GitHub issue with completion │
│ - Document what was implemented     │
│ - Note any decisions/learnings      │
└──────────────┬──────────────────────┘
               ↓
┌─────────────────────────────────────┐
│ Create ADR if architectural decision│
└─────────────────────────────────────┘
```

### Layer 7: Automated Validation (Future)

**ESLint Rules** (to be created):
```javascript
// .eslintrc.js - Custom rules
rules: {
  'no-getsession-on-server': 'error',     // Blocks getSession() in Server Components
  'no-auth-in-components': 'error',       // Blocks getUser() outside DAL
  'require-cookies-before-supabase': 'warn', // Reminds to call cookies()
  'no-deprecated-auth-helpers': 'error',  // Blocks @supabase/auth-helpers
}
```

**Pre-commit Hooks**:
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm run test:auth-isolation"
    }
  }
}
```

**CI/CD Pipeline**:
```yaml
# .github/workflows/auth-validation.yml
- name: Run auth isolation tests
  run: npm run test:auth-isolation

- name: Check for auth anti-patterns
  run: npm run lint:auth
```

## Enforcement Priority

### Phase 1: NOW (Epic #3 Implementation)

✅ **Completed**:
- Auth best practices document created
- Senior developer specialist skill updated
- TDD skill enhanced with Supabase auth patterns

⏳ **Next**:
- Implement Epic #3 using DAL pattern from day 1
- Write auth tests BEFORE implementation
- Have senior-developer-specialist review before marking complete

### Phase 2: Week 2-3 (As We Build)

- [ ] Create PR template with auth checklist
- [ ] Write first ADR documenting DAL decision
- [ ] Add auth isolation test suite
- [ ] Create test helper utilities for auth

### Phase 3: Week 4+ (Continuous Improvement)

- [ ] Update auth-best-practices.md as we learn
- [ ] Expand test coverage
- [ ] Create ESLint rules for common mistakes
- [ ] Set up pre-commit hooks
- [ ] Add CI/CD auth validation

### Phase 4: Post-MVP (Automation)

- [ ] Automated security scanning
- [ ] Performance monitoring for auth operations
- [ ] Regular security audits
- [ ] Team training on auth patterns

## How Each Layer Prevents Problems

| Problem | Prevention Layer | How It Helps |
|---------|------------------|--------------|
| Scattered auth checks | Documentation + Skills | DAL pattern codified and enforced by skills |
| Using getSession() on server | Senior Dev Specialist | Auto-detects anti-pattern during review |
| Missing RLS policies | TDD Skill | Requires tenant isolation tests BEFORE implementation |
| Performance issues | Auth Best Practices Doc | Documents performance patterns (cache, single getUser) |
| Forgotten auth checks | PR Template | Checklist ensures coverage |
| Inconsistent patterns | ADRs | Documents WHY we chose specific patterns |
| Regressions | Test Suite | Catches breaking changes automatically |

## Success Metrics

**Week 2** (After Epic #3):
- [ ] 100% of auth code follows DAL pattern
- [ ] Zero component-level auth checks
- [ ] All auth tests pass
- [ ] First ADR created

**Week 4** (After Epic #4-5):
- [ ] PR template in use
- [ ] Auth isolation test suite expanded
- [ ] Zero usage of deprecated packages
- [ ] Documentation referenced in code comments

**Week 8** (After Epic #6-7):
- [ ] All auth features have comprehensive tests
- [ ] ESLint rules catching common mistakes
- [ ] CI/CD pipeline validates auth patterns
- [ ] No auth-related bugs in production

**Ongoing**:
- Auth best practices doc updated when we learn new patterns
- Skills updated with new anti-patterns
- ADRs created for major decisions
- Test suite expanded as features grow

## Quick Reference: Using the System

### Before Implementing Auth Feature

1. **Read**: `docs/architecture/auth-best-practices.md`
2. **Invoke**: `test-driven-development` skill
3. **Write**: Tests first (tenant isolation, JWT claims, DAL)
4. **Watch**: Tests fail
5. **Implement**: Following documented patterns
6. **Watch**: Tests pass
7. **Invoke**: `senior-developer-specialist` for review
8. **Update**: GitHub issue with completion status
9. **Create**: ADR if architectural decision made

### During Code Review

1. **Check**: PR template checklist completed
2. **Verify**: Tests exist and pass
3. **Scan**: No anti-patterns present
4. **Confirm**: Follows auth-best-practices.md patterns
5. **Validate**: Senior developer specialist reviewed (if significant)

### When Discovering New Pattern/Anti-Pattern

1. **Update**: `auth-best-practices.md`
2. **Update**: Relevant skill (senior-dev or TDD)
3. **Create**: ADR if significant decision
4. **Communicate**: Team discussion
5. **Test**: Add new test case to suite

## Maintenance

**Monthly Review**:
- Check for new Supabase auth features/changes
- Review any auth-related bugs/issues
- Update documentation with learnings
- Expand test coverage for discovered edge cases

**Quarterly Review**:
- Audit all auth code against current patterns
- Review ADRs for outdated decisions
- Check for deprecated packages/patterns
- Performance audit of auth operations

**When Supabase Releases Breaking Changes**:
1. Update `auth-best-practices.md` immediately
2. Update skills with new patterns
3. Create migration ADR
4. Update tests for new behavior
5. Update PR template if needed

## Contact

**Questions about auth patterns?** Reference `docs/architecture/auth-best-practices.md`

**Found a new anti-pattern?** Update the document and relevant skills

**Need architectural guidance?** Invoke `senior-developer-specialist` skill

**Implementing auth feature?** Follow the workflow above

---

**Remember**: The goal isn't bureaucracy - it's preventing the scattered auth check problem we've experienced before. Every layer serves a purpose:

- **Documentation** = Single source of truth
- **Skills** = Automated knowledge application
- **TDD** = Proof it works before shipping
- **PR Template** = Catch mistakes before merge
- **ADRs** = Remember why we made decisions
- **Tests** = Prevent regressions

Use all layers together for maximum effectiveness.
