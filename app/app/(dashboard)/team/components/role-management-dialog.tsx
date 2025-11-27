/**
 * Role Management Dialog
 *
 * Part of Issue #56: Admin User Management - Team Page
 *
 * Allows admins/owners to change member roles and remove members.
 *
 * Business rules enforced:
 * - Cannot change own role
 * - Only owners can promote to owner
 * - Cannot demote last owner
 * - Confirmation before removal
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AlertCircle } from 'lucide-react'
import { changeUserRole, removeMember } from '../actions'
import { toast } from 'sonner'
import type { OrganizationMember, UserRole } from '@/lib/dal/team'

const ROLES = [
  {
    value: 'owner' as const,
    label: 'Owner',
    description: 'Full control of organization'
  },
  {
    value: 'admin' as const,
    label: 'Admin',
    description: 'Manage members and settings'
  },
  {
    value: 'editor' as const,
    label: 'Editor',
    description: 'Create and edit content'
  },
  {
    value: 'viewer' as const,
    label: 'Viewer',
    description: 'Read-only access'
  },
]

interface RoleManagementDialogProps {
  member: OrganizationMember
  onClose: () => void
  onSuccess: () => void
}

export function RoleManagementDialog({ member, onClose, onSuccess }: RoleManagementDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role)
  const [isLoading, setIsLoading] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const router = useRouter()

  const getInitials = () => {
    const first = member.users.first_name?.charAt(0)?.toUpperCase() || ''
    const last = member.users.last_name?.charAt(0)?.toUpperCase() || ''
    return `${first}${last}` || '??'
  }

  const handleSave = async () => {
    if (selectedRole === member.role) {
      onClose()
      return
    }

    setIsLoading(true)
    try {
      const result = await changeUserRole({
        targetUserId: member.user_id,
        newRole: selectedRole,
      })

      if (result.success) {
        toast.success(`Role updated to ${selectedRole}`)
        router.refresh()
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to change role')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change role')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemove = async () => {
    if (!showRemoveConfirm) {
      setShowRemoveConfirm(true)
      return
    }

    setIsLoading(true)
    try {
      const result = await removeMember(member.user_id)

      if (result.success) {
        toast.success('Member removed from team')
        router.refresh()
        onSuccess()
      } else {
        toast.error(result.error || 'Failed to remove member')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    } finally {
      setIsLoading(false)
      setShowRemoveConfirm(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Member</DialogTitle>
          <DialogDescription>
            Update role or remove member from your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Member info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {member.users.first_name} {member.users.last_name}
              </p>
              <p className="text-sm text-muted-foreground truncate">{member.users.email}</p>
            </div>
          </div>

          {/* Current role */}
          <div>
            <p className="text-sm font-medium mb-1">Current Role</p>
            <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
          </div>

          {/* Role selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Change Role</Label>
            <RadioGroup value={selectedRole} onValueChange={(val) => setSelectedRole(val as UserRole)}>
              <div className="space-y-2">
                {ROLES.map((role) => (
                  <div key={role.value} className="flex items-start gap-3">
                    <RadioGroupItem
                      value={role.value}
                      id={role.value}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={role.value}
                      className="cursor-pointer flex-1"
                    >
                      <div className="font-medium">{role.label}</div>
                      <div className="text-sm text-muted-foreground">{role.description}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Warning message */}
          <div className="bg-amber-500/10 border border-amber-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">
              You cannot change your own role or demote the only owner.
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          {showRemoveConfirm ? (
            <>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600">
                  Confirm removal?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This will revoke all access immediately
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRemoveConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={isLoading}
                >
                  {isLoading ? 'Removing...' : 'Confirm Remove'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowRemoveConfirm(true)}
                disabled={isLoading}
              >
                Remove from Team
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isLoading || selectedRole === member.role}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
