# Agile Documentation Principles

This reference document explains the core agile documentation principles that guide how we create GitHub issues as living documentation.

## Table of Contents

1. [Just Barely Good Enough (JBGE)](#just-barely-good-enough-jbge)
2. [Living Documentation](#living-documentation)
3. [Document Continuously](#document-continuously)
4. [Progressive Disclosure](#progressive-disclosure)
5. [Collaboration Over Documentation](#collaboration-over-documentation)
6. [Focus on Stable Information](#focus-on-stable-information)

---

## Just Barely Good Enough (JBGE)

### Principle

Produce the minimum viable documentation that is good enough for the task at hand. Balance the need for information with agile efficiency.

### What This Means for GitHub Issues

**DO:**
- Include essential context and success criteria
- Document critical decisions and constraints
- Provide enough detail for someone to start work
- Focus on information that directly supports implementation

**DON'T:**
- Document every possible scenario or edge case upfront
- Create exhaustive step-by-step instructions
- Specify implementation details that developers can determine
- Include speculative "what if" scenarios

### Example

**Too Much (Not JBGE):**
```markdown
## Implementation Approach

Step 1: Create a new file called UserService.ts in the services/ directory
Step 2: Import the following modules: { supabase } from '@/lib/supabase',
        { User } from '@/types', and { logger } from '@/utils/logger'
Step 3: Create a class called UserService
Step 4: Add a constructor that initializes the Supabase client
Step 5: Create a method called getUser() that takes userId as a parameter
[... 20 more steps ...]
```

**Just Right (JBGE):**
```markdown
## Technical Approach

Create a UserService that handles user CRUD operations via Supabase:
- Retrieve users by ID or email
- Update user profiles
- Handle authentication state

Key considerations:
- Use Supabase RLS for authorization
- Cache user data to minimize database calls
- Handle offline state gracefully
```

---

## Living Documentation

### Principle

Documentation should evolve over time alongside the codebase, not be a static artifact created once and never updated.

### What This Means for GitHub Issues

**DO:**
- Update issues with decisions made during implementation
- Add learnings and outcomes as you discover them
- Link to PRs, commits, and related issues as work progresses
- Use issues as a historical record of "why we did it this way"
- Reference issues in code comments for traceability

**DON'T:**
- Create issues and never update them
- Close issues without adding outcome notes
- Delete or hide issues when plans change (update them instead)
- Create separate documentation that duplicates issue content

### Example

**Static Documentation Approach:**
```markdown
Create user authentication flow
[Issue created, work done, issue closed - no updates]
```

**Living Documentation Approach:**
```markdown
Create user authentication flow

**Original Plan:** Use JWT tokens with 24-hour expiration

**Progress Notes:**
- 2024-11-15: Started implementation with JWT approach
- 2024-11-17: Decision: Switched to Supabase Auth instead of custom JWT
  - Rationale: Supabase provides built-in RLS integration
  - Team discussion: #[discussion-link]
- 2024-11-20: Completed implementation
  - PR: #123
  - Learnings: Supabase refresh tokens handle expiration automatically

**Outcome:** Successfully implemented auth using Supabase Auth.
Future work should use this pattern for consistency.
```

---

## Document Continuously

### Principle

Write documentation throughout the project, updating it as you update your code. Don't wait until the end to document.

### What This Means for GitHub Issues

**DO:**
- Create Master Epic and Feature Epics at project start (planning)
- Create Implementation Tasks just-in-time (1-2 weeks before work)
- Update epics with decisions as they're made (ongoing)
- Add progress notes to active issues (daily/weekly)
- Document learnings immediately when they occur

**DON'T:**
- Create all tasks at the beginning (waterfall approach)
- Wait until a feature is complete to document how it works
- Batch documentation updates at the end of a sprint
- Retroactively guess at "why we made this decision"

### Timeline Pattern

```
Week 1: Create Master Epic + All Feature Epics
  ↓
Week 1: Create Implementation Tasks for Week 1-2 work
  ↓
Week 1-2: Update tasks daily with progress/decisions
  ↓
Week 2: Create Implementation Tasks for Week 3-4 work
  ↓
Week 2: Mark Week 1-2 tasks complete with learnings
  ↓
[Continue pattern...]
```

---

## Progressive Disclosure

### Principle

Structure information so it loads in stages. Provide high-level overview first, with details available when needed.

### What This Means for GitHub Issues

**DO:**
- Use three-tier hierarchy: Master → Feature → Implementation
- Put overview/context at the top of each issue
- Use expandable sections for detailed information
- Link to related issues rather than duplicating content
- Provide "just enough" context at each tier

**DON'T:**
- Put all details in the Master Epic
- Duplicate information across multiple issues
- Make readers hunt through multiple issues to understand basics
- Flatten the hierarchy (all tasks at same level)

### Information Distribution

**Master Epic (Tier 1):**
- Executive summary
- Overall success metrics
- Links to feature epics
- High-level timeline
- Critical constraints

**Feature Epic (Tier 2):**
- Capability definition and user value
- Success criteria for this capability
- Technical approach overview
- Open questions
- Links to implementation tasks

**Implementation Task (Tier 3):**
- Specific work to be done
- Detailed technical notes
- Acceptance criteria
- Test cases
- PR references

---

## Collaboration Over Documentation

### Principle

Use documentation to supplement conversations, not as a substitute for them. Documentation should enable discussion, not replace it.

### What This Means for GitHub Issues

**DO:**
- Use issues as conversation threads (comments)
- Tag people to get input on decisions
- Reference issues in team discussions
- Ask clarifying questions in comments
- Use @mentions to involve relevant people

**DON'T:**
- Expect issues to answer every possible question
- Create issues instead of having conversations
- Write documentation to avoid talking to teammates
- Make issues so detailed that no discussion is needed

### Example Pattern

```markdown
## Open Question

Should we use polling or webhooks for Fireflies integration?

**Options:**
- Polling: Simpler, but may hit rate limits
- Webhooks: Real-time, but requires endpoint setup

@teammate1 @teammate2 - thoughts?

---

**Comments:**
@teammate1: Webhooks are better for real-time needs
@teammate2: Agreed, and Fireflies has good webhook docs

**Decision (2024-11-15):** Webhooks
- Less load on Fireflies API
- Real-time is important for user experience
- We have infrastructure for webhook endpoints
```

---

## Focus on Stable Information

### Principle

Capture stable and relevant information for the current project phase rather than documenting speculative scenarios.

### What This Means for GitHub Issues

**DO:**
- Document decisions that have been made
- Capture constraints that are confirmed
- Include requirements that are validated
- Record actual user feedback and data
- Document proven patterns and approaches

**DON'T:**
- Speculate about future requirements ("we might need...")
- Document "nice to have" features as requirements
- Include detailed plans for features 6 months away
- Maintain documentation about deprecated approaches (mark them clearly)

### Example

**Speculative (Don't):**
```markdown
## Future Considerations

We might want to add OAuth integration with Google, Microsoft,
and GitHub. We could use Passport.js or implement custom OAuth
flows. We should design the auth system to support multiple
providers even though we're only using Supabase Auth now.
```

**Stable Information (Do):**
```markdown
## Current Implementation

Using Supabase Auth for email/password authentication.

## Known Future Requirement

Must support single sign-on (SSO) by Q2 2025 for enterprise customers.
Auth architecture should not prevent SSO addition.

## Out of Scope

Social login (Google, GitHub) - no validated customer need yet.
```

---

## Applying These Principles to GitHub Issues

### When Creating Issues

1. **Start with JBGE**: What's the minimum information needed?
2. **Plan for Living Documentation**: Leave space for updates
3. **Use Progressive Disclosure**: Right detail level for the tier
4. **Enable Collaboration**: Ask questions, tag people
5. **Stick to Stable Info**: Don't speculate

### When Updating Issues

1. **Document Continuously**: Update as work progresses
2. **Keep it Living**: Add decisions, learnings, outcomes
3. **Maintain Hierarchy**: Update the right tier
4. **Facilitate Collaboration**: Respond to comments
5. **Archive Unstable Info**: Mark deprecated sections clearly

### When Closing Issues

1. **Document Outcomes**: What was accomplished?
2. **Capture Learnings**: What did we learn?
3. **Link Artifacts**: PRs, commits, related issues
4. **Note Deviations**: What changed from the plan and why?
5. **Help Future Self**: What would help someone understand this later?

---

## Common Anti-Patterns

### Anti-Pattern: Waterfall Documentation

Creating all detailed documentation upfront, then never updating it.

**Solution:** Create high-level epics upfront, detailed tasks just-in-time, update continuously.

### Anti-Pattern: Post-Facto Documentation

Doing all the work, then trying to document what happened at the end.

**Solution:** Update issues as you work, capturing decisions and learnings in the moment.

### Anti-Pattern: Over-Specification

Documenting every possible detail, leaving no room for developer autonomy.

**Solution:** Apply JBGE principle - provide context and constraints, not step-by-step instructions.

### Anti-Pattern: Documentation Debt

Issues get stale and out of sync with actual implementation.

**Solution:** Treat issue updates as part of the definition of done - no task is complete until the issue is updated.

### Anti-Pattern: Documentation Silos

Important information exists in Slack, email, Google Docs - but not in issues.

**Solution:** Reference external discussions in issues, or copy key decisions into issue comments.

---

## Summary Checklist

When creating or updating GitHub issues, ask:

- [ ] **JBGE**: Is this just enough information, or too much?
- [ ] **Living**: Can this issue be updated as work progresses?
- [ ] **Continuous**: Am I documenting now, not retroactively?
- [ ] **Progressive**: Is this the right detail level for this tier?
- [ ] **Collaborative**: Does this enable discussion, not replace it?
- [ ] **Stable**: Am I documenting facts, not speculation?
