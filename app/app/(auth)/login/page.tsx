/**
 * Login Page
 *
 * Simple login form using Supabase Auth
 * Updated with signup link for new users
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from './login-form'
import { MosaicBackground } from '../mosaic-background'

export const metadata: Metadata = {
  title: 'Login',
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <MosaicBackground />
      <div className="relative z-10 w-full max-w-md space-y-8 rounded-lg bg-white/95 p-8 shadow-xl backdrop-blur-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold">impact OS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>

        <Suspense fallback={<div className="text-center">Loading...</div>}>
          <LoginForm />
        </Suspense>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don't have an account? </span>
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
