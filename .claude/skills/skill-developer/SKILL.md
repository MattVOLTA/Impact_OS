---
name: skill-developer
description: "Helps create effective Claude Skills following best practices. Use when developing new Skills or improving existing ones. Guides through discovery, structure, metadata, and testing."
---

# Claude Skill Developer

## Purpose
This skill helps you create well-structured, effective Claude Skills that follow official best practices. It guides you through discovery, architecture, implementation, and testing to ensure your Skills are concise, properly scoped, and reliable.

## Core Principles

### 1. Challenge Every Line
Skills share the context window. Only include information Claude doesn't already possess. Ask: "Does Claude really need this explanation?"

### 2. Progressive Disclosure
Structure Skills so information loads in stages:
- **Level 1**: Metadata (name/description) - always loaded
- **Level 2**: SKILL.md body - loaded when triggered
- **Level 3**: Reference files - loaded only when needed

### 3. Appropriate Degrees of Freedom
Match specificity to task fragility:
- **High freedom** (text instructions): Multiple valid approaches exist
- **Medium freedom** (pseudocode): Preferred patterns with some variation
- **Low freedom** (specific scripts): Operations are fragile or require exact sequences

### 4. Build Evaluations First
Create test scenarios demonstrating actual gaps BEFORE extensive documentation. This ensures Skills solve real problems.

### 5. Develop Iteratively with Claude
Use one Claude instance to create Skills; test with another in real tasks. Observe behavior and refine based on usage patterns.

## Discovery Interview

When a user wants to create a new Skill, interview them to understand:

### Essential Questions

Ask one question at a time, building on responses:

1. **What gap are you trying to fill?**
   - What does Claude currently do wrong or forget?
   - What do you find yourself repeatedly explaining?
   - What workflows break when instructions aren't precise?

2. **When should this Skill activate?**
   - What keywords or contexts signal this Skill is needed?
   - Are there situations where it shouldn't activate?
   - How will Claude know to use this vs other Skills?

3. **Who will use this Skill?**
   - Just you, your team, or broader audience?
   - What's their expertise level?
   - What platforms will they use? (Claude.ai, API, Claude Code)

4. **What degree of freedom is appropriate?**
   - Must steps happen in exact sequence? (scripts/strict instructions)
   - Are there preferred patterns with acceptable variations? (pseudocode/templates)
   - Multiple valid approaches exist? (high-level guidance)

5. **What resources does this need?**
   - Scripts or utilities?
   - Reference documentation?
   - Templates or examples?
   - External dependencies?

6. **What outputs should it produce?**
   - Specific file formats?
   - Data structures?
   - Interactive workflows with user feedback loops?

## Skill Architecture Guidance

### Metadata Requirements

Every Skill needs YAML frontmatter with:

```yaml
---
name: skill-name-in-lowercase
description: "What this does and when to use it. Include key terms and triggers."
---
```

**Name constraints:**
- Maximum 64 characters
- Lowercase letters, numbers, hyphens only
- No XML tags or reserved words ("anthropic", "claude")
- Use gerund form: "processing-pdfs", "analyzing-spreadsheets"

**Description constraints:**
- Maximum 1024 characters for web uploads (200 for API)
- Write in third person
- Include BOTH what it does AND when to use it
- Be specific with key terms Claude should recognize
- Avoid vague descriptions like "helps with documents"

### File Structure

**Single-file Skills** (under 500 lines):
```
skill-name/
└── SKILL.md (metadata + all content)
```

**Multi-file Skills** (over 500 lines):
```
skill-name/
├── SKILL.md (overview, metadata, navigation)
├── reference.md (API details, specifications)
├── examples.md (usage patterns, templates)
└── scripts/ (executable utilities)
```

**Critical rules:**
- Keep SKILL.md body under 500 lines
- Reference files must be ONE level deep (linked directly from SKILL.md)
- Avoid nested references (file A → file B → file C)
- Long reference files (100+ lines) should include table of contents
- All file paths use forward slashes, never backslashes

### Content Organization

**SKILL.md should contain:**
- Purpose statement
- Core principles or workflow overview
- When to use / when not to use
- Key decision points
- Links to reference files (if multi-file)
- Examples demonstrating desired style/output

**Reference files should contain:**
- API specifications
- Detailed procedures
- Code templates
- Extended examples
- Style guides

**Scripts should:**
- Solve problems, not punt to Claude
- Handle errors explicitly with helpful messages
- Document all constants and magic numbers
- List dependencies explicitly
- Clarify execution intent (run vs read as reference)

## Writing Guidelines

### Essential Practices

**Consistent terminology:** Choose one term throughout
- ✓ "API endpoint" everywhere
- ✗ Mixing "URL", "path", "API route", "endpoint"

**Provide templates:** Supply output format templates for strict requirements
```yaml
# Example template
response:
  status: success|error
  data: {}
  message: ""
```

**Use examples:** Include input/output pairs demonstrating style and detail level

