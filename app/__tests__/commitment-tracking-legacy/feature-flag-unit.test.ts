/**
 * Feature Flag Unit Test
 *
 * Verifies that DAL functions check the feature flag.
 */

import { getCommitmentTracks } from '@/lib/dal/commitment-tracking'
import { getTenantConfig } from '@/lib/dal/settings'
import { requireAuth, getCurrentOrganizationId } from '@/lib/dal/shared'

// Mock dependencies
jest.mock('@/lib/dal/settings', () => ({
  getTenantConfig: jest.fn()
}))

jest.mock('@/lib/dal/shared', () => ({
  requireAuth: jest.fn(),
  getCurrentOrganizationId: jest.fn()
}))

describe('Commitment Tracking DAL Feature Flag (Legacy)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default auth mocks
    ;(requireAuth as jest.Mock).mockResolvedValue({
      supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null })
      }
    })
    ;(getCurrentOrganizationId as jest.Mock).mockResolvedValue('tenant-123')
  })

  test('getCommitmentTracks throws if feature is disabled', async () => {
    // Mock config with feature disabled
    ;(getTenantConfig as jest.Mock).mockResolvedValue({
      feature_commitment_tracking: false
    })

    await expect(getCommitmentTracks()).rejects.toThrow('Commitment Tracking feature is disabled')
  })

  test('getCommitmentTracks proceeds if feature is enabled', async () => {
    // Mock config with feature enabled
    ;(getTenantConfig as jest.Mock).mockResolvedValue({
      feature_commitment_tracking: true
    })

    await expect(getCommitmentTracks()).resolves.not.toThrow()
  })
})


