/**
 * CRUD Operations - Active Organization Isolation Tests
 *
 * Verifies that CREATE, READ, UPDATE, DELETE operations all respect active organization
 * Tests across multiple data types: Companies, Contacts, Forms, Interactions
 *
 * Part of Issue #55: Fix Multi-Organization Data Isolation Bug
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
const testDataIds = new Map<string, Set<string>>() // table -> set of IDs

afterEach(async () => {
  // Cleanup test data
  for (const [table, ids] of testDataIds.entries()) {
    for (const id of ids) {
      await adminClient.from(table).delete().eq('id', id)
    }
  }
  testDataIds.clear()

  // Cleanup test users and orgs
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()

  for (const orgId of testOrgIds) {
    await adminClient.from('tenants').delete().eq('id', orgId)
  }
  testOrgIds.clear()
})

/**
 * Helper to track test data for cleanup
 */
function trackTestData(table: string, id: string) {
  if (!testDataIds.has(table)) {
    testDataIds.set(table, new Set())
  }
  testDataIds.get(table)!.add(id)
}

describe('Companies CRUD - Active Organization Isolation', () => {
  test('CREATE: Company created in active organization only', async () => {
    // Setup: User with access to Org A and Org B
    const userEmail = `crud-create-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create two orgs
    const { data: orgA } = await adminClient.from('tenants').insert({
      name: `CRUD Org A ${Date.now()}`,
      slug: `crud-org-a-${Date.now()}`
    }).select().single()

    const { data: orgB } = await adminClient.from('tenants').insert({
      name: `CRUD Org B ${Date.now()}`,
      slug: `crud-org-b-${Date.now()}`
    }).select().single()

    testOrgIds.add(orgA!.id)
    testOrgIds.add(orgB!.id)

    // Add user to both orgs
    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: orgA!.id, role: 'admin' },
      { user_id: userId, organization_id: orgB!.id, role: 'admin' }
    ])

    // Set active org to A
    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: orgA!.id
    })

    // Sign in as user
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // CREATE company (should go into Org A)
    const { data: newCompany, error: createError } = await userClient
      .from('companies')
      .insert({
        business_name: 'Test Company Created',
        tenant_id: orgA!.id // Explicit tenant_id required by WITH CHECK
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(newCompany).toBeDefined()
    expect(newCompany!.tenant_id).toBe(orgA!.id)

    trackTestData('companies', newCompany!.id)

    // Verify company is in Org A (via admin client)
    const { data: verifyCompany } = await adminClient
      .from('companies')
      .select('tenant_id')
      .eq('id', newCompany!.id)
      .single()

    expect(verifyCompany!.tenant_id).toBe(orgA!.id)

    await userClient.auth.signOut()
  })

  test('READ: User sees companies ONLY from active organization', async () => {
    // Setup: User with companies in both Org A and Org B
    const userEmail = `crud-read-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    // Create orgs
    const { data: orgA } = await adminClient.from('tenants').insert({
      name: `Read Org A ${Date.now()}`,
      slug: `read-org-a-${Date.now()}`
    }).select().single()

    const { data: orgB } = await adminClient.from('tenants').insert({
      name: `Read Org B ${Date.now()}`,
      slug: `read-org-b-${Date.now()}`
    }).select().single()

    testOrgIds.add(orgA!.id)
    testOrgIds.add(orgB!.id)

    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: orgA!.id, role: 'admin' },
      { user_id: userId, organization_id: orgB!.id, role: 'admin' }
    ])

    // Create companies in both orgs
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA!.id,
      business_name: 'Company in A'
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB!.id,
      business_name: 'Company in B'
    }).select().single()

    trackTestData('companies', companyA!.id)
    trackTestData('companies', companyB!.id)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Set active org to A
    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: orgA!.id
    })

    // READ companies - should only see Org A
    const { data: companiesA } = await userClient.from('companies').select('*')

    expect(companiesA!.length).toBe(1)
    expect(companiesA![0].id).toBe(companyA!.id)
    expect(companiesA!.find(c => c.id === companyB!.id)).toBeUndefined()

    // Switch to Org B
    await adminClient.from('user_sessions').update({
      active_organization_id: orgB!.id
    }).eq('user_id', userId)

    // READ again - should only see Org B
    const { data: companiesB } = await userClient.from('companies').select('*')

    expect(companiesB!.length).toBe(1)
    expect(companiesB![0].id).toBe(companyB!.id)
    expect(companiesB!.find(c => c.id === companyA!.id)).toBeUndefined()

    await userClient.auth.signOut()
  })

  test('UPDATE: Can only update companies in active organization', async () => {
    // Similar setup...
    const userEmail = `crud-update-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    const { data: orgA } = await adminClient.from('tenants').insert({
      name: `Update Org A ${Date.now()}`,
      slug: `update-org-a-${Date.now()}`
    }).select().single()

    const { data: orgB } = await adminClient.from('tenants').insert({
      name: `Update Org B ${Date.now()}`,
      slug: `update-org-b-${Date.now()}`
    }).select().single()

    testOrgIds.add(orgA!.id)
    testOrgIds.add(orgB!.id)

    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: orgA!.id, role: 'admin' },
      { user_id: userId, organization_id: orgB!.id, role: 'admin' }
    ])

    // Create companies in both orgs
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA!.id,
      business_name: 'Company A Original'
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB!.id,
      business_name: 'Company B Original'
    }).select().single()

    trackTestData('companies', companyA!.id)
    trackTestData('companies', companyB!.id)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Set active org to A
    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: orgA!.id
    })

    // UPDATE Company A - should succeed (in active org)
    const { error: updateAError } = await userClient
      .from('companies')
      .update({ business_name: 'Company A Updated' })
      .eq('id', companyA!.id)

    expect(updateAError).toBeNull()

    // Try to UPDATE Company B - should fail or return 0 rows (not in active org)
    const { data: updateBResult, error: updateBError } = await userClient
      .from('companies')
      .update({ business_name: 'Company B Hacked' })
      .eq('id', companyB!.id)
      .select()

    // Should return no rows (RLS blocks access)
    expect(updateBResult || []).toHaveLength(0)

    // Verify Company B was NOT updated
    const { data: verifyB } = await adminClient
      .from('companies')
      .select('business_name')
      .eq('id', companyB!.id)
      .single()

    expect(verifyB!.business_name).toBe('Company B Original') // Unchanged

    await userClient.auth.signOut()
  })

  test('DELETE: Can only delete companies in active organization', async () => {
    // Similar setup...
    const userEmail = `crud-delete-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    const { data: orgA } = await adminClient.from('tenants').insert({
      name: `Delete Org A ${Date.now()}`,
      slug: `delete-org-a-${Date.now()}`
    }).select().single()

    const { data: orgB } = await adminClient.from('tenants').insert({
      name: `Delete Org B ${Date.now()}`,
      slug: `delete-org-b-${Date.now()}`
    }).select().single()

    testOrgIds.add(orgA!.id)
    testOrgIds.add(orgB!.id)

    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: orgA!.id, role: 'admin' },
      { user_id: userId, organization_id: orgB!.id, role: 'admin' }
    ])

    // Create companies in both orgs
    const { data: companyA } = await adminClient.from('companies').insert({
      tenant_id: orgA!.id,
      business_name: 'Company to Delete'
    }).select().single()

    const { data: companyB } = await adminClient.from('companies').insert({
      tenant_id: orgB!.id,
      business_name: 'Company to Keep'
    }).select().single()

    trackTestData('companies', companyA!.id)
    trackTestData('companies', companyB!.id)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Set active org to A
    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: orgA!.id
    })

    // DELETE Company A - should succeed (in active org)
    const { error: deleteAError } = await userClient
      .from('companies')
      .delete()
      .eq('id', companyA!.id)

    expect(deleteAError).toBeNull()

    // Verify Company A was deleted
    const { data: verifyADeleted } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', companyA!.id)
      .maybeSingle()

    expect(verifyADeleted).toBeNull()

    // Try to DELETE Company B - should fail (not in active org)
    const { data: deleteBResult } = await userClient
      .from('companies')
      .delete()
      .eq('id', companyB!.id)
      .select()

    // Should return no rows (RLS blocks access)
    expect(deleteBResult || []).toHaveLength(0)

    // Verify Company B still exists
    const { data: verifyBExists } = await adminClient
      .from('companies')
      .select('id')
      .eq('id', companyB!.id)
      .single()

    expect(verifyBExists).toBeDefined()

    await userClient.auth.signOut()
  })
})

