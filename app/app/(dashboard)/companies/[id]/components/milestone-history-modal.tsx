/**
 * Milestone History Modal
 *
 * Displays the complete timeline of milestone changes for a company.
 */

'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'

interface MilestoneHistoryEntry {
  id: string
  company_id: string
  from_milestone_id: string | null
  to_milestone_id: string
  changed_at: string
  changed_by: string
  metadata: Record<string, any>
  from_milestone?: {
    name: string
    order_position: number
  } | null
  to_milestone: {
    name: string
    order_position: number
  }
  user: {
    first_name: string
    last_name: string
  }
}

interface MilestoneHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: MilestoneHistoryEntry[]
}

export function MilestoneHistoryModal({
  open,
  onOpenChange,
  history
}: MilestoneHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Milestone History</DialogTitle>
          <DialogDescription>
            Timeline of milestone progression for this company
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No milestone history yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={entry.id} className="relative pl-6 border-l-2 border-muted pb-4 last:pb-0">
                  {/* Timeline dot */}
                  <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-primary" />

                  {/* Content */}
                  <div className="space-y-2">
                    {/* Progression */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.from_milestone ? (
                        <>
                          <Badge variant="outline" className="text-xs">
                            {entry.from_milestone.order_position}. {entry.from_milestone.name}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="text-xs">
                            Initial
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      <Badge variant="default" className="text-xs">
                        {entry.to_milestone.order_position}. {entry.to_milestone.name}
                      </Badge>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {entry.user.first_name} {entry.user.last_name}
                        </span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(entry.changed_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {entry.metadata?.is_verified && (
                        <>
                          <span>•</span>
                          <Badge variant="secondary" className="text-xs h-5">Verified</Badge>
                        </>
                      )}
                    </div>

                    {/* Notes if any */}
                    {entry.metadata?.notes && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <p className="font-medium text-muted-foreground mb-1">Notes:</p>
                        <p>{entry.metadata.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
