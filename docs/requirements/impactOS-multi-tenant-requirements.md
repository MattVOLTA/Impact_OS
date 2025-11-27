# Requirements: impactOS Multi-Tenant Platform

**Product Manager:** [Your Name]
**Last Updated:** November 11, 2024
**Status:** Discovery Complete - Ready for Build
**Target Delivery:** End of January 2026 (10 weeks)

---

## Executive Summary

We're building a multi-tenant version of impactOS to enable 10+ accelerator/incubator organizations to comply with government direct beneficiary tracking requirements while eliminating the operational burden of single-tenant deployments. The MVP focuses on self-service onboarding, interaction capture via Fireflies, demographic data collection, and government compliance reporting.

---

## Part 1: Problem Space

### 1.1 Problem Statement

**Who has this problem?**
- **Primary:** Accelerator and incubator organizations (5 current customers + 10 validated prospects + 40-90 potential)
- **Secondary:** The impactOS team (operational burden of maintaining multiple single-tenant instances)
- **Tertiary:** Startups and founders requiring support tracking for government compliance

**What is the problem?**

The current single-tenant architecture creates three critical barriers:

1. **Operational Scaling Barrier:** Each new customer requires manual deployment, configuration, and ongoing maintenance. Updates must be applied individually to each instance, consuming significant technical resources and preventing rapid customer acquisition.

2. **Technical Setup Barrier:** Organizations require technical expertise to deploy and configure impactOS, eliminating non-technical organizations from adopting despite having the compliance need.

3. **Government Compliance Urgency:** Canadian government funding requirements mandate tracking of direct beneficiaries (founders and team members) with demographic data for inclusion/diversity reporting. Organizations lacking this capability risk funding loss or compliance violations.

**Why does this matter?**

**Customer Impact:**
- 10 validated organizations cannot access impactOS due to setup/maintenance barriers
- Government compliance requirements create urgency—organizations need tracking capability now
- Manual processes for beneficiary tracking are error-prone and time-consuming
- Non-profit organizations lack budget for custom deployments or ongoing technical support

**Business Impact:**
- Current architecture caps growth at ~5 organizations (limited by maintenance capacity)
- Each manual deployment/update consumes 4-8 hours of technical time
- Cannot serve 50-100 potential market without fundamental architecture change
- Mission impact limited: fewer organizations supported = fewer startups helped

**Strategic Importance:**
- Multi-tenancy unlocks 10-20x scale (5 → 50-100 organizations)
- Government compliance driver creates pull-based demand (not push-based sales)
- Non-profit sustainability: operational efficiency enables mission scale without proportional resource growth

**Evidence:**

**Customer Validation:**
- 10 organizations with validated interest beyond current 5 customers
- Primary adoption driver: government pressure for direct beneficiary tracking
- Barrier identified: technical setup requirements and ongoing maintenance needs

**Operational Data:**
- Current: 5 single-tenant instances requiring manual updates
- Deployment time: 4-8 hours per customer for initial setup
- Update time: 2-4 hours per customer per release
- Technical capacity: 1 engineer (solo operation)

**Market Evidence:**
- Canadian government mandates demographic tracking for funded programs
- Required categories: Women, Racialized Communities, Youth, Black Communities, Indigenous Peoples, 2SLGBTQI+, Newcomers/Immigrants, Persons with Disability, Official Language Minority
- PIPEDA compliance required for personal data handling

**What happens if we don't solve this?**

- 10 validated organizations cannot adopt (market opportunity lost)
- Current 5 customers continue requiring manual updates (operational burden persists)
- Government compliance gap prevents organizations from accessing funding
- Mission impact limited to single-digit number of organizations
- Competitive risk: other solutions may emerge for compliance tracking

### 1.2 Success Metrics

**Primary Success Metric:**
10 validation organizations successfully record meetings with portfolio companies for 30 consecutive days

**Baseline:** 5 single-tenant organizations (manual deployment/updates)

**Target:** 10 organizations using multi-tenant MVP by end of January 2026

**Timeline:** MVP delivery by January 31, 2026 (10 weeks); 30-day validation period through February 2026

**Secondary Metrics:**

- **Self-Service Onboarding Success Rate:** 80%+ of validation orgs onboard without manual technical assistance
  - Baseline: 0% (all require manual setup today)
  - Target: 8 of 10 orgs complete onboarding independently

