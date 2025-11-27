/**
 * Individual Report View Page
 *
 * Displays a single report with markdown rendering and download option.
 */

import { getReport } from '@/lib/dal/reports'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ReportViewPage({ params }: PageProps) {
  const { id } = await params

  let report
  try {
    report = await getReport(id)
  } catch (error) {
    notFound()
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
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/reports/library">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </Link>
        <form action={`/api/reports/download/${report.id}`} method="POST">
          <Button type="submit">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </form>
      </div>

      {/* Report Metadata */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-semibold mb-2">{report.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {getReportTypeBadge(report.report_type)}
          <span>•</span>
          <span>
            Created {formatDistanceToNow(new Date(report.created_at), { addSuffix: true }).replace('about ', '')}
          </span>
          {report.metadata?.start_date && (
            <>
              <span>•</span>
              <span>
                {report.metadata.start_date} to {report.metadata.end_date || 'present'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white border rounded-lg p-8">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {report.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
