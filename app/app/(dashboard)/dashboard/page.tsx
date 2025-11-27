/**
 * Dashboard Landing Page
 *
 * Shows personalized welcome message with user's name.
 * Auth handled via DAL.
 */

import type { Metadata } from 'next'
import { getCurrentUser } from '@/lib/dal/shared'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.firstName || user.email

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Welcome, {displayName}!
        </h1>
        <p className="text-muted-foreground">
          Use the sidebar to navigate through your portfolio.
        </p>
      </div>
    </div>
  )
}