- **Deployment Time Reduction:** From 4-8 hours per org to <1 hour (self-service)
  - Baseline: 6 hours average per org
  - Target: <1 hour (mostly self-service configuration)

- **Update Propagation:** All tenants receive updates simultaneously
  - Baseline: 2-4 hours per tenant (serial updates)
  - Target: 0 hours (single deployment serves all tenants)

- **Interaction Capture Rate:** 70%+ of meetings auto-captured via Fireflies
  - Measurement: Interactions created / Total meetings conducted
  - Target: At least 70% automated capture (30% manual entry acceptable)

- **Demographic Data Completeness:** 90%+ of direct beneficiaries have complete demographic profiles
  - Required for government compliance
  - Target: 90% completion within 30 days of beneficiary creation

**Leading Indicators (measurable within 2 weeks):**

- Organizations completing onboarding setup (target: 10 orgs by week 2 post-launch)
- Fireflies API connections established (target: 10 orgs configure Fireflies by day 3)
- First interaction captured per org (target: within 7 days of onboarding)
- First company/contact records created (target: within 3 days of onboarding)

### 1.3 User Context

**Jobs to Be Done:**

**For Accelerator/Incubator Organizations:**
When I'm managing a portfolio of startup companies, I want to automatically track all support interactions and beneficiary demographics, so I can demonstrate program impact to government funders and maintain compliance without administrative burden.

**For Coaches/Advisors:**
When I'm meeting with founders, I want the system to automatically capture our conversations and link them to the right companies, so I can focus on coaching instead of documentation.

**For Program Administrators:**
When I'm reporting to government funders, I want to generate compliant reports showing direct beneficiaries and demographics, so I can satisfy reporting requirements without manual data compilation.

**User Journey (Current State - Single Tenant):**

1. Organization contacts impactOS team requesting access
2. impactOS team manually deploys dedicated instance (4-8 hours)
3. Technical setup requires infrastructure configuration
4. Organization onboards with hands-on support
5. Interactions tracked manually or semi-automatically
6. Updates require per-customer deployment (2-4 hours each)
7. **Pain points:** High touch required, technical barriers, slow scaling, manual updates

**User Journey (Desired State - Multi-Tenant MVP):**

1. Organization signs up via self-service portal
2. Organization creates account and configures tenant settings (program structure, update intervals)
3. Admin invites coaches/advisors to platform
4. Coaches connect Fireflies API (self-service configuration)
5. Coaches add portfolio companies and founders/team contacts with demographics
6. Interactions automatically captured when Fireflies meetings occur
7. Contacts auto-matched via email; coaches review/correct mappings
8. Company updates submitted on configurable schedule
9. Reports generated via AI agent with database query access
10. Updates deployed to all tenants simultaneously
11. **Success:** Self-service, automated capture, compliance-ready, scalable

### 1.4 Constraints and Requirements

**Must Have (Non-Negotiable):**

