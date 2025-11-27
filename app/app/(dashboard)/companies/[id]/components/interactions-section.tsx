/**
 * Interactions Section
 *
 * Displays interactions related to a company in a table format with client-side pagination.
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { AddInteractionButton } from '@/app/(dashboard)/interactions/components/add-interaction-button'
import { FirefliesIndicator } from '@/app/(dashboard)/interactions/components/fireflies-indicator'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { InteractionWithRelations } from '@/lib/dal/interactions'

interface InteractionsSectionProps {
  companyId: string
  initialInteractions: InteractionWithRelations[]
}

export function InteractionsSection({ companyId, initialInteractions }: InteractionsSectionProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const interactions = initialInteractions

  // Calculate pagination
  const totalPages = Math.ceil(interactions.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedInteractions = interactions.slice(startIndex, endIndex)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Interactions</CardTitle>
            <CardDescription>
              {interactions.length === 0
                ? 'No interactions captured yet'
                : `${interactions.length} interaction${interactions.length === 1 ? '' : 's'}`}
            </CardDescription>
          </div>
          <AddInteractionButton companyId={companyId} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground px-6">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No interactions captured yet.</p>
            <p className="text-xs mt-2">
              Add a manual interaction or connect Fireflies to auto-capture meetings.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3 text-sm font-medium">Title</TableHead>
                  <TableHead className="px-4 py-3 text-sm font-medium">Contacts</TableHead>
                  <TableHead className="px-4 py-3 text-sm font-medium">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInteractions.map(interaction => (
                  <TableRow key={interaction.id} className="hover:bg-muted/50">
                    <TableCell className="px-4 py-3 w-[40%]">
                      <Link href={`/interactions/${interaction.id}`} className="flex items-center gap-2 block truncate">
                        {interaction.fireflies_transcript_id && <FirefliesIndicator />}
                        <span className="font-medium text-sm truncate" title={interaction.title || 'Untitled'}>
                          {interaction.title || 'Untitled'}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {interaction.contacts?.slice(0, 2).map(contact => (
                          <Link
                            key={contact.id}
                            href={`/contacts/${contact.id}`}
                          >
                            <Badge variant="outline" className="text-xs hover:bg-secondary">
                              {contact.first_name} {contact.last_name}
                            </Badge>
                          </Link>
                        ))}
                        {interaction.contacts && interaction.contacts.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{interaction.contacts.length - 2}
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
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({interactions.length} total)
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