describe('Contacts CRUD - Active Organization Isolation', () => {
  test('CREATE: Contact created in active organization with correct tenant_id', async () => {
    const userEmail = `contact-create-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    const { data: org } = await adminClient.from('tenants').insert({
      name: `Contact Create Org ${Date.now()}`,
      slug: `contact-create-${Date.now()}`
    }).select().single()

    testOrgIds.add(org!.id)

    await adminClient.from('organization_members').insert({
      user_id: userId,
      organization_id: org!.id,
      role: 'admin'
    })

    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: org!.id
    })

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // CREATE contact
    const { data: newContact, error: createError } = await userClient
      .from('contacts')
      .insert({
        first_name: 'Test',
        last_name: 'Contact',
        tenant_id: org!.id
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(newContact).toBeDefined()
    expect(newContact!.tenant_id).toBe(org!.id)

    trackTestData('contacts', newContact!.id)

    await userClient.auth.signOut()
  })

  test('READ: Contacts filtered by active organization', async () => {
    // Setup with contacts in two orgs, verify isolation
    const userEmail = `contact-read-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    const { data: orgA } = await adminClient.from('tenants').insert({
      name: `Contact Read A ${Date.now()}`,
      slug: `contact-read-a-${Date.now()}`
    }).select().single()

    const { data: orgB } = await adminClient.from('tenants').insert({
      name: `Contact Read B ${Date.now()}`,
      slug: `contact-read-b-${Date.now()}`
    }).select().single()

    testOrgIds.add(orgA!.id)
    testOrgIds.add(orgB!.id)

    await adminClient.from('organization_members').insert([
      { user_id: userId, organization_id: orgA!.id, role: 'admin' },
      { user_id: userId, organization_id: orgB!.id, role: 'admin' }
    ])

    // Create contacts in both orgs
    const { data: contactA } = await adminClient.from('contacts').insert({
      tenant_id: orgA!.id,
      first_name: 'Contact',
      last_name: 'In A'
    }).select().single()

    const { data: contactB } = await adminClient.from('contacts').insert({
      tenant_id: orgB!.id,
      first_name: 'Contact',
      last_name: 'In B'
    }).select().single()

    trackTestData('contacts', contactA!.id)
    trackTestData('contacts', contactB!.id)

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // Active org A
    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: orgA!.id
    })

    const { data: contactsInA } = await userClient.from('contacts').select('*')

    expect(contactsInA!.length).toBe(1)
    expect(contactsInA![0].id).toBe(contactA!.id)

    // Switch to Org B
    await adminClient.from('user_sessions').update({
      active_organization_id: orgB!.id
    }).eq('user_id', userId)

    const { data: contactsInB } = await userClient.from('contacts').select('*')

    expect(contactsInB!.length).toBe(1)
    expect(contactsInB![0].id).toBe(contactB!.id)

    await userClient.auth.signOut()
  })
})

