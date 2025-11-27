/**
 * Edit Interaction Modal
 *
 * Modal form for editing an existing interaction.
 */

'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateInteractionSchema } from '@/lib/schemas/interaction'
import type { z } from 'zod'
import type { InteractionWithRelations } from '@/lib/dal/interactions'
import { updateInteractionAction, searchContactsForInteractionAction, searchCompaniesForInteractionAction } from '../../actions'

type UpdateInteractionFormData = z.infer<typeof updateInteractionSchema>
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
import { MultiSelectCombobox } from '../../components/multi-select-combobox'
import { MinimalTiptap } from '@/components/ui/shadcn-io/minimal-tiptap'
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EditInteractionModalProps {
  interaction: InteractionWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditInteractionModal({
  interaction,
  open,
  onOpenChange
}: EditInteractionModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isFirefliesSourced = !!interaction.fireflies_transcript_id

  const form = useForm({
    resolver: zodResolver(updateInteractionSchema),
    defaultValues: {
      title: interaction.title || '',
      interaction_type: interaction.interaction_type,
      meeting_date: interaction.meeting_date ? new Date(interaction.meeting_date) : undefined,
      summary: interaction.summary || '',
      contact_ids: interaction.contacts?.map(c => c.id) || [],
      company_ids: interaction.companies?.map(c => c.id) || []
    }
  })

  // Reset form when interaction changes
  useEffect(() => {
    form.reset({
      title: interaction.title || '',
      interaction_type: interaction.interaction_type,
      meeting_date: interaction.meeting_date ? new Date(interaction.meeting_date) : undefined,
      summary: interaction.summary || '',
      contact_ids: interaction.contacts?.map(c => c.id) || [],
      company_ids: interaction.companies?.map(c => c.id) || []
    })
  }, [interaction, form])

  async function onSubmit(data: UpdateInteractionFormData) {
    setError(null)

    startTransition(async () => {
      const result = await updateInteractionAction(interaction.id, data)

      if (result.success) {
        onOpenChange(false)
        router.refresh()
      } else {
        setError(result.error || 'Failed to update interaction')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Interaction</DialogTitle>
          <DialogDescription>
            Update the details of this interaction.
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

            {/* Contacts */}
            <FormField
              control={form.control}
              name="contact_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contacts *</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      placeholder="Search contacts..."
                      selectedValues={field.value || []}
                      onValuesChange={field.onChange}
                      searchFunction={searchContactsForInteractionAction}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Companies */}
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
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <MinimalTiptap
                      content={field.value || ''}
                      onChange={field.onChange}
                      placeholder="Enter meeting summary and notes..."
                      editable={!isFirefliesSourced}
                      className="min-h-[200px] max-h-[400px] overflow-y-auto"
                      contentType={interaction.summary?.includes('##') ? 'markdown' : 'html'}
                    />
                  </FormControl>
                  {isFirefliesSourced && (
                    <p className="text-xs text-muted-foreground">
                      Summary is read-only for Fireflies-captured interactions
                    </p>
                  )}
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
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
