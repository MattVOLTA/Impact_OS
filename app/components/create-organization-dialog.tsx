/**
 * Create Organization Dialog
 *
 * Modal for creating a new organization from anywhere in the dashboard
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'

interface CreateOrganizationDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateOrganizationDialog({
  children,
  open: controlledOpen,
  onOpenChange
}: CreateOrganizationDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use controlled open state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: ''
    }
  })

  async function onSubmit(values: CreateOrganizationInput) {
    setError(null)

    try {
      const org = await createOrganization(values)

      // Show success toast
      toast.success('Organization created successfully!', {
        description: `Switching to ${org.name}...`,
        duration: 2000
      })

      // Close dialog
      setOpen(false)

      // Reset form
      form.reset()

      // Use hard navigation to force full page reload (updates sidebar data)
      window.location.href = `/api/switch-org/${org.id}`
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create organization'
      setError(errorMessage)
      toast.error('Failed to create organization', {
        description: errorMessage
      })
    }
  }

  // Reset form when dialog closes
  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset()
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Create a new organization
          </DialogTitle>
          <DialogDescription>
            You'll become the admin and can invite team members from settings
          </DialogDescription>
        </DialogHeader>

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

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
