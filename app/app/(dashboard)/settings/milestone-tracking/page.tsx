/**
 * Milestone Tracking Management Page
 *
 * Server Component that lists all milestone tracks and allows admins to:
 * - View all tracks
 * - Navigate to edit individual track milestones
 * - See milestone counts per track
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUserRole } from '@/lib/dal/shared'
import { getMilestoneTracksWithDefinitions } from '@/lib/dal/milestone-tracks'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, ChevronRight, Settings } from 'lucide-react'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Milestone Tracking Management',
}

export default async function MilestoneTrackingManagementPage() {
  // Check admin permissions
  const userRole = await getCurrentUserRole()
  if (userRole !== 'admin') {
    redirect('/settings')
  }

  // Fetch all tracks with their definitions
  const tracks = await getMilestoneTracksWithDefinitions(false) // Include inactive

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Smart Back Button with Breadcrumb */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref="/settings" fallbackLabel="Back to Settings" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/settings" className="hover:text-foreground">
            Settings
          </Link>
          <span>/</span>
          <span className="text-foreground">Milestone Tracking</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Milestone Track Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage milestone definitions for each track
        </p>
      </div>

      {tracks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No milestone tracks found. Enable milestone tracking in settings to create default tracks.
            </p>
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tracks.map(track => (
            <Card key={track.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle>{track.name}</CardTitle>
                      {!track.is_active && (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {track.description && (
                      <CardDescription>{track.description}</CardDescription>
                    )}
                  </div>
                  <Button asChild>
                    <Link href={`/settings/milestone-tracking/${track.slug}`}>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Milestones
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {track.definitions?.filter(d => d.is_active).length || 0} active milestones
                  </span>
                  {track.definitions && track.definitions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Last updated: {new Date(track.updated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
