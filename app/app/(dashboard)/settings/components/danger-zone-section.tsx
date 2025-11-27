/**
 * Danger Zone Section
 *
 * Contains destructive actions like deleting the organization
 * Only visible to admins
 */

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteOrganizationDialog } from '@/components/delete-organization-dialog'
import { AlertTriangle } from 'lucide-react'

interface DangerZoneSectionProps {
  organizationId: string
  organizationName: string
}

export function DangerZoneSection({
  organizationId,
  organizationName
}: DangerZoneSectionProps) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
        <CardDescription>
          Irreversible and destructive actions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Delete this organization</p>
            <p className="text-sm text-muted-foreground">
              Permanently delete {organizationName} and all associated data. This action cannot be undone.
            </p>
          </div>
          <DeleteOrganizationDialog
            organizationId={organizationId}
            organizationName={organizationName}
          />
        </div>
      </CardContent>
    </Card>
  )
}
