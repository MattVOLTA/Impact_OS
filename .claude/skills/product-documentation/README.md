# Product Documentation Skill

A Claude skill for converting product requirements documents (PRDs) into well-structured, hierarchical GitHub issues that serve as both implementation guides and living documentation.

## Overview

This skill applies agile documentation principles and SVPG product management philosophy to transform comprehensive product requirements into actionable GitHub issues. It creates a three-tier hierarchy that maintains traceability from requirements → capabilities → implementation while empowering development teams with appropriate autonomy.

## When to Use

**Activate this skill when:**
- Converting a PRD or requirements document into GitHub issues
- Breaking down a product feature into implementation-ready work items
- Creating a master epic with linked feature epics
- Structuring product documentation for AI-assisted development
- Need to maintain traceability from requirements → capabilities → implementation

**Keywords that trigger this skill:**
- "create GitHub issues from requirements"
- "convert PRD to issues"
- "product documentation"
- "feature epics"
- "capability breakdown"
- "implementation issues"

## Core Principles

### Agile Documentation
- **Just Barely Good Enough (JBGE)**: Include only what's necessary for successful implementation
- **Living Documentation**: Issues evolve as implementation progresses
- **Document Continuously**: Create structure upfront, details just-in-time
- **Progressive Disclosure**: Each tier reveals appropriate level of detail

### SVPG Product Management
- **Capabilities Over Features**: Express requirements as user capabilities (what users can do)
- **Problem-First Thinking**: Start with the problem, not the solution
- **Empowered Teams**: Provide context and constraints, not prescriptive solutions
- **Outcome-Focused**: Measure success by user outcomes, not feature delivery

## Three-Tier Hierarchy

### Tier 1: Master Epic (1 issue)
- Single source of truth for the entire project
- Executive summary, success metrics, timeline
- Links to all feature epics
- Architecture decisions and constraints
- Living document that evolves throughout the project

### Tier 2: Feature Epics (5-10 issues)
- One epic per major capability
- Capability definition and user value
- Success criteria and acceptance criteria
- High-level technical approach (not step-by-step)
- Open questions and decision tracking
- Created upfront to establish scope

### Tier 3: Implementation Tasks (created just-in-time)
- Specific, actionable technical work items
- Clear acceptance criteria
- Linked to parent epic
- Created incrementally as development progresses (1-2 weeks ahead)

## File Structure

```
product-documentation/
├── SKILL.md                    # Main skill definition and workflow
├── README.md                   # This file
├── TESTING.md                  # Test scenarios and validation
├── templates/
│   ├── master-epic-template.md         # Tier 1 template
│   ├── feature-epic-template.md        # Tier 2 template
│   └── implementation-task-template.md # Tier 3 template
└── reference/
    ├── agile-documentation-principles.md  # JBGE, Living Docs, etc.
    ├── svpg-product-principles.md         # Capabilities, Problem-First, etc.
    └── capability-breakdown-guide.md      # How to identify capabilities
```

## Quick Start

### Example 1: Convert a PRD to GitHub Issues

```
User: "Convert my product requirements document into GitHub issues."

Claude (using skill):
1. Analyzes PRD to identify core capabilities
2. Proposes three-tier structure
3. Creates Master Epic with problem statement and success metrics
4. Creates Feature Epics (one per capability)
5. Links all issues properly
6. Suggests creating Implementation Tasks just-in-time
```

### Example 2: Create a Feature Epic

```
User: "Create a Feature Epic for letting users export their data."

Claude (using skill):
1. Asks clarifying questions about the problem and users
2. Frames as capability: "Users can export data in multiple formats"
3. Creates epic using feature-epic-template.md
4. Includes problem statement, user value, success criteria
5. Keeps technical approach high-level
6. Lists open questions
```

### Example 3: Break Down an Epic

```
User: "I'm ready to start work on the onboarding epic. Break it down into tasks."

Claude (using skill):
1. Asks which aspects to prioritize first
2. Creates 3-5 implementation tasks for week 1-2 work
3. Uses implementation-task-template.md
4. Links tasks to parent epic
5. Includes specific acceptance criteria
6. Does NOT create tasks for later weeks (just-in-time)
```

## Templates

