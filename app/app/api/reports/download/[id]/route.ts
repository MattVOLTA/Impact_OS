/**
 * Report Download API Route
 *
 * Downloads a report as a markdown file.
 * Enforces multi-tenant isolation via RLS.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getReport } from '@/lib/dal/reports'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    // Get report (RLS enforced)
    const report = await getReport(id)

    // Generate filename from title
    const filename = `${report.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`

    // Return markdown file
    return new NextResponse(report.content, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Download error:', error)

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Report not found' },
      { status: 404 }
    )
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  return POST(request, context)
}
