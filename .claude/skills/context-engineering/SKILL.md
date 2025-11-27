---
name: context-engineering
description: "Evaluates and optimizes context engineering in AI systems, including prompts, tools, retrieval strategies, and agent architectures. Use when reviewing context management, identifying context pollution, or recommending improvements for AI pipelines and agentic workflows."
---

# Context Engineering Evaluation & Optimization

## Purpose

This skill helps you evaluate and improve context engineering in AI systems by analyzing how information is curated, maintained, and utilized during LLM inference. It identifies opportunities for optimization across prompts, tools, retrieval strategies, memory systems, and agent architectures.

## Core Principles

Context engineering is the art of optimizing the utility of tokens against LLM constraints to consistently achieve desired outcomes. The foundational principles are:

### 1. Context is a Finite Resource with Diminishing Returns

LLMs experience **context rot**: as token count increases, ability to recall information decreases. This stems from:
- **Attention budget scarcity**: n² pairwise relationships for n tokens stretch attention thin
- **Training distribution bias**: models have less experience with longer sequences
- **Position encoding limitations**: interpolation allows longer contexts but with degradation

**Implication**: Find the smallest possible set of high-signal tokens that maximize likelihood of desired outcomes.

### 2. The Right Altitude

Balance between two extremes:
- **Too specific**: Hardcoded, brittle logic that's fragile and high-maintenance
- **Too vague**: High-level guidance that lacks concrete signals or falsely assumes shared context

**Goldilocks zone**: Specific enough to guide behavior, flexible enough to provide strong heuristics.

### 3. Progressive Disclosure

Structure information to load in stages:
- **Level 1**: Always available (metadata, high-level instructions)
- **Level 2**: Loaded when triggered (detailed guidelines, examples)
- **Level 3**: Retrieved just-in-time (specific files, data, references)

Like humans using file systems and bookmarks rather than memorizing entire corpuses.

### 4. Just-in-Time Over Pre-Processing

Modern agentic approaches favor:
- Lightweight identifiers (file paths, queries, links) maintained in memory
- Dynamic loading at runtime using tools
- Progressive discovery through exploration

**Trade-off**: Runtime exploration is slower but avoids stale indexing and irrelevant context pollution.

## When to Use This Skill

Activate this skill when:
- Reviewing context engineering in AI/agent systems
- Evaluating prompt design, tool architectures, or retrieval strategies
- Identifying context pollution or attention budget issues
- Optimizing long-horizon task performance
- Assessing memory and persistence patterns
- Comparing architectural approaches (single vs. multi-agent, pre-retrieval vs. JIT, etc.)

## Evaluation Workflow

### Step 1: Discovery Interview

Start by understanding the user's context and needs. Ask:

1. **What are you evaluating?**
   - Agent architecture / agentic workflow
   - System prompt design
   - Tool ecosystem
   - Retrieval strategy (RAG, embeddings, search)
   - Memory/persistence system
   - Long-horizon task implementation
   - Complete AI pipeline

2. **What's the current challenge or goal?**
   - Performance issues (slow, inaccurate, inconsistent)
   - Context window limitations
   - Maintenance complexity
   - Scaling concerns
   - Specific failure modes observed

3. **What output format would be most useful?**
   - Narrative analysis with findings
   - Prioritized recommendations (high/medium/low impact)
   - Specific code/architecture examples
   - Comparative analysis (current vs. optimized)
   - Actionable implementation tasks
   - Diagnostic report with metrics

### Step 2: Contextual Analysis

Based on the discovery, analyze the relevant components:

**For System Prompts**:
- Is information organized in clear sections (background, instructions, tools, output)?
- Is the prompt at the right altitude (not too brittle, not too vague)?
- Does it use structural markers (XML tags, markdown headers)?
- Is it minimal yet sufficient for desired behavior?
- Are examples diverse and canonical rather than edge-case laundry lists?

**For Tools**:
- Do tools promote token efficiency in returns and behavior?
- Is there minimal overlap in functionality?
- Are tool purposes unambiguous (no decision paralysis)?
- Do tools have clear, descriptive input parameters?
- Are they self-contained and robust to error?

**For Retrieval Strategies**:
- Is data retrieved just-in-time or pre-processed?
- Are lightweight identifiers used vs. full data objects?
- Does metadata provide useful signals (file names, paths, timestamps)?
- Is progressive disclosure enabled through exploration?
- Are there stale indexing or irrelevant context issues?

**For Agent Architectures**:
- Is context actively managed (compaction, note-taking, clearing)?
- Are long-horizon tasks handled with appropriate patterns?
- Is there a hybrid approach balancing speed and freshness?
- Do sub-agents handle focused tasks with clean context?
- Is state persisted appropriately across sessions?

**For Memory Systems**:
- Is information stored outside context window when appropriate?
- Are structured formats (JSON) used for schema-dependent data?
- Is unstructured text used for progress notes and exploration?
- Are memory operations scoped and secured properly?
- Is there a strategy for memory expiration and cleanup?

### Step 3: Pattern Recognition

Consult reference files for deeper analysis:

- **patterns.md**: Context engineering patterns and when to use them
- **anti-patterns.md**: Common context engineering smells
- **metrics.md**: Quantitative measurement approaches
- **examples.md**: Example audits for different scenarios

### Step 4: Recommendations

Provide findings in the user's requested format, grounded in:
- Specific observations from their system
- Relevant principles from core framework
- Applicable patterns from reference materials
- Measurable improvements when possible
- Trade-offs and implementation considerations

Focus on **high-signal improvements** that address root causes rather than symptoms.

## Claude 4.5 Sonnet-Specific Guidance

When evaluating systems using Claude Sonnet 4.5, consider these model-specific capabilities:

### Strengths to Leverage

- **200K-1M context window**: Can handle extensive context but still subject to attention degradation
- **Context awareness**: Model tracks remaining context window
- **Parallel tool calling**: Excels at simultaneous independent operations
- **Extended thinking**: Can reflect on tool results before proceeding
- **64K output tokens**: Supports comprehensive responses

### Optimization Opportunities

- **Be explicit**: Claude 4.5 benefits from detailed specifications ("Include as many relevant features as possible")
- **Provide reasoning context**: Explain *why* behind requests for better generalization
- **Maximize parallel operations**: "Call independent tools in parallel rather than sequentially"
- **Use structured formats**: JSON for schema-dependent data, text for notes
- **Enable thinking after tool use**: "Reflect on tool result quality before proceeding"
- **Long-context positioning**: Place lengthy documents at the beginning (20K+ tokens)
- **Grounding technique**: Ask for relevant quote extraction before main task

## Remember

- Every architecture is unique - adapt evaluation to specific context
- Treat context as precious and finite, even with large windows
- Optimize for the smallest high-signal token set
- Balance between over-engineering and under-specification
- Ground recommendations in measurable improvements when possible
- Consider trade-offs: speed vs. freshness, simplicity vs. capability
- Test assumptions with real usage before implementing major changes

## Reference Files

- **patterns.md**: Detailed context engineering patterns (compaction, memory, multi-agent, JIT retrieval)
- **anti-patterns.md**: Common context pollution signals and inefficiencies
- **metrics.md**: Measurement approaches and optimization indicators
- **examples.md**: Example evaluations across different scenarios
