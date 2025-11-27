/**
 * Market Milestones DAL Schema Tests
 *
 * Following TDD: These tests are written FIRST and should FAIL until schema and DAL are implemented.
 *
 * Tests verify:
 * - Creation of Milestone Tracks and Definitions
 * - RLS isolation for custom tracks
 * - Visibility of System Standard tracks (tenant_id = null)
 * - Logging of Company Progress
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_2_ID = '22222222-2222-2222-2222-222222222222'

const testUserIds = new Set<string>()
const testCompanyIds = new Set<string>()
const testTrackIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

console.log('Service Key Present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('Service Key Length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length)

afterEach(async () => {
  // Cleanup tracks (cascades to definitions)
  for (const trackId of testTrackIds) {
    await adminClient.from('commitment_tracks').delete().eq('id', trackId)
  }
  testTrackIds.clear()

  // Cleanup companies (cascades to progress)
  for (const companyId of testCompanyIds) {
    await adminClient.from('companies').delete().eq('id', companyId)
  }
  testCompanyIds.clear()

  // Cleanup users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

describe('Market Milestones Schema & Access Control', () => {
  test('can create custom milestone track and definitions', async () => {
    // 1. Setup User
    const email = `milestone-creator-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_1_ID }
    })
    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Add to organization members (Required for RLS)
    await adminClient.from('organization_members').insert({
      user_id: user.id,
      organization_id: TENANT_1_ID,
      role: 'admin'
    })

    // Create session
    await adminClient.from('user_sessions').insert({
      user_id: user.id,
      active_organization_id: TENANT_1_ID
    })

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // 2. Create Track
    const { data: track, error: trackError } = await userClient
      .from('commitment_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        title: 'Custom SaaS Track',
        description: 'Modified for our accelerator'
      })
      .select()
      .single()

    expect(trackError).toBeNull()
    expect(track).toBeDefined()
    expect(track.title).toBe('Custom SaaS Track')
    testTrackIds.add(track.id)

    // 3. Create Definition
    const { data: def, error: defError } = await userClient
      .from('commitment_definitions')
      .insert({
        track_id: track.id,
        title: 'Problem Validation',
        description: '10 Interviews',
        order_index: 1
      })
      .select()
      .single()

    expect(defError).toBeNull()
    expect(def).toBeDefined()
    expect(def.title).toBe('Problem Validation')
  })

  test('users can see System Standard tracks (tenant_id is NULL)', async () => {
    // 1. Create System Track (as Admin)
    const { data: systemTrack, error: systemTrackError } = await adminClient
      .from('commitment_tracks')
      .insert({
        tenant_id: null, // System Standard
        title: 'G7 Standard SaaS',
        is_system_standard: true
      })
      .select()
      .single()

    if (systemTrackError) console.error('System track creation error:', systemTrackError)
    if (systemTrack) testTrackIds.add(systemTrack.id)

    // 2. Setup User in Tenant 1
    const email = `milestone-viewer-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_1_ID }
    })
    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Add to organization members (Required for RLS)
    await adminClient.from('organization_members').insert({
      user_id: user.id,
      organization_id: TENANT_1_ID,
      role: 'viewer'
    })

    // Create session
    await adminClient.from('user_sessions').insert({
      user_id: user.id,
      active_organization_id: TENANT_1_ID
    })

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // 3. Query Tracks
    const { data: tracks, error: queryError } = await userClient.from('commitment_tracks').select('*')
    if (queryError) console.error('Query error:', queryError)

    // Should see the system track
    const found = tracks?.find(t => t.id === systemTrack?.id)
    expect(found).toBeDefined()
  })

  test('RLS prevents seeing other tenants custom tracks', async () => {
    // 1. Create Custom Track for Tenant 2 (as Admin for simplicity)
    const { data: tenant2Track } = await adminClient
      .from('commitment_tracks')
      .insert({
        tenant_id: TENANT_2_ID,
        title: 'Tenant 2 Secret Track'
      })
      .select()
      .single()
    if (tenant2Track) testTrackIds.add(tenant2Track.id)

    // 2. Setup User in Tenant 1
    const email = `milestone-spy-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_1_ID }
    })
    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Add to organization members (Required for RLS)
    await adminClient.from('organization_members').insert({
      user_id: user.id,
      organization_id: TENANT_1_ID,
      role: 'viewer'
    })

    // Create session
    await adminClient.from('user_sessions').insert({
      user_id: user.id,
      active_organization_id: TENANT_1_ID
    })

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // 3. Query Tracks
    const { data: tracks } = await userClient.from('commitment_tracks').select('*')

    // Should NOT see Tenant 2's track
    const found = tracks?.find(t => t.id === tenant2Track?.id)
    expect(found).toBeUndefined()
  })

  test('can log milestone progress for a company', async () => {
    // 1. Setup User
    const email = `milestone-logger-${Date.now()}@test.com`
    const { data: { user } } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { tenant_id: TENANT_1_ID }
    })
    if (!user) throw new Error('User creation failed')
    testUserIds.add(user.id)

    // Add to organization members (Required for RLS)
    await adminClient.from('organization_members').insert({
      user_id: user.id,
      organization_id: TENANT_1_ID,
      role: 'admin'
    })

    // Create session
    await adminClient.from('user_sessions').insert({
      user_id: user.id,
      active_organization_id: TENANT_1_ID
    })

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // 2. Create Company
    const { data: company, error: companyError } = await userClient
      .from('companies')
      .insert({
        tenant_id: TENANT_1_ID,
        business_name: 'Milestone Corp',
        company_type: 'Startup',
        city: 'Toronto',
        province: 'Ontario'
      })
      .select()
      .single()
    if (companyError) console.error('Company creation error:', companyError)
    if (!company) throw new Error('Company failed')
    testCompanyIds.add(company.id)

    // 3. Create Track & Definition
    const { data: track } = await userClient
      .from('commitment_tracks')
      .insert({ tenant_id: TENANT_1_ID, title: 'Track' }).select().single()
    testTrackIds.add(track.id)

    const { data: def } = await userClient
      .from('commitment_definitions')
      .insert({ track_id: track.id, title: 'Step 1', order_index: 1 }).select().single()

    // 4. Log Progress
    const { data: progress, error: progressError } = await userClient
      .from('company_commitments_progress')
      .insert({
        tenant_id: TENANT_1_ID,
        company_id: company.id,
        commitment_id: def.id,
        status: 'achieved',
        achieved_at: new Date().toISOString(),
        verified_by_user_id: user.id
      })
      .select()
      .single()

    expect(progressError).toBeNull()
    expect(progress).toBeDefined()
    expect(progress.status).toBe('achieved')
    expect(progress.verified_by_user_id).toBe(user.id)
  })
})

