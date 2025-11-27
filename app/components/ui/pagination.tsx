'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from './button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
}

/**
 * Pagination component for navigating through paginated data
 *
 * Features:
 * - Previous/Next navigation
 * - Page count display
 * - Total records display
 * - Preserves search params in URLs
 * - Hidden when only one page exists
 * - Disabled states for first/last page
 *
 * @param currentPage - Current page number (1-indexed)
 * @param totalPages - Total number of pages
 * @param totalCount - Total number of records (filtered)
 */
export function Pagination({
  currentPage,
  totalPages,
  totalCount
}: PaginationProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * Create a URL for a specific page number
   * Preserves existing search parameters (like search query)
   */
  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  // Don't show pagination if only one page
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t">
      <div className="text-sm text-muted-foreground">
        Page {currentPage} of {totalPages} ({totalCount} total)
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild={currentPage > 1}
          disabled={currentPage <= 1}
        >
          {currentPage > 1 ? (
            <Link href={createPageURL(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Link>
          ) : (
            <span className="flex items-center">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </span>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          asChild={currentPage < totalPages}
          disabled={currentPage >= totalPages}
        >
          {currentPage < totalPages ? (
            <Link href={createPageURL(currentPage + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          ) : (
            <span className="flex items-center">
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
