# Context Engineering Anti-Patterns

This reference catalogs common context engineering smells and inefficiencies to investigate during evaluations.

## Table of Contents

1. [Context Pollution](#context-pollution)
2. [Prompt Design Issues](#prompt-design-issues)
3. [Tool Design Problems](#tool-design-problems)
4. [Retrieval Strategy Inefficiencies](#retrieval-strategy-inefficiencies)
5. [Memory & State Management Issues](#memory--state-management-issues)
6. [Architecture Smells](#architecture-smells)

---

## Context Pollution

### Symptom: Context Bloat

**Signals**:
- Context window fills up quickly during interactions
- Agent performance degrades as conversation progresses
- High token counts with low information density
- Redundant or duplicate information across messages

**Root causes**:
- Not clearing processed tool results
- Repeating full documents instead of references
- Accumulating intermediate states unnecessarily
- No compaction strategy for long conversations

**Investigation questions**:
- What percentage of context is redundant or processed data?
- Are tool results cleared after use?
- Is there a compaction or cleanup strategy?

---

### Symptom: Irrelevant Context Accumulation

**Signals**:
- Retrieved information not used in reasoning
- Embedding-based retrieval returning off-topic content
- Pre-loaded documents that agent never references
- Wide net retrieval with low precision

**Root causes**:
- Over-aggressive pre-retrieval
- Stale or poorly tuned embeddings
- Lack of relevance filtering
- No progressive disclosure strategy

**Investigation questions**:
- How is relevance determined for retrieved content?
- What percentage of retrieved context is actually used?
- Is there a way to retrieve more selectively?

---

### Symptom: Attention Budget Waste

**Signals**:
- Model misses important details late in context
- Performance difference between early vs. late information
- Loss of focus on primary task
- Increased hallucinations or errors

**Root causes**:
- Critical information buried in large context
- Poor document positioning (important info at end)
- No grounding technique to focus attention
- Context exceeds model's optimal operating range

**Investigation questions**:
- Where is critical information positioned?
- Is the context larger than necessary?
- Could grounding or quote extraction help?

---

## Prompt Design Issues

### Symptom: Wrong Altitude (Too Specific)

**Signals**:
- Hardcoded if-else logic in prompts
- Brittle behavior requiring frequent updates
- Prompts read like code rather than guidance
- High maintenance complexity

**Example**:
```
If user asks about X, do Y. If user asks about Z, do W.
If condition A and condition B, then action C, otherwise action D.
```

**Better approach**:
```
When analyzing requests, consider [principles]. Prioritize [goals].
Use tools that best match the situation.
```

**Investigation questions**:
- Does the prompt specify exact branching logic?
- Is it fragile to variations in input?
- Could it be generalized with principles instead of rules?

---

### Symptom: Wrong Altitude (Too Vague)

**Signals**:
- Agent behavior is inconsistent
- Model makes incorrect assumptions
- Frequent need for clarification
- Falsely assumes shared context or domain knowledge

**Example**:
```
Help the user with their request.
Be helpful and accurate.
```

**Better approach**:
```
Analyze user requests by [specific criteria].
When encountering [situation], [specific guidance].
Output should follow [concrete structure].
```

**Investigation questions**:
- Are instructions specific enough to guide behavior?
- Does the model have concrete signals for desired outputs?
- Are there implicit assumptions about shared knowledge?

---

### Symptom: Example Overload

**Signals**:
- Prompts stuffed with dozens of examples
- Examples covering every edge case imaginable
- Edge case examples outweigh canonical ones
- Examples are highly similar with minor variations

**Root cause**: Attempting to enumerate every rule via examples rather than providing principles.

**Better approach**: 3-5 diverse, canonical examples that represent different scenarios effectively.

**Investigation questions**:
- Do examples represent diverse scenarios or redundant edge cases?
- Could principles replace some examples?
- Are examples canonical or exceptional?

---

### Symptom: Poor Organization

**Signals**:
- No clear sections or hierarchy
- Mixed concerns (instructions, background, examples interleaved)
- Difficult to locate specific information
- No structural markers (XML tags, headers)

**Impact**: Model has harder time navigating and prioritizing information.

**Investigation questions**:
- Is information organized into clear sections?
- Are structural markers (XML, markdown) used?
- Can sections be easily identified and referenced?

---

## Tool Design Problems

### Symptom: Tool Bloat

**Signals**:
- Many tools with overlapping functionality
- Unclear which tool to use in given situations
- Humans can't definitively choose between tools
- Decision paralysis in agent behavior

**Example**: Separate tools for `read_file`, `read_text_file`, `get_file_content`, `load_file`

**Root cause**: Tools not designed with clear separation of concerns.

**Investigation questions**:
- Is each tool's purpose unambiguous?
- Do multiple tools solve the same problem?
- Can tools be consolidated or differentiated?

---

### Symptom: Inefficient Tool Returns

**Signals**:
- Tools return massive amounts of data
- Context fills with raw data dumps
- Pagination not available for large results
- No filtering options at tool level

**Example**: Tool returns entire 10MB file when user needs one function.

**Root cause**: Tools not designed for token efficiency.

**Investigation questions**:
- Do tools return minimal high-signal information?
- Are there options for filtering/pagination?
- Could summaries replace full data returns?

---

### Symptom: Unclear Tool Contracts

**Signals**:
- Agent frequently misuses tools
- Tool descriptions are vague or incomplete
- Parameters lack clear documentation
- Required vs. optional parameters unclear

**Example**:
```json
{
  "name": "process_data",
  "description": "Processes data",
  "parameters": {
    "data": "the data to process",
    "options": "various options"
  }
}
```

**Investigation questions**:
- Are tool purposes explicitly clear?
- Do parameters have descriptive, unambiguous names?
- Are required parameters actually necessary?

---

### Symptom: Tool Dependency Complexity

**Signals**:
- Tools frequently called in wrong order
- Results from tool A needed for tool B but not made explicit
- Agent has to guess parameter values
- Errors from missing prerequisite tool calls

**Root cause**: Tool dependencies not clearly documented or enforced.

**Investigation questions**:
- Are tool dependencies explicit?
- Do tools guide agents to call prerequisites?
- Could workflows be simplified?

---

## Retrieval Strategy Inefficiencies

### Symptom: Stale Pre-Retrieval

**Signals**:
- Retrieved content doesn't match current state
- Index updates lag behind data changes
- Agent sees outdated information
- Requires frequent reindexing

**Root cause**: Pre-computed retrieval without JIT refresh capability.

**Investigation questions**:
- How fresh does retrieved content need to be?
- Is there a hybrid approach with JIT for dynamic content?
- How often is index updated vs. data changed?

---

### Symptom: Over-Retrieval

**Signals**:
- Large chunks retrieved when small subset needed
- No progressive disclosure mechanism
- Context filled before work begins
- Pre-retrieval assumes what's needed without exploration

**Root cause**: Lack of just-in-time retrieval capability.

**Investigation questions**:
- Could agents retrieve incrementally as needed?
- Are lightweight identifiers used instead of full data?
- Is progressive disclosure possible?

---

### Symptom: Poor Metadata Utilization

**Signals**:
- File/folder structures not leveraged
- Timestamps ignored
- Naming conventions not utilized as signals
- Hierarchies flattened in retrieval

**Root cause**: Retrieval treats all content equally without considering metadata signals.

**Investigation questions**:
- Does metadata provide useful signals?
- Could hierarchies inform relevance?
- Are naming conventions meaningful?

---

## Memory & State Management Issues

### Symptom: No Cross-Session Persistence

**Signals**:
- Agent starts from scratch each session
- Repeats discovery work already done
- No memory of previous decisions or learnings
- User has to re-explain context

**Root cause**: Lack of memory/persistence mechanism.

**Investigation questions**:
- Would file-based memory help?
- Could git commits serve as checkpoints?
- Should structured notes persist across sessions?

---

### Symptom: Memory Without Cleanup

**Signals**:
- Memory grows unbounded
- Old irrelevant information persists
- No expiration or pruning strategy
- Memory pollution mirrors context pollution

**Root cause**: Memory accumulation without maintenance strategy.

**Investigation questions**:
- Is there an expiration policy?
- Are memories pruned based on relevance?
- Is there a capacity limit?

---

### Symptom: Unstructured Memory for Structured Data

**Signals**:
- Difficulty parsing remembered information
- Inconsistent memory formats
- Hard to update specific values
- No schema for critical state

**Root cause**: Using unstructured text for schema-dependent data.

**Investigation questions**:
- Should JSON/YAML be used instead?
- Is data schema-dependent or exploratory?
- Could structured format improve retrieval?

---

## Architecture Smells

### Symptom: Single Agent Doing Too Much

**Signals**:
- Context fills rapidly with diverse concerns
- Agent context-switches between different task types
- Performance degradation in long conversations
- Difficult to maintain focused attention

**Root cause**: No separation of concerns via sub-agents.

**Investigation questions**:
- Could sub-agents handle specialized tasks?
- Are there distinct concerns that could be isolated?
- Would separation improve focus?

---

### Symptom: No Compaction Strategy for Long Tasks

**Signals**:
- Tasks fail when hitting context limits
- No graceful degradation
- Work lost when context full
- Agent can't complete long-horizon tasks

**Root cause**: Lack of compaction, note-taking, or state management for extended operations.

**Investigation questions**:
- How are long-horizon tasks handled?
- Is there a compaction strategy?
- Are notes taken for persistence?

---

### Symptom: Missing Hybrid Approach

**Signals**:
- Exclusively pre-retrieval OR exclusively JIT (not both)
- Unnecessary latency from runtime retrieval of static content
- Stale information from lack of runtime refresh
- Suboptimal balance between speed and freshness

**Root cause**: Not leveraging strengths of both approaches.

**Investigation questions**:
- What content is stable vs. dynamic?
- Could stable content be pre-loaded?
- Could dynamic content be JIT retrieved?

---

### Symptom: Context Unaware Operations

**Signals**:
- No tracking of context usage
- Operations don't adapt to available context budget
- Agent unaware of approaching limits
- No warnings or proactive management

**Root cause**: System doesn't monitor or manage context consumption.

**Investigation questions**:
- Is context usage tracked?
- Does agent know remaining budget?
- Are there proactive warnings or adaptations?

---

## Investigation Approach

When encountering these anti-patterns:

1. **Confirm the symptom**: Verify observed behaviors match pattern description
2. **Identify root cause**: Distinguish symptom from underlying issue
3. **Assess impact**: Quantify effect on performance, cost, or maintainability
4. **Consider context**: Determine if pattern is actually problematic in this specific case
5. **Recommend solution**: Suggest specific pattern or approach to address
6. **Estimate effort**: Help prioritize fixes based on impact vs. implementation complexity

**Remember**: Not all anti-patterns require fixing immediately. Prioritize based on actual impact on system performance and goals.
