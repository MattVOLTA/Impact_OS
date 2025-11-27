/**
 * Onboarding Page
 *
 * Multi-step onboarding flow for new users
 * PROTECTED: Requires authentication
 *
 * Part of Issue #54: Self-Service Onboarding
 * Updated for Issue #74: Match login page styling
 */

import { requireAuth } from '@/lib/dal/shared'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from './onboarding-flow'
import { MosaicBackground } from '../mosaic-background'

export default async function OnboardingPage() {
  // Require authentication
  try {
    await requireAuth()
  } catch (error) {
    // Not authenticated - redirect to login
    redirect('/login?error=authentication-required')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <MosaicBackground />
      <div className="relative z-10 w-full max-w-3xl p-8">
        <OnboardingFlow />
      </div>
    </div>
  )
}