**Multi-Tenancy & Security:**
- Complete data isolation between tenants (tenant cannot see another tenant's data)
- Row-Level Security (RLS) enforced in Supabase for all tables
- Tenant ID on every data record for isolation
- PIPEDA compliance for Canadian privacy law (personal demographic data)

**Government Compliance (BAI Metrics):**
- All fields from BAI Metrics Pilot Data Collection document (see docs/BAI Metrics Pilot Data Collection - Final.md)
- Company profile data (business name, number, address, city, province, phone, email, URL, industry)
- Contact/beneficiary tracking with role designation (founder vs team member)
- Demographic fields (9 categories: Women, Racialized Communities, Youth, Black Communities, Indigenous Peoples, 2SLGBTQI+, Newcomers/Immigrants, Persons with Disability, Official Language Minority)
- Multi-select support for demographic categories
- Self-identification AND staff-reported demographic data
- Program and cohort tracking with start/end dates
- Company updates (Stage of Growth, Current FTEs, Jobs Created, Capital Raised with type)
- Support provided tracking and cost of support
- Industry taxonomy (96 industries from BAI document)

**Feature Flags (Per-Tenant Configuration):**
- Company Updates (enable/disable)
- Interactions (enable/disable)
- Fireflies Integration (enable/disable)
- Advisor Profiles (enable/disable)

**Self-Service Onboarding:**
- Organization signup and tenant creation without manual intervention
- Fireflies API key configuration by tenant admins
- Coach/advisor invitation system
- Portfolio company and contact management

**Interaction Capture:**
- Fireflies integration via GraphQL API
- Automatic transcript and summary storage
- Auto-matching of meeting participants to contacts via email
- Manual interaction notes entry (fallback when Fireflies not available)
- Link interactions to companies and contacts

**Reporting:**
- AI agent architecture with MCP tools for database queries
- Government compliance reports with demographic data
- Stakeholder-specific report generation

**Should Have (Strongly Desired):**

- Contact email management (multiple emails per contact)
- Coach ability to edit/correct auto-matched interactions
- Visual feedback on onboarding progress
- Update interval configuration at program/cohort/company level
- Validation warnings for incomplete demographic data

**Out of Scope (Explicitly Not Solving in MVP):**

- Atomic observations extraction (AI-powered insight tagging)
- Sprint commitments tracking (leading/lagging indicators framework)
- Portfolio pattern analysis (cross-company insights)
- Custom AI agents for monthly/quarterly synthesis
- Migration tooling for existing 5 single-tenant instances (handle post-MVP)
- Mobile applications (web-first)
- Internationalization (English only for MVP)
- Payment processing (non-profit, no revenue model in MVP)

---

## Part 2: Risk Assessment

### 2.1 Value Risk

**Assessment:** Low

**Key Questions:**
- Will organizations use this? **YES** - 10 validated with explicit interest
- Is demand driven by genuine need? **YES** - Government compliance pressure creates urgency
- Will they adopt within timeline? **YES** - 30-day validation window is realistic

**Current Evidence:**
- 10 organizations explicitly expressed interest beyond current 5 customers
- Government compliance requirement creates pull-based demand (not push-based)
- Main barrier is technical setup/maintenance, not product-market fit
- Current 5 customers prove product value; architecture is the constraint

**Remaining Unknowns:**
- Will self-service onboarding be intuitive enough without support?
- Will Fireflies auto-matching accuracy meet user expectations?
- Will demographic data collection UX be sensitive and appropriate?

**De-Risking Plan:**
- **Onboarding usability testing** (week 3-4 of development): Test with 2-3 friendly validation orgs
- **Fireflies matching validation** (week 5-6): Prototype with real meeting data, measure match accuracy
- **Demographic UI review** (week 2): Review design with inclusion/diversity expert
- **Early access beta** (week 8-10): Invite 3 validation orgs for early feedback before full MVP launch

### 2.2 Viability Risk

**Assessment:** Low

**Stakeholder Alignment:**

| Stakeholder | Concerns | Status | Mitigation |
|-------------|----------|--------|------------|
| Validation Organizations | Need compliance capability urgently | Aligned | Government pressure creates urgency |
| Current Customers | Don't want disruption during transition | Neutral | Keep single-tenant running during MVP validation |
| Developer (You) | Can solo build deliver in 10 weeks? | Aligned | Phased feature development, pragmatic scope |
| Government Funders | Require specific demographic fields | Aligned | BAI metrics doc fully specifies requirements |

**Business Case:**

**Costs:**
- Development time: 10 weeks solo (your time)
- Infrastructure: Supabase Pro tier for multi-tenancy (~$25/month per tenant or enterprise plan)
- Fireflies: Organizations provide own API keys (their cost, not ours)

**Benefits:**
- Unlock 10 organizations immediately (2x growth)
- Eliminate 2-4 hours per org per update (operational efficiency)
- Enable path to 50-100 organizations (10-20x scale potential)
- Mission impact: more organizations supported = more startups helped

**Viability Confirmed:**
- Non-profit model: $3500-$5000/year per org covers operational costs
- Not revenue-driven; viability = operational sustainability + mission impact
- Multi-tenancy is prerequisite for scale, not optional optimization

**De-Risking Plan:**
- **Infrastructure cost validation** (week 1): Confirm Supabase pricing for 10-15 tenants
- **Fireflies API limits review** (week 1): Understand rate limits, tenant isolation
- **Legal/PIPEDA review** (week 2): Ensure demographic data handling meets privacy requirements

### 2.3 Usability Risk

**Assessment:** Medium

**Key Usability Concerns:**

1. **Self-Service Onboarding Complexity:**
   - Risk: Non-technical users may struggle with Fireflies API key configuration
   - Mitigation: Step-by-step wizard, visual feedback, contextual help

2. **Demographic Data Sensitivity:**
   - Risk: Beneficiaries may feel uncomfortable with demographic questions
   - Mitigation: Clear privacy explanations, "Prefer not to disclose" option, self-identification emphasis

3. **Auto-Matching Review UX:**
   - Risk: Coaches need to review/correct auto-matched interactions efficiently
   - Mitigation: Clear confidence indicators, easy correction workflow

4. **Multi-Email Contact Management:**
   - Risk: Managing multiple emails per contact could be confusing
   - Mitigation: Primary email designation, clear visual hierarchy

**Design Validation Completed:**
- Current impactOS UX provides foundation (proven with 5 customers)
- Multi-tenancy shouldn't significantly change core workflows

**Remaining Unknowns:**
- Will tenant admins understand feature flags and how to configure them?
- Will demographic data collection feel appropriate and respectful?
- Will Fireflies connection instructions be clear enough?

**De-Risking Plan:**
- **Onboarding prototype testing** (week 3): Test with 2 non-technical users from validation orgs
- **Demographic UI review** (week 2): Consult inclusion/diversity expert on field presentation
- **Feature flag UI testing** (week 4): Test admin configuration with 2 validation org admins
- **Beta feedback loop** (week 8-10): Daily check-ins with first 3 beta organizations

### 2.4 Feasibility Risk

**Assessment:** Low-Medium

**Technical Approach:**

**Architecture:**
- Next.js 14+ App Router for multi-tenant routing
- Supabase PostgreSQL with Row-Level Security (RLS) for tenant isolation
- TypeScript for type safety across tenant boundaries
- Tailwind CSS + ShadCN for consistent UI
- Feature flags stored in tenant configuration table

**Key Technical Concerns:**

1. **Multi-Tenant RLS Policies:**
   - Challenge: Every query must include tenant_id filter
   - Approach: Supabase RLS policies enforce tenant isolation at database level
   - Complexity: Medium (must implement carefully to avoid data leaks)

2. **Fireflies Integration:**
   - Challenge: Auto-matching meeting participants to contacts
   - Approach: Email-based matching with fuzzy logic fallback
   - Complexity: Medium (webhook handling, async processing)

3. **Demographic Data Model:**
   - Challenge: 9 demographic categories with multi-select
   - Approach: Junction table for contact_demographics
   - Complexity: Low (straightforward many-to-many)

4. **Feature Flags:**
   - Challenge: Conditional rendering and data models per tenant
   - Approach: Tenant configuration table with flags; middleware checks
   - Complexity: Low-Medium (requires thoughtful architecture)

5. **AI Agent Reporting:**
   - Challenge: MCP tool integration for database queries
   - Approach: Claude Code Execution with Supabase MCP tools
   - Complexity: Medium (agent prompt engineering, query safety)

**Technical Validation Completed:**
- Stack proven (Next.js + Supabase + TypeScript used in single-tenant version)
- Supabase RLS supports multi-tenancy natively
- Fireflies GraphQL API documented and accessible
- MCP tools for Supabase available and functional

**Engineering Confidence:**
Solo developer (you) expressed **no feasibility concerns** with 10-week timeline, planning to tackle features one at a time.

**Estimated Sizing:**

- Week 1-2: Multi-tenant architecture + RLS policies + authentication
- Week 3-4: Self-service onboarding + tenant admin portal
- Week 5-6: Fireflies integration + auto-matching + interaction capture
- Week 7-8: Company/contact management + demographics + BAI data model
- Week 9-10: AI agent reporting + testing + bug fixes + beta launch

**Remaining Unknowns:**
- Will RLS policies perform adequately at 10-15 tenant scale?
- Will Fireflies webhook volume overwhelm async processing?
- Will MCP agent queries handle complex reporting efficiently?

**De-Risking Plan:**
- **RLS policy testing** (week 2): Create test tenants, verify isolation, load test with synthetic data
- **Fireflies webhook POC** (week 5): Test with real Fireflies account, measure latency
- **MCP agent POC** (week 9): Test agent with sample queries, validate report generation
- **Load testing** (week 9): Simulate 10 tenants with realistic data volumes

---

## Part 3: Solution Space

**Important:** This section explores potential solutions but doesn't prescribe implementation details. The product trio (you as solo developer) retains autonomy on technical decisions during delivery.

---

### 3.1 Solution Approach (Current Direction)

**Multi-Tenant SaaS Platform** with self-service onboarding, automatic interaction capture, government compliance data model, and AI-powered reporting.

**Core Architecture:**
- Single Next.js application with tenant routing
- Supabase PostgreSQL with RLS for data isolation
- Feature flags per tenant for modular capability enablement
- Fireflies webhooks for automatic interaction capture
- AI agent with MCP database access for reporting

**Why This Approach:**

**Multi-Tenancy:**
- Eliminates manual deployment per customer (operational efficiency)
- Enables simultaneous updates across all tenants (maintenance efficiency)
- Scales to 50-100 organizations without linear resource growth

**Self-Service:**
- Removes technical setup barrier (expands addressable market)
- Enables rapid onboarding (10 orgs in weeks, not months)
- Reduces support burden on solo developer

**Fireflies Integration:**
- Automates interaction capture (reduces coach documentation burden)
- Leverages existing tool coaches already use (low adoption friction)
- Provides transcript + summary (richer data than manual notes)

**Feature Flags:**
- Allows tenants to enable only capabilities they need (flexibility)
- Supports phased rollout of new features (risk mitigation)
- Enables different pricing tiers in future (business model evolution)

**AI Agent Reporting:**
- Flexible report generation without hard-coded queries (adaptability)
- Leverages Claude's natural language understanding (ease of use)
- MCP tools provide secure database access (safety)

**Alternatives Considered:**

| Approach | Pros | Cons | Why Not Selected |
|----------|------|------|------------------|
| Continue single-tenant | Zero migration risk; proven architecture | Cannot scale; manual updates; blocks adoption | Doesn't solve core problem |
| Separate instance per tenant (containerized) | Stronger isolation | Still requires per-tenant deployment; complex orchestration | Doesn't eliminate operational burden |
| White-label platform (self-hosted by customers) | Customer controls infrastructure | Requires customer technical capacity; defeats purpose of SaaS | Contradicts self-service goal |
| Third-party multi-tenant platform (e.g., Retool) | Faster initial build | Lock-in risk; limited customization; ongoing costs | Need full control for compliance requirements |

---

### 3.2 Key Capabilities (Not Features)

Express requirements as capabilities (what users need to accomplish), not specific features:

**Capability 1: Organizations can onboard independently**
- **Why:** Removes technical barrier; enables rapid adoption
- **Success:** 80%+ of validation orgs onboard without manual assistance
- **Includes:** Account creation, tenant configuration, team invitation, Fireflies connection

**Capability 2: Coaches can track all interactions automatically**
- **Why:** Reduces documentation burden; ensures complete records
- **Success:** 70%+ of meetings auto-captured via Fireflies
- **Includes:** Fireflies webhook integration, transcript/summary storage, email-based auto-matching, manual note entry fallback

**Capability 3: Organizations can manage portfolio companies and beneficiaries with complete demographic data**
- **Why:** Government compliance requirement; diversity/inclusion reporting
- **Success:** 90%+ demographic data completeness within 30 days
- **Includes:** Company profiles, contact management with roles (founder/team), multi-select demographics, privacy-conscious UI

**Capability 4: Organizations can configure programs and update schedules**
- **Why:** Different programs have different reporting cadences
- **Success:** Each validation org configures at least one program with update schedule
- **Includes:** Program/cohort structure, configurable update intervals, company enrollment

**Capability 5: Organizations can generate government compliance reports**
- **Why:** Primary use case; demonstrates program impact
- **Success:** All validation orgs generate at least one report within 30 days
- **Includes:** AI agent with MCP database access, demographic aggregation, BAI metrics format

**Capability 6: Administrators can control feature access per tenant**
- **Why:** Flexibility; phased rollout; different customer needs
- **Success:** Feature flags functional for all 4 flagged capabilities
- **Includes:** Tenant configuration table, feature flag middleware, conditional UI rendering

**Capability 7: All tenant data is completely isolated**
- **Why:** Security; privacy; compliance
- **Success:** Zero cross-tenant data leaks in security testing
- **Includes:** RLS policies on all tables, tenant_id on all records, auth middleware

---

### 3.3 User Experience Principles

**Design Priorities:**
1. **Self-Service Over Hand-Holding:** Users should accomplish tasks independently with clear guidance, not waiting for support
2. **Privacy-First Demographic Collection:** Demographic questions must feel respectful, with clear privacy explanations and opt-out options
3. **Automation with Oversight:** Auto-matching should work most of the time, but coaches must easily review and correct
4. **Progressive Disclosure:** Don't overwhelm new users; reveal complexity as needed
5. **Familiar Patterns:** Leverage existing impactOS UX where possible; minimize learning curve

**Design Assets:**
[To be created during implementation - reference current impactOS single-tenant designs]

**Key UX Decisions:**

1. **Onboarding Wizard:** Step-by-step flow with progress indicator, visual feedback, contextual help
2. **Fireflies Connection:** Copy-paste API key with "Test Connection" button; clear error messages
3. **Demographic Fields:** Optional by default; "Prefer not to disclose" option; self-identification emphasis; privacy notice
4. **Auto-Match Review:** Confidence indicators (high/medium/low); one-click correction; batch approval
5. **Feature Flags:** Admin-only settings page; toggle switches; clear descriptions of each feature

---

### 3.4 Open Questions and Decisions Needed

Track open questions and decisions to be made during delivery:

| Question | Options | Decision Date | Owner | Resolution |
|----------|---------|---------------|-------|------------|
| Supabase pricing tier for 10-15 tenants | Pro ($25/org) vs Team ($599/month) | Week 1 | You | TBD |
| Fireflies webhook approach | Polling vs Webhooks vs Hybrid | Week 5 | You | TBD |
| Feature flag storage | Tenant config table vs Separate feature_flags table | Week 2 | You | TBD |
| Demographic data model | Single table with columns vs Junction table | Week 7 | You | TBD |
| Auto-match confidence threshold | Email exact match only vs Fuzzy name matching | Week 6 | You | TBD |
| Update interval configuration UI | Calendar picker vs Predefined intervals vs Custom | Week 4 | You | TBD |
| MCP agent prompt engineering | General-purpose vs Report-specific agents | Week 9 | You | TBD |
| Beta organization selection | First 3 to volunteer vs Strategically selected | Week 7 | You | TBD |

---

## Part 4: Delivery Plan

### 4.1 Release Strategy

**Approach:** Phased rollout with beta program

**Rationale:**
- De-risk with friendly organizations before full launch
- Learn from real usage to refine UX and fix bugs
- Validate self-service onboarding with actual users
- Build confidence in auto-matching accuracy

**Phases:**

1. **Phase 1 - Internal Testing (Week 1-7):**
   - Build core multi-tenant architecture
   - Implement self-service onboarding
   - Test with synthetic data
   - Dogfood internally where possible

2. **Phase 2 - Beta Program (Week 8-10):**
   - Invite 3 validation organizations
   - Full support and daily check-ins
   - Rapid iteration based on feedback
   - Success criteria: 3 orgs capture interactions for 7 days

3. **Phase 3 - MVP Launch (End of January 2026):**
   - Invite remaining 7 validation organizations
   - Self-service onboarding (light support available)
   - Monitor metrics daily for first 2 weeks
   - Success criteria: 10 orgs capture interactions for 30 days

4. **Phase 4 - Validation & Iteration (February 2026):**
   - 30-day validation period
   - Collect feedback and usage data
   - Prioritize improvements based on learnings
   - Prepare for broader rollout (50-100 orgs)

---

### 4.2 Go-to-Market

**Launch Date:** End of January 2026 (MVP)

**Target Audience:**
- 10 validation organizations (explicitly invited)
- Canadian accelerators/incubators with government funding
- Non-profit support organizations

**Communication Plan:**

**Beta Launch (Week 8):**
- Direct outreach to 3 selected beta organizations
- Personalized onboarding support
- Daily check-in calls for first week

**MVP Launch (Week 10):**
- Email invitation to remaining 7 validation organizations
- Self-service onboarding with video tutorial
- Office hours (2x/week) for first 2 weeks

**Post-Validation (March 2026+):**
- Case studies from successful validation organizations
- Referral program to reach additional organizations
- Content marketing (blog posts, webinars) on government compliance

**Sales Enablement:**
Not applicable - non-profit, invitation-only during validation phase.

**Customer Communication:**
- Validation orgs notified of MVP availability via email
- Onboarding instructions and video tutorial provided
- Support available via email and office hours

---

### 4.3 Success Monitoring

**Instrumentation:**

All metrics tracked in Supabase analytics + custom dashboard:

**Onboarding Funnel:**
- Account creation started
- Account creation completed
- Fireflies API connected
- First company created
- First contact created
- First interaction captured
- Time to first interaction (goal: <7 days)

**Usage Metrics:**
- Interactions captured per org per week
- Auto-match success rate (correct matches / total matches)
- Demographic data completeness (% of contacts with full demographics)
- Company update submission rate (on-time / total expected)
- Report generation frequency

**Technical Metrics:**
- API response times (p50, p95, p99)
- Fireflies webhook processing latency
- Database query performance
- Error rates by feature

**Dashboard:**
Custom Supabase dashboard with key metrics, refreshed daily.

**Review Cadence:**
- **Daily (Week 1-2 post-launch):** Monitor onboarding funnel, catch critical issues
- **Weekly (Week 3-10):** Review usage metrics, identify struggling organizations
- **30-day review:** Assess success criteria achievement, gather qualitative feedback
- **90-day review:** Long-term adoption patterns, prioritize next features

**Success Criteria Revisited:**

**Primary Metric:**
- 10 validation orgs successfully record meetings for 30 consecutive days
- Measurement: Interaction count per org per day (must be >0 for 30 consecutive days)
- Target: 10/10 orgs (100% success)

**Secondary Metrics:**
- Self-service onboarding: 8/10 orgs (80%)
- Auto-capture rate: 70%+ of meetings
- Demographic completeness: 90%+ of contacts
- Report generation: 10/10 orgs generate at least one report

---

### 4.4 Rollback Plan

**What Could Go Wrong:**

1. **Data Isolation Failure:** Tenant can see another tenant's data
2. **Fireflies Auto-Matching Failure:** Matches incorrect or missing
3. **Performance Degradation:** Slow queries with 10+ tenants
4. **Onboarding Confusion:** Organizations cannot complete setup independently
5. **Demographic Data Sensitivity:** Users uncomfortable with questions

**Rollback Criteria:**

**Critical (Immediate Rollback):**
- Cross-tenant data leak discovered
- Data loss or corruption
- Authentication bypass vulnerability

**High Priority (Fix Within 24 Hours or Rollback):**
- >50% onboarding abandonment rate
- Auto-matching accuracy <40%
- API response times >5 seconds consistently

**Medium Priority (Fix Within 1 Week):**
- Demographic data collection causing user complaints
- Feature flag configuration confusing admins
- Specific BAI metrics fields missing or incorrect

**Rollback Process:**

1. **Database Rollback:** Supabase point-in-time recovery to pre-deployment state
2. **Code Rollback:** Git revert to previous stable commit; redeploy
3. **Communication:** Email validation orgs immediately; explain issue and timeline
4. **Data Preservation:** Export any user-created data before rollback; restore after fix

**Monitoring for Rollback Triggers:**
- Automated alerts for cross-tenant data access patterns
- Error rate monitoring (>5% = alert)
- User feedback channel (email, office hours) for UX issues

---

## Part 5: Discovery Log

Track discovery activities and learnings:

| Date | Activity | Participants | Key Learnings | Impact on Direction |
|------|----------|-------------|---------------|---------------------|
| Nov 11, 2024 | Discovery interview (28 questions) | PM + Solo Developer | Government compliance is primary driver; 10 validated orgs; 10-week timeline; all BAI fields required | Scoped MVP to focus on compliance; confirmed feasibility |
| Nov 11, 2024 | Reviewed impactOS.xyz website | PM | Understood current single-tenant product; atomic observations not needed for MVP; focus on core workflow | Descoped AI synthesis to post-MVP |
| Nov 11, 2024 | Reviewed BAI Metrics document | PM | Complete data model specified; 96 industries; 9 demographic categories; multi-select required | Validated comprehensive data requirements |
| Nov 11, 2024 | Reviewed Supabase database schema | PM via MCP tools | Existing data model provides foundation; advisor_profiles, companies, contacts, support_engagements tables exist | Can build on existing schema; add tenant_id and multi-tenant RLS |
| Nov 11, 2024 | Reviewed Fireflies API docs | PM via Context7 MCP | GraphQL API with transcripts, summaries, speakers; webhooks available | Confirmed integration feasibility; auto-matching approach validated |

---

## Appendix

### A. BAI Metrics Data Model

See: `docs/BAI Metrics Pilot Data Collection - Final.md`

**Key Tables:**
- **Company:** Business profile, address, industry, business number
- **Contacts:** First name, last name, email, role (founder/team member), demographics
- **Demographics:** 9 categories (multi-select)
- **Programs:** Program name, cohorts with start/end dates
- **Company Updates:** Stage of growth, FTEs, jobs created, capital raised
- **Support Summary:** Support type, cost of support
- **Industries:** 96 industry definitions

### B. Fireflies API Integration

**GraphQL Endpoints Used:**
- `transcripts` query: Fetch transcripts with filters (user_id, date, etc.)
- `transcript` query: Fetch specific transcript with full details
- Webhook subscription: Real-time notifications for new transcripts

**Key Data Points:**
- `sentences`: Full transcript (speaker, text, timestamps)
- `summary`: Multiple summary formats (keywords, action items, overview, etc.)
- `meeting_attendees`: Participants with email addresses (for auto-matching)
- `transcript_url`, `audio_url`, `video_url`: Links to original recording

### C. Multi-Tenant Architecture

**Tenant Isolation:**
- `tenant_id` (UUID) on all data tables
- Supabase RLS policies enforce `tenant_id = auth.jwt() ->> 'tenant_id'`
- Auth middleware sets tenant context in JWT claims

**Feature Flags:**
```sql
CREATE TABLE tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  feature_company_updates BOOLEAN DEFAULT true,
  feature_interactions BOOLEAN DEFAULT true,
  feature_fireflies BOOLEAN DEFAULT false,
  feature_advisor_profiles BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### D. Phased Feature Development (10 Weeks)

**Week 1-2: Foundation**
- Multi-tenant authentication (Supabase Auth with tenant context)
- Tenant table and RLS policies on all tables
- Self-service signup flow (create tenant, create admin user)
- Admin dashboard (tenant settings, feature flags)

**Week 3-4: Onboarding**
- Team invitation system (email invites with role assignment)
- Fireflies API key configuration (test connection button)
- Onboarding wizard with progress tracking
- Company/contact creation UI

**Week 5-6: Interactions**
- Fireflies webhook integration (transcript + summary storage)
- Auto-matching logic (email-based, fuzzy fallback)
- Manual interaction notes entry
- Interaction review/correction UI for coaches

**Week 7-8: BAI Compliance**
- Full BAI data model implementation
- Demographic data collection UI (privacy-conscious)
- Program/cohort management
- Company updates (with configurable intervals)
- Industry taxonomy (96 industries)

**Week 9-10: Reporting & Beta**
- AI agent with MCP tools for database queries
- Report generation for government compliance
- Testing, bug fixes, performance optimization
- Beta launch with 3 validation organizations

### E. Current Supabase Schema (Existing)

**Key Tables:**
- `support_orgs`: Organization records (will become tenants)
- `users`: User accounts linked to auth.users
- `support_org_members`: Team membership with roles (admin/editor/viewer)
- `companies`: Portfolio companies
- `contacts`: Founders and team members
- `advisor_profiles`: Coach/advisor profiles with expertise
- `support_engagements`: Interactions/meetings
- `advisor_companies`: Advisor-company assignments

**Changes Needed:**
- Add `tenant_id` to all tables
- Rename `support_orgs` → `tenants` (or keep naming)
- Add demographic fields to `contacts`
- Add BAI-specific fields (business number, industry, capital raised, etc.)
- Add `programs`, `program_cohorts`, `company_updates` tables
- Add `feature_flags` or embed in `tenant_config`

---

## Summary

This requirements document defines a multi-tenant impactOS MVP that enables 10 validation organizations to:
1. Self-service onboard without technical assistance
2. Automatically capture interactions via Fireflies
3. Track direct beneficiaries with complete demographic data
4. Generate government compliance reports

**Success = 10 organizations recording meetings for 30 consecutive days by end of February 2026**

**Delivery Timeline: 10 weeks (end of January 2026)**

**Risk Profile: Low overall** (Low value risk, Low viability risk, Medium usability risk, Low-Medium feasibility risk)

**Next Steps:**
1. Begin Week 1 development (multi-tenant foundation)
2. Conduct infrastructure cost validation (Supabase pricing)
3. PIPEDA compliance review (demographic data handling)
4. Select 3 beta organizations for Week 8 launch
