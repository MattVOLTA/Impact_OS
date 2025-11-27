/**
 * Commitment Tracker Component
 *
 * Visualizes company progress against their assigned Commitment Track.
 * Allows coaches to mark commitments as achieved.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { updateCommitmentProgressAction } from '../actions'
import type { CommitmentDefinition, CompanyCommitmentProgress } from '@/lib/schemas/commitment-tracking'

interface CommitmentTrackerProps {
  companyId: string
  trackTitle: string
  definitions: CommitmentDefinition[]
  progress: CompanyCommitmentProgress[]
  canEdit?: boolean
}

export function CommitmentTracker({
  companyId,
  trackTitle,
  definitions,
  progress,
  canEdit = false
}: CommitmentTrackerProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  // Merge definitions with progress
  const commitmentSteps = definitions.map(def => {
    const record = progress.find(p => p.commitment_id === def.id)
    return {
      ...def,
      isAchieved: record?.status === 'achieved',
      achievedAt: record?.achieved_at,
      recordId: record?.id
    }
  })

  // Calculate velocity metrics
  const achievedCount = commitmentSteps.filter(m => m.isAchieved).length
  const totalCount = commitmentSteps.length
  const progressPercent = Math.round((achievedCount / totalCount) * 100)

  const handleToggle = async (commitmentId: string, currentStatus: boolean) => {
    if (!canEdit) return
    setIsLoading(commitmentId)

    try {
      // Toggle status: if achieved -> pending (undo), if pending -> achieved
      const newStatus = currentStatus ? 'pending' : 'achieved'

      const result = await updateCommitmentProgressAction({
        company_id: companyId,
        commitment_id: commitmentId,
        status: newStatus,
      })

      if (!result.success) {
        console.error(result.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Commitment Tracker</CardTitle>
            <CardDescription>{trackTitle}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">{progressPercent}%</div>
            <Badge variant={progressPercent === 100 ? 'default' : 'secondary'}>
              {achievedCount}/{totalCount}
            </Badge>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-2 w-full bg-secondary rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4 mt-4">
          {commitmentSteps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                step.isAchieved ? "bg-muted/20 border-muted" : "bg-background border-border",
                isLoading === step.id && "opacity-70 cursor-wait"
              )}
            >
              {/* Status Icon */}
              <div className="mt-0.5">
                {step.isAchieved ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn("font-medium", step.isAchieved && "text-foreground")}>
                    {step.title}
                  </h4>
                  {step.achievedAt && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(step.achievedAt), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              </div>

              {/* Action */}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(step.id, step.isAchieved)}
                  disabled={!!isLoading}
                  className={cn(
                    "shrink-0",
                    step.isAchieved ? "text-muted-foreground hover:text-destructive" : "text-primary"
                  )}
                >
                  {step.isAchieved ? "Undo" : "Mark Done"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
