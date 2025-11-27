---
name: product-documentation
description: "Converts product requirements documents (PRDs) into hierarchical GitHub issues following agile documentation principles and SVPG product management philosophy. Use when creating GitHub issues from requirements, breaking down features into epics, or documenting product capabilities for implementation."
---

# Product Documentation Skill

## Purpose

This skill transforms comprehensive product requirements documents into well-structured, hierarchical GitHub issues that serve as both implementation guides and living documentation. It applies agile documentation principles (Just Barely Good Enough, Progressive Disclosure, Living Documentation) and SVPG product management philosophy (capabilities over features, problem-first thinking) to create issues that AI developers can execute successfully.

## When to Use This Skill

**Activate this skill when:**
- Converting a PRD or requirements document into GitHub issues
- Breaking down a product feature into implementation-ready work items
- Creating a master epic with linked feature epics
- Structuring product documentation for AI-assisted development
- Need to maintain traceability from requirements → capabilities → implementation

**Do NOT use this skill when:**
- Creating one-off bug reports or simple feature requests
- Writing general documentation (README, API docs, etc.)
- Managing existing issues (updates, closures, etc.)

## Core Principles

### 1. Three-Tier Hierarchical Structure

**Tier 1: Master Epic** (1 issue)
- Single source of truth for the entire project
- Links to all feature epics
- Contains executive summary, success metrics, timeline, architecture decisions
- Living document that evolves throughout the project

**Tier 2: Feature Epics** (5-10 issues typically)
- One epic per major capability
- Defines user value, success criteria, technical approach
- Links to implementation tasks
- Created upfront to establish scope

**Tier 3: Implementation Tasks** (created just-in-time)
- Specific, actionable technical work items
- Linked to parent epic
- Clear acceptance criteria
- Created incrementally as development progresses

### 2. Agile Documentation Principles

**Just Barely Good Enough (JBGE):**
- Include only what's necessary for successful implementation
- Avoid speculative details that may change
- Focus on stable, decision-critical information

**Living Documentation:**
- Issues evolve as implementation progresses
- Update with decisions, learnings, and outcomes
- Serve as historical record and onboarding material

**Document Continuously:**
- Create Tier 1 and Tier 2 upfront for planning
- Create Tier 3 just-in-time for active development
- Update all tiers as work progresses

**Progressive Disclosure:**
- Master Epic: High-level overview
- Feature Epics: Capability details
- Implementation Tasks: Technical specifics

### 3. SVPG Product Principles

**Capabilities Over Features:**
- Express requirements as user capabilities (what users need to accomplish)
- Avoid prescriptive feature specifications
- Give development team autonomy on "how"

**Problem-First Thinking:**
- Every epic starts with the problem being solved
- Include evidence and user context
- Define success criteria before solution approach

**Empowered Teams:**
- Provide context and constraints, not detailed specifications
- Allow technical decisions during implementation
- Track open questions and decision points

## Workflow

### Step 1: Analyze Requirements Document

Review the PRD or requirements document and identify:
- Core problem statement and user context
- Success metrics and timeline
- Key capabilities (not features)
- Technical constraints and risks
- Stakeholder requirements

### Step 2: Structure Breakdown

Create a three-tier outline:
1. **Master Epic**: Project name and overall scope
2. **Feature Epics**: List 5-10 core capabilities (reference `reference/capability-breakdown-guide.md`)
3. **Implementation Tasks**: Note which epics need immediate task breakdown (typically week 1-2 work)

### Step 3: Create Master Epic

Use `templates/master-epic-template.md`:
- Executive summary with problem statement
- Success metrics and timeline
- Links to all feature epics (will be added after creation)
- Architecture decisions and constraints
- Risk assessment summary
- Labels: `epic`, `master`, `documentation`

### Step 4: Create Feature Epics

For each capability, use `templates/feature-epic-template.md`:
- Capability definition (what users need to accomplish)
- User value and context (Jobs to Be Done)
- Success criteria (measurable outcomes)
- Technical approach overview (high-level only)
- Open questions and decision points
- Acceptance criteria
- Link to Master Epic
- Labels: `epic`, `feature-area-name`

### Step 5: Link Issues

Update Master Epic with links to all Feature Epics:
```markdown
## Feature Epics

- #2 Multi-Tenant Foundation & Security
- #3 Self-Service Onboarding
- #4 Fireflies Integration & Interaction Capture
...
```

### Step 6: Create Implementation Tasks (Just-in-Time)

When ready to start work on a feature epic, break it down using `templates/implementation-task-template.md`:
- Specific technical task description
- Link to parent Feature Epic
- Technical implementation details
- Acceptance criteria (testable)
- Estimated complexity (optional)
- Labels: `task`, `feature-area-name`

### Step 7: Maintain Living Documentation

As work progresses:
- Update issues with decisions made
- Add learnings and outcomes
- Link to PRs and commits
- Close tasks and mark epics complete
- Reference issues in code comments for traceability

## Issue Templates

