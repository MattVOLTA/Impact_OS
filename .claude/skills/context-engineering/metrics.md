# Context Engineering Metrics

This reference provides quantitative approaches for measuring context effectiveness and identifying optimization opportunities.

## Table of Contents

1. [Token Efficiency Metrics](#token-efficiency-metrics)
2. [Context Utilization Metrics](#context-utilization-metrics)
3. [Performance Metrics](#performance-metrics)
4. [Quality Metrics](#quality-metrics)
5. [System Health Metrics](#system-health-metrics)

---

## Token Efficiency Metrics

### Context Window Utilization

**What to measure**:
```
Utilization Rate = (Tokens Used) / (Total Context Window)
```

**Healthy ranges**:
- **< 50%**: Efficient, plenty of headroom
- **50-75%**: Moderate usage, monitor growth
- **75-90%**: High usage, consider compaction
- **> 90%**: Critical, immediate optimization needed

**Claude 4.5 Sonnet**: 200K standard, 1M beta

**Investigation triggers**:
- Utilization > 75% early in conversation
- Rapid growth rate (>10% per turn)
- Consistent high utilization across sessions

---

### Token Distribution

**What to measure**: Percentage of tokens allocated to each component.

**Typical healthy distribution**:
```
System Prompt:        5-15%
Tool Definitions:     5-10%
Message History:      30-50%
Tool Results:         20-30%
Retrieved Context:    10-20%
User Input:           5-10%
```

**Red flags**:
- Tool results > 40% (consider clearing old results)
- Retrieved context > 30% (over-retrieval likely)
- System prompt > 20% (may be too detailed)
- Message history > 60% (compaction needed)

**How to analyze**:
```python
def analyze_token_distribution(context):
    components = {
        'system_prompt': count_tokens(context.system),
        'tools': count_tokens(context.tool_definitions),
        'messages': count_tokens(context.messages),
        'tool_results': count_tokens(extract_tool_results(context)),
        'retrieved': count_tokens(extract_retrieved_content(context)),
        'user_input': count_tokens(context.latest_user_message)
    }

    total = sum(components.values())
    return {k: (v/total)*100 for k, v in components.items()}
```

---

### Tool Return Efficiency

**What to measure**:
```
Return Efficiency = (Utilized Tokens) / (Total Tokens Returned)
```

**How to assess utilization**:
- Tokens referenced in subsequent reasoning
- Information used in final output
- Data that influenced decisions

**Healthy ranges**:
- **> 80%**: Highly efficient, minimal waste
- **50-80%**: Moderate efficiency, room for improvement
- **< 50%**: Inefficient, consider filtering/summarization

**Example investigation**:
```
Tool returned 5000 tokens (entire file)
Agent used 200 tokens (one function)
Efficiency: 4% ← Investigate pagination or targeted retrieval
```

---

### Retrieval Precision

**What to measure**:
```
Precision = (Relevant Retrieved Items) / (Total Retrieved Items)
```

**Evaluation approach**:
- Manual review: Did agent use this information?
- Automated: Does model reference retrieval in output?
- A/B test: Performance with vs. without each retrieved item

**Healthy targets**:
- **> 70%**: Excellent precision
- **40-70%**: Moderate, consider tuning
- **< 40%**: Poor precision, revisit retrieval strategy

---

## Context Utilization Metrics

### Information Density

**What to measure**:
```
Density = (Unique Semantic Units) / (Total Tokens)
```

**Semantic units**: Distinct facts, instructions, examples, or data points.

**Assessment approach**:
- Count unique statements in prompt/context
- Identify redundant or repetitive information
- Calculate ratio of unique to total content

**Red flags**:
- Repeated instructions across sections
- Duplicate examples
- Redundant tool results
- Same information in multiple formats

---

### Attention Distribution Quality

**What to measure**: How evenly or appropriately attention is distributed across context.

**Indicators of poor distribution**:
- Critical information buried in middle of large context
- Important details late in context (suffers from position bias)
- Excessive context before key instructions
- No structural markers to guide attention

**Optimization signals**:
- Position critical information at start or end
- Use XML tags or markdown headers for structure
- Apply grounding technique for long documents
- Limit context to truly necessary information

---

### Reference vs. Active Context

**What to measure**:
```
Active Ratio = (Actively Used Context) / (Total Context)
```

**Active context**: Information directly used in reasoning or output
**Reference context**: Information available but not used

**Healthy patterns**:
- Active ratio > 60% for short tasks
- Active ratio > 40% for exploratory tasks
- Reference context provides "just in case" coverage

**Optimization opportunity** (if ratio < 40%):
- Move reference material to JIT retrieval
- Use sub-agents for deep dives
- Provide identifiers instead of full content

---

## Performance Metrics

### Task Completion Rate

**What to measure**:
```
Completion Rate = (Successfully Completed Tasks) / (Total Tasks)
```

**Segment by context level**:
- Low context (< 50K tokens): Baseline performance
- Medium context (50K-100K tokens): Expected slight degradation
- High context (100K-200K tokens): Monitor for significant drops
- Extended context (> 200K tokens): Specialized handling needed

**Investigation triggers**:
- Completion rate drops > 15% at medium context
- Completion rate drops > 30% at high context
- Consistent failures on specific task types

---

### Response Quality vs. Context Size

**What to measure**: Quality degradation as context grows.

**Evaluation approach**:
```
For each task at different context levels:
1. Measure accuracy/correctness
2. Assess completeness
3. Check consistency
4. Evaluate relevance

Plot: Quality Score vs. Context Size
```

**Healthy pattern**: Gradual degradation, not cliff drop-off

**Warning signs**:
- Sharp quality drop at specific threshold
- Inconsistent behavior with same context size
- Missing critical information despite being in context

---

### Latency by Context Component

**What to measure**: Time impact of different context components.

**Breakdown**:
```
Total Latency =
  Prompt Processing Time +
  Retrieval Time +
  Tool Execution Time +
  Generation Time
```

**Optimization targets**:
- Retrieval < 20% of total latency
- Tool execution < 30% of total latency
- Generation time proportional to output length

**Investigation triggers**:
- Retrieval time > 30% (consider caching or indexing)
- Tool execution dominating (async execution? optimization?)
- Disproportionate prompt processing (size reduction needed?)

---

### Cost Efficiency

**What to measure**:
```
Cost per Task = (Total Tokens * Price per Token) / Tasks Completed
```

**Claude 4.5 Sonnet pricing**:
- Input: $3 per million tokens
- Output: $15 per million tokens

**Optimization levers**:
- Reduce input context (biggest impact on cost)
- Use prompt caching for repeated content
- Clear tool results aggressively
- Implement compaction for long tasks

**Example calculation**:
```
Task uses average 50K input, 2K output tokens
Input cost:  50K * $3/1M = $0.15
Output cost: 2K * $15/1M = $0.03
Total: $0.18 per task

If compaction reduces to 30K input:
New cost: $0.12 per task
Savings: 33%
```

---

## Quality Metrics

### Context Relevance Score

**What to measure**: How relevant context is to the task.

**Evaluation method** (using LLM grading):
```
Prompt to grading model:
"On a scale of 1-5, rate how relevant this context is to completing
the task. Consider:
- Is information directly applicable?
- Is there irrelevant or distracting content?
- Is critical information present?"

1 = Mostly irrelevant
2 = Some relevance, much noise
3 = Moderately relevant
4 = Highly relevant, minimal noise
5 = Perfectly curated, all high-signal
```

**Target**: Average score > 4.0

**Investigation triggers**:
- Score < 3.5 consistently
- High variance in scores (inconsistent curation)
- Specific context types scoring low

---

### Information Recall Accuracy

**What to measure**: Can the model accurately recall information from context?

**Test approach**:
```
1. Place specific facts at different positions in context
2. Ask model to recall or use those facts
3. Measure accuracy by position

Positions to test:
- Beginning (0-10% of context)
- Early middle (10-30%)
- Middle (30-70%)
- Late middle (70-90%)
- End (90-100%)
```

**Healthy pattern**: < 10% accuracy drop across positions

**Warning signs**:
- > 30% drop in middle positions (context rot)
- Poor end recall (recency bias failure)
- Inconsistent recall patterns

---

### Output Consistency

**What to measure**: Consistency of outputs given same input at different context levels.

**Test approach**:
```
Same prompt with:
- Minimal context
- Medium context (+ 50K irrelevant)
- High context (+ 100K irrelevant)

Measure output similarity (semantic, structural)
```

**Target**: > 90% consistency across context levels

**Investigation triggers**:
- Significant output variation (attention dilution)
- Errors appearing at higher context levels
- Different conclusions from same information

---

## System Health Metrics

### Context Growth Rate

**What to measure**:
```
Growth Rate = Δ(Context Size) / Δ(Turns)
```

**Healthy patterns**:
- Linear growth: Sustainable with compaction
- Sublinear growth: Tool result clearing working
- Logarithmic growth: Excellent management

**Warning patterns**:
- Superlinear growth: Compaction needed urgently
- Exponential growth: Fundamental design issue

**Example analysis**:
```
Turn 1: 5K tokens
Turn 5: 25K tokens → 5K/turn (linear)
Turn 10: 75K tokens → 7.5K/turn (accelerating)
Turn 15: 150K tokens → 10K/turn (unsustainable)
```

---

### Compaction Effectiveness

**What to measure** (when compaction is used):
```
Compression Ratio = (Original Size) / (Compacted Size)

Information Retention = (Critical Info Preserved) / (Original Critical Info)
```

**Healthy targets**:
- Compression ratio: 3:1 to 10:1
- Information retention: > 95% of critical details

**Red flags**:
- Low compression (< 2:1): Compaction prompt may be too conservative
- Low retention (< 90%): Compaction prompt too aggressive
- Frequent need to re-ask questions: Details lost in compaction

---

### Memory System Utilization

**What to measure** (when using memory tools):
```
Memory Hit Rate = (Successful Retrievals) / (Total Retrieval Attempts)

Memory Relevance = (Used Memories) / (Retrieved Memories)
```

**Healthy patterns**:
- Hit rate > 80% (memory exists when needed)
- Relevance > 70% (retrieved memory is useful)

**Investigation triggers**:
- Low hit rate: Memory not being written consistently
- Low relevance: Over-broad retrieval, poor organization
- High memory churn: No persistence or poor expiration policy

---

## Measurement Implementation

### Automated Tracking

**Implement logging**:
```python
class ContextMetrics:
    def log_interaction(self, context_state):
        return {
            'timestamp': now(),
            'total_tokens': count_tokens(context_state),
            'component_breakdown': analyze_distribution(context_state),
            'utilization_rate': calculate_utilization(context_state),
            'tool_efficiency': measure_tool_returns(context_state),
            'growth_rate': calculate_growth(context_state)
        }
```

**Dashboard metrics**:
- Real-time context utilization
- Token distribution charts
- Growth rate trends
- Quality score over time
- Cost tracking

---

### Evaluation Cadence

**Continuous monitoring**:
- Context utilization (every interaction)
- Token distribution (every interaction)
- Growth rate (every interaction)

**Periodic evaluation**:
- Quality metrics (weekly or per deployment)
- Performance benchmarks (bi-weekly)
- Cost analysis (monthly)

**Triggered evaluation**:
- After major changes to prompts/tools
- When performance degrades unexpectedly
- Before scaling to production

---

## Optimization Decision Framework

**Use metrics to prioritize optimizations**:

1. **High impact, low effort**:
   - Clear old tool results
   - Adjust document positioning
   - Remove redundant examples

2. **High impact, medium effort**:
   - Implement compaction
   - Add tool result filtering
   - Tune retrieval precision

3. **High impact, high effort**:
   - Migrate to multi-agent architecture
   - Build custom memory system
   - Redesign tool ecosystem

4. **Low impact**:
   - Deprioritize unless aligned with other goals

**Remember**: Measure before and after changes to validate improvements.
