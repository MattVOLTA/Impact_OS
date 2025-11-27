# Reporting Agent - Product Requirements Document

**Feature**: AI-Powered Reporting Agent for impactOS Multi-Tenant
**Status**: Requirements Defined
**Priority**: High (MVP Phase 5 - Week 9-10)
**Created**: November 13, 2024
**Last Updated**: November 13, 2024

---

## Overview

An AI-powered reporting agent that enables tenant admins and coaches to generate compliance reports and analyze portfolio performance through natural language conversations. The agent provides both standardized template-based reports and exploratory analysis capabilities while maintaining strict multi-tenant data isolation.

---

## Problem Statement

**Current State:**
- Coaches and admins need to manually compile data for BAI compliance reports
- Performance analysis requires technical SQL knowledge or custom development
- No self-service way to explore portfolio data and trends
- Report generation is time-consuming and error-prone

**Impact:**
- Time wasted on manual data compilation
- Delayed insights into portfolio performance
- Missed opportunities to identify trends or issues
- Barrier to BAI compliance reporting

**Success Criteria:**
- Coaches can generate demographic reach reports in <2 minutes via natural language
- Interaction activity reports automatically compiled from database
- Reports are audit-trail compliant (conversation history preserved)
- Zero cross-tenant data leakage

---

## Users

**Primary Users:**
- Tenant administrators
- Coaches/advisors working with portfolio companies

**User Characteristics:**
- Internal staff (not external stakeholders)
- May lack technical/SQL knowledge
- Need reports for both external compliance (BAI) and internal evaluation
- Evaluate team performance, track progress, identify learning patterns

**Access Control:**
- All authenticated users within a tenant can access reporting
- Reports are tenant-scoped and shared across all tenant users
- RLS policies enforce tenant isolation at database level

---

## Use Cases

### Use Case 1: BAI Compliance Report (Monthly/Quarterly)

**Actor:** Tenant Admin
**Goal:** Generate standardized BAI demographic reach report for government submission
**Preconditions:** User is authenticated, tenant has interaction and demographic data

**Flow:**
1. User navigates to `/reports` page
2. User types: "Generate demographic reach report for Q4 2024"
3. Agent recognizes template, executes one-shot report generation
4. Agent returns markdown report with demographic breakdown, interaction counts
5. User reviews report, downloads as markdown for submission
6. Report saved to tenant's report library

**Success Criteria:**
- Report includes all 9 BAI demographic categories
- Data filtered by specified time period
- Report saved and downloadable
- Audit trail preserved (conversation + report)

### Use Case 2: Exploratory Performance Analysis

**Actor:** Coach
**Goal:** Analyze meeting transcripts to identify problem trends in EdTech industry
**Preconditions:** User is authenticated, tenant has meeting transcripts

**Flow:**
1. User navigates to `/reports` page
2. User types: "Analyze transcripts from EdTech companies for common challenges"
3. Agent asks clarifying questions: "Which time period?" → "Last 6 months"
4. Agent validates data availability, proposes analysis approach
5. User confirms approach
6. Agent analyzes transcripts, identifies themes, generates summary report
7. User asks follow-up: "Show me which companies mentioned fundraising challenges"
8. Agent refines analysis, provides specific company breakdown
9. Full conversation and reports saved

**Success Criteria:**
- Agent validates data exists before committing to analysis
- Conversational refinement works (follow-up questions)
- Multiple reports can be generated in one session
- All conversation history preserved

### Use Case 3: Interaction Activity Report

**Actor:** Tenant Admin
**Goal:** Monthly summary of support engagement activity
**Preconditions:** User is authenticated, tenant has interaction records

**Flow:**
1. User types: "Show me interaction activity for October 2024"
2. Agent generates report with:
   - Total interactions count
   - Breakdown by interaction type (meeting, email, call)
   - Top companies by engagement frequency
   - Meeting frequency trends
3. User downloads markdown report
4. User shares report URL with other tenant users

