/**
 * Fireflies Indicator
 *
 * Badge showing that an interaction was auto-captured via Fireflies.
 */

import { AudioLines } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function FirefliesIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700">
            <AudioLines className="h-3 w-3" />
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Auto-captured via Fireflies</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
