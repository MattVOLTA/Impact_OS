/**
 * Signup Form Component
 *
 * Client-side form for user registration
 * Part of Issue #54: Self-Service Onboarding
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { signupSchema, type SignupInput } from '@/lib/schemas/auth'
import { signupAction } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'

export function SignupForm() {
  const router = useRouter()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const [error, setError] = useState<string | null>(null)

  // Pre-fill email from URL params (e.g., from invitation link)
  const prefilledEmail = searchParams?.get('email') || ''

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: prefilledEmail,
      password: '',
      firstName: '',
      lastName: ''
    }
  })

  async function onSubmit(values: SignupInput) {
    setError(null)

    const result = await signupAction(values)

    if (!result.success) {
      setError(result.error || 'An error occurred')
      return
    }

    // Get 'next' parameter if present (for invitation acceptance after signup)
    const next = searchParams?.get('next') || '/onboarding'

    // Check if email confirmation is required
    // If user.confirmed_at is null, they need to confirm email
    if (result.user && !result.user.confirmed_at) {
      // Redirect to confirmation notice page with email in URL
      router.push(`/signup/check-email?email=${encodeURIComponent(values.email)}&next=${encodeURIComponent(next)}`)
      return
    }

    // Email already confirmed (or confirmation disabled) - go to next page
    router.push(next)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              {prefilledEmail && (
                <p className="text-xs text-muted-foreground">
                  This is the email address the invitation was sent to
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </Form>
  )
}
