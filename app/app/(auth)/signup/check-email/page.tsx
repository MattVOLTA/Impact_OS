/**
 * Check Email Page
 *
 * Shown after signup when email confirmation is required
 * Part of Issue #54: Self-Service Onboarding
 * Updated for Issue #74: Match login page styling
 */

'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { MosaicBackground } from '../../mosaic-background'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || 'your email'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <MosaicBackground />
      <div className="relative z-10 w-full max-w-md space-y-6 rounded-lg bg-white/95 p-8 shadow-xl backdrop-blur-sm text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to:
          </p>
          <p className="text-sm font-medium">{email}</p>
        </div>

        <div className="space-y-4 rounded-lg border bg-muted/50 p-4 text-left">
          <p className="text-sm font-medium">Next steps:</p>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-semibold">1.</span>
              <span>Check your email inbox (and spam folder)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">2.</span>
              <span>Click the confirmation link in the email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">3.</span>
              <span>You'll be redirected to create your organization</span>
            </li>
          </ol>
        </div>

        <div className="pt-4">
          <Link href="/login">
            <Button variant="outline" className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Didn't receive the email? Check your spam folder or contact support.
        </p>
      </div>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-slate-950" />
        <div className="text-center text-white">Loading...</div>
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  )
}
