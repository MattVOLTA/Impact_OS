/**
 * Commitment Form
 *
 * Client component for creating/editing commitments.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCommitmentSchema, updateCommitmentSchema, type Commitment } from '@/lib/schemas/commitments'
import { createCommitmentAction, updateCommitmentAction } from '../../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { CalendarIcon, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { z } from 'zod'

// Combined schema for form
const formSchema = createCommitmentSchema.extend({
  status: z.enum(['open', 'completed', 'cancelled', 'not_completed']).optional()
})

type FormData = z.infer<typeof formSchema>

interface CommitmentFormProps {
  companyId: string
  initialData?: Commitment
}

export function CommitmentForm({ companyId, initialData }: CommitmentFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_id: companyId,
      title: initialData?.title || '',
      description: initialData?.description || '',
      due_date: initialData?.due_date || undefined,
      status: initialData?.status || 'open'
    }
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    setError(null)

    try {
      if (initialData) {
        // Update
        const result = await updateCommitmentAction(initialData.id, {
          title: data.title,
          description: data.description,
          due_date: data.due_date,
          status: data.status
        })
        
        if (!result.success) throw new Error(result.error)
      } else {
        // Create
        const result = await createCommitmentAction({
          company_id: companyId,
          title: data.title,
          description: data.description,
          due_date: data.due_date
        })

        if (!result.success) throw new Error(result.error)
      }

      router.push(`/companies/${companyId}/commitments`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input 
          id="title" 
          placeholder="e.g. Complete Seed Round" 
          {...form.register('title')} 
        />
        {form.formState.errors.title && (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea 
          id="description" 
          placeholder="Add details..." 
          rows={4}
          {...form.register('description')} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Due Date (Optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch('due_date') && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch('due_date') ? format(new Date(form.watch('due_date')!), 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={form.watch('due_date') ? new Date(form.watch('due_date')!) : undefined}
                onSelect={(date) => form.setValue('due_date', date?.toISOString())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {initialData && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={form.watch('status')} 
              onValueChange={(val: any) => form.setValue('status', val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Abandoned</SelectItem>
                <SelectItem value="not_completed">Not Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Save Changes' : 'Create Commitment'}
        </Button>
      </div>
    </form>
  )
}

