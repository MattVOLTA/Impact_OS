/**
 * Report Library Page
 *
 * Browse and view all generated reports for the tenant.
 * Provides search, filter, and download functionality.
 */

export const dynamic = 'force-dynamic'

import { getReports } from '@/lib/dal/reports'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Download, MessageSquare, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function ReportLibraryPage() {
  let reports: Awaited<ReturnType<typeof getReports>> = []
  try {
    reports = await getReports(100)
  } catch (error) {
    console.error('Error loading reports:', error)
    reports = []
  }

  const getReportTypeBadge = (type: string) => {
    switch (type) {
      case 'demographic_reach':
        return <Badge variant="secondary">Demographic Reach</Badge>
      case 'interaction_activity':
        return <Badge variant="secondary">Interaction Activity</Badge>
      default:
        return <Badge variant="outline">Custom</Badge>
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/reports">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Chat
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold mt-4">Report Library</h1>
          <p className="text-sm text-gray-600 mt-1">
            Browse and download all generated reports
          </p>
        </div>
        <Link href="/reports">
          <Button>
            <MessageSquare className="h-4 w-4 mr-2" />
            New Report
          </Button>
        </Link>
      </div>

      {/* Reports Table */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-gray-600 mb-4">No reports generated yet</p>
          <Link href="/reports">
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              Generate Your First Report
            </Button>
          </Link>
        </div>
      ) : (
        <div className="border rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {report.title}
                  </TableCell>
                  <TableCell>{getReportTypeBadge(report.report_type)}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(report.created_at), {
                      addSuffix: true
                    }).replace('about ', '')}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {report.report_sessions?.title || 'Untitled conversation'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/reports/library/${report.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <form action={`/api/reports/download/${report.id}`} method="POST">
                        <Button variant="ghost" size="sm" type="submit">
                          <Download className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
