/**
 * Program Status Badges Component
 *
 * Displays active and alumni program enrollment counts as badges.
 * Used in the companies list table to show enrollment status at a glance.
 */

import { Badge } from '@/components/ui/badge'

interface ProgramStatusBadgesProps {
  activeCount: number
  alumniCount: number
}

export function ProgramStatusBadges({ activeCount, alumniCount }: ProgramStatusBadgesProps) {
  // No enrollments - show placeholder
  if (activeCount === 0 && alumniCount === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {activeCount > 0 && (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border-green-200 dark:border-green-800">
          Active: {activeCount}
        </Badge>
      )}
      {alumniCount > 0 && (
        <Badge variant="secondary">
          Alumni: {alumniCount}
        </Badge>
      )}
    </div>
  )
}
