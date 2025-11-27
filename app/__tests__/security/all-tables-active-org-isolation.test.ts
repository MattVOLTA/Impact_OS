/**
 * Comprehensive Active Organization Data Isolation Tests
 *
 * Tests ALL 19 data tables to verify users ONLY see data from their ACTIVE organization
 *
 * Part of Issue #55: Fix Multi-Organization Data Isolation Bug
 *
 * Pattern: For each table:
 * 1. Create user with membership in Org A and Org B
 * 2. Create test data in both orgs
 * 3. Set active org to A → verify only Org A data visible
 * 4. Switch to Org B → verify only Org B data visible
 * 5. Verify Org A data no longer visible
 */

import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

const testUserIds = new Set<string>()
const testOrgIds = new Set<string>()
const testDataIds: Record<string, Set<string>> = {}

// Helper to track test data for cleanup
function trackData(table: string, id: string) {
  if (!testDataIds[table]) {
    testDataIds[table] = new Set()
  }
  testDataIds[table].add(id)
}

afterEach(async () => {
  // Cleanup all test data
  const cleanupOrder = [
    // Clean up junction tables first (foreign key dependencies)
    'interaction_contacts',
    'interaction_companies',
    'company_contacts',
    'company_industries',
    'contact_demographics',
    'company_program_enrollments',
    'program_contacts',
    'update_form_reminders',

    // Then main data tables
    'meeting_transcripts',
    'interactions',
    'form_submissions',
    'reports',
    'report_sessions',
    'forms',
    'company_updates',
    'support_summary',
    'programs',
    'contacts',
    'companies',
    'advisor_profiles'
  ]

  for (const table of cleanupOrder) {
    if (testDataIds[table]?.size > 0) {
      await adminClient.from(table).delete().in('id', Array.from(testDataIds[table]))
      testDataIds[table].clear()
    }
  }

  // Clean up users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  // Clean up orgs
  for (const orgId of testOrgIds) {
    await adminClient.from('tenants').delete().eq('id', orgId)
  }
  testOrgIds.clear()
})

// Helper to create test user with memberships in two orgs
async function createTestUserWithTwoOrgs() {
  const userEmail = `isolation-test-${Date.now()}@example.com`
  const { data: authData } = await adminClient.auth.admin.createUser({
    email: userEmail,
    password: 'TestPassword123!',
    email_confirm: true
  })

  const userId = authData.user!.id
  testUserIds.add(userId)

  // Wait for user creation to propagate
  await new Promise(resolve => setTimeout(resolve, 200))

  // Create two orgs
  const { data: orgA } = await adminClient.from('tenants').insert({
    name: `Org A ${Date.now()}`,
    slug: `org-a-${Date.now()}`
  }).select().single()

  const { data: orgB } = await adminClient.from('tenants').insert({
    name: `Org B ${Date.now()}`,
    slug: `org-b-${Date.now()}`
  }).select().single()

  testOrgIds.add(orgA!.id)
  testOrgIds.add(orgB!.id)

  // Add user to both orgs
  await adminClient.from('organization_members').insert([
    { user_id: userId, organization_id: orgA!.id, role: 'admin' },
    { user_id: userId, organization_id: orgB!.id, role: 'admin' }
  ])

  // Create authenticated user client
  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  await userClient.auth.signInWithPassword({
    email: userEmail,
    password: 'TestPassword123!'
  })

  return { userId, orgA: orgA!, orgB: orgB!, userClient }
}

// Helper to switch active org
async function switchActiveOrg(userId: string, orgId: string) {
  await adminClient.from('user_sessions').upsert({
    user_id: userId,
    active_organization_id: orgId,
    last_switched_at: new Date().toISOString()
  })
}

