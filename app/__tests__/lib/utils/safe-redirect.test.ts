/**
 * Safe Redirect Utility Tests
 *
 * Tests for URL validation to prevent open redirect vulnerability (CWE-601)
 * Part of Issue #81: Fix open redirect vulnerability
 *
 * TDD: These tests are written FIRST, before the implementation.
 * The tests should FAIL initially until we implement the utility.
 */

import { isValidInternalRedirect, getSafeRedirectUrl } from '@/lib/utils/safe-redirect'

describe('isValidInternalRedirect', () => {
  describe('valid internal paths - should return true', () => {
    test('accepts root path /', () => {
      expect(isValidInternalRedirect('/')).toBe(true)
    })

    test('accepts /dashboard', () => {
      expect(isValidInternalRedirect('/dashboard')).toBe(true)
    })

    test('accepts /auth/callback', () => {
      expect(isValidInternalRedirect('/auth/callback')).toBe(true)
    })

    test('accepts /onboarding', () => {
      expect(isValidInternalRedirect('/onboarding')).toBe(true)
    })

    test('accepts paths with query params /foo?bar=1', () => {
      expect(isValidInternalRedirect('/foo?bar=1')).toBe(true)
    })

    test('accepts paths with hash /page#section', () => {
      expect(isValidInternalRedirect('/page#section')).toBe(true)
    })

    test('accepts deeply nested paths /a/b/c/d', () => {
      expect(isValidInternalRedirect('/a/b/c/d')).toBe(true)
    })
  })

  describe('invalid external URLs - should return false', () => {
    test('rejects https://evil.com', () => {
      expect(isValidInternalRedirect('https://evil.com')).toBe(false)
    })

    test('rejects http://evil.com', () => {
      expect(isValidInternalRedirect('http://evil.com')).toBe(false)
    })

    test('rejects //evil.com (protocol-relative)', () => {
      expect(isValidInternalRedirect('//evil.com')).toBe(false)
    })

    test('rejects /\\evil.com (IE backslash trick)', () => {
      expect(isValidInternalRedirect('/\\evil.com')).toBe(false)
    })

    test('rejects \\\\evil.com (double backslash)', () => {
      expect(isValidInternalRedirect('\\\\evil.com')).toBe(false)
    })

    test('rejects javascript:alert(1)', () => {
      expect(isValidInternalRedirect('javascript:alert(1)')).toBe(false)
    })

    test('rejects data:text/html,<script>alert(1)</script>', () => {
      expect(isValidInternalRedirect('data:text/html,<script>alert(1)</script>')).toBe(false)
    })

    test('rejects empty string', () => {
      expect(isValidInternalRedirect('')).toBe(false)
    })

    test('rejects relative paths without leading slash (dashboard)', () => {
      expect(isValidInternalRedirect('dashboard')).toBe(false)
    })

    test('rejects URLs with @ sign that could be parsed as auth /foo@evil.com', () => {
      // Some URL parsers might interpret this as user:pass@host
      // Being conservative - reject anything that could be ambiguous
      expect(isValidInternalRedirect('/foo@evil.com')).toBe(false)
    })

    test('rejects HTTPS with different casing HTTPS://evil.com', () => {
      expect(isValidInternalRedirect('HTTPS://evil.com')).toBe(false)
    })

    test('rejects http with spaces  http://evil.com', () => {
      expect(isValidInternalRedirect('  http://evil.com')).toBe(false)
    })
  })
})

describe('getSafeRedirectUrl', () => {
  const DEFAULT_URL = '/onboarding'

  describe('returns url when valid', () => {
    test('returns /dashboard when passed /dashboard', () => {
      expect(getSafeRedirectUrl('/dashboard', DEFAULT_URL)).toBe('/dashboard')
    })

    test('returns / when passed /', () => {
      expect(getSafeRedirectUrl('/', DEFAULT_URL)).toBe('/')
    })

    test('returns path with query params', () => {
      expect(getSafeRedirectUrl('/page?foo=bar', DEFAULT_URL)).toBe('/page?foo=bar')
    })
  })

  describe('returns default when url is invalid', () => {
    test('returns default when url is null', () => {
      expect(getSafeRedirectUrl(null, DEFAULT_URL)).toBe(DEFAULT_URL)
    })

    test('returns default when url is undefined', () => {
      expect(getSafeRedirectUrl(undefined as unknown as string | null, DEFAULT_URL)).toBe(DEFAULT_URL)
    })

    test('returns default when url is empty string', () => {
      expect(getSafeRedirectUrl('', DEFAULT_URL)).toBe(DEFAULT_URL)
    })

    test('returns default when url is external https://evil.com', () => {
      expect(getSafeRedirectUrl('https://evil.com', DEFAULT_URL)).toBe(DEFAULT_URL)
    })

    test('returns default when url is protocol-relative //evil.com', () => {
      expect(getSafeRedirectUrl('//evil.com', DEFAULT_URL)).toBe(DEFAULT_URL)
    })

    test('returns default when url has backslash /\\evil.com', () => {
      expect(getSafeRedirectUrl('/\\evil.com', DEFAULT_URL)).toBe(DEFAULT_URL)
    })
  })
})
