/**
 * User Preferences Tests - Pragmatic TDD
 *
 * Test pure functions and utilities that don't require auth context.
 */

import { debounce } from '@/lib/utils'
import type { FilterPreferences } from '@/lib/types/user-preferences'

describe('FilterPreferences Type', () => {
  it('accepts company type filter', () => {
    const prefsWithCompanyType: FilterPreferences = {
      search: 'test',
      enrollmentStatus: 'active',
      programId: 'abc-123',
      companyType: 'Startup'
    }

    expect(prefsWithCompanyType.companyType).toBe('Startup')
  })

  it('accepts all valid company types', () => {
    const validTypes = [
      'Startup', 'Investment Fund', 'Government', 'University',
      'Service Provider', 'Large Corporation', 'Non-Profit'
    ]

    validTypes.forEach(type => {
      const prefs: FilterPreferences = { companyType: type as any }
      expect(prefs.companyType).toBe(type)
    })
  })
})

describe('debounce utility', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('delays function execution', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 500)

    debouncedFn('test')

    // Should not be called immediately
    expect(mockFn).not.toHaveBeenCalled()

    // Fast-forward time
    jest.advanceTimersByTime(500)

    // Now should be called
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('cancels previous calls when invoked rapidly', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 500)

    debouncedFn('first')
    jest.advanceTimersByTime(100)
    debouncedFn('second')
    jest.advanceTimersByTime(100)
    debouncedFn('third')

    // Advance to completion
    jest.advanceTimersByTime(500)

    // Should only call with last value
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('third')
  })

  it('handles multiple arguments', () => {
    const mockFn = jest.fn()
    const debouncedFn = debounce(mockFn, 500)

    debouncedFn('arg1', 'arg2', 'arg3')
    jest.advanceTimersByTime(500)

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
  })
})