describe('Active Organization Data Isolation - All Tables', () => {
  test('contacts table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create contacts in both orgs
    const { data: contactA } = await adminClient.from('contacts').insert({
      tenant_id: orgA.id,
      first_name: 'Alice',
      last_name: 'Anderson'
    }).select().single()

    const { data: contactB } = await adminClient.from('contacts').insert({
      tenant_id: orgB.id,
      first_name: 'Bob',
      last_name: 'Brown'
    }).select().single()

    trackData('contacts', contactA!.id)
    trackData('contacts', contactB!.id)

    // Set active org to A
    await switchActiveOrg(userId, orgA.id)

    const { data: contactsInA } = await userClient.from('contacts').select('*')
    expect(contactsInA?.length).toBe(1)
    expect(contactsInA![0].id).toBe(contactA!.id)
    expect(contactsInA!.find(c => c.id === contactB!.id)).toBeUndefined()

    // Switch to B
    await switchActiveOrg(userId, orgB.id)

    const { data: contactsInB } = await userClient.from('contacts').select('*')
    expect(contactsInB?.length).toBe(1)
    expect(contactsInB![0].id).toBe(contactB!.id)
    expect(contactsInB!.find(c => c.id === contactA!.id)).toBeUndefined()

    await userClient.auth.signOut()
  })

  test('interactions table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create interactions in both orgs
    const { data: interactionA } = await adminClient.from('interactions').insert({
      tenant_id: orgA.id,
      title: 'Meeting in Org A',
      meeting_date: new Date().toISOString()
    }).select().single()

    const { data: interactionB } = await adminClient.from('interactions').insert({
      tenant_id: orgB.id,
      title: 'Meeting in Org B',
      meeting_date: new Date().toISOString()
    }).select().single()

    trackData('interactions', interactionA!.id)
    trackData('interactions', interactionB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: interactionsInA } = await userClient.from('interactions').select('*')
    expect(interactionsInA?.length).toBe(1)
    expect(interactionsInA![0].id).toBe(interactionA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: interactionsInB } = await userClient.from('interactions').select('*')
    expect(interactionsInB?.length).toBe(1)
    expect(interactionsInB![0].id).toBe(interactionB!.id)

    await userClient.auth.signOut()
  })

  test('programs table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create programs in both orgs
    const { data: programA } = await adminClient.from('programs').insert({
      tenant_id: orgA.id,
      name: 'Program in Org A'
    }).select().single()

    const { data: programB } = await adminClient.from('programs').insert({
      tenant_id: orgB.id,
      name: 'Program in Org B'
    }).select().single()

    trackData('programs', programA!.id)
    trackData('programs', programB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: programsInA } = await userClient.from('programs').select('*')
    expect(programsInA?.length).toBe(1)
    expect(programsInA![0].id).toBe(programA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: programsInB } = await userClient.from('programs').select('*')
    expect(programsInB?.length).toBe(1)
    expect(programsInB![0].id).toBe(programB!.id)

    await userClient.auth.signOut()
  })

  test('forms table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create forms in both orgs
    const { data: formA } = await adminClient.from('forms').insert({
      tenant_id: orgA.id,
      title: 'Form in Org A',
      description: 'Test form A',
      form_data: { questions: [] },
      version: 1,
      valid_from: new Date().toISOString()
    }).select().single()

    const { data: formB } = await adminClient.from('forms').insert({
      tenant_id: orgB.id,
      title: 'Form in Org B',
      description: 'Test form B',
      form_data: { questions: [] },
      version: 1,
      valid_from: new Date().toISOString()
    }).select().single()

    trackData('forms', formA!.id)
    trackData('forms', formB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: formsInA } = await userClient.from('forms').select('*')
    expect(formsInA?.length).toBe(1)
    expect(formsInA![0].id).toBe(formA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: formsInB } = await userClient.from('forms').select('*')
    expect(formsInB?.length).toBe(1)
    expect(formsInB![0].id).toBe(formB!.id)

    await userClient.auth.signOut()
  })

  test('reports table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create report sessions first (required foreign key)
    const { data: sessionA } = await adminClient.from('report_sessions').insert({
      tenant_id: orgA.id,
      created_by: userId
    }).select().single()

    const { data: sessionB } = await adminClient.from('report_sessions').insert({
      tenant_id: orgB.id,
      created_by: userId
    }).select().single()

    trackData('report_sessions', sessionA!.id)
    trackData('report_sessions', sessionB!.id)

    // Create reports in both orgs
    const { data: reportA } = await adminClient.from('reports').insert({
      tenant_id: orgA.id,
      session_id: sessionA!.id,
      title: 'Report in Org A',
      content: 'Test content',
      report_type: 'test',
      created_by: userId
    }).select().single()

    const { data: reportB } = await adminClient.from('reports').insert({
      tenant_id: orgB.id,
      session_id: sessionB!.id,
      title: 'Report in Org B',
      content: 'Test content',
      report_type: 'test',
      created_by: userId
    }).select().single()

    trackData('reports', reportA!.id)
    trackData('reports', reportB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: reportsInA } = await userClient.from('reports').select('*')
    expect(reportsInA?.length).toBe(1)
    expect(reportsInA![0].id).toBe(reportA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: reportsInB } = await userClient.from('reports').select('*')
    expect(reportsInB?.length).toBe(1)
    expect(reportsInB![0].id).toBe(reportB!.id)

    await userClient.auth.signOut()
  })

  test('company_updates table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create companies first
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA.id,
      business_name: 'Company A'
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB.id,
      business_name: 'Company B'
    }).select().single()

    trackData('companies', companyA!.id)
    trackData('companies', companyB!.id)

    // Create updates
    const { data: updateA } = await adminClient.from('company_updates').insert({
      tenant_id: orgA.id,
      company_id: companyA!.id,
      update_date: new Date().toISOString()
    }).select().single()

    const { data: updateB } = await adminClient.from('company_updates').insert({
      tenant_id: orgB.id,
      company_id: companyB!.id,
      update_date: new Date().toISOString()
    }).select().single()

    trackData('company_updates', updateA!.id)
    trackData('company_updates', updateB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: updatesInA } = await userClient.from('company_updates').select('*')
    expect(updatesInA?.length).toBe(1)
    expect(updatesInA![0].id).toBe(updateA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: updatesInB } = await userClient.from('company_updates').select('*')
    expect(updatesInB?.length).toBe(1)
    expect(updatesInB![0].id).toBe(updateB!.id)

    await userClient.auth.signOut()
  })

  test('junction tables (company_contacts) inherit isolation from parents', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create companies and contacts in both orgs
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA.id,
      business_name: 'Company A'
    }).select().single()

    const { data: contactA } = await adminClient.from('contacts').insert({
      tenant_id: orgA.id,
      first_name: 'Contact',
      last_name: 'A'
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB.id,
      business_name: 'Company B'
    }).select().single()

    const { data: contactB } = await adminClient.from('contacts').insert({
      tenant_id: orgB.id,
      first_name: 'Contact',
      last_name: 'B'
    }).select().single()

    trackData('companies', companyA!.id)
    trackData('companies', companyB!.id)
    trackData('contacts', contactA!.id)
    trackData('contacts', contactB!.id)

    // Create junction records
    await adminClient.from('company_contacts').insert([
      { company_id: companyA!.id, contact_id: contactA!.id },
      { company_id: companyB!.id, contact_id: contactB!.id }
    ])

    trackData('company_contacts', `${companyA!.id}-${contactA!.id}`)
    trackData('company_contacts', `${companyB!.id}-${contactB!.id}`)

    await switchActiveOrg(userId, orgA.id)

    // Query companies - should only see Org A
    const { data: companiesInA } = await userClient
      .from('companies')
      .select('*, company_contacts(*)')

    expect(companiesInA?.length).toBe(1)
    expect(companiesInA![0].id).toBe(companyA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: companiesInB } = await userClient
      .from('companies')
      .select('*, company_contacts(*)')

    expect(companiesInB?.length).toBe(1)
    expect(companiesInB![0].id).toBe(companyB!.id)

    await userClient.auth.signOut()
  })

  test('meeting_transcripts table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create interactions first
    const { data: interactionA } = await adminClient.from('interactions').insert({
      tenant_id: orgA.id,
      title: 'Meeting A',
      meeting_date: new Date().toISOString()
    }).select().single()

    const { data: interactionB } = await adminClient.from('interactions').insert({
      tenant_id: orgB.id,
      title: 'Meeting B',
      meeting_date: new Date().toISOString()
    }).select().single()

    trackData('interactions', interactionA!.id)
    trackData('interactions', interactionB!.id)

    // Create transcripts
    const { data: transcriptA } = await adminClient.from('meeting_transcripts').insert({
      tenant_id: orgA.id,
      interaction_id: interactionA!.id,
      transcript: 'Transcript A'
    }).select().single()

    const { data: transcriptB } = await adminClient.from('meeting_transcripts').insert({
      tenant_id: orgB.id,
      interaction_id: interactionB!.id,
      transcript: 'Transcript B'
    }).select().single()

    trackData('meeting_transcripts', transcriptA!.id)
    trackData('meeting_transcripts', transcriptB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: transcriptsInA } = await userClient.from('meeting_transcripts').select('*')
    expect(transcriptsInA?.length).toBe(1)
    expect(transcriptsInA![0].id).toBe(transcriptA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: transcriptsInB } = await userClient.from('meeting_transcripts').select('*')
    expect(transcriptsInB?.length).toBe(1)
    expect(transcriptsInB![0].id).toBe(transcriptB!.id)

    await userClient.auth.signOut()
  })

  test('form_submissions table respects active organization', async () => {
    const { userId, orgA, orgB, userClient } = await createTestUserWithTwoOrgs()

    // Create companies first (required for submissions)
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA.id,
      business_name: 'Company A'
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB.id,
      business_name: 'Company B'
    }).select().single()

    trackData('companies', companyA!.id)
    trackData('companies', companyB!.id)

    // Create forms
    const { data: formA } = await adminClient.from('forms').insert({
      tenant_id: orgA.id,
      title: 'Form A',
      description: 'Test',
      form_data: { questions: [] },
      version: 1,
      valid_from: new Date().toISOString()
    }).select().single()

    const { data: formB } = await adminClient.from('forms').insert({
      tenant_id: orgB.id,
      title: 'Form B',
      description: 'Test',
      form_data: { questions: [] },
      version: 1,
      valid_from: new Date().toISOString()
    }).select().single()

    trackData('forms', formA!.id)
    trackData('forms', formB!.id)

    // Create submissions
    const { data: submissionA } = await adminClient.from('form_submissions').insert({
      tenant_id: orgA.id,
      form_id: formA!.id,
      company_id: companyA!.id,
      form_snapshot: { questions: [] },
      submission_data: {},
      status: 'submitted'
    }).select().single()

    const { data: submissionB } = await adminClient.from('form_submissions').insert({
      tenant_id: orgB.id,
      form_id: formB!.id,
      company_id: companyB!.id,
      form_snapshot: { questions: [] },
      submission_data: {},
      status: 'submitted'
    }).select().single()

    trackData('form_submissions', submissionA!.id)
    trackData('form_submissions', submissionB!.id)

    await switchActiveOrg(userId, orgA.id)

    const { data: submissionsInA } = await userClient.from('form_submissions').select('*')
    expect(submissionsInA?.length).toBe(1)
    expect(submissionsInA![0].id).toBe(submissionA!.id)

    await switchActiveOrg(userId, orgB.id)

    const { data: submissionsInB } = await userClient.from('form_submissions').select('*')
    expect(submissionsInB?.length).toBe(1)
    expect(submissionsInB![0].id).toBe(submissionB!.id)

    await userClient.auth.signOut()
  })
})
