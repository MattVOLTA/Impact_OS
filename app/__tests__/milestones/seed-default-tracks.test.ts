/**
 * Seed Default Tracks Integration Test
 *
 * TDD: Tests the complete workflow of seeding 4 predefined milestone tracks
 * with all their milestone definitions.
 *
 * This is an integration test that verifies the entire milestone tracking
 * system works end-to-end.
 */

import { createClient } from '@supabase/supabase-js'
import { getMilestoneTrackTemplates } from '../../lib/dal/milestone-tracks'

// Test tenant ID
const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

// Track test IDs for cleanup
const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()

// Admin client for setup/cleanup
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cleanup after tests
afterEach(async () => {
  // Delete all test tracks (cascade will delete definitions)
  for (const id of testTrackIds) {
    await adminClient.from('milestone_tracks').delete().eq('id', id)
  }
  testTrackIds.clear()

  // Delete test users
  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

// Helper to create test user
async function createTestUser(email: string, tenantId: string, role: string = 'admin') {
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      first_name: 'Test',
      last_name: 'User',
      role
    }
  })

  if (error) throw error
  if (!data.user) throw new Error('User creation failed')

  const { error: memberError } = await adminClient.from('organization_members').insert({
    user_id: data.user.id,
    organization_id: tenantId,
    role
  })

  if (memberError) throw memberError

  const { error: sessionError } = await adminClient.from('user_sessions').insert({
    user_id: data.user.id,
    active_organization_id: tenantId
  })

  if (sessionError) throw sessionError

  testUserIds.add(data.user.id)
  return data.user
}

describe('Seed Default Milestone Tracks - Integration Test', () => {
  test('seeds all 4 predefined tracks with correct milestone counts', async () => {
    const timestamp = Date.now()
    const email = `admin-seed-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-seed-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Get templates
    const templates = getMilestoneTrackTemplates()

    expect(templates).toHaveLength(4)

    // Create each track with its milestones
    for (const template of templates) {
      // Create track
      const { data: track, error: trackError } = await userClient
        .from('milestone_tracks')
        .insert({
          tenant_id: TENANT_1_ID,
          name: template.name,
          slug: template.slug,
          description: template.description
        })
        .select()
        .single()

      expect(trackError).toBeNull()
      expect(track).toBeDefined()
      if (track) testTrackIds.add(track.id)

      // Create milestones for this track
      const milestonesToInsert = template.milestones.map(m => ({
        track_id: track!.id,
        order_position: m.order,
        name: m.name,
        evidence_description: m.evidence_description,
        objective_signal: m.objective_signal
      }))

      const { data: milestones, error: milestoneError } = await userClient
        .from('milestone_definitions')
        .insert(milestonesToInsert)
        .select()

      expect(milestoneError).toBeNull()
      expect(milestones).toBeDefined()
      expect(milestones?.length).toBe(template.milestones.length)
    }

    // Verify all tracks were created
    const { data: allTracks } = await userClient
      .from('milestone_tracks')
      .select('*, definitions:milestone_definitions(*)')
      .eq('tenant_id', TENANT_1_ID)
      .in('slug', ['software', 'hardware', 'biotech-pharma', 'medical-device'])

    expect(allTracks).toBeDefined()
    expect(allTracks?.length).toBe(4)

    // Verify milestone counts
    const software = allTracks?.find(t => t.slug === 'software')
    const hardware = allTracks?.find(t => t.slug === 'hardware')
    const biotech = allTracks?.find(t => t.slug === 'biotech-pharma')
    const medDevice = allTracks?.find(t => t.slug === 'medical-device')

    expect(software?.definitions).toHaveLength(6)
    expect(hardware?.definitions).toHaveLength(8)
    expect(biotech?.definitions).toHaveLength(6)
    expect(medDevice?.definitions).toHaveLength(7)
  })

  test('verifies Software track milestones are in correct order', async () => {
    const timestamp = Date.now()
    const email = `admin-verify-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-verify-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Get software template
    const templates = getMilestoneTrackTemplates()
    const softwareTemplate = templates.find(t => t.slug === 'software')!

    // Create track
    const { data: track } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: softwareTemplate.name,
        slug: softwareTemplate.slug,
        description: softwareTemplate.description
      })
      .select()
      .single()

    if (track) testTrackIds.add(track.id)

    // Create milestones
    const milestonesToInsert = softwareTemplate.milestones.map(m => ({
      track_id: track!.id,
      order_position: m.order,
      name: m.name,
      evidence_description: m.evidence_description,
      objective_signal: m.objective_signal
    }))

    await userClient
      .from('milestone_definitions')
      .insert(milestonesToInsert)

    // Retrieve ordered milestones
    const { data: milestones } = await userClient
      .from('milestone_definitions')
      .select('*')
      .eq('track_id', track!.id)
      .order('order_position')

    expect(milestones).toBeDefined()
    expect(milestones?.[0].name).toBe('Problem Validated')
    expect(milestones?.[1].name).toBe('Solution Validated')
    expect(milestones?.[2].name).toBe('First Paying Customer')
    expect(milestones?.[3].name).toBe('Repeatable Sales with ICP')
    expect(milestones?.[4].name).toBe('Early PM Fit')
    expect(milestones?.[5].name).toBe('Product Market Fit')
  })
})