**Success Criteria:**
- Report includes all interaction types
- Data aggregated correctly by time period
- Other tenant users can view the saved report
- Download functionality works

---

## Functional Requirements

### FR-1: Natural Language Chat Interface

**Description:** Users interact with reporting agent via natural language chat

**Acceptance Criteria:**
- Chat interface on dedicated `/reports` page
- User can type free-form natural language requests
- Agent responds conversationally
- Chat supports markdown formatting in responses
- Conversation history visible in UI

### FR-2: Three Interaction Modes

**Description:** Agent supports template, conversational, and guided modes

**Template Mode (One-Shot):**
- Agent recognizes predefined report types
- Executes without clarifying questions if all parameters present
- Returns complete report immediately

**Conversational Mode (Follow-ups):**
- User can ask follow-up questions on generated reports
- Agent maintains context from previous messages
- Multiple reports can be generated in one session

**Guided Mode (Clarification):**
- Agent asks questions when request is ambiguous
- Example: "For which time period?" if not specified
- Agent validates data availability before committing

**Acceptance Criteria:**
- Template requests execute in single turn when unambiguous
- Follow-up questions work without re-stating context
- Agent asks for clarification when needed
- Agent validates technical feasibility against database schema

### FR-3: Standardized Report Templates (MVP)

**Description:** Two core templates for proof of concept

**Template 1: Demographic Reach Report**
- Time period (monthly, quarterly)
- Total interactions count
- Breakdown by 9 BAI demographic categories:
  - Women, Racialized Communities, Youth, Black Communities, Indigenous Peoples
  - 2SLGBTQI+, Newcomers/Immigrants, Persons with Disability, Official Language Minority
- Companies by demographic category
- Interaction counts per category

**Template 2: Interaction Activity Report**
- Time period (monthly, quarterly)
- Total interactions count
- Breakdown by interaction type (meeting, email, call)
- Top companies by engagement frequency
- Meeting frequency trends over time period

**Acceptance Criteria:**
- Both templates executable via natural language
- Reports use only existing database data
- Time periods correctly filtered (monthly, quarterly)
- Output formatted as markdown

### FR-4: Report Persistence

**Description:** All reports and conversations saved to database

**Data Model:**
```
report_sessions
  - id (uuid)
  - tenant_id (uuid, FK to tenants)
  - created_by (uuid, FK to users)
  - created_at (timestamp)
  - title (text, auto-generated or user-provided)
  - conversation (jsonb, full chat history)

reports
  - id (uuid)
  - session_id (uuid, FK to report_sessions)
  - tenant_id (uuid, FK to tenants)
  - title (text)
  - content (text, markdown)
  - report_type (text, e.g., 'demographic_reach', 'interaction_activity')
  - parameters (jsonb, e.g., { dateRange, reportType })
  - created_at (timestamp)
```

**Acceptance Criteria:**
- Every conversation saved as report_session
- Every generated report artifact saved as separate record
- Full conversation history preserved (audit trail)
- Tenant-scoped (RLS enforced)
- All tenant users can view all tenant reports

### FR-5: Report Library & Discovery

**Description:** Users can browse past reports and conversations

**Features:**
- List view of all report sessions (most recent first)
- List view of all generated reports (filterable by type)
- Click to view full conversation
- Click to view individual report
- Search/filter by date, type, creator

**Acceptance Criteria:**
- Reports page shows list of past sessions
- Can navigate to specific session to see conversation
- Can view individual report artifacts
- Filtering works (by date, type)

### FR-6: Download Functionality

**Description:** Users can export reports as markdown files

**Acceptance Criteria:**
- Download button on each report
- Downloads as `.md` file with proper filename
- Markdown preserves formatting
- Includes metadata footer (generated date, tenant, time period)

### FR-7: Multi-Tenant Data Isolation

**Description:** Strict tenant isolation enforced at database level

