/**
 * Signup Page
 *
 * Public page for user registration
 * Part of Issue #54: Self-Service Onboarding
 */

'use client'

import { SignupForm } from './signup-form'
import Link from 'next/link'
import { MosaicBackground } from '../mosaic-background'

export default function SignupPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <MosaicBackground />
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-lg bg-white/95 p-8 shadow-xl backdrop-blur-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with impact OS
          </p>
        </div>

        <SignupForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
