/**
 * Organization Switcher Component
 *
 * Allows users to switch between organizations they belong to
 * Displayed in sidebar header
 *
 * Part of Issue #54: Self-Service Onboarding
 */

'use client'

import { useState } from 'react'
import { Building, Check, ChevronsUpDown, PlusCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { CreateOrganizationDialog } from '@/components/create-organization-dialog'
import { cn } from '@/lib/utils'

interface Organization {
  id: string
  name: string
  slug: string
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
  currentOrganizationId: string
}

export function OrganizationSwitcher({
  organizations,
  currentOrganizationId
}: OrganizationSwitcherProps) {
  const router = useRouter()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const currentOrg = organizations.find(o => o.id === currentOrganizationId)

  function handleSwitchOrg(orgId: string) {
    if (orgId === currentOrganizationId) return

    // Get org name for toast
    const targetOrg = organizations.find(o => o.id === orgId)

    // Show loading toast
    toast.loading('Switching organizations...', {
      description: targetOrg ? `Switching to ${targetOrg.name}` : undefined
    })

    // Use hard navigation to force full page reload (updates layout/header)
    window.location.href = `/api/switch-org/${orgId}`
  }

  function handleCreateOrg() {
    setCreateDialogOpen(true)
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                className="w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                suppressHydrationWarning
              >
                <Building className="h-4 w-4" />
                <span className="truncate">{currentOrg?.name || 'Select Organization'}</span>
                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-[--radix-popper-anchor-width]" align="start">
              {organizations.length > 0 ? (
                <>
                  {organizations.map(org => (
                    <DropdownMenuItem
                      key={org.id}
                      onSelect={() => handleSwitchOrg(org.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          org.id === currentOrganizationId ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate">{org.name}</span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              ) : null}

              <DropdownMenuItem onSelect={handleCreateOrg} className="cursor-pointer">
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>Create Organization</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Create Organization Dialog */}
      <CreateOrganizationDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  )
}
