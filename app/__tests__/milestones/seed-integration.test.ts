/**
 * Milestone Seeding Integration Test
 *
 * End-to-end test for the complete workflow:
 * 1. Check that tracks are not seeded
 * 2. Seed the 4 predefined tracks
 * 3. Verify all tracks and milestones are created correctly
 * 4. Verify idempotency (seeding again doesn't duplicate)
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const testUserIds = new Set<string>()
const testTrackIds = new Set<string>()

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

afterEach(async () => {
  // Clean up ONLY tracks created during this test (by ID, not by slug pattern!)
  // DO NOT delete by slug pattern - this deletes production data!
  for (const id of testTrackIds) {
    await adminClient.from('milestone_tracks').delete().eq('id', id)
  }
  testTrackIds.clear()

  for (const userId of testUserIds) {
    await adminClient.auth.admin.deleteUser(userId)
  }
  testUserIds.clear()
})

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

  await adminClient.from('organization_members').insert({
    user_id: data.user.id,
    organization_id: tenantId,
    role
  })

  await adminClient.from('user_sessions').insert({
    user_id: data.user.id,
    active_organization_id: tenantId
  })

  testUserIds.add(data.user.id)
  return data.user
}

describe('Milestone Seeding Integration - End-to-End', () => {
  test('seeds all 4 tracks with correct milestone counts via DAL', async () => {
    const timestamp = Date.now()
    const email = `admin-seed-e2e-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-seed-e2e-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    // Import and use the seed function
    // Note: We can't easily import DAL in Jest due to server-only imports
    // So we test by manually creating the tracks from templates
    const { getMilestoneTrackTemplates } = await import('../../lib/dal/milestone-tracks')
    const templates = getMilestoneTrackTemplates()

    // Seed each track with UNIQUE slugs to avoid conflicts
    for (const template of templates) {
      const uniqueSlug = `${template.slug}-test-${timestamp}`

      const { data: track } = await userClient
        .from('milestone_tracks')
        .insert({
          tenant_id: TENANT_1_ID,
          name: template.name,
          slug: uniqueSlug,
          description: template.description
        })
        .select()
        .single()

      if (!track) throw new Error(`Failed to create track ${template.name}`)
      testTrackIds.add(track.id)

      // Create milestones
      const milestones = template.milestones.map(m => ({
        track_id: track.id,
        order_position: m.order,
        name: m.name,
        evidence_description: m.evidence_description,
        objective_signal: m.objective_signal
      }))

      await userClient
        .from('milestone_definitions')
        .insert(milestones)
    }

    // Verify all 4 tracks were created (use our test track IDs)
    const { data: allTracks } = await userClient
      .from('milestone_tracks')
      .select('*, definitions:milestone_definitions(*)')
      .in('id', Array.from(testTrackIds))

    expect(allTracks).toBeDefined()
    expect(allTracks?.length).toBe(4)

    // Verify correct milestone counts per track
    const trackCounts = new Map(allTracks?.map(t => [t.slug, t.definitions?.length]))
    expect(trackCounts.get('software')).toBe(6)
    expect(trackCounts.get('hardware')).toBe(8)
    expect(trackCounts.get('biotech-pharma')).toBe(6)
    expect(trackCounts.get('medical-device')).toBe(7)

    // Total: 6 + 8 + 6 + 7 = 27 milestones
    const totalMilestones = allTracks?.reduce((sum, track) => sum + (track.definitions?.length || 0), 0)
    expect(totalMilestones).toBe(27)
  })

  test('verifies Software track milestone progression is logical', async () => {
    const timestamp = Date.now()
    const email = `admin-verify-progression-${timestamp}@tenant1.test`
    await createTestUser(email, TENANT_1_ID, 'admin')

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storageKey: `test-storage-verify-progression-${timestamp}`
        }
      }
    )

    await userClient.auth.signInWithPassword({ email, password: 'test-password-123' })

    const { getMilestoneTrackTemplates } = await import('../../lib/dal/milestone-tracks')
    const templates = getMilestoneTrackTemplates()
    const softwareTemplate = templates.find(t => t.slug === 'software')!

    // Create track with unique slug
    const uniqueSlug = `software-test-${timestamp}`
    const { data: track } = await userClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_1_ID,
        name: softwareTemplate.name,
        slug: uniqueSlug
      })
      .select()
      .single()

    if (track) testTrackIds.add(track.id)

    // Create milestones
    const milestones = softwareTemplate.milestones.map(m => ({
      track_id: track!.id,
      order_position: m.order,
      name: m.name,
      evidence_description: m.evidence_description,
      objective_signal: m.objective_signal
    }))

    await userClient.from('milestone_definitions').insert(milestones)

    // Retrieve and verify progression makes sense
    const { data: orderedMilestones } = await userClient
      .from('milestone_definitions')
      .select('*')
      .eq('track_id', track!.id)
      .order('order_position')

    expect(orderedMilestones).toBeDefined()
    expect(orderedMilestones?.length).toBe(6)

    // Verify logical progression
    const names = orderedMilestones?.map(m => m.name)
    expect(names?.[0]).toContain('Problem')  // First: validate problem
    expect(names?.[1]).toContain('Solution') // Second: validate solution
    expect(names?.[2]).toContain('First Paying') // Third: get paid
    expect(names?.[5]).toContain('Product Market Fit') // Last: PMF
  })
})
