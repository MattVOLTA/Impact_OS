/**
 * Create Organization Form
 *
 * Form for creating a new organization from dashboard
 * Part of Issue #54: Multi-Organization Support
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  createOrganizationSchema,
  type CreateOrganizationInput
} from '@/lib/schemas/organization'
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

export function CreateOrgForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: ''
      // slug will auto-generate from name
    }
  })

  async function onSubmit(values: CreateOrganizationInput) {
    setError(null)

    try {
      const org = await createOrganization(values)

      // Switch to new org and redirect to dashboard
      router.push(`/api/switch-org/${org.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <p className="text-sm">{error}</p>
          </Alert>
        )}

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

        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? 'Creating...'
              : 'Create Organization'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
