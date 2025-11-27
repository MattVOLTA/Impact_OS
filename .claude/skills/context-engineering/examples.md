# Context Engineering Evaluation Examples

This reference demonstrates how to evaluate context engineering across different scenarios.

## Table of Contents

1. [Agent with Bloated Toolset](#example-1-agent-with-bloated-toolset)
2. [Prompt with Wrong Altitude](#example-2-prompt-with-wrong-altitude)
3. [Inefficient Retrieval Strategy](#example-3-inefficient-retrieval-strategy)
4. [Long-Horizon Task Without State Management](#example-4-long-horizon-task-without-state-management)
5. [Multi-Agent vs. Single-Agent Architecture](#example-5-multi-agent-vs-single-agent-architecture)
6. [Memory System Evaluation](#example-6-memory-system-evaluation)

---

## Example 1: Agent with Bloated Toolset

### Scenario

A coding agent has 23 different tools for file operations and code analysis.

### Discovery Interview

**Q**: What are you evaluating?
**A**: Tool ecosystem for a coding agent

**Q**: What's the current challenge?
**A**: Agent frequently uses wrong tools or asks for clarification about which tool to use

**Q**: What output format would be useful?
**A**: Prioritized recommendations with specific consolidation suggestions

### Analysis

**Token distribution analysis**:
```
System Prompt:        8%
Tool Definitions:     28% ← Red flag (should be 5-10%)
Message History:      45%
Tool Results:         15%
User Input:           4%
```

**Tool overlap investigation**:

Identified clusters with functional overlap:
1. File reading: `read_file`, `read_text_file`, `get_file_content`, `load_file`, `cat_file`
2. File search: `find_files`, `search_files`, `glob_files`, `locate_files`
3. Code analysis: `analyze_function`, `get_function_info`, `inspect_function`, `parse_function`

**Anti-pattern identified**: Tool bloat (anti-patterns.md → Tool Design Problems)

**Metrics**:
- Tool definition overhead: 28% of context (target: <10%)
- Decision complexity: 5 tools per common operation
- Agent confusion rate: ~30% of tool calls require clarification

### Recommendations

**High Impact (Immediate)**:

1. **Consolidate file reading** → Single `read_file` tool with parameters:
   ```json
   {
     "name": "read_file",
     "parameters": {
       "path": "File path",
       "lines": "Optional: specific line range",
       "format": "text|json|binary"
     }
   }
   ```
   **Impact**: Reduces 5 tools to 1, saves ~8% context

2. **Consolidate file search** → Single `find_files` with glob patterns:
   ```json
   {
     "name": "find_files",
     "parameters": {
       "pattern": "Glob pattern (e.g., **/*.py)",
       "path": "Optional: search root"
     }
   }
   ```
   **Impact**: Reduces 4 tools to 1, saves ~6% context

3. **Consolidate code analysis** → Single `analyze_code` tool:
   ```json
   {
     "name": "analyze_code",
     "parameters": {
       "file": "File to analyze",
       "scope": "file|function|class",
       "name": "Optional: specific function/class name"
     }
   }
   ```
   **Impact**: Reduces 4 tools to 1, saves ~6% context

**Expected results**:
- Tool definitions: 28% → ~8% context (20% savings)
- Decision clarity: 5 options → 1 option per operation
- Reduced agent confusion and faster decision-making

**Implementation effort**: Medium (2-3 days to consolidate and test)

---

## Example 2: Prompt with Wrong Altitude

### Scenario

Customer support agent has 5,000-token system prompt with detailed branching logic.

### Discovery Interview

**Q**: What's the current challenge?
**A**: Frequent prompt updates needed when new edge cases discovered; agent behavior is brittle

**Q**: What are you evaluating?
**A**: System prompt design

**Q**: What output would be useful?
**A**: Specific rewrite suggestions with examples

### Analysis

**Current prompt excerpt**:
```
If customer asks about refund:
  If purchase was within 30 days:
    If product is in original condition:
      Offer full refund
    Else if product shows minor wear:
      Offer 50% refund
    Else:
      Deny refund, offer store credit
  Else if purchase was within 60 days:
    [... 50 more lines of conditions ...]
```

**Anti-pattern identified**: Wrong altitude - too specific (anti-patterns.md → Prompt Design Issues)

**Problems**:
- Hardcoded business logic that should be dynamic
- Brittle to variations in customer requests
- High maintenance burden
- 5,000 tokens for what should be principles

### Recommendations

**High Impact (Immediate)**:

**Replace conditional logic with principles**:

```xml
<refund_policy_principles>
When evaluating refund requests, consider:

1. Purchase timing: Recent purchases (< 30 days) receive priority consideration
2. Product condition: Original condition enables full refunds; wear affects eligibility
3. Customer history: Long-term customers receive benefit of doubt
4. Replacement option: Offer replacements before store credit before refunds

Decision framework:
- Gather: purchase date, condition, customer history
- Evaluate: which policy applies based on factors
- Offer: best available option with clear explanation
- Escalate: if outside standard parameters or customer requests
</refund_policy_principles>

<refund_examples>
Example 1 - Clear case:
Customer: "I want to return this shirt, bought it 2 weeks ago, never worn"
Analysis: Within window, original condition
Action: Offer full refund

Example 2 - Nuanced case:
Customer: "This has a defect, bought 45 days ago"
Analysis: Outside standard window, but defect claim
Action: Inspect product, likely offer replacement or refund despite timing

Example 3 - Edge case:
Customer: "I've changed my mind about this opened software, 5 days ago"
Analysis: Recent purchase, but opened software has different policy
Action: Check software return policy, likely offer store credit
</refund_examples>
```

**Impact**:
- Token reduction: 5,000 → ~800 tokens (84% reduction)
- Maintainability: Principles stay stable, edge cases handled by reasoning
- Flexibility: Handles variations without prompt updates
- Altitude: Right level of guidance without brittleness

**Expected results**:
- More consistent handling of novel situations
- Less frequent prompt updates
- Better generalization to edge cases
- Faster inference (smaller prompt)

**Implementation effort**: Low (1 day to rewrite and test)

---

## Example 3: Inefficient Retrieval Strategy

### Scenario

Research assistant pre-retrieves 50K tokens of embedded content, but only uses 10-15% of it.

### Discovery Interview

**Q**: What's the current challenge?
**A**: Slow response times and agent sometimes misses relevant information

**Q**: What are you evaluating?
**A**: Retrieval strategy for research tasks

**Q**: What output would be useful?
**A**: Comparative analysis of current vs. optimized approach with implementation guidance

### Analysis

**Current approach**:
1. User asks research question
2. Embed query, retrieve top 50 chunks
3. Load all 50 chunks into context (~50K tokens)
4. Agent reasons over all content
5. Returns answer

**Metrics measured**:
- Retrieval precision: 12% (only 6 of 50 chunks used)
- Context utilization: 15% (most content ignored)
- Average latency: 8 seconds
- Token efficiency: 50K input for 2K output

**Anti-patterns identified**:
- Over-retrieval (anti-patterns.md → Retrieval Strategy Inefficiencies)
- Irrelevant context accumulation (anti-patterns.md → Context Pollution)

**Pattern applicable**: Hybrid retrieval (patterns.md → Retrieval Patterns)

### Recommendations

**High Impact (Immediate)**:

**Implement progressive retrieval**:

```
Phase 1 - Lightweight retrieval:
1. Embed query
2. Retrieve top 10 chunk metadata (titles, sources, snippets)
3. Present to agent: "These sources seem relevant. Which should I fetch?"
4. Agent selects 2-5 most promising

Phase 2 - Targeted deep dive:
5. Retrieve full content for selected chunks only
6. Agent analyzes in detail
7. If needed: "Should I retrieve additional sources?"

Phase 3 - Just-in-time expansion:
8. Agent can request specific additional sources by name
9. Progressive disclosure of detail as needed
```

**Implementation**:
```python
class ProgressiveRetriever:
    def retrieve_lightweight(self, query, top_k=10):
        """Return metadata only"""
        embeddings = self.embed(query)
        results = self.vector_db.search(embeddings, top_k)
        return [
            {
                'id': r.id,
                'title': r.title,
                'source': r.source,
                'snippet': r.text[:200],
                'relevance_score': r.score
            }
            for r in results
        ]

    def retrieve_full(self, document_ids):
        """Fetch full content for selected IDs"""
        return self.vector_db.get_by_ids(document_ids)
```

**Tool design**:
```json
{
  "name": "search_sources",
  "description": "Get lightweight metadata for potentially relevant sources",
  "parameters": {
    "query": "Research query",
    "limit": "Number of results (default: 10)"
  }
},
{
  "name": "fetch_source",
  "description": "Retrieve full content for a specific source by ID",
  "parameters": {
    "source_id": "ID from search results",
    "sections": "Optional: specific sections to retrieve"
  }
}
```

**Expected results**:

| Metric | Current | Optimized | Improvement |
|--------|---------|-----------|-------------|
| Avg tokens loaded | 50K | 12K | 76% reduction |
| Retrieval precision | 12% | 65% | 5.4x increase |
| Avg latency | 8s | 4s | 50% faster |
| Context utilization | 15% | 70% | 4.7x increase |

**Trade-offs**:
- Additional tool call round-trips (adds ~0.5s)
- Agent must reason about source selection (minimal overhead with good metadata)
- More complex implementation (moderate effort)

**Implementation effort**: Medium (3-5 days including testing)

---

## Example 4: Long-Horizon Task Without State Management

### Scenario

Coding agent working on multi-hour refactoring project loses context and forgets decisions.

### Discovery Interview

**Q**: What's the current challenge?
**A**: Agent makes inconsistent decisions in long sessions, sometimes contradicting earlier choices

**Q**: What are you evaluating?
**A**: Long-horizon task handling for extended coding sessions

**Q**: What output would be useful?
**A**: Specific implementation plan for state persistence

### Analysis

**Current behavior**:
- Session starts with clear context
- After ~20 file edits, context fills
- Agent starts losing track of architectural decisions
- Inconsistencies appear: naming conventions vary, patterns differ
- Eventually hits context limit and fails

**Metrics**:
- Context growth rate: 8K tokens/turn (unsustainable)
- Consistency degradation: 15% error rate after turn 15
- Task completion: Fails on tasks requiring > 25 turns

**Anti-patterns identified**:
- No cross-session persistence (anti-patterns.md → Memory & State)
- No compaction strategy (anti-patterns.md → Architecture Smells)

**Patterns applicable**:
- Structured note-taking (patterns.md → Long-Horizon Task Patterns)
- State checkpointing (patterns.md → Long-Horizon Task Patterns)
- Compaction (patterns.md → Long-Horizon Task Patterns)

### Recommendations

**High Impact (Multi-phase implementation)**:

**Phase 1: Structured note-taking (Immediate)**

Introduce architectural decision record:

```json
// .ai/architecture.json
{
  "naming_conventions": {
    "components": "PascalCase, ends with 'Component'",
    "hooks": "camelCase, starts with 'use'",
    "utilities": "camelCase, descriptive verb"
  },
  "patterns": {
    "state_management": "Context API with hooks",
    "file_structure": "Feature-based folders",
    "error_handling": "Error boundaries at route level"
  },
  "completed": [
    "Refactored authentication module",
    "Updated user profile components",
    "Migrated to new state pattern"
  ],
  "in_progress": {
    "task": "Refactoring dashboard components",
    "current_file": "src/dashboard/Overview.tsx",
    "next_steps": [
      "Update remaining dashboard widgets",
      "Add error boundaries",
      "Write tests"
    ]
  }
}
```

**Tool for managing state**:
```json
{
  "name": "update_architecture_notes",
  "description": "Update architectural decisions and progress tracking",
  "parameters": {
    "section": "naming_conventions|patterns|completed|in_progress",
    "updates": "JSON object with updates to merge"
  }
}
```

**Impact**:
- Agent can reference decisions consistently
- Progress tracked across sessions
- Reduced cognitive load (externalized memory)

---

**Phase 2: State checkpointing (Week 1)**

Implement git-based checkpoints:

```xml
<checkpoint_strategy>
After each significant unit of work:
1. Commit changes with descriptive message
2. Update architecture.json with completion
3. Tag major milestones
4. Use commit history as recovery mechanism

Checkpoint frequency:
- After each file/module completion
- Before major architectural changes
- Every 10 turns in long sessions
</checkpoint_strategy>
```

**Impact**:
- Reliable state recovery
- Clear history of decisions
- Can resume after context resets

---

**Phase 3: Compaction (Week 2)**

Implement context compaction at 75% utilization:

```python
def compact_context(message_history):
    """Summarize conversation while preserving critical details"""

    # Keep recent (last 5 turns)
    recent = message_history[-5:]

    # Summarize older history
    older = message_history[:-5]
    summary = model.create_summary(
        older,
        preserve=[
            "Architectural decisions",
            "Unresolved issues or bugs",
            "Implementation details for in-progress work",
            "User requirements and constraints"
        ]
    )

    # Return compacted context
    return [summary] + recent
```

**Trigger**: When context utilization > 75%

**Impact**:
- Extends working session indefinitely
- Maintains critical context
- Reduces token costs

---

**Expected results**:

| Metric | Current | With Notes | + Checkpoints | + Compaction |
|--------|---------|------------|---------------|--------------|
| Sustainable turns | 25 | 50 | 50 | Unlimited |
| Consistency rate | 85% | 95% | 95% | 92% |
| Session resume | No | Yes | Yes | Yes |
| Context growth | 8K/turn | 6K/turn | 6K/turn | Managed |

**Implementation effort**:
- Phase 1: Low (1-2 days)
- Phase 2: Low (1 day)
- Phase 3: Medium (3-4 days)

---

## Example 5: Multi-Agent vs. Single-Agent Architecture

### Scenario

Research assistant doing comprehensive market analysis struggles with context management.

### Discovery Interview

**Q**: What's the current challenge?
**A**: Single agent gets overwhelmed with information from multiple sources and loses focus

**Q**: What are you evaluating?
**A**: Whether to switch to multi-agent architecture

**Q**: What output would be useful?
**A**: Comparative analysis with architecture recommendation and migration path

### Analysis

**Current single-agent approach**:
```
User asks: "Analyze competitive landscape for AI coding tools"

Agent workflow:
1. Search web for competitor info (20K tokens)
2. Analyze GitHub repositories (30K tokens)
3. Research pricing models (15K tokens)
4. Gather user reviews (25K tokens)
5. Synthesize findings (context: 90K tokens)
```

**Observed problems**:
- Context fills with diverse content types
- Agent context-switches between research modes
- Synthesis quality degrades at high token counts
- Difficult to maintain focus on specific aspects

**Metrics**:
- Context utilization at synthesis: 90K tokens (45% of 200K window)
- Recall accuracy: 65% (should be > 80%)
- Task completion time: 12 minutes
- Synthesis quality score: 3.2/5.0

**Pattern applicable**: Sub-agent architecture (patterns.md → Multi-Agent Patterns)

### Recommendations

**Comparative Analysis**:

**Option A: Optimized Single-Agent**

Improvements:
- Use compaction after each research phase
- Implement progressive retrieval
- Use structured note-taking

Expected results:
- Context: ~60K tokens (33% improvement)
- Recall: ~75% (moderate improvement)
- Time: ~10 minutes (17% faster)
- Quality: ~3.8/5.0 (moderate improvement)

Effort: Low-medium (1 week)

---

**Option B: Multi-Agent Architecture**

Proposed architecture:
```
Coordinator Agent (main)
├── Web Research Sub-agent
│   └── Searches, summarizes web sources
│   └── Returns: 2K token summary
├── Code Analysis Sub-agent
│   └── Analyzes repositories
│   └── Returns: 2K token summary
├── Pricing Research Sub-agent
│   └── Gathers pricing data
│   └── Returns: 1K token structured data
└── Review Analysis Sub-agent
    └── Aggregates user reviews
    └── Returns: 2K token summary

Coordinator receives: 7K tokens total
Coordinator synthesizes with full context to findings
```

**Implementation**:
```python
class ResearchCoordinator:
    def __init__(self):
        self.sub_agents = {
            'web': WebResearchAgent(),
            'code': CodeAnalysisAgent(),
            'pricing': PricingResearchAgent(),
            'reviews': ReviewAnalysisAgent()
        }

    async def research(self, query):
        # Parallel sub-agent execution
        results = await asyncio.gather(
            self.sub_agents['web'].research(query),
            self.sub_agents['code'].analyze(query),
            self.sub_agents['pricing'].gather(query),
            self.sub_agents['reviews'].analyze(query)
        )

        # Coordinator synthesizes condensed findings
        synthesis = await self.synthesize(results)
        return synthesis

class WebResearchAgent:
    async def research(self, query):
        # Deep exploration (can use 50K tokens internally)
        findings = await self.explore(query)

        # Return condensed summary only
        return self.summarize(findings, max_tokens=2000)
```

Expected results:
- Coordinator context: ~7K tokens (92% improvement)
- Recall: ~95% (clean separation = clear focus)
- Time: ~8 minutes (33% faster via parallelization)
- Quality: ~4.7/5.0 (significant improvement)

Effort: High (3-4 weeks)

---

**Recommendation: Multi-Agent Architecture**

**Rationale**:
1. **Quality improvement**: 3.2 → 4.7 (47% increase) justifies investment
2. **Scalability**: Easy to add new research dimensions (new sub-agents)
3. **Clarity**: Clean separation of concerns improves maintainability
4. **Context efficiency**: 92% reduction in coordinator context enables richer synthesis

**Migration path**:
1. Week 1: Build coordinator framework
2. Week 2: Implement web & code sub-agents (highest value)
3. Week 3: Add pricing & review sub-agents
4. Week 4: Testing, optimization, parallel execution tuning

**Trade-offs accepted**:
- Higher implementation complexity
- More moving parts to maintain
- Potential for coordination overhead (mitigated by async execution)

---

## Example 6: Memory System Evaluation

### Scenario

Personal assistant agent has file-based memory but performance is inconsistent.

### Discovery Interview

**Q**: What's the current challenge?
**A**: Agent sometimes remembers context, sometimes forgets; memory seems unreliable

**Q**: What are you evaluating?
**A**: Memory system effectiveness

**Q**: What output would be useful?
**A**: Diagnostic report with specific fixes

### Analysis

**Current memory structure**:
```
/memories/
├── user_preferences.txt (unstructured, 3K tokens)
├── past_conversations.txt (unstructured, 15K tokens, growing)
├── notes.txt (unstructured, 8K tokens)
└── important_dates.txt (unstructured, 2K tokens)
```

**Metrics measured**:
- Memory hit rate: 45% (should be > 80%)
- Memory relevance: 55% (should be > 70%)
- Memory growth: Unbounded (no expiration)
- Retrieval accuracy: 60% (should be > 85%)

**Anti-patterns identified**:
- Unstructured memory for structured data (anti-patterns.md → Memory & State)
- Memory without cleanup (anti-patterns.md → Memory & State)
- Poor organization making retrieval difficult

### Recommendations

**High Impact (Immediate)**:

**1. Restructure memory with appropriate formats**

```
/memories/
├── user_profile.json          # Structured
├── preferences.json           # Structured
├── past_interactions/         # Organized by date
│   ├── 2025-01.md            # Monthly summaries
│   └── 2025-02.md
├── action_items.json          # Structured, active tasks
└── knowledge_base/            # Organized by topic
    ├── coding.md
    ├── research.md
    └── writing.md
```

**user_profile.json** (structured):
```json
{
  "name": "Matt",
  "role": "Developer",
  "timezone": "EST",
  "communication_style": "Direct, technical",
  "current_projects": [
    {
      "name": "BAI Metrics",
      "tech_stack": ["Next.js", "Supabase", "TypeScript"],
      "status": "Active development"
    }
  ],
  "preferences": {
    "code_style": "Functional, TypeScript, extensive documentation",
    "explanation_depth": "Intermediate-expert level",
    "format_preference": "Code examples with explanations"
  }
}
```

**action_items.json** (structured, with expiration):
```json
{
  "items": [
    {
      "id": "1",
      "description": "Review pull request #42",
      "created": "2025-02-15",
      "due": "2025-02-18",
      "status": "pending",
      "priority": "high"
    },
    {
      "id": "2",
      "description": "Research context engineering patterns",
      "created": "2025-02-14",
      "due": null,
      "status": "completed",
      "completed_date": "2025-02-15"
    }
  ]
}
```

**past_interactions/2025-02.md** (unstructured, auto-summarized):
```markdown
# February 2025 Interactions Summary

## Week 1 (Feb 1-7)
- Worked on BAI Metrics dashboard optimization
- Discussed Ignite connector improvements
- Implemented duplicate detection UI

## Week 2 (Feb 8-14)
- Created context engineering skill
- Researched Anthropic best practices
- Explored multi-agent architectures

## Key Insights
- Prefers high-freedom, principles-based approaches
- Values comprehensive documentation
- Focuses on maintainability over performance
```

---

**2. Implement expiration policy**

```python
class MemoryManager:
    def cleanup_policy(self):
        """Remove or archive old/irrelevant memories"""

        # Archive old monthly summaries (keep last 3 months)
        archive_summaries_older_than(months=3)

        # Remove completed action items older than 30 days
        remove_completed_items_older_than(days=30)

        # Compress knowledge base if > 50K tokens
        if knowledge_base_size() > 50000:
            summarize_oldest_entries()

    def relevance_scoring(self, memory_file):
        """Score memory relevance for retention"""
        score = 0

        # Recency (last accessed)
        days_since_access = days_since(memory_file.last_accessed)
        if days_since_access < 7:
            score += 10
        elif days_since_access < 30:
            score += 5

        # Frequency (access count in last 30 days)
        score += min(memory_file.access_count_30d, 10)

        # Explicit importance flag
        if memory_file.metadata.get('important'):
            score += 20

        return score
```

---

**3. Improve retrieval strategy**

```json
{
  "name": "recall_memory",
  "description": "Retrieve specific memory by category and optional filter",
  "parameters": {
    "category": "profile|preferences|interactions|actions|knowledge",
    "filter": "Optional: specific aspect (e.g., 'current_projects')",
    "date_range": "Optional: for interactions (e.g., '2025-02')"
  }
}
```

**Instead of**:
```
"Read all memory files to find information about user's coding preferences"
→ Loads 28K tokens, uses 200 tokens
```

**Use targeted retrieval**:
```
recall_memory(category="preferences", filter="code_style")
→ Loads 200 tokens, uses 200 tokens
```

---

**Expected results**:

| Metric | Current | Optimized | Improvement |
|--------|---------|-----------|-------------|
| Hit rate | 45% | 85% | 89% increase |
| Relevance | 55% | 80% | 45% increase |
| Avg memory loaded | 28K | 3K | 89% reduction |
| Retrieval accuracy | 60% | 90% | 50% increase |
| Memory growth | Unbounded | Managed | Sustainable |

**Implementation effort**: Medium (1 week to restructure and implement cleanup)

---

## Pattern Recognition Across Examples

### Common Themes

1. **Measure first**: All evaluations started with quantitative metrics
2. **Identify root cause**: Symptoms vs. underlying issues
3. **Reference patterns**: Applied documented patterns from reference files
4. **Consider trade-offs**: No silver bullet; every solution has costs
5. **Phased implementation**: Prioritize high-impact, low-effort improvements
6. **Validate improvements**: Define success metrics upfront

### Evaluation Methodology

```
1. Discovery: Understand context, challenges, desired outputs
2. Measurement: Gather quantitative data about current state
3. Pattern matching: Identify applicable patterns and anti-patterns
4. Analysis: Root cause identification with supporting evidence
5. Recommendation: Specific, actionable improvements with expected impact
6. Prioritization: Effort vs. impact trade-off analysis
```

This methodology applies across all context engineering evaluations, adapted to specific scenarios.
