/**
 * Smart Back Button Component
 *
 * Displays a back button with intelligent context based on the HTTP referer.
 * Shows "Back to [Context]" when coming from a known page, or generic "Back" otherwise.
 *
 * Server Component that reads the referer header to determine context.
 */

import { headers } from 'next/headers'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartBackButtonProps {
  fallbackHref: string
  fallbackLabel?: string
  className?: string
  ignoreRefererPath?: string
}

/**
 * Extracts context from referer URL
 * Returns { label, href } based on the referer path
 */
function getBackContext(referer: string | null, fallbackHref: string, fallbackLabel: string, ignoreRefererPath?: string) {
  if (!referer) {
    return { label: fallbackLabel, href: fallbackHref }
  }

  try {
    const refererUrl = new URL(referer)
    const pathname = refererUrl.pathname

    // Ignore self-referential loops
    if (ignoreRefererPath && pathname === ignoreRefererPath) {
      return { label: fallbackLabel, href: fallbackHref }
    }

    // Match specific patterns and return appropriate context
    if (pathname.startsWith('/interactions/') && pathname !== '/interactions') {
      return { label: 'Back to Interaction', href: pathname }
    }
    if (pathname === '/interactions') {
      return { label: 'Back to Interactions', href: '/interactions' }
    }
    if (pathname.startsWith('/contacts/') && pathname !== '/contacts') {
      return { label: 'Back to Contact', href: pathname }
    }
    if (pathname === '/contacts') {
      return { label: 'Back to Contacts', href: '/contacts' }
    }
    if (pathname.startsWith('/companies/') && pathname !== '/companies') {
      return { label: 'Back to Company', href: pathname }
    }
    if (pathname === '/companies') {
      return { label: 'Back to Companies', href: '/companies' }
    }
    if (pathname === '/dashboard') {
      return { label: 'Back to Dashboard', href: '/dashboard' }
    }

    // Default to referer if it's from our app
    return { label: fallbackLabel, href: pathname }
  } catch {
    // Invalid URL, use fallback
    return { label: fallbackLabel, href: fallbackHref }
  }
}

export async function SmartBackButton({
  fallbackHref,
  fallbackLabel = 'Back',
  className,
  ignoreRefererPath
}: SmartBackButtonProps) {
  const headersList = await headers()
  const referer = headersList.get('referer')

  const { label, href } = getBackContext(referer, fallbackHref, fallbackLabel, ignoreRefererPath)

  return (
    <Link 
      href={href} 
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1", className)}
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </Link>
  )
}
