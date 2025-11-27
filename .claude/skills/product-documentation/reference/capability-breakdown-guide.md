# Capability Breakdown Guide

This guide helps you identify and structure user capabilities from product requirements documents, breaking them down into Feature Epics that form the foundation of your GitHub issue hierarchy.

## Table of Contents

1. [What is a Capability?](#what-is-a-capability)
2. [Identifying Capabilities from Requirements](#identifying-capabilities-from-requirements)
3. [Structuring Capabilities](#structuring-capabilities)
4. [Common Patterns](#common-patterns)
5. [Capability Examples](#capability-examples)

---

## What is a Capability?

### Definition

A **capability** is something a user can accomplish after a feature is built. It describes outcomes and user goals, not features or solutions.

### Capability vs Feature

**Feature** (Implementation-focused):
- "Fireflies Integration"
- "Settings Page"
- "Database Migration Tool"

**Capability** (Outcome-focused):
- "Coaches can automatically capture meeting interactions"
- "Administrators can control feature access"
- "Organizations can migrate existing data"

### Key Characteristics

A well-defined capability:
- **User-centric**: Focuses on what users can do
- **Outcome-oriented**: Describes the end result, not the implementation
- **Valuable**: Provides clear user value
- **Testable**: Can verify when it's working
- **Independent**: Can be built somewhat independently (though may have dependencies)

---

## Identifying Capabilities from Requirements

### Step 1: Find User Goals

Look for language like:
- "Users need to..."
- "Organizations want to..."
- "When I'm [situation], I want to..."
- "Jobs to be done"
- Problem statements describing what users can't do today

### Step 2: Extract Core Actions

Identify verbs that describe user actions:
- **Create/Add**: "Add companies to portfolio"
- **Read/View**: "View interaction history"
- **Update/Edit**: "Update company information"
- **Delete/Remove**: "Remove inactive users"
- **Configure**: "Configure update schedules"
- **Generate**: "Generate compliance reports"
- **Integrate**: "Connect external tools"
- **Analyze**: "Analyze portfolio performance"

### Step 3: Group Related Capabilities

Cluster capabilities that:
- Serve the same user type
- Accomplish related goals
- Share technical dependencies
- Form a coherent workflow

### Step 4: Validate Each Capability

Ask for each potential capability:
- **Is it user-facing?** (If purely technical, might be an implementation detail)
- **Is it valuable independently?** (Or just part of a larger capability)
- **Can users tell when it works?** (Testable outcome)
- **Is it the right size?** (Not too big, not too small)

---

## Structuring Capabilities

### Size Guidelines

**Too Big** (Should be split):
- Takes more than 2-4 weeks to build
- Involves multiple distinct user workflows
- Has too many dependencies
- Hard to describe concisely

**Too Small** (Should be combined):
- Takes less than a few days to build
- Is just an implementation detail of a larger capability
- Doesn't provide value independently
- Is just a single CRUD operation

**Just Right**:
- 1-3 weeks of development
- Cohesive user workflow or outcome
- Can be tested and validated independently
- Clear user value

### Hierarchy Patterns

**Pattern 1: CRUD Workflow**

When users need to manage entities:
- Combine create, read, update, delete into one capability: "Manage [entity]"
- Example: "Manage Portfolio Companies" (not separate capabilities for create, update, delete)

**Pattern 2: Multi-Step Process**

When users complete a workflow:
- Keep the workflow together if steps are tightly coupled
- Split if steps can happen independently
- Example: "Onboard New Organizations" includes account creation, team invitation, configuration

**Pattern 3: Configuration and Usage**

Often two capabilities:
1. "Configure [feature]" - Set up and customize
2. "Use [feature]" - Day-to-day usage

Example:
- "Configure Program Structure" (setup cohorts, schedules)
- "Manage Company Enrollments" (assign companies to cohorts)

---

## Common Patterns

### Pattern: Self-Service Onboarding

**Capability**: "Organizations can onboard independently"

**Includes:**
- Account creation
- Team invitation
- Initial configuration
- External tool connections
- Getting started guidance

**Success Criteria:**
- X% of orgs complete onboarding without support
- Time to first value < Y days

### Pattern: Data Management

**Capability**: "Administrators can manage [entity type]"

**Includes:**
- Create new records
- Import bulk data
- Edit existing records
- Delete/archive records
- Search and filter

**Success Criteria:**
- All CRUD operations work
- Bulk operations handle large datasets
- Data validation prevents errors

### Pattern: Integration

**Capability**: "Users can integrate with [external tool]"

**Includes:**
- Connection setup (API keys, OAuth)
- Data synchronization
- Error handling and reconnection
- Configuration options

**Success Criteria:**
- Connection succeeds
- Data syncs reliably
- Errors are handled gracefully

### Pattern: Reporting and Analytics

**Capability**: "Organizations can generate [type of report]"

**Includes:**
- Report generation
- Customization options
- Export formats
- Scheduling (if applicable)

**Success Criteria:**
- Reports contain required data
- Reports are accurate
- Export formats work correctly

### Pattern: Access Control

**Capability**: "Administrators can control access to [features/data]"

**Includes:**
- Permission configuration
- Role assignment
- Feature enablement/disablement
- Audit logging

**Success Criteria:**
- Access controls enforce correctly
- Unauthorized users cannot access restricted features/data

---

## Capability Examples

### Example 1: Multi-Tenant Platform

**From Requirements:**
"We need multi-tenant architecture where each organization's data is completely isolated."

**Capability:**
"All tenant data is completely isolated"

**Why it's a capability:**
- User outcome: Organizations can trust their data is private
- Testable: Can verify no cross-tenant data leaks
- Valuable: Critical security requirement

**Not framed as:**
- "Implement Row-Level Security" (too implementation-focused)
- "Add tenant_id to all tables" (too technical)

### Example 2: Automated Data Capture

**From Requirements:**
"Coaches need a way to capture meeting notes without spending 20 minutes per meeting on documentation."

**Capability:**
"Coaches can automatically capture meeting interactions"

**Why it's a capability:**
- User outcome: Coaches spend less time on documentation
- Testable: Measure time spent and capture rate
- Valuable: Solves documented pain point

**Not framed as:**
- "Fireflies Integration" (too solution-focused)
- "Webhook Handler" (too technical)

### Example 3: Demographic Data Collection

**From Requirements:**
"Government compliance requires tracking demographic data for all direct beneficiaries."

**Capability:**
"Organizations can collect complete demographic data for compliance"

**Why it's a capability:**
- User outcome: Organizations meet compliance requirements
- Testable: Verify all required fields are captured
- Valuable: Prevents funding loss

**Not framed as:**
- "Add demographic fields to contacts table" (too implementation-focused)
- "Demographics Form" (too UI-focused)

### Example 4: Feature Configuration

**From Requirements:**
"Different organizations need different features. Some want Fireflies, some don't. Some want advisor profiles, others don't."

**Capability:**
"Administrators can control feature access per tenant"

**Why it's a capability:**
- User outcome: Admins customize their tenant
- Testable: Features enable/disable correctly
- Valuable: Flexibility for different org needs

**Not framed as:**
- "Feature Flags" (too technical)
- "Settings Page" (too UI-focused)

---

## Step-by-Step Breakdown Process

### Example: impactOS Multi-Tenant Requirements

**Step 1: Extract user goals from PRD**

From requirements document:
- Organizations need to onboard without technical help
- Coaches need to track interactions automatically
- Admins need demographic data for compliance
- Organizations need to generate reports
- Admins need to control which features are active

**Step 2: Convert to capabilities**

1. "Organizations can onboard independently"
2. "Coaches can automatically capture meeting interactions"
3. "Organizations can manage portfolio companies and beneficiaries with demographics"
4. "Organizations can configure programs and update schedules"
5. "Organizations can generate government compliance reports"
6. "Administrators can control feature access"
7. "All tenant data is completely isolated"

**Step 3: Validate size**

- ✓ #1 (Onboarding): 1-2 weeks - good size
- ✓ #2 (Auto-capture): 2 weeks - good size
- ✓ #3 (Company/contact mgmt): 2 weeks - good size
- ✓ #4 (Program config): 1 week - good size
- ✓ #5 (Reporting): 1-2 weeks - good size
- ✓ #6 (Feature flags): 1 week - good size
- ✓ #7 (Tenant isolation): 1-2 weeks - good size

**Step 4: Check for dependencies**

- #7 (Isolation) must come first - foundation for everything
- #1 (Onboarding) depends on #6 (Feature flags) and #7 (Isolation)
- #2 (Auto-capture) depends on #3 (Company/contact data)
- #5 (Reporting) depends on all data being available

**Step 5: Final capability list with dependencies**

1. Multi-Tenant Foundation & Security (#7)
2. Feature Flags & Tenant Configuration (#6)
3. Self-Service Onboarding (#1)
4. Company & Contact Management with Demographics (#3)
5. Fireflies Integration & Interaction Capture (#2)
6. Programs, Cohorts & Update Scheduling (#4)
7. AI Agent Reporting (#5)

---

## Anti-Patterns to Avoid

### Anti-Pattern: Too Technical

**Bad**: "Implement Supabase RLS policies"
**Good**: "All tenant data is completely isolated"

**Why**: First is implementation detail, second is user outcome.

### Anti-Pattern: Too Granular

**Bad**: Separate capabilities for "Create Company", "Update Company", "Delete Company"
**Good**: "Manage Portfolio Companies"

**Why**: CRUD operations on the same entity should be one capability.

### Anti-Pattern: Too Broad

**Bad**: "Complete Platform Implementation"
**Good**: Break into 5-10 specific capabilities

**Why**: Too broad to plan, implement, or test effectively.

### Anti-Pattern: Feature-Focused

**Bad**: "Settings Page with Toggle Switches"
**Good**: "Administrators can control feature access"

**Why**: First describes UI, second describes user outcome.

### Anti-Pattern: No User Value

**Bad**: "Database Schema Migration"
**Good**: "Organizations can migrate existing data" (if migration helps users)

**Why**: If it's purely technical, it's an implementation detail, not a capability.

---

## Validation Checklist

For each capability, verify:

- [ ] **User-centric**: Describes what users can accomplish
- [ ] **Outcome-oriented**: Focuses on end result, not implementation
- [ ] **Valuable**: Provides clear user or business value
- [ ] **Testable**: Can verify when it's working
- [ ] **Right-sized**: 1-3 weeks of development
- [ ] **Independent enough**: Can be built without everything else
- [ ] **Not too technical**: Expressed in user terms, not implementation terms
- [ ] **Complete thought**: Stands alone as a meaningful capability

---

## Summary

**Good capabilities:**
- Describe user outcomes
- Are testable and measurable
- Provide value independently
- Are right-sized (1-3 weeks)
- Use user-facing language

**When breaking down a PRD:**
1. Extract user goals and problems
2. Identify core user actions
3. Group related capabilities
4. Validate size and independence
5. Order by dependencies
6. Create one Feature Epic per capability

**Result:**
A clean set of 5-10 Feature Epics that map requirements to implementation while preserving user focus and outcome orientation.
