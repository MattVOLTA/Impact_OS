/**
 * Program Status Badges Component
 *
 * Displays program enrollment counts with color-coded badges:
 * - Active programs: Green badge
 * - Alumni programs: Gray badge
 * - No enrollments: "—" placeholder
 */

import { Badge } from '@/components/ui/badge'

export function ProgramStatusBadges({
  activeCount,
  alumniCount
}: {
  activeCount: number
  alumniCount: number
}) {
  if (activeCount === 0 && alumniCount === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="flex gap-1">
      {activeCount > 0 && (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
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