**Avoid time-sensitive information:**
- ✓ Use "Old Patterns" sections for deprecated approaches
- ✗ Conditional "before/after date" statements

**Create verifiable outputs:**
For multi-step operations, use intermediate files that can be validated:
```
1. Generate plan.json (validate structure)
2. Execute plan (validate completion)
3. Generate report (validate format)
```

### Workflows and Validation

**Complex task workflows:** Break operations into sequential steps with copyable checklists

**Feedback loops:** Implement "run validator → fix errors → repeat" patterns

**Verification points:** Include checkpoints where Claude can confirm before proceeding

## Common Patterns

### Interview-then-Execute Pattern
```markdown
## How to Use This Skill

1. Claude asks clarifying questions one at a time
2. User provides context and requirements
3. Claude proposes approach for approval
4. Execute with validated parameters
5. Run verification/validation
6. Iterate if needed
```

### Template-with-Validation Pattern
```markdown
## Workflow

1. Load template from templates/base.yaml
2. Fill placeholders using user input
3. Validate against schema in reference.md
4. Execute script to verify output
5. Report results with specific error messages
```

### Progressive-Complexity Pattern
```markdown
## Usage Levels

### Quick Start (defaults)
Use default settings for common cases

### Intermediate (customize)
Override specific settings for your use case

### Advanced (full control)
Access all configuration options
```

## Anti-Patterns to Avoid

**Too many options:** Present defaults with escape hatches, not multiple equivalent approaches

**Magic numbers:** All constants require justification
- ✗ `retry_count = 3`
- ✓ `retry_count = 3  # Balance reliability vs speed; most failures resolve by retry two`

**Assumed tools:** Don't assume packages are installed; provide explicit instructions

**Deeply nested content:** Progressive disclosure only works effectively one level deep

**Windows paths:** Always use forward slashes for cross-platform compatibility

**Vague activation criteria:** Description must be specific enough for Claude to know when to activate

**Over-specification:** Don't constrain when multiple valid approaches exist

## Testing Checklist

Before finalizing any Skill, verify:

- [ ] Name is lowercase with hyphens only
- [ ] Description includes what it does AND when to use it
- [ ] Description contains key terms for activation
- [ ] SKILL.md body under 500 lines
- [ ] References are one level deep only
- [ ] All file paths use forward slashes
- [ ] Scripts handle errors explicitly
- [ ] All constants are documented
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Templates provided for strict formats
- [ ] Examples demonstrate desired style
- [ ] Tested with real usage scenarios
- [ ] Tested with Haiku, Sonnet, and Opus (if multi-model usage expected)

## Output Format

After gathering requirements, generate:

1. **Skill directory structure** (with file tree)
2. **SKILL.md** with proper frontmatter and content
3. **Reference files** (if needed)
4. **Scripts** (if needed)
5. **Testing scenarios** to validate the Skill works

## Iterative Development Process

1. **Gather requirements** through interview
2. **Draft minimal SKILL.md** addressing core use case
3. **Create test scenario** demonstrating the gap
4. **Test with real Claude instance**
5. **Observe unexpected behaviors**
6. **Refine based on observations** (not assumptions)
7. **Expand only if gaps remain**

## Remember

- Skills are for repeated workflows, not one-off tasks
- Conciseness is critical—context window is shared
- Let Claude handle variation within appropriate degrees of freedom
- Test with real usage before adding more documentation
- Watch how Claude navigates your files—unexpected patterns indicate structure issues
- Different models may behave differently—test across models if needed

## Example: Creating a New Skill

User: "I want to create a Skill for analyzing database schemas"

### Discovery Questions Asked:
1. What specific gap are you filling? → "Claude forgets to check foreign key constraints"
2. When should this activate? → "When I ask about database design or schema changes"
3. What degree of freedom? → "Medium—there are preferred patterns but some variation is OK"
4. What resources needed? → "SQL schema templates and common anti-patterns list"

### Output Structure:
```
database-schema-analyzer/
├── SKILL.md (overview, workflow, when to use)
├── templates/
│   ├── table-template.sql
│   └── migration-template.sql
└── reference/
    ├── constraints.md (FK, unique, check constraints)
    └── anti-patterns.md (common mistakes to avoid)
```

### SKILL.md Preview:
```yaml
---
name: database-schema-analyzer
description: "Analyzes database schemas for design issues, constraint violations, and anti-patterns. Use when reviewing database designs, schema changes, or migration scripts."
---

# Database Schema Analyzer

## Purpose
Helps analyze database schemas systematically, checking for constraint issues, normalization problems, and common anti-patterns.

## Workflow
1. Load schema (user provides SQL or description)
2. Ask clarifying questions about usage patterns
3. Check against constraint checklist in reference/constraints.md
4. Identify anti-patterns from reference/anti-patterns.md
5. Provide specific recommendations with examples

[... rest of content ...]
```

This demonstrates: proper naming, specific description with triggers, clear structure, progressive disclosure, and appropriate degree of freedom.
