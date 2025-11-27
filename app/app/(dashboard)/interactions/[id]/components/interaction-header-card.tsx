/**
 * Interaction Header Card
 *
 * Compact header showing interaction title, type, date, and actions.
 * Matches ContactHeaderCard and CompanyHeaderCard pattern.
 */

'use client'

import { format } from 'date-fns'
import { Calendar, MessageSquare, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { type InteractionWithRelations } from '@/lib/dal/interactions'
import { InteractionActionsMenu } from './interaction-actions-menu'

interface InteractionHeaderCardProps {
  interaction: InteractionWithRelations
}

export function InteractionHeaderCard({ interaction }: InteractionHeaderCardProps) {
  // Format interaction type for display
  const formatInteractionType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <Card>
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Interaction Info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row - Title and Actions */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{interaction.title || 'Untitled Interaction'}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {formatInteractionType(interaction.interaction_type)}
                  </Badge>
                  {interaction.meeting_date && (
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(interaction.meeting_date), 'MMMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions Menu */}
              <div className="flex-shrink-0">
                <InteractionActionsMenu interaction={interaction} />
              </div>
            </div>

            {/* Fireflies Link */}
            {interaction.fireflies_transcript_id && (
              <div>
                <a
                  href={`https://app.fireflies.ai/view/${interaction.fireflies_transcript_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View in Fireflies
                </a>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
