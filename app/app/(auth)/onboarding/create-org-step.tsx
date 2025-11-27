/**
 * Create Organization Step
 *
 * First step in onboarding: Create organization and become admin
 * Part of Issue #54: Self-Service Onboarding
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrganizationSchema, type CreateOrganizationInput } from '@/lib/schemas/organization'
import { createOrganization } from '@/lib/dal/organizations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Alert } from '@/components/ui/alert'
import { Building } from 'lucide-react'

interface CreateOrgStepProps {
  onComplete: (organizationId: string) => void
}

export function CreateOrgStep({ onComplete }: CreateOrgStepProps) {
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: ''
      // slug is optional and will auto-generate from name
    }
  })

  async function onSubmit(values: CreateOrganizationInput) {
    setError(null)

    try {
      const org = await createOrganization(values)
      onComplete(org.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Create your organization</h2>
          <p className="text-sm text-muted-foreground">
            You'll be the admin and can invite your team next
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input placeholder="Acme Accelerator" autoFocus {...field} />
                </FormControl>
                <FormDescription>
                  The name of your accelerator, incubator, or support organization
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? 'Creating organization...'
              : 'Create Organization'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