### Master Epic Template
Includes sections for:
- Executive summary
- Success metrics (primary and secondary)
- Feature epic links
- Architecture decisions
- Timeline and phases
- Risk assessment
- Constraints
- Major decisions log
- Learnings and outcomes

### Feature Epic Template
Includes sections for:
- Capability definition (user-centric)
- User value and context (Job to Be Done)
- Success criteria (measurable)
- Technical approach overview (high-level)
- Constraints and requirements
- Open questions and decisions
- Implementation tasks (just-in-time)
- Timeline and dependencies
- Testing and validation
- Risks and mitigation

### Implementation Task Template
Includes sections for:
- Task description
- Technical details (specific approach)
- Files/components to change or create
- Dependencies
- Acceptance criteria (functional, technical, documentation)
- Implementation notes
- Testing plan
- Estimated complexity

## Reference Materials

### Agile Documentation Principles
Comprehensive guide to:
- Just Barely Good Enough (JBGE)
- Living Documentation
- Document Continuously
- Progressive Disclosure
- Collaboration Over Documentation
- Focus on Stable Information

### SVPG Product Principles
Detailed explanation of:
- Capabilities Over Features
- Problem-First Thinking
- Empowered Product Teams
- The Four Risks (Value, Viability, Usability, Feasibility)
- Continuous Discovery
- Product vs Feature Teams

### Capability Breakdown Guide
Step-by-step guide for:
- Identifying capabilities from requirements
- Structuring capabilities appropriately
- Validating capability size and independence
- Common patterns (CRUD, workflows, integrations)
- Examples and anti-patterns

## Best Practices

### For Master Epics
✓ Keep executive summary concise (2-3 paragraphs)
✓ Include specific, measurable success metrics
✓ Update with major decisions and learnings
✗ Don't include detailed implementation plans
✗ Don't duplicate content that belongs in Feature Epics

### For Feature Epics
✓ Start with user capability and value
✓ Define measurable success criteria
✓ Keep technical approach high-level
✓ List open questions and decision points
✗ Don't prescribe exact implementation steps
✗ Don't create all Implementation Tasks upfront

### For Implementation Tasks
✓ Be specific and actionable
✓ Include testable acceptance criteria
✓ Link to parent Feature Epic
✗ Don't create tasks more than 1-2 weeks in advance
✗ Don't duplicate information from parent epic

## Integration with Development Workflow

This skill works best when combined with:
- **GitHub Projects**: Visualize progress across all tiers
- **Pull Request References**: Link PRs to Implementation Tasks
- **Code Comments**: Reference issue numbers for traceability
- **Regular Updates**: Review and update epics weekly
- **Retrospectives**: Capture learnings in epics for future reference

## Adaptation Guidance

This skill is designed for SVPG-style product development with agile documentation principles. Adapt as needed:

- **Waterfall projects**: Create all Implementation Tasks upfront instead of just-in-time
- **Smaller projects**: May only need 2 tiers (Master + Implementation Tasks)
- **Larger projects**: Add Tier 1.5 (Theme Epics) between Master and Feature Epics
- **Non-product work**: Adapt capability language (infrastructure capabilities, operational capabilities, etc.)

## Testing

See `TESTING.md` for comprehensive test scenarios including:
- Basic capability identification
- PRD to GitHub issues conversion
- Single feature epic creation
- Implementation task breakdown
- Agile documentation principles application
- SVPG principles application
- Living documentation updates

## Version History

- **v1.0** (2024-11-11): Initial release
  - Three-tier hierarchical structure
  - Agile documentation principles
  - SVPG product management principles
  - Comprehensive templates and reference materials

## Contributing

To improve this skill:
1. Test with real product requirements
2. Observe how it handles edge cases
3. Refine templates based on usage
4. Update reference materials with learnings
5. Add examples from real projects

## License

This skill is part of the impactOS project and follows its licensing terms.

## Credits

Created based on:
- **Agile Documentation Principles**: Just Barely Good Enough, Living Documentation
- **SVPG Product Management**: Marty Cagan's product management philosophy
- **Skill Development Best Practices**: Claude skill-developer guidelines

---

**Last Updated**: November 11, 2024
**Status**: Ready for use
**Maintained By**: impactOS Team
