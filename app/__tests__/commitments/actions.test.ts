/**
 * Commitments Actions Tests
 *
 * Tests verify:
 * - Server actions call DAL correctly
 * - Revalidation paths are correct
 * - Error handling
 */

import { createCommitmentAction, updateCommitmentAction, deleteCommitmentAction } from '@/app/(dashboard)/companies/[id]/actions'
import { createCommitment, updateCommitment } from '@/lib/dal/commitments'
import { revalidatePath } from 'next/cache'

// Mocks
jest.mock('@/lib/dal/commitments', () => ({
  createCommitment: jest.fn(),
  updateCommitment: jest.fn()
}))

jest.mock('@/lib/dal/shared', () => ({
  requireAuth: jest.fn().mockResolvedValue({
    supabase: {
      from: jest.fn().mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ 
                data: { company_id: '11111111-1111-1111-1111-111111111111' }, 
                error: null 
              })
            })
          })
        })
      })
    }
  })
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

describe('Commitments Actions', () => {
  const mockCompanyId = '11111111-1111-1111-1111-111111111111'
  const mockCommitmentId = '22222222-2222-2222-2222-222222222222'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('createCommitmentAction calls DAL and revalidates', async () => {
    const input = {
      company_id: mockCompanyId,
      title: 'New Action Item'
    }

    ;(createCommitment as jest.Mock).mockResolvedValue({
      id: mockCommitmentId,
      ...input,
      status: 'open'
    })

    const result = await createCommitmentAction(input)

    expect(result.success).toBe(true)
    expect(createCommitment).toHaveBeenCalledWith(input)
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${mockCompanyId}/commitments`)
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${mockCompanyId}`)
  })

  test('updateCommitmentAction calls DAL and revalidates', async () => {
    const updates = {
      status: 'completed' as const
    }

    ;(updateCommitment as jest.Mock).mockResolvedValue({
      id: mockCommitmentId,
      company_id: mockCompanyId,
      title: 'Existing Item',
      ...updates
    })

    const result = await updateCommitmentAction(mockCommitmentId, updates)

    expect(result.success).toBe(true)
    expect(updateCommitment).toHaveBeenCalledWith(mockCommitmentId, updates)
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${mockCompanyId}`)
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${mockCompanyId}/commitments`)
  })

  test('deleteCommitmentAction removes item and revalidates', async () => {
    const result = await deleteCommitmentAction(mockCommitmentId)

    expect(result.success).toBe(true)
    // Note: We mocked the Supabase call in the module mock at the top
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${mockCompanyId}`)
    expect(revalidatePath).toHaveBeenCalledWith(`/companies/${mockCompanyId}/commitments`)
  })

  test('handles errors gracefully', async () => {
    ;(createCommitment as jest.Mock).mockRejectedValue(new Error('Database error'))

    const result = await createCommitmentAction({
      company_id: mockCompanyId,
      title: 'Fail Item'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })
})

