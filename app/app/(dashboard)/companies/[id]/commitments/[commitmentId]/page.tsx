/**
 * Commitment Details Page
 *
 * View and edit a specific commitment.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCompany } from '@/lib/dal/companies'
import { getCommitment } from '@/lib/dal/commitments'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { CommitmentForm } from './commitment-form'

interface CommitmentDetailPageProps {
  params: Promise<{ id: string; commitmentId: string }>
}

export async function generateMetadata({ params }: CommitmentDetailPageProps): Promise<Metadata> {
  const { id, commitmentId } = await params
  const commitment = commitmentId !== 'new' ? await getCommitment(commitmentId) : null
  
  return {
    title: commitment ? `Edit Commitment - ${commitment.title}` : 'New Commitment',
  }
}

export default async function CommitmentDetailPage({ params }: CommitmentDetailPageProps) {
  const { id: companyId, commitmentId } = await params
  
  const company = await getCompany(companyId)
  if (!company) notFound()

  const isNew = commitmentId === 'new'
  let commitment = null

  if (!isNew) {
    commitment = await getCommitment(commitmentId)
    if (!commitment) notFound()
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref={`/companies/${companyId}/commitments`} fallbackLabel="Back to Commitments" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/companies/${companyId}`} className="hover:text-foreground">{company.business_name}</Link>
          <span>/</span>
          <Link href={`/companies/${companyId}/commitments`} className="hover:text-foreground">Commitments</Link>
          <span>/</span>
          <span className="text-foreground">{isNew ? 'New' : 'Edit'}</span>
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isNew ? 'Create Commitment' : 'Edit Commitment'}
        </h1>
        <p className="text-muted-foreground">
          {isNew ? 'Set a new goal or action item.' : 'Update details or status.'}
        </p>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <CommitmentForm 
          companyId={companyId} 
          initialData={commitment || undefined} 
        />
      </div>
    </div>
  )
}