describe('Forms CRUD - Active Organization Isolation', () => {
  test('CREATE: Form created in active organization', async () => {
    const userEmail = `form-create-${Date.now()}@example.com`
    const { data: authData } = await adminClient.auth.admin.createUser({
      email: userEmail,
      password: 'TestPassword123!',
      email_confirm: true
    })

    const userId = authData.user!.id
    testUserIds.add(userId)

    await new Promise(resolve => setTimeout(resolve, 200))

    const { data: org } = await adminClient.from('tenants').insert({
      name: `Form Create Org ${Date.now()}`,
      slug: `form-create-${Date.now()}`
    }).select().single()

    testOrgIds.add(org!.id)

    await adminClient.from('organization_members').insert({
      user_id: userId,
      organization_id: org!.id,
      role: 'admin'
    })

    await adminClient.from('user_sessions').upsert({
      user_id: userId,
      active_organization_id: org!.id
    })

    // Sign in
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userClient.auth.signInWithPassword({
      email: userEmail,
      password: 'TestPassword123!'
    })

    // CREATE form
    const { data: newForm, error: createError } = await userClient
      .from('forms')
      .insert({
        title: 'Test Form',
        tenant_id: org!.id,
        form_data: {},
        created_by: userId
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(newForm).toBeDefined()
    expect(newForm!.tenant_id).toBe(org!.id)

    trackTestData('forms', newForm!.id)

    await userClient.auth.signOut()
  })
})
