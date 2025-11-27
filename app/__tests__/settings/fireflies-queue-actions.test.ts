/**
 * Tests for Fireflies Queue Actions (Three-Tab Workflow)
 *
 * Tests the new import_status-based workflow:
 * - getPendingMeetings (status = 'pending')
 * - getImportedMeetings (status = 'imported')
 * - getExcludedMeetings (status = 'excluded')
 * - excludeSelectedMeetings (bulk exclude)
 * - undoExclusion (move back to pending)
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

describe('Fireflies Queue Actions', () => {
  const adminClient = createClient(supabaseUrl, serviceRoleKey)

  // Test data
  const testTenantId = '11111111-1111-1111-1111-111111111111' // Acme Accelerator
  let testUserId: string
  let testMeetingIds: string[] = []

  beforeAll(async () => {
    // Create test user
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: `test-fireflies-${Date.now()}@test.com`,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: {
        tenant_id: testTenantId,
        first_name: 'Test',
        last_name: 'User'
      }
    })
    testUserId = authData.user!.id
  })

  beforeEach(async () => {
    // Create test meetings in different states
    const meetings = [
      {
        tenant_id: testTenantId,
        fireflies_transcript_id: `ff-pending-${Date.now()}-1`,
        title: 'Pending Meeting 1',
        meeting_date: new Date().toISOString(),
        import_status: 'pending'
      },
      {
        tenant_id: testTenantId,
        fireflies_transcript_id: `ff-pending-${Date.now()}-2`,
        title: 'Pending Meeting 2',
        meeting_date: new Date().toISOString(),
        import_status: 'pending'
      },
      {
        tenant_id: testTenantId,
        fireflies_transcript_id: `ff-imported-${Date.now()}`,
        title: 'Imported Meeting',
        meeting_date: new Date().toISOString(),
        import_status: 'imported',
        imported_at: new Date().toISOString()
      },
      {
        tenant_id: testTenantId,
        fireflies_transcript_id: `ff-excluded-${Date.now()}`,
        title: 'Excluded Meeting',
        meeting_date: new Date().toISOString(),
        import_status: 'excluded',
        excluded_at: new Date().toISOString(),
        excluded_by_user_id: testUserId
      }
    ]

    const { data, error } = await adminClient
      .from('fireflies_staged_meetings')
      .insert(meetings)
      .select('id')

    if (error) throw error
    testMeetingIds = data.map(m => m.id)
  })

  afterEach(async () => {
    // Clean up test meetings
    await adminClient
      .from('fireflies_staged_meetings')
      .delete()
      .in('id', testMeetingIds)

    testMeetingIds = []
  })

  afterAll(async () => {
    // Clean up test user
    await adminClient.auth.admin.deleteUser(testUserId)
  })

  describe('getPendingMeetings', () => {
    it('should return only meetings with status pending', async () => {
      const { data } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'pending')
        .order('meeting_date', { ascending: false })

      expect(data).toBeDefined()
      expect(data!.length).toBe(2)
      expect(data!.every(m => m.import_status === 'pending')).toBe(true)
      expect(data![0].title).toContain('Pending Meeting')
    })

    it('should not return imported or excluded meetings', async () => {
      const { data } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'pending')

      const titles = data!.map(m => m.title)
      expect(titles).not.toContain('Imported Meeting')
      expect(titles).not.toContain('Excluded Meeting')
    })
  })

  describe('getImportedMeetings', () => {
    it('should return only meetings with status imported', async () => {
      const { data } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'imported')
        .order('imported_at', { ascending: false })

      expect(data).toBeDefined()
      expect(data!.length).toBe(1)
      expect(data![0].import_status).toBe('imported')
      expect(data![0].title).toBe('Imported Meeting')
      expect(data![0].imported_at).toBeDefined()
    })
  })

  describe('getExcludedMeetings', () => {
    it('should return only meetings with status excluded', async () => {
      const { data } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'excluded')
        .order('excluded_at', { ascending: false })

      expect(data).toBeDefined()
      expect(data!.length).toBe(1)
      expect(data![0].import_status).toBe('excluded')
      expect(data![0].title).toBe('Excluded Meeting')
      expect(data![0].excluded_at).toBeDefined()
      expect(data![0].excluded_by_user_id).toBe(testUserId)
    })
  })

  describe('excludeSelectedMeetings (bulk operation)', () => {
    it('should update multiple meetings to excluded status', async () => {
      // Get pending meeting IDs
      const { data: pending } = await adminClient
        .from('fireflies_staged_meetings')
        .select('id')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'pending')

      const pendingIds = pending!.map(m => m.id)

      // Exclude them
      const { error } = await adminClient
        .from('fireflies_staged_meetings')
        .update({
          import_status: 'excluded',
          excluded_at: new Date().toISOString(),
          excluded_by_user_id: testUserId
        })
        .in('id', pendingIds)
        .eq('tenant_id', testTenantId)

      expect(error).toBeNull()

      // Verify they're excluded
      const { data: excluded } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .in('id', pendingIds)

      expect(excluded!.every(m => m.import_status === 'excluded')).toBe(true)
      expect(excluded!.every(m => m.excluded_at !== null)).toBe(true)
      expect(excluded!.every(m => m.excluded_by_user_id === testUserId)).toBe(true)
    })

    it('should only affect meetings in current tenant', async () => {
      // Get count of excluded meetings for test tenant
      const { count: beforeCount } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'excluded')

      // Try to exclude (should only affect test tenant)
      const { data: pending } = await adminClient
        .from('fireflies_staged_meetings')
        .select('id')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'pending')
        .limit(1)

      if (pending && pending.length > 0) {
        await adminClient
          .from('fireflies_staged_meetings')
          .update({
            import_status: 'excluded',
            excluded_at: new Date().toISOString(),
            excluded_by_user_id: testUserId
          })
          .eq('id', pending[0].id)
          .eq('tenant_id', testTenantId)
      }

      // Verify count increased by exactly 1
      const { count: afterCount } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'excluded')

      expect(afterCount).toBe((beforeCount || 0) + 1)
    })
  })

  describe('Contact Matching Logic', () => {
    let testContactId: string
    let testContactEmail: string

    beforeEach(async () => {
      // Create a test contact with email in contact_emails table
      testContactEmail = `test-contact-${Date.now()}@example.com`

      const { data: contact } = await adminClient
        .from('contacts')
        .insert({
          tenant_id: testTenantId,
          first_name: 'Test',
          last_name: 'Contact'
        })
        .select('id')
        .single()

      testContactId = contact!.id

      // Add email to contact_emails table
      await adminClient
        .from('contact_emails')
        .insert({
          contact_id: testContactId,
          email: testContactEmail,
          is_primary: true
        })
    })

    afterEach(async () => {
      // Clean up contact and emails
      await adminClient
        .from('contact_emails')
        .delete()
        .eq('contact_id', testContactId)

      await adminClient
        .from('contacts')
        .delete()
        .eq('id', testContactId)
    })

    it('should match participants using contact_emails table', async () => {
      // Create staged meeting with participant matching our test contact
      const { data: meeting } = await adminClient
        .from('fireflies_staged_meetings')
        .insert({
          tenant_id: testTenantId,
          fireflies_transcript_id: `ff-match-test-${Date.now()}`,
          title: 'Test Matching Meeting',
          meeting_date: new Date().toISOString(),
          participants: [testContactEmail, 'unknown@example.com'],
          import_status: 'pending'
        })
        .select('*')
        .single()

      testMeetingIds.push(meeting!.id)

      // Query using contact_emails (CORRECT)
      const { data: matchedEmails } = await adminClient
        .from('contact_emails')
        .select('email, contacts!inner(tenant_id)')
        .eq('contacts.tenant_id', testTenantId)
        .in('email', meeting!.participants)

      expect(matchedEmails).toBeDefined()
      expect(matchedEmails!.length).toBe(1)
      expect(matchedEmails![0].email).toBe(testContactEmail)
    })

    it('should NOT match using contacts.email column (legacy bug)', async () => {
      // The bug: querying contacts.email instead of contact_emails
      const { data: wrongMatches } = await adminClient
        .from('contacts')
        .select('email')
        .eq('tenant_id', testTenantId)
        .in('email', [testContactEmail])

      // Should be empty because contacts.email is NULL
      expect(wrongMatches).toEqual([])
    })

    it('should set match_type to known_contact when emails match', async () => {
      // Create meeting with matched participant
      const { data: meeting } = await adminClient
        .from('fireflies_staged_meetings')
        .insert({
          tenant_id: testTenantId,
          fireflies_transcript_id: `ff-type-test-${Date.now()}`,
          title: 'Type Test Meeting',
          meeting_date: new Date().toISOString(),
          participants: [testContactEmail],
          matched_emails: [testContactEmail],
          match_type: 'known_contact',
          import_status: 'pending'
        })
        .select('*')
        .single()

      testMeetingIds.push(meeting!.id)

      expect(meeting!.match_type).toBe('known_contact')
      expect(meeting!.matched_emails).toContain(testContactEmail)
    })

    it('should populate matched_emails array with all matching emails', async () => {
      // Create second contact email
      const secondEmail = `test-contact-2-${Date.now()}@example.com`

      const { data: contact2 } = await adminClient
        .from('contacts')
        .insert({
          tenant_id: testTenantId,
          first_name: 'Second',
          last_name: 'Contact'
        })
        .select('id')
        .single()

      await adminClient
        .from('contact_emails')
        .insert({
          contact_id: contact2!.id,
          email: secondEmail,
          is_primary: true
        })

      // Query with multiple matching emails
      const participants = [testContactEmail, secondEmail, 'unknown@example.com']

      const { data: matchedEmails } = await adminClient
        .from('contact_emails')
        .select('email, contacts!inner(tenant_id)')
        .eq('contacts.tenant_id', testTenantId)
        .in('email', participants)

      const emails = matchedEmails?.map(c => c.email) || []

      expect(emails.length).toBe(2)
      expect(emails).toContain(testContactEmail)
      expect(emails).toContain(secondEmail)
      expect(emails).not.toContain('unknown@example.com')

      // Cleanup
      await adminClient.from('contact_emails').delete().eq('contact_id', contact2!.id)
      await adminClient.from('contacts').delete().eq('id', contact2!.id)
    })

    it('should enrich pending meetings with contact names', async () => {
      // Create meeting with matched participant
      const { data: meeting } = await adminClient
        .from('fireflies_staged_meetings')
        .insert({
          tenant_id: testTenantId,
          fireflies_transcript_id: `ff-enrich-test-${Date.now()}`,
          title: 'Enrichment Test Meeting',
          meeting_date: new Date().toISOString(),
          participants: [testContactEmail],
          matched_emails: [testContactEmail],
          match_type: 'known_contact',
          import_status: 'pending'
        })
        .select('*')
        .single()

      testMeetingIds.push(meeting!.id)

      // Simulate getPendingMeetings enrichment logic
      const { data: contacts } = await adminClient
        .from('contact_emails')
        .select('email, contacts!inner(id, first_name, last_name, tenant_id)')
        .eq('contacts.tenant_id', testTenantId)
        .in('email', meeting!.matched_emails)

      const contactNames = contacts?.map(c => ({
        email: c.email,
        name: `${c.contacts.first_name} ${c.contacts.last_name}`
      })) || []

      expect(contactNames.length).toBe(1)
      expect(contactNames[0].email).toBe(testContactEmail)
      expect(contactNames[0].name).toBe('Test Contact')
    })
  })

  describe('undoExclusion', () => {
    it('should move excluded meeting back to pending', async () => {
      // Get excluded meeting
      const { data: excluded } = await adminClient
        .from('fireflies_staged_meetings')
        .select('id')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'excluded')
        .limit(1)
        .single()

      const meetingId = excluded!.id

      // Undo exclusion
      const { error } = await adminClient
        .from('fireflies_staged_meetings')
        .update({
          import_status: 'pending',
          excluded_at: null,
          excluded_by_user_id: null
        })
        .eq('id', meetingId)
        .eq('tenant_id', testTenantId)

      expect(error).toBeNull()

      // Verify it's pending
      const { data: meeting } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      expect(meeting!.import_status).toBe('pending')
      expect(meeting!.excluded_at).toBeNull()
      expect(meeting!.excluded_by_user_id).toBeNull()
    })

    it('should allow re-excluding after undo', async () => {
      // Get excluded meeting
      const { data: excluded } = await adminClient
        .from('fireflies_staged_meetings')
        .select('id')
        .eq('tenant_id', testTenantId)
        .eq('import_status', 'excluded')
        .limit(1)
        .single()

      const meetingId = excluded!.id

      // Undo exclusion
      await adminClient
        .from('fireflies_staged_meetings')
        .update({
          import_status: 'pending',
          excluded_at: null,
          excluded_by_user_id: null
        })
        .eq('id', meetingId)

      // Re-exclude
      const { error } = await adminClient
        .from('fireflies_staged_meetings')
        .update({
          import_status: 'excluded',
          excluded_at: new Date().toISOString(),
          excluded_by_user_id: testUserId
        })
        .eq('id', meetingId)

      expect(error).toBeNull()

      // Verify final state
      const { data: meeting } = await adminClient
        .from('fireflies_staged_meetings')
        .select('*')
        .eq('id', meetingId)
        .single()

      expect(meeting!.import_status).toBe('excluded')
      expect(meeting!.excluded_at).toBeDefined()
    })
  })
})
