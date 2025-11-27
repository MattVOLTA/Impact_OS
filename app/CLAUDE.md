# CLAUDE.md - Development Guide

## 🚀 Project Overview
**impactOS Multi-Tenant Platform**: SaaS for accelerator/incubator reporting and BAI compliance.
- **Goal**: Validate with 10 orgs recording meetings for 30 days by Feb 2026.
- **Phase**: Production-ready MVP.

## 🛠 Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui.
- **Database**: Supabase (PostgreSQL + RLS).
- **Auth**: Supabase Auth (SSR) + Custom Access Token Hooks.
- **AI**: Anthropic Claude (Reporting) + Fireflies.ai (Transcripts).

## ⚠️ Critical Rules
1. **Auth Architecture**:
   - **DAL Pattern**: ALL auth/DB checks in `app/lib/dal/`. NEVER in components.
   - **Tenant Isolation**: `tenant_id` enforced via RLS and JWT claims.
   - **Reference**: `docs/architecture/auth-best-practices.md`
2. **Testing**: TDD required. Test tenant isolation (`tenant_id`) before features.
3. **Server Actions**: Always use server actions for mutations, never client-side API calls.

---

## 🔥 Fireflies Integration Architecture

### Overview
Two-stage manual process for importing meeting transcripts from Fireflies.ai:
1. **Stage 1**: Daily sync fetches lightweight metadata → stages in queue
2. **Stage 2**: User reviews queue → imports selected meetings → full transcript fetch

### Database Schema

**Table: `fireflies_staged_meetings`**
```sql
CREATE TABLE fireflies_staged_meetings (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  fireflies_transcript_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL,
  organizer_email TEXT,
  host_email TEXT,
  participants TEXT[] DEFAULT '{}',

  -- Contact Matching (computed during sync)
  match_type TEXT CHECK (match_type IN ('active_support', 'known_contact', 'no_match')),
  matched_emails TEXT[] DEFAULT '{}',

  -- Import Status (three-state workflow)
  import_status TEXT DEFAULT 'pending'
    CHECK (import_status IN ('pending', 'imported', 'excluded')),

  -- Timestamps & Relationships
  staged_at TIMESTAMPTZ DEFAULT NOW(),
  imported_at TIMESTAMPTZ,
  imported_to_interaction_id UUID REFERENCES interactions(id),
  excluded_at TIMESTAMPTZ,
  excluded_by_user_id UUID REFERENCES users(id),

  -- Tenant Isolation
  CONSTRAINT unique_fireflies_transcript_per_tenant
    UNIQUE (tenant_id, fireflies_transcript_id)
);

-- RLS Policies
CREATE POLICY "Users can view current org staged meetings"
  ON fireflies_staged_meetings FOR SELECT
  USING (tenant_id = get_active_organization_id());
```

**Configuration: `tenant_config` columns**
- `fireflies_sync_start_date` - Cutoff date (sync meetings from this date onwards)
- `fireflies_last_sync_at` - Last sync timestamp (for incremental updates)
- `fireflies_connection_status` - 'connected' | 'disconnected'
- `fireflies_connected_at` - When account was connected

### Sync Flow (Stage 1)

**Trigger:** Daily at 2 AM UTC via GitHub Actions (`.github/workflows/fireflies-sync.yml`)

**Script:** `app/scripts/fireflies-daily-sync.ts`

**Process:**
1. Fetch all meetings from Fireflies GraphQL API since last sync (or cutoff date)
2. For each meeting:
   - Check if already staged or imported (skip duplicates)
   - Match participants against `contact_emails` table
   - Determine `match_type` (active_support | known_contact | no_match)
   - Store `matched_emails` array
   - Insert into `fireflies_staged_meetings` with `import_status='pending'`
3. Update `fireflies_last_sync_at` timestamp

**Fireflies API Client:** `app/lib/fireflies/client.ts`
- `fetchMeetingsByDateRange()` - Lightweight metadata only (Stage 1)
- `fetchFullTranscript()` - Full transcript with sentences (Stage 2)
- API key retrieved from Supabase Vault: `vault_read_secret('fireflies_api_key')`

