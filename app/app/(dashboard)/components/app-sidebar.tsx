/**
 * Application Sidebar Navigation
 *
 * Collapsible sidebar with navigation items.
 * When collapsed: Shows icon-only view
 * When expanded: Shows icon + label
 * Uses shadcn/ui Sidebar component.
 *
 * Updated for multi-org support (Issue #54)
 * Updated for sidebar reorganization (Issue #59)
 */

'use client'

import { Home, Building2, Users, MessageSquare, FileText, LogOut, FileEdit, GraduationCap, ChevronUp, AudioLines } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { OrganizationSwitcher } from '@/components/organization-switcher'
import { logoutAction } from '../actions'

interface Organization {
  id: string
  name: string
  slug: string
}

interface FeatureFlags {
  companyUpdates: boolean
  interactions: boolean
  fireflies: boolean
  advisorProfiles: boolean
}

interface AppSidebarProps {
  organizations: Organization[]
  currentOrganizationId: string
  featureFlags: FeatureFlags
  firefliesConnected: boolean
  userRole: 'owner' | 'admin' | 'editor' | 'viewer'
  userName: string
  userEmail: string
  userInitials: string
}

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: Home,
    featureFlag: null as string | null, // Always visible
  },
  {
    title: 'Companies',
    url: '/companies',
    icon: Building2,
    featureFlag: null, // Always visible
  },
  {
    title: 'Contacts',
    url: '/contacts',
    icon: Users,
    featureFlag: null, // Always visible
  },
  {
    title: 'Interactions',
    url: '/interactions',
    icon: MessageSquare,
    featureFlag: 'interactions' as const, // Feature gated
  },
  {
    title: 'Programs',
    url: '/programs',
    icon: GraduationCap,
    featureFlag: null, // Always visible (BAI compliance required)
  },
  {
    title: 'Forms',
    url: '/forms',
    icon: FileEdit,
    featureFlag: null, // Always visible (core functionality)
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: FileText,
    featureFlag: null, // Always visible (core functionality)
  },
  {
    title: 'Transcript Queue',
    url: '/settings/fireflies/queue',
    icon: AudioLines,
    featureFlag: 'fireflies_connected' as const, // Only show when Fireflies is connected
  },
]

// Footer items removed - Team and Settings moved to header (Issue #59)

export function AppSidebar({
  organizations,
  currentOrganizationId,
  featureFlags,
  firefliesConnected,
  userRole,
  userName,
  userEmail,
  userInitials
}: AppSidebarProps) {
  const pathname = usePathname()

  const handleLogout = async () => {
    await logoutAction()
  }

  // Filter navigation items based on feature flags
  const visibleNavigationItems = navigationItems.filter(item => {
    // If no feature flag, always show
    if (!item.featureFlag) return true

    // Check if feature is enabled
    if (item.featureFlag === 'interactions') return featureFlags.interactions
    if (item.featureFlag === 'advisor_profiles') return featureFlags.advisorProfiles
    if (item.featureFlag === 'company_updates') return featureFlags.companyUpdates
    if (item.featureFlag === 'fireflies_connected') return firefliesConnected

    // Default to showing if unknown feature flag
    return true
  })

  return (
    <Sidebar collapsible="icon">
      {/* Organization Switcher */}
      <SidebarHeader>
        <OrganizationSwitcher
          organizations={organizations}
          currentOrganizationId={currentOrganizationId}
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User menu with avatar in footer */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  suppressHydrationWarning
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {userInitials || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{userName || 'User'}</span>
                  <ChevronUp className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
