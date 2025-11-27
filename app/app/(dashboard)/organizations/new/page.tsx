/**
 * Create New Organization Page
 *
 * Allows existing users to create additional organizations
 * Part of Issue #54: Multi-Organization Support
 */

import { redirect } from 'next/navigation'
import { createOrganization } from '@/lib/dal/organizations'
import { CreateOrgForm } from './create-org-form'

export default function NewOrganizationPage() {
  return (
    <div className="container max-w-2xl py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create a new organization</h1>
          <p className="text-muted-foreground">
            You'll become the admin and can invite team members
          </p>
        </div>

        <div className="rounded-lg border bg-card p-8">
          <CreateOrgForm />
        </div>
      </div>
    </div>
  )
}