**Key Pattern: Lightweight Sync**
```typescript
// Stage 1: Fetch ONLY metadata (fast, cheap)
const meetings = await firefliesClient.fetchMeetingsByDateRange({
  fromDate: lastSyncAt || cutoffDate,
  toDate: new Date()
})

// NO full transcript fetch here! Only title, date, participants
```

### Import Flow (Stage 2)

**Trigger:** User clicks "Import Selected" in queue UI

**Action:** `importSelectedMeetings(meetingIds)` in `app/(dashboard)/settings/actions.ts`

**Process:**
1. For each selected meeting:
   - **Fetch full transcript** (heavy operation, only now!)
   - Create `interaction` record
   - Create `meeting_transcript` record with full data
   - Create `meeting_speakers` records for each speaker
   - Link to matched contacts (`interaction_contacts`)
   - Link to companies via contacts (`interaction_companies`)
   - Update staged meeting: `import_status='imported'`, `imported_at`, `imported_to_interaction_id`
2. Return per-meeting success/error results

**Key Pattern: Full Transcript Only When Needed**
```typescript
// Stage 2: Fetch full transcript ONLY when user imports
const fullTranscript = await firefliesClient.fetchFullTranscript(
  stagedMeeting.fireflies_transcript_id
)

// Now we have: transcript text, sentences, speakers, AI summaries
```

### Queue UI (Three Tabs)

**Page:** `app/(dashboard)/settings/fireflies/queue/page.tsx`

**Tab 1: Pending Review** (`pending-queue-table.tsx`)
- Shows meetings with `import_status='pending'`
- Smart badges: 🟢 Active Support | 🔵 Known Contact | 🟡 Unknown
- Tooltips show matched contact names
- Bulk actions: "Import Selected", "Exclude Selected"
- Individual actions: View Details, Import One, Exclude One

**Tab 2: Imported** (`imported-history-table.tsx`)
- Shows meetings with `import_status='imported'`
- Read-only audit trail
- Links to created interactions
- Displays import timestamp

**Tab 3: Excluded** (`excluded-meetings-table.tsx`)
- Shows meetings with `import_status='excluded'`
- "Undo Exclusion" button (reversible!)
- Displays exclusion timestamp
- Moves back to pending when undone

### Server Actions

**Location:** `app/(dashboard)/settings/actions.ts`

**Core Actions:**
- `triggerManualSync()` - Admin-only, runs sync script on-demand
- `getPendingMeetings()` - Fetches pending with contact enrichment
- `getImportedMeetings()` - Fetches imported with interaction relationships
- `getExcludedMeetings()` - Fetches excluded with user metadata
- `importSelectedMeetings(ids)` - Bulk import with full transcript fetch
- `excludeStagedMeeting(id)` - Single exclude
- `excludeSelectedMeetings(ids)` - Bulk exclude
- `undoExclusion(id)` - Move excluded back to pending

### Contact Matching Logic

**Goal:** Match Fireflies meeting participants to existing contacts in database

**Process:**
1. Extract participant emails from Fireflies meeting
2. Query `contact_emails` table (NOT `contacts.email` which is NULL!)
3. Join with `contacts` to get contact details and verify tenant isolation
4. Set `match_type`:
   - `'active_support'` - if contact is marked as active support
   - `'known_contact'` - if any emails match existing contacts
   - `'no_match'` - if no emails match
5. Populate `matched_emails` array with matching email addresses
6. Enrich pending meetings with contact names for UI tooltips

**Critical Bug Fix:** Always query `contact_emails.email`, NOT `contacts.email` (which is always NULL in our schema).

**Pattern:**
```typescript
// CORRECT: Query contact_emails table
const { data: matchedContacts } = await supabase
  .from('contact_emails')
  .select(`
    email,
    contact_id,
    contacts!inner (
      id,
      first_name,
      last_name,
      tenant_id
    )
  `)
  .in('email', participantEmails)
  .eq('contacts.tenant_id', tenantId)

// WRONG: Don't query contacts.email directly
// contacts.email is always NULL in our multi-email schema!
```

### Testing

