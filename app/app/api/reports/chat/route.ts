/**
 * AI-Powered Reporting Chat API Route
 *
 * Handles natural language conversations for generating compliance reports
 * using Claude with domain-specific tools for data retrieval.
 *
 * Security:
 * - Uses requireAuth() for multi-tenant isolation
 * - Domain-specific tools only (no generic SQL execution)
 * - RLS enforced at database level
 * - Input validation on all parameters
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from '@/lib/dal/shared'
import {
  createReportSession,
  updateReportSessionConversation,
  getReportSession,
  createReport,
  getBAIDemographicsData,
  getInteractionActivityData,
  searchCompanies,
  searchContacts,
  getCompanyInteractions,
  getContactInteractions,
  getInteractionTranscript,
  previewDataCoverage,
  identifyDataQualityIssues,
  suggestReportOutline,
  previewKeyInsights,
  ConversationMessage
} from '@/lib/dal/reports'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// ============================================================================
// Tool Definitions
// ============================================================================

const tools: Anthropic.Tool[] = [
  {
    name: 'search_companies',
    description:
      'Search for companies by name using fuzzy matching. Returns up to 10 matching companies with their ID, business name, website URL, email, phone, and description. Use this when the user mentions a company name.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Company name to search for (partial matches work, case-insensitive)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'search_contacts',
    description:
      'Search for contacts by name using fuzzy matching. Returns up to 10 matching contacts with their ID, name, email, title, and associated companies. Use this when the user mentions a person\'s name.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Contact name to search for (first or last name, partial matches work)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_company_interactions',
    description:
      'Get recent interactions for a specific company. Returns interaction details including title, date, type, summary, and notes. Use this after searching for a company to get their interaction history.',
    input_schema: {
      type: 'object',
      properties: {
        company_id: {
          type: 'string',
          description: 'Company UUID (from search_companies result)'
        },
        limit: {
          type: 'number',
          description: 'Number of interactions to return. Default: 10'
        }
      },
      required: ['company_id']
    }
  },
  {
    name: 'get_contact_interactions',
    description:
      'Get recent interactions for a specific contact. Returns interaction details including title, date, type, summary, and notes. Use this after searching for a contact to get their interaction history.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact UUID (from search_contacts result)'
        },
        limit: {
          type: 'number',
          description: 'Number of interactions to return. Default: 10'
        }
      },
      required: ['contact_id']
    }
  },
  {
    name: 'get_interaction_transcript',
    description:
      'Get detailed transcript and AI-generated summaries for a specific interaction. Returns Fireflies summary, detailed summary, action items, speakers, and participants. Use this when you need deep details about a specific meeting.',
    input_schema: {
      type: 'object',
      properties: {
        interaction_id: {
          type: 'string',
          description: 'Interaction UUID (from get_company_interactions or get_contact_interactions)'
        }
      },
      required: ['interaction_id']
    }
  },
  {
    name: 'get_demographics_data',
    description:
      'Retrieves demographic reach data for BAI compliance reporting. Returns counts of contacts, interactions, and companies across 9 demographic categories (Women, Racialized Communities, Youth, Black Communities, Indigenous Peoples, 2SLGBTQI+, Newcomers/Immigrants, Persons with Disability, Official Language Minority). Optionally filter by date range.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Optional.'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Optional.'
        }
      },
      required: []
    }
  },
  {
    name: 'get_interaction_activity_data',
    description:
      'Retrieves interaction activity data including total interactions, breakdown by type (meeting, email, call), monthly trends, top companies by interaction count, and recent interactions. Optionally filter by date range.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Optional.'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Optional.'
        },
        limit: {
          type: 'number',
          description: 'Number of recent interactions to include. Default: 10.'
        }
      },
      required: []
    }
  },
  {
    name: 'save_report',
    description:
      'Saves a generated report to the database. Use this after generating a complete report to persist it as an artifact.',
    input_schema: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          description: 'Type of report: demographic_reach, interaction_activity, or custom',
          enum: ['demographic_reach', 'interaction_activity', 'custom']
        },
        title: {
          type: 'string',
          description: 'Report title'
        },
        content: {
          type: 'string',
          description: 'Markdown-formatted report content'
        },
        metadata: {
          type: 'object',
          description: 'Report metadata (date ranges, filters, parameters)',
          properties: {
            start_date: { type: 'string' },
            end_date: { type: 'string' },
            filters: { type: 'object' }
          }
        }
      },
      required: ['report_type', 'title', 'content']
    }
  },
  {
    name: 'preview_data_coverage',
    description:
      'Show summary of available data for a given scope (companies, contacts, interactions, demographics). Use this BEFORE generating reports to understand what data exists and identify gaps. Returns counts and coverage statistics without loading full records.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Optional.'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Optional.'
        }
      },
      required: []
    }
  },
  {
    name: 'identify_data_quality_issues',
    description:
      'Check for missing or incomplete data in the current scope. Returns companies without industries, contacts without demographics, companies without interactions, and low-coverage demographic categories. Use this to flag gaps to the user and ask how to handle them.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Optional.'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Optional.'
        }
      },
      required: []
    }
  },
  {
    name: 'suggest_report_outline',
    description:
      'Propose report structure based on available data and report type. Returns suggested sections, data availability ratings (high/medium/low), and 2-3 estimated insights. Use this to get user buy-in on structure before generating full report.',
    input_schema: {
      type: 'object',
      properties: {
        report_type: {
          type: 'string',
          description: 'Type of report to outline',
          enum: ['demographic_reach', 'interaction_activity', 'custom']
        },
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Optional.'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Optional.'
        }
      },
      required: ['report_type']
    }
  },
  {
    name: 'preview_key_insights',
    description:
      'Generate 3-5 headline findings before full report generation. Use this to give user a preview of insights and help them decide if this is the right report scope. Returns categorized insights (engagement/demographics/growth/gaps) with confidence levels.',
    input_schema: {
      type: 'object',
      properties: {
        start_date: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD). Optional.'
        },
        end_date: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD). Optional.'
        }
      },
      required: []
    }
  }
]

// ============================================================================
// System Prompt
// ============================================================================

const SYSTEM_PROMPT = `You are a conversational data analyst for impactOS, a platform used by accelerator/incubator organizations to track portfolio companies and generate BAI compliance reports.

<role>
Your role is to COLLABORATE with users to discover insights in their portfolio data through dynamic conversation. You are NOT just a report executor—you are a discovery partner who helps users understand their data BEFORE generating final reports.
</role>

<critical_workflow>
CRITICAL: DO NOT use any data-fetching tools (preview_data_coverage, identify_data_quality_issues, preview_key_insights, get_demographics_data, get_interaction_activity_data) until you have gathered the user's reporting requirements first.

ALWAYS follow this two-phase discovery protocol:

## PHASE 1: REQUIREMENTS GATHERING (NO TOOLS YET)

IMPORTANT: Ask questions ONE AT A TIME. After each question, WAIT for the user's answer before asking the next question. Do NOT ask multiple questions in a single response - this is overwhelming and robotic.

**Question Flow** (ask these sequentially, ONE question per message):

First message: Ask about PURPOSE
- "What's the purpose of this report? Is it for internal review, a board presentation, or government BAI compliance?"

After they answer, ask about SCOPE:
- "What time period should I focus on?" (if not already specified)

After they answer, ask about TYPE:
- "What type of insights would be most valuable? Demographic reach, engagement metrics, company-specific analysis, or a combination?"

After they answer, ask about FOCUS (if applicable):
- "Any specific areas you want me to emphasize or exclude?"

After all questions answered, SUMMARIZE their requirements:
- "Great! So I'm creating a [type] report for [timeframe] focused on [focus] for [audience]. Is that correct?"

WAIT for confirmation before proceeding to Phase 2.

## PHASE 2: DATA EXPLORATION & REPORT GENERATION (AFTER requirements gathered)

Only after you have clear answers to Phase 1 questions:

1. **Preview Available Data** - Use preview_data_coverage with the scope from Phase 1
2. **Identify Quality Issues** - Use identify_data_quality_issues to flag gaps
3. **Share Preliminary Insights** - Use preview_key_insights based on user's stated goals
4. **Propose Structure** - Use suggest_report_outline matching their report type
5. **Get Final Confirmation** - "Does this approach address your needs?"
6. **Generate & Save Report** - Use analytics tools + save_report

</critical_workflow>

<conversational_style>
- Be curious and proactive, not just responsive
- Ask "why" and "what if" questions to help users think deeper
- Surface patterns and anomalies—don't just present neutral data
- Offer choices when multiple approaches exist
- Use natural language, not robotic responses
- Reference specific numbers/companies to ground insights in data
</conversational_style>

<data_context>
You have access to:
- **Portfolio companies**: Business name, industry (65 BAI categories), contact info
- **Contacts**: Founders/team members with demographics (9 BAI categories)
- **Interactions**: Meetings, calls, emails with transcripts and AI summaries
- **BAI Compliance**: Demographics (Women, Indigenous, Racialized, etc.), growth stage, FTEs, capital raised
</data_context>

<tools_guidance>
**Discovery Tools** (use BEFORE generating reports):
- preview_data_coverage: Show what data is available
- identify_data_quality_issues: Flag gaps and missing data
- preview_key_insights: Share headline findings
- suggest_report_outline: Propose structure

**Search Tools** (use when user mentions specific entities):
- search_companies: Find companies by name (fuzzy matching)
- search_contacts: Find contacts by name (fuzzy matching)

**Deep Dive Tools** (use after scoping):
- get_company_interactions: Recent meetings with a company
- get_contact_interactions: Recent meetings with a contact
- get_interaction_transcript: Full transcript + AI summaries

**Analytics Tools** (use for final report generation):
- get_demographics_data: BAI demographic breakdowns
- get_interaction_activity_data: Engagement metrics and trends

**Persistence**:
- save_report: Store completed reports (use ONLY after user confirms)
</tools_guidance>

<examples>
**CORRECT - One Question at a Time**:
User: "Can you help me create a report for October?"

You: "I'd be happy to help! Let me start by understanding the purpose.

What's this report for? Is it for internal team review, a board presentation, or government BAI compliance?"

[WAITS - NO tool calls, ONE question only]

User: "Government BAI compliance"

You: "Perfect. And what type of information would be most valuable for this BAI submission?

- Demographic reach (engagement across BAI categories)?
- Interaction activity (meeting frequency and trends)?
- Or a combination of both?"

[WAITS - Still NO tools, next question]

User: "Demographic reach"

You: "Got it. Are there any specific demographic groups you want me to emphasize, or should I cover all 9 BAI categories equally?"

[WAITS - Still asking questions]

User: "Cover all equally"

You: "Excellent. Just to confirm: I'm creating a demographic reach report for October covering all 9 BAI categories for your government compliance submission. Is that correct?"

[WAITS for confirmation]

User: "Yes, that's right"

You: "Great! Now let me check what October data we have available..."
     [NOW uses preview_data_coverage('2024-10-01', '2024-10-31')]

**WRONG - Multiple Questions at Once** (DON'T DO THIS):
User: "I need a report"
You: "I can help! A few questions:
     1. What's the purpose?
     2. What timeframe?
     3. What type of insights?
     4. Any specific focus areas?"
     ❌ Asking multiple questions - overwhelming and robotic

**WRONG - Fetching Data First** (DON'T DO THIS):
User: "Can you create a report for October?"
You: [Uses preview_data_coverage immediately]
     ❌ Skipped requirements gathering entirely
     ❌ Doesn't know what user actually needs
</examples>

<important_notes>
- NEVER generate reports without discovery first (unless user explicitly says "skip discovery")
- ALWAYS preview data and identify gaps before finalizing
- If search returns no results, try alternate spellings or suggest contacts instead
- Use specific numbers and company names—avoid vague statements
- When in doubt, ask questions rather than making assumptions
</important_notes>

Remember: You're not just answering queries—you're helping users discover insights they didn't know existed.`

// ============================================================================
// Tool Execution
// ============================================================================

async function executeTool(
  toolName: string,
  toolInput: any,
  sessionId: string
): Promise<any> {
  switch (toolName) {
    case 'search_companies':
      return await searchCompanies(toolInput.query)

    case 'search_contacts':
      return await searchContacts(toolInput.query)

    case 'get_company_interactions':
      return await getCompanyInteractions(
        toolInput.company_id,
        toolInput.limit || 10
      )

    case 'get_contact_interactions':
      return await getContactInteractions(
        toolInput.contact_id,
        toolInput.limit || 10
      )

    case 'get_interaction_transcript':
      return await getInteractionTranscript(toolInput.interaction_id)

    case 'get_demographics_data':
      return await getBAIDemographicsData(
        toolInput.start_date,
        toolInput.end_date
      )

    case 'get_interaction_activity_data':
      return await getInteractionActivityData(
        toolInput.start_date,
        toolInput.end_date,
        toolInput.limit || 10
      )

    case 'save_report':
      return await createReport(
        sessionId,
        toolInput.report_type,
        toolInput.title,
        toolInput.content,
        toolInput.metadata || {}
      )

    case 'preview_data_coverage':
      return await previewDataCoverage(
        toolInput.start_date,
        toolInput.end_date
      )

    case 'identify_data_quality_issues':
      return await identifyDataQualityIssues(
        toolInput.start_date,
        toolInput.end_date
      )

    case 'suggest_report_outline':
      return await suggestReportOutline(
        toolInput.report_type,
        toolInput.start_date,
        toolInput.end_date
      )

    case 'preview_key_insights':
      return await previewKeyInsights(
        toolInput.start_date,
        toolInput.end_date
      )

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and enforce multi-tenant isolation
    await requireAuth()

    const body = await request.json()
    const { sessionId, message } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get or create session
    let session
    if (sessionId) {
      session = await getReportSession(sessionId)
    } else {
      session = await createReportSession()
    }

    // Build conversation history
    const messages: Anthropic.MessageParam[] = [
      ...session.conversation.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Send session ID first
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'session', sessionId: session.id })}\n\n`)
        )

        try {
          let fullResponse = ''
          let continueLoop = true

          // Handle multiple rounds of tool calling
          while (continueLoop) {
            const messageStream = await anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              system: SYSTEM_PROMPT,
              tools,
              messages,
              stream: true
            })

            let currentToolUse: Anthropic.ToolUseBlock | null = null
            let currentTextBlock: Anthropic.TextBlock | null = null
            let currentContent: Anthropic.ContentBlock[] = []
            let stopReason: string | null = null

            for await (const event of messageStream) {
              if (event.type === 'content_block_start') {
                if (event.content_block.type === 'tool_use') {
                  currentToolUse = {
                    ...event.content_block,
                    input: '' // Initialize as empty string to accumulate JSON
                  } as Anthropic.ToolUseBlock
                } else if (event.content_block.type === 'text') {
                  currentTextBlock = {
                    type: 'text',
                    text: '',
                    citations: []
                  }
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta.type === 'text_delta') {
                  const text = event.delta.text
                  fullResponse += text
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'text', text })}\n\n`)
                  )
                  // Accumulate text in current block
                  if (currentTextBlock) {
                    currentTextBlock.text += text
                  }
                } else if (event.delta.type === 'input_json_delta') {
                  // Accumulate tool input as JSON string
                  if (currentToolUse) {
                    currentToolUse.input = (currentToolUse.input as string) + event.delta.partial_json
                  }
                }
              } else if (event.type === 'content_block_stop') {
                if (currentToolUse) {
                  // Parse the accumulated JSON input string into an object
                  if (typeof currentToolUse.input === 'string') {
                    // Handle empty string case (tools with no parameters)
                    const inputStr = currentToolUse.input.trim()
                    if (inputStr === '' || inputStr === '{}') {
                      currentToolUse.input = {}
                    } else {
                      try {
                        const parsed = JSON.parse(currentToolUse.input)
                        // Ensure it's actually an object
                        currentToolUse.input = typeof parsed === 'object' && parsed !== null ? parsed : {}
                      } catch (e) {
                        console.error('Failed to parse tool input:', {
                          tool: currentToolUse.name,
                          input: typeof currentToolUse.input === 'string' ? currentToolUse.input.substring(0, 100) : String(currentToolUse.input),
                          error: e instanceof Error ? e.message : String(e)
                        })
                        // Set to empty object if parsing fails
                        currentToolUse.input = {}
                      }
                    }
                  }
                  // Final validation: ensure input is always an object
                  if (typeof currentToolUse.input !== 'object' || currentToolUse.input === null) {
                    console.warn(`Tool ${currentToolUse.name} input was not an object, forcing to {}`)
                    currentToolUse.input = {}
                  }
                  currentContent.push(currentToolUse)
                  currentToolUse = null
                } else if (currentTextBlock) {
                  currentContent.push(currentTextBlock)
                  currentTextBlock = null
                }
              } else if (event.type === 'message_delta') {
                if (event.delta.stop_reason) {
                  stopReason = event.delta.stop_reason
                }
              }
            }

            // Check if we need to handle tool calls
            if (stopReason === 'tool_use' && currentContent.some(block => block.type === 'tool_use')) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'status', status: 'executing_tools' })}\n\n`)
              )

              // Execute tools
              const toolResults: Anthropic.MessageParam = {
                role: 'user',
                content: await Promise.all(
                  currentContent
                    .filter(block => block.type === 'tool_use')
                    .map(async (block) => {
                      const toolUse = block as Anthropic.ToolUseBlock
                      try {
                        const result = await executeTool(
                          toolUse.name,
                          toolUse.input,
                          session.id
                        )
                        return {
                          type: 'tool_result' as const,
                          tool_use_id: toolUse.id,
                          content: JSON.stringify(result)
                        }
                      } catch (error) {
                        return {
                          type: 'tool_result' as const,
                          tool_use_id: toolUse.id,
                          content: JSON.stringify({
                            error: error instanceof Error ? error.message : 'Unknown error'
                          }),
                          is_error: true
                        }
                      }
                    })
                )
              }

              // Add to conversation and continue loop
              messages.push(
                { role: 'assistant', content: currentContent },
                toolResults
              )
            } else {
              // No more tool calls, exit loop
              continueLoop = false
            }
          }

          // Save conversation
          const updatedConversation: ConversationMessage[] = [
            ...session.conversation,
            {
              role: 'user',
              content: message,
              timestamp: new Date().toISOString()
            },
            {
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date().toISOString()
            }
          ]

          await updateReportSessionConversation(session.id, updatedConversation)

          // Send completion
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
          )
        } catch (error) {
          console.error('Streaming error:', error)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', error: 'An error occurred' })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
