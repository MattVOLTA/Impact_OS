/**
 * Commitments Analysis Tests
 *
 * Tests verify:
 * - Heuristic date extraction (Friday, Tomorrow)
 * - Measurability check (numeric content)
 */

import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

import { analyzeCommitmentAction } from '@/app/(dashboard)/companies/[id]/actions'

describe('Commitment Analysis (Mock)', () => {
  test('extracts "Friday" correctly', async () => {
    const result = await analyzeCommitmentAction('Call investor by Friday')
    
    expect(result.success).toBe(true)
    expect(result.data?.extracted_date).toBeDefined()
    
    // Verify it's a valid date in the future
    const date = new Date(result.data!.extracted_date!)
    expect(date.getTime()).toBeGreaterThan(Date.now())
  })

  test('extracts "Tomorrow" correctly', async () => {
    const result = await analyzeCommitmentAction('Finish draft tomorrow')
    
    expect(result.success).toBe(true)
    
    const date = new Date(result.data!.extracted_date!)
    const now = new Date()
    
    // Should be roughly 24 hours ahead (ignoring exact execution time diffs)
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
    expect(diffHours).toBeGreaterThan(23)
    expect(diffHours).toBeLessThan(49) // Within next day range
  })

  test('identifies measurable commitments (contains numbers)', async () => {
    const result = await analyzeCommitmentAction('Get 3 introductions')
    expect(result.data?.is_measurable).toBe(true)
    expect(result.data?.suggestion).toBeNull()
  })

  test('identifies vague commitments (no numbers)', async () => {
    const result = await analyzeCommitmentAction('Do some sales outreach')
    expect(result.data?.is_measurable).toBe(false)
    expect(result.data?.suggestion).toBe('Try adding a number or metric.')
  })
})
