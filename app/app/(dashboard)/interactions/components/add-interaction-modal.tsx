/**
 * Add Interaction Modal
 *
 * Modal form for creating a new interaction (manual entry).
 */

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createInteractionSchema } from '@/lib/schemas/interaction'
import type { z } from 'zod'
import { createInteractionAction, searchContactsForInteractionAction, searchCompaniesForInteractionAction } from '../actions'

type CreateInteractionFormData = z.infer<typeof createInteractionSchema>
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MultiSelectCombobox } from './multi-select-combobox'
import { MinimalTiptap } from '@/components/ui/shadcn-io/minimal-tiptap'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface AddInteractionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultCompanyId?: string
  defaultContactId?: string
}

export function AddInteractionModal({
  open,
  onOpenChange,
  defaultCompanyId,
  defaultContactId
}: AddInteractionModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    resolver: zodResolver(createInteractionSchema),
    defaultValues: {
      title: '',
      interaction_type: 'meeting' as const,
      meeting_date: new Date(),
      summary: '',
      contact_ids: defaultContactId ? [defaultContactId] : [],
      company_ids: defaultCompanyId ? [defaultCompanyId] : []
    }
  })

  async function onSubmit(data: CreateInteractionFormData) {
    setError(null)

    startTransition(async () => {
      const result = await createInteractionAction(data)

      if (result.success && result.interaction) {
        form.reset()
        onOpenChange(false)
        router.push(`/interactions/${result.interaction.id}`)
        router.refresh()
      } else {
        setError(result.error || 'Failed to create interaction')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Interaction</DialogTitle>
          <DialogDescription>
            Record a meeting, call, email, or text with your portfolio companies.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Q4 Check-in Call"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="meeting_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Meeting Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value && field.value instanceof Date ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value as Date | undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date('1900-01-01')
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contacts (required) */}
            <FormField
              control={form.control}
              name="contact_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacts *</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      placeholder="Search contacts..."
                      selectedValues={field.value}
                      onValuesChange={field.onChange}
                      searchFunction={searchContactsForInteractionAction}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Companies (optional) */}
            <FormField
              control={form.control}
              name="company_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Companies (optional)</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      placeholder="Search companies..."
                      selectedValues={field.value || []}
                      onValuesChange={field.onChange}
                      searchFunction={searchCompaniesForInteractionAction}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary */}
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary (optional)</FormLabel>
                  <FormControl>
                    <MinimalTiptap
                      content={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Enter meeting summary and notes..."
                      className="min-h-[200px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Error Display */}
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Interaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
