/**
 * OpenAI Client for Commitment Analysis
 *
 * Uses GPT-5 Nano with structured outputs for real-time SMART validation
 * Issue #68: AI-Powered Commitment Validation
 */

import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'
import { commitmentAnalysisSchema, type CommitmentAnalysis } from '@/lib/schemas/commitments'

/**
 * System prompt for SMART commitment validation
 */
const SMART_VALIDATION_PROMPT = `You are an expert business coach analyzing commitments for measurability and quality.

Evaluate if this commitment follows SMART criteria:
- **Specific**: Clear, unambiguous goal (not vague like "work on X")
- **Measurable**: Quantifiable metrics or observable outcomes (numbers, percentages, completion states)
- **Achievable**: Realistic given business context (not impossible)
- **Relevant**: Business-focused (not personal tasks like "buy groceries")
- **Time-bound**: Has deadline or timeframe (explicit or implied)

Extract any dates mentioned. Handle natural language like:
- "next Friday" → calculate actual date
- "in 2 weeks" / "in 90 days" → calculate date from today (today + N days/weeks)
- "end of month" → last day of current month
- "tomorrow" → next day (today + 1)
- "this quarter" / "end of Q1" → end of current/specified quarter
- "by [date]" → use that specific date

IMPORTANT: For relative dates like "in X days", always calculate from today's date.
Example: If today is 2025-11-23 and commitment says "in 90 days", the date should be 2026-02-21.

Provide a measurability score (0-10):
- 0-3: Vague, no metrics ("improve product", "work on marketing")
- 4-6: Somewhat specific but missing quantification ("talk to investors", "hire someone")
- 7-8: Good specificity with metrics ("send 3 intros", "raise $100K")
- 9-10: Excellent SMART commitment ("hire first engineer by end of Q1, budget $120K")

If score < 7, provide ONE specific, actionable suggestion to make it measurable.

**Good Examples (8-10):**
✅ "Send 3 customer intros by Friday" (specific number + deadline)
✅ "Hire first engineer by end of Q1" (clear outcome + timeframe)
✅ "Reach $10K MRR this month" (quantifiable + deadline)
✅ "Complete MVP and ship to 5 beta users" (measurable outcome + quantity)

**Bad Examples (0-4) with Suggestions:**
❌ "Work on marketing" → "Create 5 LinkedIn posts by Friday"
❌ "Improve product" → "Ship 3 customer-requested features this sprint"
❌ "Talk to investors" → "Send pitch deck to 10 VCs by end of week"
❌ "Get more customers" → "Convert 5 demo calls to paid customers this month"

Analyze the commitment and return structured JSON with your evaluation.

Today's date: ${new Date().toISOString().split('T')[0]}`

/**
 * Analyze commitment using GPT-5 Nano
 *
 * Uses structured outputs to guarantee valid JSON response.
 * Configured for minimal reasoning and low verbosity for speed.
 *
 * @param apiKey - OpenAI API key
 * @param commitmentText - Text to analyze
 * @returns Analysis with SMART breakdown
 */
export async function analyzeCommitmentWithGPT5(
  apiKey: string,
  commitmentText: string
): Promise<CommitmentAnalysis> {
  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: "gpt-5-nano",
    reasoning_effort: "minimal",      // Fastest responses
    verbosity: "low",                 // Concise output
    max_completion_tokens: 200,       // Keep responses short (GPT-5 parameter)
    // Note: GPT-5 Nano only supports default temperature (1)
    messages: [
      {
        role: "system",
        content: SMART_VALIDATION_PROMPT
      },
      {
        role: "user",
        content: commitmentText
      }
    ],
    response_format: zodResponseFormat(commitmentAnalysisSchema, "commitment_analysis")
  })

  const content = response.choices[0].message.content
  if (!content) {
    throw new Error('No response from GPT-5 Nano')
  }

  // Structured outputs guarantee this is valid JSON matching our schema
  const analysis = JSON.parse(content) as CommitmentAnalysis
  return analysis
}

/**
 * Fallback heuristic analysis (simple rules-based)
 *
 * Used when AI Integration disabled or OpenAI unavailable.
 * Provides basic date extraction and measurability detection.
 *
 * @param text - Commitment text to analyze
 * @returns Basic analysis result
 */
export function analyzeWithHeuristics(text: string): CommitmentAnalysis {
  const lower = text.toLowerCase()
  let date: string | null = null

  // Simple date extraction using keywords
  const today = new Date()

  if (lower.includes('friday')) {
    const d = new Date(today)
    const daysUntilFriday = (5 + 7 - d.getDay()) % 7 || 7
    d.setDate(d.getDate() + daysUntilFriday)
    date = d.toISOString()
  } else if (lower.includes('tomorrow')) {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    date = d.toISOString()
  } else if (lower.includes('next week')) {
    const d = new Date(today)
    d.setDate(d.getDate() + 7)
    date = d.toISOString()
  } else if (lower.includes('end of month')) {
    const d = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    date = d.toISOString()
  }

  // Check for numbers (basic measurability heuristic)
  const hasNumber = /\d/.test(text)
  const isMeasurable = hasNumber
  const score = hasNumber ? 7 : 3

  return {
    extracted_date: date,
    is_measurable: isMeasurable,
    measurability_score: score,
    suggestion: isMeasurable
      ? null
      : "Try adding a number or specific metric to make it measurable.",
    is_duplicate: false,
    smart_criteria: {
      specific: text.length > 20,
      measurable: hasNumber,
      achievable: true, // Can't determine from text alone
      relevant: true,   // Assume business-relevant
      time_bound: date !== null
    }
  }
}

/**
 * Optional: Simple in-memory cache to prevent duplicate API calls
 * Cache results for 5 minutes
 */
const analysisCache = new Map<string, { result: CommitmentAnalysis, timestamp: number }>()
const CACHE_TTL = 300000 // 5 minutes

/**
 * Analyze commitment with caching layer
 *
 * Checks cache first to avoid duplicate API calls for identical text.
 * Useful when user re-types the same commitment.
 *
 * @param apiKey - OpenAI API key
 * @param commitmentText - Text to analyze
 * @returns Cached or fresh analysis
 */
export async function analyzeCommitmentWithCache(
  apiKey: string,
  commitmentText: string
): Promise<CommitmentAnalysis> {
  // Normalize text for cache key
  const cacheKey = commitmentText.trim().toLowerCase()
  const cached = analysisCache.get(cacheKey)

  // Return cached result if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result
  }

  // Call GPT-5 Nano
  const analysis = await analyzeCommitmentWithGPT5(apiKey, commitmentText)

  // Cache the result
  analysisCache.set(cacheKey, {
    result: analysis,
    timestamp: Date.now()
  })

  // Cleanup old cache entries (simple LRU)
  if (analysisCache.size > 100) {
    const oldestKey = analysisCache.keys().next().value
    if (oldestKey) {
      analysisCache.delete(oldestKey)
    }
  }

  return analysis
}
