/**
 * Interaction Type Badge
 *
 * Visual indicator for interaction type with icon.
 */

import { Mail, MessageSquare, Phone, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { InteractionType } from '@/lib/schemas/interaction'

interface InteractionTypeBadgeProps {
  type: InteractionType
  showLabel?: boolean
}

const typeConfig = {
  meeting: {
    icon: Video,
    label: 'Meeting',
    color: 'bg-blue-100 text-blue-700 hover:bg-blue-100'
  },
  email: {
    icon: Mail,
    label: 'Email',
    color: 'bg-green-100 text-green-700 hover:bg-green-100'
  },
  call: {
    icon: Phone,
    label: 'Call',
    color: 'bg-purple-100 text-purple-700 hover:bg-purple-100'
  }
}

export function InteractionTypeBadge({ type, showLabel = false }: InteractionTypeBadgeProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <Badge variant="secondary" className={config.color}>
      <Icon className={showLabel ? 'h-3 w-3 mr-1' : 'h-3 w-3'} />
      {showLabel && config.label}
    </Badge>
  )
}