**File:** `app/__tests__/settings/fireflies-queue-actions.test.ts`

**Test Coverage:**
- Three-tab filtering by `import_status`
- Bulk import/exclude operations
- Tenant isolation (verify users can't access other tenants' meetings)
- Contact matching logic
- Undo exclusion workflow
- Contact name enrichment
- Matched emails population

**Pattern: Test Tenant Isolation**
```typescript
test('tenant isolation - users cannot access other tenant meetings', async () => {
  // Create meeting for tenant A
  const meetingA = await createStagedMeeting({ tenant_id: tenantA })

  // Try to fetch as tenant B (should return empty)
  const result = await getPendingMeetings({ tenant_id: tenantB })
  expect(result).toHaveLength(0)
})
```

### Key Files Reference

| File | Purpose |
|------|---------|
| `.github/workflows/fireflies-sync.yml` | Daily sync scheduling (2 AM UTC) |
| `app/scripts/fireflies-daily-sync.ts` | Stage 1: Lightweight sync script |
| `app/lib/fireflies/client.ts` | Fireflies GraphQL API client |
| `app/(dashboard)/settings/actions.ts` | All server actions (import/exclude/sync) |
| `app/(dashboard)/settings/fireflies/queue/page.tsx` | Queue page with three tabs |
| `app/(dashboard)/settings/fireflies/queue/components/pending-queue-table.tsx` | Pending tab UI |
| `app/(dashboard)/settings/fireflies/queue/components/imported-history-table.tsx` | Imported tab UI |
| `app/(dashboard)/settings/fireflies/queue/components/excluded-meetings-table.tsx` | Excluded tab UI |
| `app/__tests__/settings/fireflies-queue-actions.test.ts` | Comprehensive test suite |

### Common Patterns

**Pattern 1: Admin-Only Actions**
```typescript
export async function triggerManualSync() {
  const { user } = await requireAuth()
  const isAdmin = await checkIsAdmin(user.id)

  if (!isAdmin) {
    throw new Error('Only admins can trigger manual sync')
  }

  // ... sync logic
}
```

**Pattern 2: Bulk Operations with Error Handling**
```typescript
export async function importSelectedMeetings(meetingIds: string[]) {
  const results = []

  for (const meetingId of meetingIds) {
    try {
      // Import logic
      results.push({ success: true, meetingId, interactionId })
    } catch (error) {
      console.error('Import failed:', error)
      results.push({ success: false, meetingId, error: error.message })
    }
  }

  return { results }
}
```

**Pattern 3: Status Transitions**
```typescript
// Pending → Imported
await supabase
  .from('fireflies_staged_meetings')
  .update({
    import_status: 'imported',
    imported_at: new Date().toISOString(),
    imported_to_interaction_id: interactionId
  })
  .eq('id', meetingId)

// Pending → Excluded
await supabase
  .from('fireflies_staged_meetings')
  .update({
    import_status: 'excluded',
    excluded_at: new Date().toISOString(),
    excluded_by_user_id: userId
  })
  .eq('id', meetingId)

// Excluded → Pending (undo)
await supabase
  .from('fireflies_staged_meetings')
  .update({
    import_status: 'pending',
    excluded_at: null,
    excluded_by_user_id: null
  })
  .eq('id', meetingId)
```

---

## 📂 Documentation Map
- **👩‍💻 Development Guide**: This file (`app/CLAUDE.md`)
- **🏗 Architecture**: `docs/architecture/`
- **📋 Requirements**: `docs/requirements/`
- **🇨🇦 Compliance**: `docs/BAI Metrics Pilot Data Collection - Final.md`
- **🔐 Security**: `docs/MULTI_ORG_SECURITY_ANALYSIS.md`

## 🧪 Test Tenants
- **Acme**: `1111...` (Full Access)
- **Beta**: `2222...` (No Fireflies)
- **Gamma**: `3333...` (Restricted)

## 📚 References for Agents
- **Official Best Practices**: [Claude Code Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- **Advanced Patterns**: [Hierarchical CLAUDE.md Guide](https://kuanhaohuang.com/claude-code-claude-md-advanced-tips/)
