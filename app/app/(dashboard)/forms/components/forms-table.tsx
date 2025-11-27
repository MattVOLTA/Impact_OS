/**
 * Forms Table Component
 *
 * Client Component for displaying forms list with search and pagination.
 * Matches the styling pattern used by Companies, Contacts, and Interactions tables.
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileEdit, Eye, Trash2, MoreHorizontal } from 'lucide-react'
import { Form } from '@/lib/schemas/form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

interface FormsTableProps {
  forms: Form[]
  currentPage: number
  totalPages: number
  totalCount: number
  initialStatus?: string
}

export function FormsTable({ forms, currentPage, totalPages, totalCount, initialStatus }: FormsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || initialStatus || 'all')

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    // Reset to page 1 when searching
    params.set('page', '1')
    router.push(`/forms?${params.toString()}`)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value !== 'all') {
      params.set('status', value)
    } else {
      params.delete('status')
    }
    // Reset to page 1 when changing filter
    params.set('page', '1')
    router.push(`/forms?${params.toString()}`)
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Search & Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search forms..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm bg-white"
        />
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px] bg-white" suppressHydrationWarning>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-background">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Version</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Program</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
              <th className="px-4 py-3 w-[70px]"></th>
            </tr>
          </thead>
          <tbody>
            {forms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  <FileEdit className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <p className="font-medium">No forms found</p>
                  <p className="text-xs mt-2">
                    {search || status !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Click "New Form" to create your first form'}
                  </p>
                </td>
              </tr>
            ) : (
              forms.map((form) => (
                <tr
                  key={form.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/forms/${form.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{form.title}</span>
                      {form.description && (
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {form.description}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {form.is_published ? (
                      <Badge variant="default">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">v{form.version}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {form.program_id ? 'Assigned' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(form.updated_at), { addSuffix: true }).replace('about ', '')}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/forms/${form.id}`}>
                            <FileEdit className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/forms/${form.id}/preview`}>
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  )
}
