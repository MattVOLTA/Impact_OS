# Product Documentation Skill - Testing Guide

This document provides test scenarios to validate the product-documentation skill works correctly.

## Test Scenario 1: Basic Capability Identification

**Setup:**
Provide a simple requirements statement.

**Input:**
```
User: "We need to let users export their data as CSV files."
```

**Expected Behavior:**
The skill should:
1. Recognize this as a capability request
2. Ask clarifying questions about:
   - Who needs to export data?
   - What data needs to be exported?
   - Why do they need exports?
   - Success criteria?
3. Structure as a capability: "Users can export data in multiple formats"
4. Not jump to implementation details

**Validation:**
- [ ] Skill activated (recognizes this is about product documentation)
- [ ] Questions are problem-focused, not solution-focused
- [ ] Capability is user-centric
- [ ] No premature implementation prescription

---

## Test Scenario 2: PRD to GitHub Issues

**Setup:**
Use the impactOS multi-tenant requirements document.

**Input:**
```
User: "Convert the impactOS multi-tenant requirements document into GitHub issues."
```

**Expected Behavior:**
The skill should:
1. Analyze the PRD to identify capabilities
2. Propose a structure:
   - 1 Master Epic
   - 7 Feature Epics (based on capabilities identified)
   - Suggest creating Tier 3 tasks just-in-time
3. Use the templates from `templates/` directory
4. Apply SVPG principles (capabilities over features)
5. Apply agile documentation principles (JBGE, progressive disclosure)
6. Create issues with proper linking

**Validation:**
- [ ] Master Epic created with all required sections
- [ ] 7 Feature Epics created (one per capability)
- [ ] Each Feature Epic starts with capability definition
- [ ] Success criteria are measurable
- [ ] Technical approach is high-level (not step-by-step)
- [ ] All epics properly linked
- [ ] Labels applied correctly
- [ ] No Tier 3 tasks created upfront (only proposed)

---

## Test Scenario 3: Single Feature Epic Creation

**Setup:**
User wants to create one Feature Epic for a specific capability.

**Input:**
```
User: "Create a Feature Epic for the Fireflies integration that auto-captures meeting interactions."
```

**Expected Behavior:**
The skill should:
1. Ask clarifying questions if needed (problem, users, success criteria)
2. Use `templates/feature-epic-template.md`
3. Frame as capability: "Coaches can automatically capture meeting interactions"
4. Include problem statement and user value
5. Define measurable success criteria
6. Keep technical approach high-level
7. List open questions
8. Suggest NOT creating implementation tasks yet

**Validation:**
- [ ] Epic uses capability language
- [ ] Problem statement included
- [ ] User value clearly articulated
- [ ] Success criteria are measurable
- [ ] Technical approach is not prescriptive
- [ ] Open questions section populated
- [ ] Template structure followed

---

## Test Scenario 4: Implementation Task Breakdown

**Setup:**
User wants to break down a Feature Epic into Implementation Tasks.

**Input:**
```
User: "I'm ready to start work on the Self-Service Onboarding epic. Break it down into implementation tasks."
```

**Expected Behavior:**
The skill should:
1. Analyze the onboarding capability
2. Ask which aspects to prioritize first
3. Create 3-5 specific implementation tasks for week 1-2 work
4. Use `templates/implementation-task-template.md`
5. Link tasks to parent epic
6. Make tasks specific and actionable
7. Include acceptance criteria
8. NOT create tasks for later weeks (just-in-time principle)

**Validation:**
- [ ] 3-5 tasks created (not all possible tasks)
- [ ] Tasks are specific and actionable
- [ ] Each task has clear acceptance criteria
- [ ] Tasks linked to parent epic
- [ ] Tasks are sized appropriately (not too big or small)
- [ ] Template structure followed
- [ ] Future tasks are noted but not created

---

## Test Scenario 5: Applying Agile Documentation Principles

**Setup:**
Test that the skill enforces JBGE and progressive disclosure.

**Input:**
```
User: "Create a Feature Epic for user authentication with every possible detail about OAuth, JWT, session management, password hashing, etc."
```

**Expected Behavior:**
The skill should:
1. Recognize this is over-specification
2. Apply JBGE principle - include only what's needed
3. Keep technical approach high-level
4. Note detailed decisions as "open questions"
5. Suggest creating implementation tasks just-in-time
6. Focus on capability and success criteria, not implementation minutiae

**Validation:**
- [ ] Epic doesn't include excessive implementation detail
- [ ] Technical approach is high-level
- [ ] Detailed decisions marked as open questions
- [ ] Focus remains on capability and outcomes
- [ ] JBGE principle applied

---

## Test Scenario 6: Updating Living Documentation

**Setup:**
Test that the skill supports updating issues as work progresses.

**Input:**
```
User: "We decided to use Supabase Auth instead of custom JWT for the authentication epic. Update the issue."
```

