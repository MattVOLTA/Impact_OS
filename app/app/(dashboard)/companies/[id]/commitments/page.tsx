/**
 * Commitments List Page
 *
 * Displays full list of commitments for a company with filtering.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCompany } from '@/lib/dal/companies'
import { getCompanyCommitments, type Commitment } from '@/lib/dal/commitments'
import { isAIFeatureEnabled } from '@/lib/dal/settings'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Archive } from 'lucide-react'
import { InlineCommitmentInput } from '../components/inline-commitment-input'
import { InlineCommitmentItem } from '../components/inline-commitment-item'
import { ClosedCommitmentsTable } from '../components/closed-commitments-table'

interface CommitmentsPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CommitmentsPageProps): Promise<Metadata> {
  const { id } = await params
  const company = await getCompany(id)

  return {
    title: company ? `Commitments - ${company.business_name}` : 'Commitments',
  }
}

export default async function CommitmentsPage({ params }: CommitmentsPageProps) {
  const { id: companyId } = await params
  const company = await getCompany(companyId)

  if (!company) notFound()

  // Fetch all commitments
  const commitments = await getCompanyCommitments(companyId, 'all')

  // Check if AI analysis is enabled
  const commitmentAnalysisEnabled = await isAIFeatureEnabled('commitment_analysis')

  // Group by status
  const open = commitments.filter(c => c.status === 'open')
  const closed = commitments.filter(c => c.status !== 'open')

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SmartBackButton 
          fallbackHref={`/companies/${companyId}`} 
          fallbackLabel="Back to Company" 
          ignoreRefererPath={`/companies/${companyId}/commitments`}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/companies/${companyId}`} className="hover:text-foreground">{company.business_name}</Link>
          <span>/</span>
          <span className="text-foreground">Commitments</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Commitments</h1>
        <p className="text-muted-foreground">Track goals and action items.</p>
      </div>

      <div className="space-y-10">
        {/* Input Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">New Commitment</CardTitle>
            <CardDescription>Add a new goal or action item to track</CardDescription>
          </CardHeader>
          <CardContent>
            <InlineCommitmentInput companyId={companyId} aiAnalysisEnabled={commitmentAnalysisEnabled} />
          </CardContent>
        </Card>

        {/* Open Commitments Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2.5">
              <Target className="h-5 w-5 text-blue-600" />
              Open Commitments
              <Badge variant="secondary" className="rounded-full px-2.5">{open.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              Active goals and action items
            </p>
          </div>
          {open.length > 0 ? (
            <div className="grid gap-3">
              {open.map(c => (
                <InlineCommitmentItem
                  key={c.id}
                  id={c.id}
                  initialTitle={c.title}
                  initialStatus={c.status}
                  initialDueDate={c.due_date}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground bg-muted/30">
              No open commitments.
            </div>
          )}
        </div>

        {/* Visual Separator */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted-foreground/20"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">
              Historical
            </span>
          </div>
        </div>

        {/* Closed Commitments Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2.5 text-muted-foreground">
              <Archive className="h-5 w-5" />
              Closed Commitments
              <Badge variant="outline" className="rounded-full px-2.5">{closed.length}</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1 ml-7">
              Historical record of completed, cancelled, and incomplete commitments
            </p>
          </div>
          <ClosedCommitmentsTable commitments={closed} />
        </div>
      </div>
    </div>
  )
}

