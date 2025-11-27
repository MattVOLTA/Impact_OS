/**
 * Settings Page
 *
 * Server Component with role-based access control.
 * Only admins can modify settings, others can view.
 *
 * See docs/architecture/auth-best-practices.md for Server Component patterns.
 */

import type { Metadata } from 'next'
import { getCurrentUserRole, getCurrentOrganizationId } from '@/lib/dal/shared'
import { getUserOrganizations } from '@/lib/dal/organizations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FirefliesSection } from './components/fireflies-section'
import { AIIntegrationSection } from './components/ai-integration-section'
import { CommitmentTrackingSection } from './components/commitment-tracking-section'
import { MilestoneTrackingSection } from './components/milestone-tracking-section'
import { DangerZoneSection } from './components/danger-zone-section'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  // DAL handles auth check - will throw if not authenticated
  const userRole = await getCurrentUserRole()
  const isAdmin = userRole === 'admin'

  // Get current organization for danger zone
  const currentOrgId = await getCurrentOrganizationId()
  const organizations = await getUserOrganizations()
  const currentOrg = organizations.find(o => o.id === currentOrgId)

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAdmin
            ? "Manage your organization's integrations and preferences"
            : 'View your organization settings'}
        </p>
      </div>

      {/* Admin-Only Sections */}
      {isAdmin ? (
        <>
          {/* Fireflies Integration - Admin Only */}
          <FirefliesSection isAdmin={isAdmin} />

          {/* AI Integration - Admin Only */}
          <AIIntegrationSection isAdmin={isAdmin} />

          {/* Commitment Tracking - Admin Only */}
          <CommitmentTrackingSection />

          {/* Milestone Tracking - Admin Only */}
          <MilestoneTrackingSection />

          {/* Danger Zone - Admin Only */}
          {currentOrg && (
            <DangerZoneSection
              organizationId={currentOrg.id}
              organizationName={currentOrg.name}
            />
          )}
        </>
      ) : (
        /* Non-Admin View */
        <Card>
          <CardHeader>
            <CardTitle>Settings Access</CardTitle>
            <CardDescription>
              You have {userRole} access to this organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Only organization admins can view and modify settings. Contact an admin if you need
              to change integration settings or organization configuration.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
