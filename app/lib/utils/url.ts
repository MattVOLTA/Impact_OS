/**
 * URL Utilities
 *
 * Handles environment-aware URL generation for multi-environment support
 * Part of Issue #74: Configure Sign-Up Flow for Multi-Environment Support
 *
 * REQUIRED SUPABASE DASHBOARD CONFIGURATION:
 * 1. Authentication → URL Configuration:
 *    - Site URL: https://beta.impactos.xyz
 *    - Redirect URLs:
 *      - http://localhost:3000/**
 *      - https://beta.impactos.xyz/**
 *
 * 2. Authentication → Email Templates (Confirm signup):
 *    Use: <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
 *
 * 3. Production Environment Variables:
 *    NEXT_PUBLIC_APP_URL=https://beta.impactos.xyz
 */

/**
 * Get the base URL for the current environment
 * Handles development, deploy preview, and production environments
 *
 * Priority:
 * 1. NEXT_PUBLIC_APP_URL (explicitly set for each environment)
 * 2. DEPLOY_PRIME_URL (Netlify deploy previews and branch deploys)
 * 3. URL (Netlify production URL)
 * 4. Fallback to localhost for development
 */
export function getBaseUrl(): string {
  // Server-side
  if (typeof window === 'undefined') {
    // Production environment variable (set in Netlify)
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return process.env.NEXT_PUBLIC_APP_URL
    }
    // Netlify deploy previews and branch deploys
    if (process.env.DEPLOY_PRIME_URL) {
      return process.env.DEPLOY_PRIME_URL
    }
    // Netlify production URL
    if (process.env.URL) {
      return process.env.URL
    }
    // Default to localhost for development
    return 'http://localhost:3000'
  }

  // Client-side - use current origin
  return window.location.origin
}

/**
 * Get the auth confirmation URL for the current environment
 * Used when signing up to specify where email confirmation links should redirect
 */
export function getAuthConfirmUrl(): string {
  return `${getBaseUrl()}/auth/confirm`
}
