/**
 * Commitment Tracking Types and Schema Tests
 *
 * TDD Phase 2 - Verify TypeScript types and Zod schemas exist and work
 *
 * These are pure unit tests that don't require server context
 */

import {
  type CommitmentTrack,
  type CommitmentDefinition,
  type CompanyCommitmentProgress,
  type CreateCommitmentTrackInput,
  type CreateCommitmentDefinitionInput,
  type UpdateCommitmentProgressInput,
  createCommitmentTrackSchema,
  createCommitmentDefinitionSchema,
  updateCommitmentProgressSchema
} from '@/lib/schemas/commitment-tracking'

describe('Commitment Tracking TypeScript Types', () => {
  test('CommitmentTrack type is properly defined', () => {
    const track: CommitmentTrack = {
      id: 'test-id',
      tenant_id: null,
      title: 'Test Track',
      description: 'Test',
      is_system_standard: true,
      created_at: new Date().toISOString()
    }

    expect(track.id).toBe('test-id')
    expect(track.title).toBe('Test Track')
  })

  test('CommitmentDefinition type is properly defined', () => {
    const definition: CommitmentDefinition = {
      id: 'test-id',
      track_id: 'track-id',
      title: 'Test Definition',
      description: 'Test',
      order_index: 1,
      created_at: new Date().toISOString()
    }

    expect(definition.id).toBe('test-id')
    expect(definition.title).toBe('Test Definition')
  })

  test('CompanyCommitmentProgress type is properly defined', () => {
    const progress: CompanyCommitmentProgress = {
      id: 'test-id',
      company_id: 'company-id',
      commitment_id: 'commitment-id',
      status: 'achieved',
      achieved_at: new Date().toISOString(),
      logged_at: new Date().toISOString(),
      verified_by_user_id: 'user-id',
      evidence_note: null,
      evidence_url: null
    }

    expect(progress.commitment_id).toBe('commitment-id')
    expect(progress.status).toBe('achieved')
  })
})

describe('Commitment Tracking Zod Schemas', () => {
  test('createCommitmentTrackSchema validates input', () => {
    const validInput = {
      title: 'New Track',
      description: 'Description'
    }

    const result = createCommitmentTrackSchema.parse(validInput)
    expect(result.title).toBe('New Track')
    expect(result.is_system_standard).toBe(false) // default
  })

  test('createCommitmentTrackSchema rejects empty title', () => {
    const invalidInput = {
      title: '',
      description: 'Description'
    }

    expect(() => createCommitmentTrackSchema.parse(invalidInput)).toThrow('Title is required')
  })

  test('createCommitmentDefinitionSchema validates input', () => {
    const validInput = {
      track_id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Problem Validation',
      description: '10 interviews',
      order_index: 1
    }

    const result = createCommitmentDefinitionSchema.parse(validInput)
    expect(result.title).toBe('Problem Validation')
    expect(result.order_index).toBe(1)
  })

  test('updateCommitmentProgressSchema validates input', () => {
    const validInput = {
      company_id: '123e4567-e89b-12d3-a456-426614174000',
      commitment_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'achieved' as const,
      evidence_note: 'Reviewed customer discovery logs'
    }

    const result = updateCommitmentProgressSchema.parse(validInput)
    expect(result.status).toBe('achieved')
    expect(result.evidence_note).toBe('Reviewed customer discovery logs')
  })

  test('updateCommitmentProgressSchema rejects invalid UUIDs', () => {
    const invalidInput = {
      company_id: 'not-a-uuid',
      commitment_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'achieved' as const
    }

    expect(() => updateCommitmentProgressSchema.parse(invalidInput)).toThrow()
  })

  test('updateCommitmentProgressSchema rejects invalid status', () => {
    const invalidInput = {
      company_id: '123e4567-e89b-12d3-a456-426614174000',
      commitment_id: '123e4567-e89b-12d3-a456-426614174001',
      status: 'invalid-status'
    }

    expect(() => updateCommitmentProgressSchema.parse(invalidInput)).toThrow()
  })
})
