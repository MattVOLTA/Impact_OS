/**
 * Dashboard Layout
 *
 * Server Component that wraps all protected routes with sidebar navigation.
 * Reads sidebar state from cookie to persist open/collapsed state.
 * Auth check happens at page level (via DAL), not here.
 *
 * See docs/architecture/auth-best-practices.md for layout patterns.
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { AppSidebarWrapper } from './components/app-sidebar-wrapper'
import { UniversalSearchDialog } from './components/universal-search-dialog'
import { getUserOrganizations } from '@/lib/dal/organizations'
import { getCurrentOrganizationId, getCurrentUserRole, requireAuth } from '@/lib/dal/shared'
import { Settings, UserCog } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read sidebar state from cookie (persists across page loads)
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar:state')?.value === 'true'

  // Get user's organizations - redirect to onboarding if none exist
  const organizations = await getUserOrganizations()
  if (organizations.length === 0) {
    redirect('/onboarding')
  }

  // Get current organization for header
  const currentOrgId = await getCurrentOrganizationId()
  const currentOrg = organizations.find(o => o.id === currentOrgId)

  // Get user role for header buttons
  const userRole = await getCurrentUserRole()
  const isAdminOrOwner = userRole === 'admin' || userRole === 'owner'

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <UniversalSearchDialog />
      <div className="flex h-screen w-full">
        <AppSidebarWrapper />
        <div className="flex flex-1 flex-col">
          {/* Header with sidebar trigger, org name, team, and settings */}
          <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />

            {/* Left - Org name (flex-1 pushes icons right) */}
            <div className="flex flex-1 items-center gap-2">
              <h1 className="text-xl font-bold">{currentOrg?.name || 'impact OS'}</h1>
              <span className="text-sm text-muted-foreground">· impact OS</span>
            </div>

            {/* Right side - Team and Settings (grouped with no gap) */}
            <div className="flex items-center gap-0">
              {isAdminOrOwner && (
                <Button variant="ghost" size="icon" asChild>
                  <Link href="/team">
                    <UserCog className="h-4 w-4" />
                    <span className="sr-only">Team Management</span>
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Link>
              </Button>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto bg-muted/50">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