**Security Requirements:**
- All queries use existing DAL pattern (`requireAuth()`)
- RLS policies filter by `tenant_id` from JWT
- Agent cannot access other tenants' data
- Service role key never exposed to agent

**Acceptance Criteria:**
- Tenant A cannot see Tenant B's reports
- Tenant A cannot see Tenant B's data in generated reports
- RLS tests verify isolation
- All database queries go through authenticated supabase client

---

## Non-Functional Requirements

### NFR-1: Performance
- Report generation completes within 30 seconds for standard templates
- Chat interface responds within 2 seconds for user messages
- Agent streaming enabled (shows progress during generation)

### NFR-2: Scalability
- Supports up to 10,000 interactions per tenant
- Handles concurrent report generation (multiple users)
- Token usage optimized (prefer Code Execution pattern if needed)

### NFR-3: Security
- No prompt injection vulnerabilities
- No SQL injection via natural language
- Audit trail for all report generation
- Cannot execute arbitrary SQL (domain-specific tools only)

### NFR-4: Reliability
- Agent provides helpful error messages
- Graceful degradation if database unavailable
- Conversation state preserved on page reload
- No data loss during generation

### NFR-5: Usability
- Natural language parsing handles variations (e.g., "Q4 2024" = "October-December 2024")
- Agent provides helpful suggestions if request unclear
- Reports formatted consistently
- Markdown renders properly in UI

---

## Out of Scope (MVP)

**Future Features (Post-MVP):**
- Scheduled/automated reports
- Email delivery of reports
- PDF export (MVP: markdown only)
- Report sharing outside tenant (external stakeholders)
- Custom report template builder UI
- Data visualization/charts (MVP: text/tables only)
- Integration with external systems (Google Drive, etc.)
- Advanced analytics (predictive modeling, trend forecasting)
- Support for data not yet in database (pathfinding metrics, investment amounts, etc.)

**Explicitly Not Included:**
- Public API for reports
- Multi-language support (English only)
- Real-time collaboration on reports
- Report versioning/editing after generation

---

## Data Requirements

### Data Sources (Existing Database Tables)

**Available for MVP:**
- `companies` - Portfolio companies
- `contacts` - Founders and team members
- `contact_demographics` - 9 BAI demographic categories (multi-select)
- `company_contacts` - Junction table
- `interactions` - Meeting records (title, date, summary, notes, type)
- `meeting_transcripts` - Full Fireflies transcript data
- `interaction_companies` - Link interactions to companies
- `interaction_contacts` - Link interactions to contacts
- `industries` - BAI industry categories
- `demographic_categories` - 9 BAI categories reference

**Not Available (Out of Scope for POC):**
- Pathfinding metrics (applications, interviewed, accepted)
- Investment amounts
- Support engagement types (Skill Development, Growth Coaching, etc.)
- Domain expertise categories
- Traction levels
- Success stories (narrative highlights)

### Data Quality Assumptions

- Demographic data self-reported and/or staff-reported
- Interaction dates accurate and complete
- Meeting transcripts available for Fireflies-captured meetings
- Contact-to-company associations up-to-date

---

## User Interface Requirements

### UI-1: Reports Page Layout

**Route:** `/app/(dashboard)/reports/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  Reports                                    [New Report] │
├─────────────────┬───────────────────────────────────────┤
│                 │                                         │
│  Recent         │  Chat Interface                        │
│  Sessions       │  ┌──────────────────────────────────┐ │
│                 │  │ User: Generate demographic...    │ │
│  • Q4 Demo...   │  │ Agent: Here's your report...     │ │
│  • Oct Activity │  │ [Report Markdown Rendered]       │ │
│  • EdTech...    │  │ User: Now break down by indus... │ │
│                 │  │ Agent: [Refined report]          │ │
│  Templates      │  └──────────────────────────────────┘ │
│                 │  [Type your question...            ] │
│  • Demographic  │                                         │
│  • Activity     │                                         │
│                 │                                         │
└─────────────────┴───────────────────────────────────────┘
```

