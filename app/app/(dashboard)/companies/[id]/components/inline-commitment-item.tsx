'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { updateCommitmentAction, deleteCommitmentAction } from '../actions'
import { Check, X, Trash2, Calendar, Loader2, LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface InlineCommitmentItemProps {
  id: string
  initialTitle: string
  initialStatus: 'open' | 'completed' | 'cancelled' | 'not_completed'
  initialDueDate: string | null
  onUpdate?: () => void
}

export function InlineCommitmentItem({ 
  id, 
  initialTitle, 
  initialStatus, 
  initialDueDate,
  onUpdate 
}: InlineCommitmentItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [status, setStatus] = useState(initialStatus)
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDueDate ? new Date(initialDueDate) : undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [description, setDescription] = useState<string>('')
  const [completedAt, setCompletedAt] = useState<Date | undefined>(new Date())

  const handleSave = async () => {
    if (!title.trim()) return

    setIsSaving(true)
    try {
      // Append description to existing one or update structure if schema supported separate field
      // For now, we'll append it if it's set
      let finalDescription = undefined
      if (description && (status === 'completed' || status === 'not_completed' || status === 'cancelled')) {
        finalDescription = description // Schema has description field
      }

      const result = await updateCommitmentAction(id, {
        title,
        status,
        due_date: dueDate?.toISOString(),
        description: finalDescription,
        completed_at: completedAt?.toISOString()
      })

      if (result.success) {
        toast.success('Commitment updated')
        setIsExpanded(false)
        onUpdate?.()
      } else {
        toast.error('Failed to update')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteCommitmentAction(id)
      if (result.success) {
        toast.success('Commitment deleted')
        onUpdate?.()
      } else {
        toast.error('Failed to delete')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        className="group flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer relative"
      >
        <div className="mt-0.5">
           {status === 'completed' ? (
             <Check className="h-4 w-4 text-green-600" />
           ) : status === 'cancelled' ? (
             <LogOut className="h-4 w-4 text-muted-foreground" />
           ) : status === 'not_completed' ? (
             <X className="h-4 w-4 text-red-600" />
           ) : (
             <div className="h-4 w-4 rounded-full border-2 border-muted-foreground group-hover:border-primary" />
           )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            "font-medium text-sm truncate group-hover:text-primary",
            status !== 'open' && "text-muted-foreground" // removed line-through
          )}>
            {title}
          </div>
          {dueDate && (
            <div className="text-xs text-muted-foreground mt-1">
              Due {format(dueDate, 'MMM d')}
            </div>
          )}
        </div>

        {/* Delete Button - Visible on Hover */}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Commitment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the commitment from the company record.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-lg border bg-card shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex gap-3">
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-[38px] py-2 h-10 resize-none flex-1"
          placeholder="Commitment details..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSave()
            }
          }}
        />
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className={cn(
              "h-10 w-10 shrink-0",
              !dueDate && "text-muted-foreground border-dashed"
            )}>
              <Calendar className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={dueDate}
              onSelect={setDueDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {status !== 'open' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setStatus('open')}
              className="h-8 px-2 text-xs"
            >
              Re-open
            </Button>
          )}
        </div>
      </div>

      {/* Completion Details - Only visible when not open */}
      {status !== 'open' && (
        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px] resize-none text-sm"
            placeholder={
              status === 'completed' ? "Add completion notes (optional)..." :
              status === 'not_completed' ? "Why wasn't this completed? (optional)..." :
              "Why was this abandoned? (optional)..."
            }
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {status === 'completed' ? "Completed on:" : "Closed on:"}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "h-8 px-2 text-xs",
                  !completedAt && "text-muted-foreground"
                )}>
                  <Calendar className="mr-2 h-3 w-3" />
                  {completedAt ? format(completedAt, 'MMM d, yyyy') : 'Select Date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={completedAt}
                  onSelect={setCompletedAt}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Status Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button 
          variant={status === 'completed' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setStatus('completed')}
          className={cn("flex-1 h-8 text-xs", status === 'completed' && "bg-green-600 hover:bg-green-700")}
        >
          <Check className="mr-2 h-3 w-3" />
          Completed
        </Button>
        <Button 
          variant={status === 'not_completed' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setStatus('not_completed')}
          className={cn("flex-1 h-8 text-xs", status === 'not_completed' && "bg-red-600 hover:bg-red-700 text-white")}
        >
          <X className="mr-2 h-3 w-3" />
          Not Completed
        </Button>
        <Button 
          variant={status === 'cancelled' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setStatus('cancelled')}
          className="flex-1 h-8 text-xs"
        >
          <LogOut className="mr-2 h-3 w-3" />
          Abandoned
        </Button>
      </div>

      {/* Save Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsExpanded(false)
            // Reset state
            setTitle(initialTitle)
            setStatus(initialStatus)
            setDueDate(initialDueDate ? new Date(initialDueDate) : undefined)
          }}
          className="h-8 px-3"
        >
          Cancel
        </Button>
        <Button 
          size="sm" 
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 px-4"
        >
           {isSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
           Save
        </Button>
      </div>
    </div>
  )
}
