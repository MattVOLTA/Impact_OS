# SVPG Product Management Principles

This reference document explains Silicon Valley Product Group (SVPG) product management principles, particularly those from Marty Cagan's work, and how they apply to creating GitHub issues.

## Table of Contents

1. [Capabilities Over Features](#capabilities-over-features)
2. [Problem-First Thinking](#problem-first-thinking)
3. [Empowered Product Teams](#empowered-product-teams)
4. [The Four Risks](#the-four-risks)
5. [Continuous Discovery](#continuous-discovery)
6. [Product vs Feature Teams](#product-vs-feature-teams)

---

## Capabilities Over Features

### Principle

Express requirements as user capabilities (what users need to accomplish) rather than prescriptive feature specifications (how to build it).

### Why This Matters

- **Empowers teams**: Developers can find the best solution
- **Enables innovation**: Team can discover better approaches
- **Focuses on outcomes**: Success measured by user capability, not feature delivery
- **Prevents over-specification**: Avoids prescribing solutions prematurely

### How to Apply to GitHub Issues

**Feature-Focused Approach (Don't):**
```markdown
# Add Fireflies Integration Toggle

Create a settings page with a toggle switch for enabling/disabling
Fireflies integration. The toggle should be in the top-right corner,
use the Switch component from shadcn/ui, and save to the tenant_config
table when changed.
```

**Capability-Focused Approach (Do):**
```markdown
# Tenant Admins Can Control Feature Access

## Capability Definition
Administrators need to enable or disable specific features
(Fireflies, Company Updates, Advisor Profiles) for their tenant.

## User Value
Different organizations have different needs. Some want Fireflies
integration, others don't. Admins should control which features
their team can access.

## Success Criteria
- Admins can see which features are available
- Admins can enable/disable each feature independently
- Changes take effect immediately for all team members
- Feature UI is hidden when disabled

## Technical Approach (High-Level)
Use tenant configuration table with feature flags. UI conditionally
renders based on active features.

[Team determines best implementation - settings page, feature flag
middleware, conditional rendering approach, etc.]
```

### Capability Definition Pattern

When writing Feature Epics, use this structure:

```markdown
## Capability Definition

**What users need to accomplish:**
[Action/capability from user perspective]

**Who needs this:**
- [User type 1]: [Why they need this capability]
- [User type 2]: [Why they need this capability]

**Job to Be Done:**
When I'm [context], I want to [action], so I can [outcome].
```

---

## Problem-First Thinking

### Principle

Start with the problem, not the solution. Understand who has the problem, why it matters, and what evidence supports it before proposing solutions.

### Why This Matters

- **Validates need**: Ensures you're solving real problems
- **Prevents waste**: Avoids building features nobody needs
- **Informs better solutions**: Deep problem understanding leads to better solutions
- **Creates buy-in**: Stakeholders understand why this work matters

### How to Apply to GitHub Issues

Every Feature Epic should start with problem definition:

```markdown
## Problem Statement

**Who has this problem?**
- [Primary user type]
- [Secondary user type]

**What is the problem?**
[Clear description of the pain point or unmet need]

**Why does this matter?**
- **User Impact:** [How this affects users]
- **Business Impact:** [How this affects business goals]
- **Strategic Importance:** [How this enables future capabilities]

**Evidence:**
- [Data point, user feedback, or research finding]
- [Data point, user feedback, or research finding]

**What happens if we don't solve this?**
[Consequences of not addressing this problem]
```

### Example

**Solution-First (Don't):**
```markdown
# Build Fireflies Integration

We need to integrate with Fireflies to capture meeting transcripts
automatically. This will use their GraphQL API and webhooks.
```

**Problem-First (Do):**
```markdown
# Automate Interaction Capture

## Problem Statement

**Who has this problem?**
Coaches and advisors who meet regularly with founders

**What is the problem?**
Coaches spend 15-30 minutes after each meeting manually documenting
what was discussed, action items, and observations. This is:
- Time-consuming (reduces time available for actual coaching)
- Error-prone (details forgotten or misremembered)
- Inconsistent (some coaches document well, others don't)

**Evidence:**
- User survey: 8/10 coaches report documentation burden
- Current data: Only 40% of meetings have documented notes
- Time study: Average 20 minutes per meeting for documentation

**What happens if we don't solve this?**
- Coaches continue spending 20% of their time on documentation
- Incomplete historical records hurt portfolio analysis
- Government compliance reporting lacks complete interaction data

## Proposed Solution

Integrate with Fireflies (which coaches already use) to automatically
capture meeting transcripts and summaries.
```

---

## Empowered Product Teams

### Principle

Give product teams problems to solve and context/constraints, not prescriptive solutions. Trust teams to discover the best approach.

### Why This Matters

- **Better solutions**: Teams closest to the problem find better solutions
- **Ownership**: Teams own outcomes, not just outputs
- **Motivation**: Autonomy is a key motivator
- **Learning**: Teams learn and improve through problem-solving

### How to Apply to GitHub Issues

**Master Epics** provide:
- Problem context
- Success criteria
- Constraints (technical, business, regulatory)
- Strategic goals

**Feature Epics** provide:
- Capability definition
- User context
- Success criteria
- High-level technical approach (patterns, not prescriptions)

**Implementation Tasks** allow:
- Developer autonomy on specific implementation
- Choice of patterns and approaches within constraints
- Technical decision-making

### Autonomy Levels

**Low Autonomy (Avoid):**
```markdown
Create a UserService class in services/UserService.ts.
Use the Singleton pattern. Add these exact methods:
- getUser(id: string): Promise<User>
- updateUser(id: string, data: Partial<User>): Promise<User>
- deleteUser(id: string): Promise<void>

Use Supabase client from @/lib/supabase. Handle errors with
try/catch and return null on error.
```

**High Autonomy (Good):**
```markdown
## Capability: Manage User Data

Users need to be retrieved, updated, and deleted via the API.

**Constraints:**
- Use Supabase for data access
- Respect RLS policies (tenant isolation)
- Handle errors gracefully (don't expose internal errors to users)

**Success Criteria:**
- User CRUD operations work correctly
- Tenant isolation enforced
- Errors logged and handled appropriately

[Team decides: service class pattern, error handling approach,
caching strategy, etc.]
```

---

## The Four Risks

### Principle

Every product initiative faces four types of risk. Address all four, not just feasibility.

### The Four Risks

1. **Value Risk**: Will customers choose to use this?
2. **Viability Risk**: Does this work for our business?
3. **Usability Risk**: Can users figure out how to use this?
4. **Feasibility Risk**: Can we build this with time/skills/technology available?

### How to Apply to GitHub Issues

Include risk assessment in Feature Epics:

```markdown
## Risk Assessment

### Value Risk: [Low/Medium/High]
- **Question**: Will users actually use this capability?
- **Evidence**: [Validation, user research, current usage data]
- **Mitigation**: [How we'll de-risk]

### Viability Risk: [Low/Medium/High]
- **Question**: Does this work for our business model/constraints?
- **Evidence**: [Cost analysis, stakeholder alignment]
- **Mitigation**: [How we'll de-risk]

### Usability Risk: [Low/Medium/High]
- **Question**: Can users figure out how to use this?
- **Evidence**: [Design validation, usability testing]
- **Mitigation**: [How we'll de-risk]

### Feasibility Risk: [Low/Medium/High]
- **Question**: Can we build this with available resources?
- **Evidence**: [Technical validation, prototype, team assessment]
- **Mitigation**: [How we'll de-risk]
```

### Risk-Driven Planning

**High-risk capabilities** should:
- Be validated before building (prototypes, user testing)
- Have clear de-risking activities
- Be tracked more closely

**Low-risk capabilities** can:
- Move to implementation faster
- Require less validation
- Follow proven patterns

---

## Continuous Discovery

### Principle

Product discovery is ongoing, not a phase. Continuously learn about users, validate ideas, and test assumptions.

### Why This Matters

- **Reduces waste**: Validate before building
- **Increases success**: Build things users actually want
- **Enables adaptation**: Respond to learnings during development
- **Builds knowledge**: Team understanding deepens over time

### How to Apply to GitHub Issues

**Track Open Questions:**
```markdown
## Open Questions & Decisions

| Question | Options | Decision Date | Owner | Resolution |
|----------|---------|---------------|-------|------------|
| How do users prefer to review auto-matched interactions? | UI Option A vs B | TBD | @designer | TBD |
| What's acceptable auto-match accuracy? | 70% vs 80% vs 90% | TBD | @pm | TBD |
```

**Document Learnings:**
```markdown
## Progress Notes

**2024-11-15**: User testing revealed auto-match confidence indicator
is confusing. Users want simple "looks right / not right" choice.

**Decision**: Simplify to binary choice instead of confidence percentage.

**2024-11-18**: Beta users report 85% auto-match accuracy with email-only
matching. Good enough to launch.

**Decision**: Proceed with email-only matching for MVP. Add fuzzy name
matching in v2 if needed.
```

**Validate Assumptions:**
```markdown
## Assumptions to Validate

- [ ] Users prefer automatic capture over manual entry (validate in beta)
- [ ] 70%+ auto-match accuracy is acceptable (validate with real data)
- [ ] Coaches will review/correct matches daily (validate in usage data)
```

---

## Product vs Feature Teams

### Principle

**Feature teams** are given features to build (output-focused).
**Product teams** are given problems to solve (outcome-focused).

### Characteristics

**Feature Team (Avoid):**
- Given prescriptive requirements
- Measured by feature delivery
- Little autonomy on "how"
- Implements what they're told

**Product Team (Empower):**
- Given problems and constraints
- Measured by outcomes (user value, business metrics)
- Autonomy on solution approach
- Collaborates on discovery and delivery

### How to Apply to GitHub Issues

**Feature Team Approach (Don't):**
```markdown
# Build Fireflies Integration

Implement Fireflies GraphQL API integration with these exact features:
- Polling every 5 minutes for new transcripts
- Store transcript in interactions table
- Display in interaction list UI
- Use these exact API endpoints: [...]
- Match participants by exact email match only
```

**Product Team Approach (Do):**
```markdown
# Automate Interaction Capture

## Problem
Coaches spend 20 minutes per meeting on manual documentation,
reducing time available for coaching. Only 40% of meetings are
currently documented.

## Success Criteria
- 70%+ of meetings automatically captured
- Coach documentation time reduced to <5 minutes per meeting
- Interaction capture rate increases to 90%+

## Constraints
- Must integrate with tools coaches already use (Fireflies)
- Must maintain tenant data isolation
- Must allow coaches to review/correct automated captures

## Context
Coaches use Fireflies for meeting recording. Fireflies has GraphQL
API and webhooks. We need to decide polling vs webhooks, how to
match participants, and how coaches review/correct.

[Team discovers best approach, proposes solution, builds it]
```

---

## Summary: Applying SVPG Principles to GitHub Issues

### For Master Epics

✓ Start with problem statement (problem-first)
✓ Define success metrics (outcome-focused)
✓ Assess all four risks
✓ Provide context and constraints, not solutions

### For Feature Epics

✓ Express as capabilities, not features
✓ Include "Job to Be Done" statement
✓ Define success criteria for this capability
✓ Document open questions and learnings (continuous discovery)
✓ Give high-level approach, not step-by-step instructions (empower teams)
✓ Assess capability-specific risks

### For Implementation Tasks

✓ Link to parent epic (maintain context)
✓ Provide technical constraints, not prescriptions
✓ Allow autonomy within constraints
✓ Focus on outcomes (acceptance criteria), not process

### Throughout Development

✓ Update issues with learnings (continuous discovery)
✓ Document decisions and rationale
✓ Track assumption validation
✓ Measure outcomes, not just outputs

---

## Anti-Patterns

### Anti-Pattern: Feature Factory

Creating issues that just list features to build without explaining why.

**Solution**: Always start with problem statement and user value.

### Anti-Pattern: Over-Specification

Prescribing exact implementation details, leaving no room for team autonomy.

**Solution**: Provide context, constraints, and success criteria. Let team determine "how".

### Anti-Pattern: Output Metrics

Measuring success by features delivered instead of user outcomes achieved.

**Solution**: Define success criteria based on user capabilities and measurable outcomes.

### Anti-Pattern: Waterfall Discovery

Doing all discovery upfront, then never revisiting assumptions.

**Solution**: Track open questions, document learnings, validate continuously.

### Anti-Pattern: Solution-First

Starting with "we need to build X" instead of "users have problem Y".

**Solution**: Always articulate the problem before proposing solutions.

---

## Checklist: SVPG-Aligned GitHub Issues

When creating issues, ask:

- [ ] **Problem-First**: Does this start with the problem, not the solution?
- [ ] **Capabilities**: Is this expressed as user capability, not a feature?
- [ ] **Outcomes**: Are success criteria outcome-based, not output-based?
- [ ] **Evidence**: Is there evidence supporting the problem/need?
- [ ] **Empowerment**: Does this give team autonomy on "how"?
- [ ] **Four Risks**: Have all four risks been considered?
- [ ] **Discovery**: Are open questions and learnings tracked?
- [ ] **Context**: Is enough context provided for good decisions?
- [ ] **Constraints**: Are constraints clear without over-specifying?
- [ ] **Value**: Is user value clearly articulated?
