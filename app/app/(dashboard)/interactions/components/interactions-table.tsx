/**
 * Interactions Table
 *
 * Displays interactions in a table format with search and pagination.
 */

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import type { InteractionWithRelations } from '@/lib/dal/interactions'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FirefliesIndicator } from './fireflies-indicator'
import { MessageSquare } from 'lucide-react'

interface InteractionsTableProps {
  interactions: InteractionWithRelations[]
  currentPage: number
  totalPages: number
  totalCount: number
  hasSearch?: boolean
}

export function InteractionsTable({ interactions, currentPage, totalPages, totalCount, hasSearch }: InteractionsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams()
    if (value) params.set('search', value)
    // Reset to page 1 when searching
    params.set('page', '1')
    router.push(`/interactions?${params.toString()}`)
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search interactions..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {interactions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">No interactions found</p>
              <p className="text-xs mt-2">
                {hasSearch
                  ? 'Try a different search term'
                  : 'Add your first interaction or connect Fireflies to auto-capture meetings'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 py-3 text-sm font-medium">Title</TableHead>
                <TableHead className="px-4 py-3 text-sm font-medium">Contacts</TableHead>
                <TableHead className="px-4 py-3 text-sm font-medium">Companies</TableHead>
                <TableHead className="px-4 py-3 text-sm font-medium">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.map(interaction => (
                <TableRow
                  key={interaction.id}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="px-4 py-3">
                    <Link href={`/interactions/${interaction.id}`} className="flex items-center gap-2">
                      {interaction.fireflies_transcript_id && <FirefliesIndicator />}
                      <span className="font-medium">
                        {interaction.title || 'Untitled'}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {interaction.contacts?.slice(0, 3).map(contact => (
                        <Link
                          key={contact.id}
                          href={`/contacts/${contact.id}`}
                        >
                          <Badge variant="outline" className="text-xs hover:bg-secondary">
                            {contact.first_name} {contact.last_name}
                          </Badge>
                        </Link>
                      ))}
                      {interaction.contacts && interaction.contacts.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{interaction.contacts.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {interaction.companies?.slice(0, 2).map(company => (
                        <Link
                          key={company.id}
                          href={`/companies/${company.id}`}
                        >
                          <Badge variant="outline" className="text-xs hover:bg-secondary">
                            {company.business_name}
                          </Badge>
                        </Link>
                      ))}
                      {interaction.companies && interaction.companies.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{interaction.companies.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-muted-foreground">
                    {interaction.meeting_date ? formatDistanceToNow(new Date(interaction.meeting_date), {
                      addSuffix: true
                    }).replace('about ', '') : 'No date'}
                  </TableCell>
                </TableRow>
              ))
              }
            </TableBody>
          </Table>
        </div>
      )}

      {interactions.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
        />
      )}
    </div>
  )
}
