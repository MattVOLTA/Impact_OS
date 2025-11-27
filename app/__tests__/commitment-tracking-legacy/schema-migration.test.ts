/**
 * Commitment Tracking Schema Migration Tests
 *
 * TDD Phase 1 - RED: These tests should FAIL until migration runs
 *
 * Tests verify:
 * - Renamed tables exist (commitment_tracks, commitment_definitions, company_commitments_progress)
 * - Renamed columns exist (feature_commitment_tracking, commitment_track_id)
 * - Foreign key constraints are properly renamed
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Commitment Tracking Schema Migration', () => {
  describe('Table Renames', () => {
    test('commitment_tracks table exists', async () => {
      const { data, error } = await supabase
        .from('commitment_tracks')
        .select('count')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('commitment_definitions table exists', async () => {
      const { data, error } = await supabase
        .from('commitment_definitions')
        .select('count')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('company_commitments_progress table exists', async () => {
      const { data, error } = await supabase
        .from('company_commitments_progress')
        .select('count')
        .limit(0)

      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    test('old milestone_tracks table does not exist', async () => {
      const { error } = await supabase
        .from('milestone_tracks')
        .select('count')
        .limit(0)

      // Should get error that table doesn't exist
      expect(error).not.toBeNull()
      expect(error?.message).toContain('does not exist')
    })
  })

  describe('Column Renames', () => {
    test('tenant_config has feature_commitment_tracking column', async () => {
      const { data, error } = await supabase
        .from('tenant_config')
        .select('feature_commitment_tracking')
        .limit(1)
        .maybeSingle()

      expect(error).toBeNull()
      // Column should exist (data can be null if no rows, but no error)
    })

    test('companies table has commitment_track_id column', async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('commitment_track_id')
        .limit(1)
        .maybeSingle()

      expect(error).toBeNull()
      // Column should exist
    })

    test('company_commitments_progress has commitment_id column', async () => {
      const { data, error } = await supabase
        .from('company_commitments_progress')
        .select('commitment_id')
        .limit(0)

      expect(error).toBeNull()
    })
  })

  describe('Data Integrity', () => {
    test('commitment_tracks preserves existing data', async () => {
      // There should be 4 rows from milestone_tracks
      const { count, error } = await supabase
        .from('commitment_tracks')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(count).toBeGreaterThanOrEqual(4)
    })

    test('commitment_definitions preserves existing data', async () => {
      // There should be rows from milestone_definitions
      const { count, error } = await supabase
        .from('commitment_definitions')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(count).toBeGreaterThan(0)
    })

    test('System Standard tracks remain accessible', async () => {
      const { data, error } = await supabase
        .from('commitment_tracks')
        .select('*')
        .is('tenant_id', null)
        .eq('is_system_standard', true)

      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.length).toBeGreaterThan(0)
    })
  })

  describe('Foreign Key Relationships', () => {
    test('companies can join to commitment_tracks', async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          commitment_track:commitment_tracks (
            id,
            title
          )
        `)
        .not('commitment_track_id', 'is', null)
        .limit(1)
        .maybeSingle()

      expect(error).toBeNull()
      if (data) {
        expect(data.commitment_track).toBeDefined()
      }
    })

    test('commitment_definitions can join to commitment_tracks', async () => {
      const { data, error } = await supabase
        .from('commitment_definitions')
        .select(`
          id,
          title,
          track:commitment_tracks (
            id,
            title
          )
        `)
        .limit(1)
        .single()

      expect(error).toBeNull()
      expect(data.track).toBeDefined()
    })

    test('company_commitments_progress can join to commitment_definitions', async () => {
      // This table has 0 rows, so we just verify the query structure works
      const { error } = await supabase
        .from('company_commitments_progress')
        .select(`
          id,
          commitment:commitment_definitions (
            id,
            title
          )
        `)
        .limit(1)

      // Should not error even if no rows
      expect(error).toBeNull()
    })
  })
})
