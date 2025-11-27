/**
 * Milestone Track Editor Page
 *
 * Server Component for managing milestones within a specific track.
 * Admins can add, edit, delete, and reorder milestones.
 */

import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserRole } from '@/lib/dal/shared'
import { getMilestoneTrackBySlug } from '@/lib/dal/milestone-tracks'
import { getMilestoneDefinitions } from '@/lib/dal/milestone-definitions'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MilestoneEditor } from './components/milestone-editor'

interface MilestoneTrackEditorPageProps {
  params: Promise<{ trackSlug: string }>
}

export async function generateMetadata({ params }: MilestoneTrackEditorPageProps): Promise<Metadata> {
  const { trackSlug } = await params
  const track = await getMilestoneTrackBySlug(trackSlug)

  return {
    title: track ? `${track.name} Milestones` : 'Track Not Found',
  }
}

export default async function MilestoneTrackEditorPage({ params }: MilestoneTrackEditorPageProps) {
  const { trackSlug } = await params

  // Check admin permissions
  const userRole = await getCurrentUserRole()
  if (userRole !== 'admin') {
    redirect('/settings')
  }

  // Fetch track
  const track = await getMilestoneTrackBySlug(trackSlug)

  if (!track) {
    notFound()
  }

  // Fetch milestones for this track (include inactive for editing)
  const milestones = await getMilestoneDefinitions(track.id, false)

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Smart Back Button with Breadcrumb */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref="/settings/milestone-tracking" fallbackLabel="Back to Milestone Tracking" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/settings" className="hover:text-foreground">
            Settings
          </Link>
          <span>/</span>
          <Link href="/settings/milestone-tracking" className="hover:text-foreground">
            Milestone Tracking
          </Link>
          <span>/</span>
          <span className="text-foreground">{track.name}</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{track.name} Milestones</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage milestone definitions, order, and descriptions for this track
        </p>
      </div>

      {/* Milestone Editor Component */}
      <MilestoneEditor
        track={track}
        milestones={milestones}
      />
    </div>
  )
}
