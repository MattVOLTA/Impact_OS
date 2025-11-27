/**
 * App Sidebar Wrapper (Server Component)
 *
 * Fetches user organizations and feature flags, passes to client sidebar
 * Part of Issue #54: Multi-Organization Support
 * Updated for Issue #59: Sidebar reorganization with user avatar
 */

import { getUserOrganizations } from '@/lib/dal/organizations'
import { getCurrentOrganizationId, getCurrentUserRole, requireAuth } from '@/lib/dal/shared'
import { getTenantConfig } from '@/lib/dal/settings'
import { AppSidebar } from './app-sidebar'

export async function AppSidebarWrapper() {
  // Fetch user's organizations and current role
  const organizations = await getUserOrganizations()
  const currentOrgId = await getCurrentOrganizationId()
  const userRole = await getCurrentUserRole()

  // Fetch user data for avatar/menu
  const { user } = await requireAuth()
  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'
  const userEmail = user.email || ''
  const userInitials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Fetch feature flags for current organization
  const config = await getTenantConfig()

  const featureFlags = {
    companyUpdates: config?.feature_company_updates ?? true,
    interactions: config?.feature_interactions ?? true,
    fireflies: config?.feature_fireflies ?? false,
    advisorProfiles: config?.feature_advisor_profiles ?? true
  }

  // Check if Fireflies is connected
  const firefliesConnected = config?.fireflies_connection_status === 'connected'

  return (
    <AppSidebar
      organizations={organizations}
      currentOrganizationId={currentOrgId}
      featureFlags={featureFlags}
      firefliesConnected={firefliesConnected}
      userRole={userRole}
      userName={userName}
      userEmail={userEmail}
      userInitials={userInitials}
    />
  )
}
