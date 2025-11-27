/**
 * Company Milestone Integration Tests
 *
 * Verifies that companies can be linked to milestone tracks.
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'
const testCompanyIds = new Set<string>()
const testTrackIds = new Set<string>()
const testUserIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  for (const id of testCompanyIds) await adminClient.from('companies').delete().eq('id', id)
  for (const id of testTrackIds) await adminClient.from('milestone_tracks').delete().eq('id', id)
  for (const id of testUserIds) await adminClient.auth.admin.deleteUser(id)
  
  testCompanyIds.clear()
  testTrackIds.clear()
  testUserIds.clear()
})

describe('Company Milestone Integration', () => {
  test('can create company with milestone_track_id', async () => {
    // 1. Setup User (Old style user_metadata + New style members/sessions just in case)
    const email = `milestone-company-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_ID }
    })
    if (!user) throw new Error('User failed')
    testUserIds.add(user.id)

    await adminClient.from('organization_members').insert({
      user_id: user.id,
      organization_id: TENANT_ID,
      role: 'admin'
    })
    await adminClient.from('user_sessions').insert({
      user_id: user.id,
      active_organization_id: TENANT_ID
    })

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // 2. Create Track
    const { data: track } = await userClient
      .from('milestone_tracks')
      .insert({ tenant_id: TENANT_ID, title: 'Track' })
      .select()
      .single()
    
    if (!track) throw new Error('Track creation failed')
    testTrackIds.add(track.id)

    // 3. Create Company with Track
    // Note: This uses the DAL if we call the ACTION, but here we test DB/RLS/Schema directly first.
    // Actually, we should test the DAL function `createCompany`.
    // But we can't import DAL in Jest easily if it uses server-only stuff (cookies).
    // So we test via Client (Schema support).
    
    const { data: company, error } = await userClient
      .from('companies')
      .insert({
        tenant_id: TENANT_ID,
        business_name: 'Tracked Co',
        company_type: 'Startup',
        city: 'City',
        province: 'Ontario',
        milestone_track_id: track.id
      })
      .select()
      .single()

    if (error) console.error(error)
    expect(error).toBeNull()
    expect(company).toBeDefined()
    expect(company.milestone_track_id).toBe(track.id)
    
    if (company) testCompanyIds.add(company.id)
  })
})