All templates are in the `templates/` directory:
- `master-epic-template.md`: Tier 1 Master Epic
- `feature-epic-template.md`: Tier 2 Feature Epics
- `implementation-task-template.md`: Tier 3 Implementation Tasks

## Reference Materials

- `reference/agile-documentation-principles.md`: Detailed explanation of JBGE, Living Documentation, Progressive Disclosure
- `reference/svpg-product-principles.md`: SVPG philosophy on capabilities, problem-first thinking, empowered teams
- `reference/capability-breakdown-guide.md`: How to identify and structure capabilities from requirements

## Best Practices

### For Master Epics

✓ Keep executive summary concise (2-3 paragraphs)
✓ Include specific, measurable success metrics
✓ Link to all Feature Epics in a structured list
✓ Update with major decisions and learnings
✗ Don't include detailed implementation plans
✗ Don't duplicate content that belongs in Feature Epics

### For Feature Epics

✓ Start with user capability and value
✓ Define measurable success criteria
✓ List open questions and decision points
✓ Keep technical approach high-level (not step-by-step)
✓ Update with decisions as they're made
✗ Don't prescribe exact implementation steps
✗ Don't create all Implementation Tasks upfront

### For Implementation Tasks

✓ Be specific and actionable
✓ Include testable acceptance criteria
✓ Reference parent Feature Epic
✓ Link to relevant PRs when completed
✗ Don't create tasks more than 1-2 weeks in advance
✗ Don't duplicate information from parent epic

### Labels and Organization

Use consistent labels:
- **Type**: `epic`, `task`, `documentation`
- **Tier**: `master`, `feature`, `implementation`
- **Feature Area**: `onboarding`, `security`, `integrations`, etc.
- **Status**: GitHub's default status workflow or custom project board

## Example Usage

**User:** "Convert my PRD for multi-tenant impactOS into GitHub issues"

**Claude response:**
1. Analyzes PRD and identifies 7 core capabilities
2. Creates 1 Master Epic with problem statement, success metrics, timeline
3. Creates 7 Feature Epics (one per capability) with user value and success criteria
4. Links all Feature Epics to Master Epic
5. Asks which features to start first
6. Creates Implementation Tasks for week 1-2 work
7. Provides summary of created issues with links

## Validation Checklist

Before finalizing issues:

- [ ] Master Epic includes success metrics and timeline
- [ ] All Feature Epics linked from Master Epic
- [ ] Each Feature Epic starts with capability and user value
- [ ] Success criteria are measurable
- [ ] Technical approach is high-level (not step-by-step)
- [ ] Open questions are documented
- [ ] Acceptance criteria are testable
- [ ] Labels are consistent and meaningful
- [ ] Implementation Tasks only created for immediate work (1-2 weeks)
- [ ] All issues properly linked (parent → child relationships)

## Integration with Development Workflow

This skill works best when combined with:
- **GitHub Projects** (Recommended): Visualize progress across all tiers
  - Board view for Kanban workflow (To Do, In Progress, Done)
  - Roadmap view for timeline visualization
  - Custom fields for priority, epic type, status
  - Auto-updates from issue status changes
  - **Setup after creating epics**: Link all epic issues to Project
- **Pull Request References**: Link PRs to Implementation Tasks
- **Code Comments**: Reference issue numbers for traceability
- **Regular Updates**: Review and update epics weekly
- **Retrospectives**: Capture learnings in epics for future reference

## GitHub Projects Integration

**After creating epic issues, add them to a GitHub Project**:

1. Create Project: "impactOS MVP" (or project name)
2. View: Board (columns: Not Started, In Progress, Complete)
3. Custom fields: Epic Type (Foundation, Feature, Integration)
4. Link all epic issues to Project
5. Move issues between columns as work progresses
6. Use Roadmap view for timeline visualization

**Benefits**:
- Visual progress tracking (X of 7 epics complete)
- Timeline/Gantt view for schedule
- Velocity tracking (epics per week)
- Focus clarity (what's in progress)
- Issues remain living documentation, Project provides views

**Workflow**:
1. Create epic issues (using this skill)
2. Link to GitHub Project
3. Work on epic (update issue as living doc)
4. Move to "In Progress" in Project
5. Complete epic (update issue with results)
6. Move to "Complete" in Project
7. Create next epic just-in-time

## Adaptation Guidance

This skill is designed for SVPG-style product development with agile documentation principles. Adapt as needed:

**For waterfall projects**: Create all Implementation Tasks upfront instead of just-in-time
**For smaller projects**: May only need 2 tiers (Master + Implementation Tasks)
**For larger projects**: Add Tier 1.5 (Theme Epics) between Master and Feature Epics
**For non-product work**: Adapt capability language to appropriate context (infrastructure capabilities, operational capabilities, etc.)

## Remember

- **Issues are living documentation**: They evolve as you learn
- **Capabilities over features**: Focus on user outcomes, not solutions
- **Just-in-time detail**: Create Implementation Tasks when needed, not speculatively
- **Progressive disclosure**: Each tier reveals appropriate level of detail
- **Traceability matters**: Links connect requirements → capabilities → implementation → code
