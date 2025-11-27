'use client'

import { useState, Fragment } from 'react'
import { format } from 'date-fns'
import {
  CheckCircle2,
  XCircle,
  LogOut,
  MoreVertical,
  ArrowUpDown
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import type { Commitment } from '@/lib/schemas/commitments'
import { InlineCommitmentItem } from './inline-commitment-item'

interface ClosedCommitmentsTableProps {
  commitments: Commitment[]
  onUpdate?: () => void
}

type StatusFilter = 'all' | 'completed' | 'not_completed' | 'cancelled'
type SortField = 'title' | 'due_date' | 'completed_at' | 'status'
type SortDirection = 'asc' | 'desc'

export function ClosedCommitmentsTable({ commitments, onUpdate }: ClosedCommitmentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortField, setSortField] = useState<SortField>('completed_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filter commitments
  const filteredCommitments = commitments.filter(c => {
    if (statusFilter === 'all') return true
    return c.status === statusFilter
  })

  // Sort commitments
  const sortedCommitments = [...filteredCommitments].sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]

    // Handle null values
    if (aValue === null) return 1
    if (bValue === null) return -1

    // Convert dates to timestamps for comparison
    if (sortField === 'due_date' || sortField === 'completed_at') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    // String comparison
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getStatusBadge = (status: Commitment['status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        )
      case 'not_completed':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Not Completed
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <LogOut className="mr-1 h-3 w-3" />
            Abandoned
          </Badge>
        )
      default:
        return null
    }
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 -ml-3 hover:bg-transparent"
      onClick={() => handleSort(field)}
    >
      {children}
      <ArrowUpDown className={cn(
        "ml-2 h-3 w-3",
        sortField === field ? "opacity-100" : "opacity-50"
      )} />
    </Button>
  )

  if (sortedCommitments.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed text-muted-foreground bg-muted/20">
        <p className="text-sm">
          {statusFilter === 'all'
            ? "No closed commitments yet. Mark commitments as completed, not completed, or abandoned to see them here."
            : `No ${statusFilter.replace('_', ' ')} commitments.`
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All
            <Badge variant="secondary" className="ml-2 rounded-full px-1.5 text-xs">
              {commitments.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <Badge variant="secondary" className="ml-2 rounded-full px-1.5 text-xs">
              {commitments.filter(c => c.status === 'completed').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="not_completed">
            Not Completed
            <Badge variant="secondary" className="ml-2 rounded-full px-1.5 text-xs">
              {commitments.filter(c => c.status === 'not_completed').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Abandoned
            <Badge variant="secondary" className="ml-2 rounded-full px-1.5 text-xs">
              {commitments.filter(c => c.status === 'cancelled').length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Data Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">
                <SortButton field="status">Status</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="title">Commitment</SortButton>
              </TableHead>
              <TableHead className="w-[120px]">
                <SortButton field="due_date">Due Date</SortButton>
              </TableHead>
              <TableHead className="w-[120px]">
                <SortButton field="completed_at">Closed</SortButton>
              </TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCommitments.map((commitment) => (
              <Fragment key={commitment.id}>
                <TableRow
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    expandedId === commitment.id && "bg-muted/30"
                  )}
                  onClick={() => setExpandedId(expandedId === commitment.id ? null : commitment.id)}
                >
                  <TableCell>
                    {getStatusBadge(commitment.status)}
                  </TableCell>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {commitment.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {commitment.due_date
                      ? format(new Date(commitment.due_date), 'MMM d, yyyy')
                      : '—'
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {commitment.completed_at
                      ? format(new Date(commitment.completed_at), 'MMM d, yyyy')
                      : '—'
                    }
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setExpandedId(commitment.id)}>
                          Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                {/* Expanded Row */}
                {expandedId === commitment.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-4 bg-muted/20">
                      <InlineCommitmentItem
                        id={commitment.id}
                        initialTitle={commitment.title}
                        initialStatus={commitment.status}
                        initialDueDate={commitment.due_date}
                        onUpdate={() => {
                          setExpandedId(null)
                          onUpdate?.()
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {sortedCommitments.length} of {commitments.length} closed commitments
      </div>
    </div>
  )
}
