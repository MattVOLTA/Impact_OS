# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records for the impactOS multi-tenant platform.

## What are ADRs?

Architecture Decision Records document significant architectural and design decisions made during the project. They capture:
- **What** decision was made
- **Why** we made it
- **What** alternatives we considered
- **What** consequences (positive and negative) we expect

## Why We Use ADRs

1. **Knowledge Transfer**: Future developers (AI or human) understand WHY decisions were made
2. **Prevent Revisiting**: Stop rehashing already-decided questions
3. **Accountability**: Clear record of who decided what and when
4. **Learning**: Build institutional knowledge over time
5. **Onboarding**: New team members can catch up quickly

## When to Create an ADR

Create an ADR when making decisions about:

- **Architecture Patterns**: DAL pattern, service layers, data flow
- **Technology Choices**: Which library, framework, or tool to use
- **Security Approaches**: Authentication strategies, encryption methods
- **Performance Trade-offs**: Caching strategies, optimization choices
- **API Design**: REST vs GraphQL, endpoint structure
- **Database Design**: Schema patterns, multi-tenancy approach
- **Testing Strategies**: TDD patterns, testing frameworks

**Rule of thumb**: If you spent more than 30 minutes researching options or if the decision affects multiple features, create an ADR.

## ADR Format

Use the template provided below (or see existing ADRs for examples):

```markdown
# ADR-XXX: [Decision Title]

**Date**: YYYY-MM-DD
**Status**: Accepted | Superseded | Deprecated
**Deciders**: [Who made the decision]
**Related Issue**: #[github-issue]

---

## Context

[What problem are we solving? What constraints exist?]

## Decision

[What we decided to do and how we'll implement it]

## Consequences

### Positive

- [Benefit 1]
- [Benefit 2]

### Negative

- [Trade-off 1]
- [Trade-off 2]

## Alternatives Considered

### Alternative 1: [Name]

[Description and why we didn't choose it]

### Alternative 2: [Name]

[Description and why we didn't choose it]

## References

- Links to documentation
- Links to GitHub issues/PRs
- Links to external resources
```

## Numbering Convention

- Use 3-digit zero-padded numbers: `001`, `002`, `003`, etc.
- Number sequentially in order created (not by topic)
- Don't reuse numbers even if ADR is superseded

## Status Definitions

- **Proposed**: Decision under consideration
- **Accepted**: Decision approved and being implemented
- **Superseded**: Replaced by newer ADR (link to replacement)
- **Deprecated**: No longer recommended but not replaced
- **Rejected**: Considered but not approved

## Existing ADRs

| Number | Title | Status | Date |
|--------|-------|--------|------|
| [001](./001-use-dal-pattern-for-auth.md) | Use Data Access Layer Pattern for Authentication | Accepted | 2024-11-11 |

---

## How to Use ADRs

### When Implementing a Decision

1. Read the ADR to understand rationale
2. Follow implementation guidelines
3. Reference ADR number in code comments
4. Update ADR if you discover new consequences

### When Proposing a Change

1. Check if existing ADR covers this decision
2. If superseding, create new ADR and update old one's status
3. Link related ADRs together

### When Onboarding

1. Read ADRs in chronological order
2. Understand decision evolution over time
3. Question outdated ADRs (create new one if pattern changed)

---

**Questions?** See [Architecture Decision Records](https://adr.github.io/) for more information about the ADR pattern.