**Components:**
- Left sidebar (collapsible on mobile):
  - Recent Sessions list
  - Template quick-actions
- Main area:
  - Chat message history
  - Markdown-rendered reports inline
  - Input field for new messages
- Header:
  - "New Report" button (clears conversation, starts fresh)

### UI-2: Report Display

**Requirements:**
- Markdown rendered with proper styling
- Download button per report artifact
- Copy to clipboard functionality
- Print-friendly formatting
- Metadata footer (date generated, time period, creator)

### UI-3: Session Management

**Features:**
- Click session in sidebar → loads full conversation
- Session titles auto-generated from first user message
- Delete session functionality (future)
- Archive/favorite sessions (future)

---

## Technical Architecture (TBD)

**Note:** Architecture will be determined after requirements review. Options include:
- Next.js API routes + Agent SDK
- Custom MCP server
- Hybrid approach

**Must satisfy:**
- Reuses existing DAL security patterns (`requireAuth()`, RLS)
- Fits within Next.js 16 App Router architecture
- Minimal new infrastructure
- Deployable within 10-week MVP timeline

---

## Success Metrics

**MVP Success (Week 10):**
- 3 beta orgs successfully generate demographic reports
- 80%+ of template requests succeed without clarification
- Zero cross-tenant data leakage incidents
- Coaches report time savings vs. manual report compilation

**Post-MVP (February 2026):**
- 10 validation orgs using reporting weekly
- 50+ reports generated per month across all tenants
- <5% error rate on report generation
- 90%+ user satisfaction with report quality

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Prompt injection attacks | High | Medium | Domain-specific tools (no generic SQL), input validation, RLS enforcement |
| Poor natural language understanding | Medium | Medium | Start with templates, gather user feedback, iterative prompt engineering |
| Token cost overruns | Medium | Low | Code Execution pattern, optimize tool definitions, monitor usage |
| Slow report generation | Low | Low | Optimize DAL queries, use database indexes, implement streaming |
| Cross-tenant data leakage | High | Very Low | RLS at database level, comprehensive testing, security audits |

---

## Open Questions

**For Architecture Discussion:**
1. Which architecture option best fits requirements? (Next.js API + Agent SDK vs. Custom MCP server)
2. Should we use Code Execution with MCP pattern for token efficiency?
3. How do we handle long-running reports (>30 seconds)?
4. What's the conversation state management strategy (client-side vs. server-side)?

**For Product Refinement:**
1. Should report sessions be editable (e.g., rename, add notes)?
2. Should we support report templates created by users (not just predefined)?
3. How do we handle reports that require data not yet in database (graceful degradation)?

---

## Acceptance Criteria (Overall)

- [ ] User can navigate to `/reports` page
- [ ] User can type natural language request for demographic report
- [ ] Agent generates report with correct demographic breakdown
- [ ] Report filtered by specified time period (monthly, quarterly)
- [ ] User can download report as markdown
- [ ] Report saved to database with full conversation
- [ ] Other tenant users can view saved reports
- [ ] User can ask follow-up questions in same conversation
- [ ] Agent asks clarifying questions when request ambiguous
- [ ] Interaction activity report template works
- [ ] RLS tests verify tenant isolation
- [ ] No cross-tenant data visible in reports
- [ ] Error messages are user-friendly
- [ ] Report metadata includes date, tenant, time period
- [ ] UI shows recent sessions and templates

---

## References

- Master Epic: Issue #1 (impactOS Multi-Tenant Platform)
- Example Report: `/Users/mattcooper/Downloads/aug-2025-report (1).md`
- BAI Metrics: `docs/BAI Metrics Pilot Data Collection - Final.md`
- Architecture Research: Agent SDK and MCP research (November 13, 2024)

---

**Next Steps:**
1. Review requirements with stakeholder
2. Determine technical architecture approach
3. Create implementation plan for Week 9-10
4. Design database schema for report_sessions and reports tables
5. Create GitHub issue for feature epic
