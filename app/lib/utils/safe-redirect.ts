/**
 * Safe Redirect Utility
 *
 * Validates redirect URLs to prevent open redirect vulnerability (CWE-601)
 * Part of Issue #81: Fix open redirect vulnerability
 *
 * @see https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/04-Testing_for_Client-side_URL_Redirect
 * @see https://cwe.mitre.org/data/definitions/601.html
 */

/**
 * Validates that a redirect URL is internal (same origin)
 * Prevents open redirect vulnerability by rejecting:
 * - Absolute URLs (http://, https://)
 * - Protocol-relative URLs (//evil.com)
 * - JavaScript/data URLs
 * - URLs with backslashes (IE quirk)
 * - URLs with @ signs (potential auth confusion)
 * - Empty or relative paths without leading slash
 *
 * @param url - The URL to validate
 * @returns true if the URL is a safe internal path, false otherwise
 */
export function isValidInternalRedirect(url: string): boolean {
  // Reject empty or whitespace-only strings
  if (!url || !url.trim()) {
    return false
  }

  // Trim the URL for validation
  const trimmedUrl = url.trim()

  // Must start with a single forward slash
  if (!trimmedUrl.startsWith('/')) {
    return false
  }

  // Reject protocol-relative URLs (//evil.com)
  if (trimmedUrl.startsWith('//')) {
    return false
  }

  // Reject URLs with backslashes (IE quirk: /\evil.com becomes //evil.com)
  if (trimmedUrl.includes('\\')) {
    return false
  }

  // Reject URLs with @ sign (could be parsed as user:pass@host)
  if (trimmedUrl.includes('@')) {
    return false
  }

  // Reject absolute URLs (handles case-insensitive http://, https://, javascript:, data:)
  const lowerUrl = trimmedUrl.toLowerCase()
  if (
    lowerUrl.startsWith('http://') ||
    lowerUrl.startsWith('https://') ||
    lowerUrl.startsWith('javascript:') ||
    lowerUrl.startsWith('data:')
  ) {
    return false
  }

  return true
}

/**
 * Returns a safe redirect URL, falling back to default if invalid
 *
 * @param url - The URL to validate (can be null/undefined)
 * @param defaultUrl - The fallback URL if validation fails
 * @returns The original URL if valid, otherwise the default URL
 */
export function getSafeRedirectUrl(
  url: string | null | undefined,
  defaultUrl: string
): string {
  if (!url || !isValidInternalRedirect(url)) {
    return defaultUrl
  }
  return url
}
