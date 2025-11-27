# Context Engineering Patterns

This reference describes proven patterns for managing context effectively in AI systems.

## Table of Contents

1. [Long-Horizon Task Patterns](#long-horizon-task-patterns)
2. [Retrieval Patterns](#retrieval-patterns)
3. [Tool Design Patterns](#tool-design-patterns)
4. [Memory & Persistence Patterns](#memory--persistence-patterns)
5. [Multi-Agent Patterns](#multi-agent-patterns)
6. [Prompt Structuring Patterns](#prompt-structuring-patterns)

---

## Long-Horizon Task Patterns

### Compaction

**When to use**: Tasks approaching context window limits that require conversational continuity.

**How it works**:
- Summarize conversation contents when nearing context limit
- Preserve critical details: architectural decisions, unresolved bugs, implementation specifics
- Discard redundant tool outputs and resolved discussions
- Reinitiate with compressed summary plus recently accessed files

**Implementation**:
```
Pass message history → Model summarizes → Keep compressed context + N most recent files
```

**Tuning considerations**:
- Start by maximizing recall (capture everything relevant)
- Iterate to improve precision (eliminate superfluous content)
- Safest approach: clear old tool results (once processed, raw results rarely needed)

**Example**: Claude Code compacts context to continue multi-hour coding sessions without losing architectural context.

---

### Structured Note-Taking (Agentic Memory)

**When to use**: Iterative development with clear milestones, tasks requiring persistent memory.

**How it works**:
- Agent regularly writes notes to files outside context window
- Notes pulled back into context at later times
- Maintains critical context across tool calls and sessions

**Implementation patterns**:
- **Structured notes**: JSON for tallies, objectives, schema-dependent tracking
- **Unstructured notes**: Markdown/text for exploration, strategies, progress summaries
- **Hybrid**: Combine both for comprehensive state management

**Example**: Agent playing Pokémon maintains precise tallies ("1,234 steps training in Route 1, Pikachu gained 8 levels toward target of 10"), maps of explored regions, and combat strategies that persist across context resets.

**Claude 4.5 capability**: Memory tool provides file-based system for storing/consulting information outside context window.

---

### State Checkpointing

**When to use**: Multi-session work requiring reliable state recovery.

**How it works**:
- Use version control (git) as checkpoint system
- Create commits at logical milestones
- Enable recovery and continuation across context resets

**Implementation**:
- Commit completed units of work
- Tag significant milestones
- Use commit messages as state documentation

**Benefit**: Provides external source of truth independent of context window.

---

### Multi-Window Workflows

**When to use**: Extended tasks requiring fresh starts while maintaining continuity.

**Setup patterns**:
- Create tests in structured formats (JSON) before beginning
- Set up quality-of-life tools (scripts, utilities)
- Use git for state tracking
- Maintain structured notes for cross-session memory

**Continuation strategy**:
- Consider starting fresh rather than compacting when context clears
- Read previous notes to resume work
- Leverage external state (git, files) rather than context history

---

## Retrieval Patterns

### Just-In-Time (JIT) Retrieval

**When to use**: Dynamic content, large information spaces, need for freshness over speed.

**How it works**:
- Maintain lightweight identifiers (file paths, stored queries, web links)
- Use tools to dynamically load data into context at runtime
- Progressive discovery through exploration

**Advantages**:
- Avoids stale indexing
- Prevents irrelevant context pollution
- Mirrors human cognition (bookmarks vs. memorization)

**Example**: Claude Code writes targeted queries, stores results, uses `head`/`tail` to analyze data without loading full objects.

**Metadata signals**:
- File/folder names imply purpose
- Hierarchies suggest relationships
- Timestamps indicate relevance
- Naming conventions hint at usage

**Trade-off**: Slower than pre-computed retrieval; requires proper tool design and heuristics.

---

### Hybrid Retrieval

**When to use**: Balance between speed and freshness; known stable context plus dynamic exploration.

**How it works**:
- Pre-load stable, high-signal information upfront
- Provide tools for runtime exploration of dynamic content
- Let agent decide when to explore further

**Decision boundary**:
- **Pre-load**: Stable documentation, core instructions, critical context
- **JIT retrieve**: User data, dynamic content, exploratory information

**Example**: Claude Code loads CLAUDE.md files upfront, uses glob/grep for runtime file discovery.

---

### Embedding-Based Retrieval (Pre-Inference)

**When to use**: Known query patterns, static knowledge bases, speed-critical applications.

**How it works**:
- Pre-process data into embeddings
- Retrieve relevant chunks before inference
- Surface context upfront for model reasoning

**Advantages**:
- Fast retrieval
- Works well for FAQ/knowledge base scenarios

**Limitations**:
- Risk of stale indexing
- May retrieve irrelevant context
- Requires periodic reindexing

**Best practice**: Augment with JIT retrieval for dynamic exploration when needed.

---

## Tool Design Patterns

### Minimal Viable Toolset

**Principle**: Provide smallest set of tools with no functional overlap.

**Guidelines**:
- Each tool should have clear, unambiguous purpose
- If humans can't definitively choose which tool to use, neither can AI
- Self-contained tools with robust error handling
- Clear input parameters playing to model strengths

**Anti-pattern**: Bloated toolsets covering too much functionality or creating ambiguous decision points.

---

### Token-Efficient Returns

**Principle**: Tools should return minimal high-signal information.

**Strategies**:
- Return summaries rather than full data when possible
- Provide pagination for large result sets
- Enable filtering at tool level rather than post-processing
- Use structured outputs (JSON) for efficient parsing

**Example**: Instead of returning entire file, return line count + option to read specific ranges.

---

### Progressive Tool Disclosure

**Pattern**: Tools that reveal information in layers.

**Implementation**:
- List/summary operations (overview)
- Detail operations (focused inspection)
- Deep-dive operations (comprehensive analysis)

**Example sequence**:
1. `list_files(directory)` → file names + sizes
2. `get_file_metadata(file)` → structure, imports, exports
3. `read_file(file, lines)` → specific content

---

### Tool Result Clearing

**Pattern**: Clear tool call history once results are processed.

**When to use**: Deep in message history, results no longer needed.

**Benefit**: Safest lightweight compaction approach - minimal risk of losing critical context.

**Implementation**: Many frameworks provide automatic tool result clearing after N turns.

---

## Memory & Persistence Patterns

### File-Based Memory

**Pattern**: Use file system as persistent memory outside context window.

**Operations**:
- Create/read/update/delete memory files
- Organize in meaningful directory structures
- Use file names as semantic identifiers

**Security considerations**:
- Restrict to specific directory (e.g., `/memories`)
- Validate paths against directory traversal
- Implement file size limits
- Set expiration policies

**Claude 4.5**: Memory tool provides this pattern with security safeguards.

---

### Structured vs. Unstructured Memory

**Structured (JSON, YAML)**:
- Schema-dependent information
- Tallies, metrics, objectives
- Configuration and state
- Easy to parse and validate

**Unstructured (Markdown, Text)**:
- Progress notes and exploration
- Strategic insights
- Context summaries
- Human-readable documentation

**Best practice**: Use both - structured for precision, unstructured for flexibility.

---

### Memory Expiration Strategies

**Time-based**:
- Delete after fixed duration
- Archive old memories
- Keep only recent N items

**Relevance-based**:
- Score memory importance
- Prune low-relevance items
- Maintain high-signal memories

**Capacity-based**:
- Limit total memory size
- FIFO or LRU eviction
- Compress old memories

---

## Multi-Agent Patterns

### Sub-Agent Architecture

**When to use**: Complex research/analysis, parallel exploration, separation of concerns.

**How it works**:
- Main agent coordinates with high-level plan
- Specialized sub-agents handle focused tasks
- Each sub-agent explores extensively (tens of thousands of tokens)
- Sub-agents return condensed summaries (1-2K tokens)

**Benefits**:
- Clean separation: detailed context isolated in sub-agents
- Lead agent focuses on synthesis and analysis
- Parallel exploration pays dividends

**Example**: Research system with sub-agents for different information sources, each doing deep exploration, returning distilled findings.

---

### Specialist Agent Pattern

**Pattern**: Different agents optimized for different tasks.

**Specializations**:
- Research agents (exploration, hypothesis development)
- Coding agents (implementation, debugging)
- Analysis agents (data processing, insights)
- Coordination agents (task planning, delegation)

**Communication**: Agents pass condensed summaries, not full context.

---

## Prompt Structuring Patterns

### Sectioned Prompts

**Pattern**: Organize prompts into distinct sections using XML or Markdown.

**Recommended sections**:
```xml
<background_information>
  <!-- High-level context, domain knowledge -->
</background_information>

<instructions>
  <!-- Core behavioral guidance -->
</instructions>

<tool_guidance>
  <!-- When and how to use specific tools -->
</tool_guidance>

<output_format>
  <!-- Expected response structure -->
</output_format>

<examples>
  <!-- Canonical demonstrations -->
</examples>
```

**Benefits**:
- Clear information hierarchy
- Easy to navigate and update
- Explicit separation of concerns

---

### Long-Context Document Positioning

**Pattern**: Place lengthy documents (20K+ tokens) at beginning of prompt.

**Structure**:
```
<documents>
  <document>
    <source>File name or identifier</source>
    <document_content>
      [Actual content]
    </document_content>
  </document>
</documents>

<instructions>
  [Your task description]
</instructions>

<examples>
  [If needed]
</examples>
```

**Performance impact**: Can improve response quality by up to 30% for complex multi-document inputs.

---

### Grounding Technique

**Pattern**: Request quote extraction before main task.

**How it works**:
```
Before [main task], extract relevant quotes from the documents that
relate to [specific aspect]. Then use those quotes to [complete main task].
```

**Benefit**: Helps model "cut through noise" by focusing on directly relevant material.

---

### Minimal Examples Pattern

**Principle**: Curate diverse, canonical examples rather than exhaustive edge cases.

**Guidelines**:
- Choose examples representing different scenarios
- Avoid stuffing every possible edge case
- Ensure examples align with desired behaviors
- Remember: models pay close attention to examples

**Quality over quantity**: 3-5 strong examples > 20 edge cases.

---

## Choosing the Right Pattern

**For conversational continuity**: Use compaction
**For iterative development**: Use structured note-taking
**For multi-session work**: Use state checkpointing
**For dynamic content**: Use just-in-time retrieval
**For speed-critical static content**: Use embedding-based retrieval with JIT augmentation
**For complex research**: Use sub-agent architectures
**For long documents**: Use document positioning + grounding
**For cross-session memory**: Use file-based memory with structured/unstructured mix

**Hybrid approaches** are often most effective - combine patterns based on specific needs.
