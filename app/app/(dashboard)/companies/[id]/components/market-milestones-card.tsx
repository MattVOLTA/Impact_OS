/**
 * Market Milestones Card - Company Detail
 *
 * Displays company's current milestone progress.
 * Allows editors/admins to update the current milestone.
 *
 * See Issue #71 for milestone tracking feature specification.
 */

'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Edit, Target, History } from 'lucide-react'
import { SetMilestoneModal } from './set-milestone-modal'
import { MilestoneHistoryModal } from './milestone-history-modal'

import { type CompanyMilestoneWithDetails } from '@/lib/types/milestones'

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

interface MarketMilestonesCardProps {
  companyId: string
  currentMilestone: CompanyMilestoneWithDetails | null
  milestoneHistory: MilestoneHistoryEntry[]
  userRole: string
}

export function MarketMilestonesCard({
  companyId,
  currentMilestone,
  milestoneHistory,
  userRole
}: MarketMilestonesCardProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  const canEdit = userRole === 'admin' || userRole === 'editor'
  const hasHistory = milestoneHistory && milestoneHistory.length > 0

  return (
    <>
      <Card className="gap-3">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              </div>
              <CardTitle className="text-lg">Market Milestones</CardTitle>
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-1">
          {currentMilestone ? (
            <>
              {/* Current Milestone Title */}
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground mb-1">Currently Working Towards</p>
                  {hasHistory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryModalOpen(true)}
                      className="h-auto py-0 px-2 text-xs"
                    >
                      <History className="h-3 w-3 mr-1" />
                      See History
                    </Button>
                  )}
                </div>
                <p className="font-semibold text-base">
                  {currentMilestone.milestone_definition?.name || 'Unknown Milestone'}
                </p>
              </div>

              {/* Target Evidence */}
              {currentMilestone.milestone_definition?.evidence_description && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Target Evidence</p>
                  <p className="text-sm leading-relaxed">
                    {currentMilestone.milestone_definition.evidence_description}
                  </p>
                </div>
              )}

              {/* Notes */}
              {currentMilestone.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm leading-relaxed">{currentMilestone.notes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                No milestone set for this company yet.
              </p>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                >
                  <Target className="h-4 w-4 mr-1" />
                  Set Milestone
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set Milestone Modal */}
      {canEdit && (
        <SetMilestoneModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          companyId={companyId}
          currentMilestone={currentMilestone}
        />
      )}

      {/* History Modal */}
      {hasHistory && (
        <MilestoneHistoryModal
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          history={milestoneHistory}
        />
      )}
    </>
  )
}