**Expected Behavior:**
The skill should:
1. Update the Feature Epic with the decision
2. Add to "Progress Notes" or "Decisions Log"
3. Include rationale for the decision
4. Update "Open Questions" to mark question resolved
5. Preserve original context (living documentation)
6. Link to any related discussions or PRs

**Validation:**
- [ ] Decision added to appropriate section
- [ ] Rationale documented
- [ ] Open questions updated
- [ ] Original context preserved
- [ ] Follows living documentation principle

---

## Test Scenario 7: SVPG Principles Application

**Setup:**
Test that the skill applies SVPG problem-first thinking.

**Input:**
```
User: "Create an epic for a settings page where users can configure their preferences."
```

**Expected Behavior:**
The skill should:
1. Ask about the problem being solved
2. Ask about user value and context
3. Reframe as capability, not feature
4. Start with problem statement
5. Include evidence if available
6. Define success as user outcome, not feature delivery
7. Assess all four risks (value, viability, usability, feasibility)

**Validation:**
- [ ] Skill asks about the problem
- [ ] Epic starts with problem statement
- [ ] Reframed as capability (not "settings page")
- [ ] Four risks assessed
- [ ] Success criteria are outcome-based
- [ ] User value clearly articulated

---

## Test Scenario 8: Recognizing When NOT to Use Skill

**Setup:**
Test that skill doesn't activate for unrelated tasks.

**Input:**
```
User: "Fix the bug where the login button doesn't work on mobile."
```

**Expected Behavior:**
The skill should NOT activate because:
- This is a bug fix, not new capability
- No PRD to convert
- Single issue, not epic hierarchy needed

**Validation:**
- [ ] Skill does not activate inappropriately
- [ ] Other skills or default behavior handle the request

---

## Test Scenario 9: Multi-File Skill Navigation

**Setup:**
Test that the skill properly uses reference files.

**Input:**
```
User: "What's the difference between capabilities and features according to SVPG?"
```

**Expected Behavior:**
The skill should:
1. Reference `reference/svpg-product-principles.md`
2. Provide clear explanation with examples
3. Show how this applies to GitHub issues

**Validation:**
- [ ] Correct reference file used
- [ ] Accurate information provided
- [ ] Examples included

---

## Test Scenario 10: Template Usage

**Setup:**
Test that templates are used correctly.

**Input:**
```
User: "Create a Master Epic for a new project called 'Customer Portal'."
```

**Expected Behavior:**
The skill should:
1. Use `templates/master-epic-template.md`
2. Ask for required information (problem, metrics, timeline)
3. Fill in template sections appropriately
4. Include placeholders for feature epic links
5. Create proper structure

**Validation:**
- [ ] Template structure preserved
- [ ] All sections included
- [ ] Placeholders for feature epic links
- [ ] Proper formatting and labels

---

## Skill Quality Checklist

Use this checklist to validate the overall skill quality:

### Metadata
- [x] Name is lowercase with hyphens
- [x] Description includes what it does AND when to use it
- [x] Description contains key activation terms

### Structure
- [x] SKILL.md under 500 lines
- [x] References are one level deep only
- [x] All file paths use forward slashes
- [x] Templates provided for all issue types

### Content Quality
- [x] Consistent terminology throughout
- [x] Templates provided for strict formats
- [x] Examples demonstrate desired style
- [x] No time-sensitive information
- [x] All constants/decisions documented

### Functionality
- [x] Applies agile documentation principles correctly
- [x] Applies SVPG product principles correctly
- [x] Creates proper three-tier hierarchy
- [x] Uses templates appropriately
- [x] Supports living documentation updates

---

## How to Test

### Method 1: Direct Activation
In a Claude conversation:
```
User: "I need to convert my product requirements into GitHub issues."
```

Verify that the product-documentation skill activates.

### Method 2: Explicit Skill Call
In Claude Code:
```
User: "Use the product-documentation skill to help me structure GitHub issues for my new feature."
```

### Method 3: Real-World Usage
Use the actual impactOS multi-tenant requirements document and validate that:
1. Skill activates
2. Capabilities are correctly identified
3. Issues are properly structured
4. Templates are used correctly
5. Principles are applied

---

## Success Criteria

The skill is working correctly if:

- [x] Activates on appropriate keywords/contexts
- [x] Does NOT activate on unrelated requests
- [x] Applies agile documentation principles (JBGE, living docs, progressive disclosure)
- [x] Applies SVPG product principles (capabilities, problem-first, empowerment)
- [x] Creates proper three-tier hierarchy
- [x] Uses templates consistently
- [x] Maintains appropriate degree of freedom (not over-specifying)
- [x] Supports both creation and updates (living documentation)
- [x] References are navigable and helpful
- [x] Examples are clear and applicable
