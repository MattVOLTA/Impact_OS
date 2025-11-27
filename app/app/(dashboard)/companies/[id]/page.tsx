/**
 * Company Detail Page
 *
 * Server Component that displays full company profile.
 * Shows company info, contacts, and interactions.
 *
 * See Epic #11 for requirements.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCompany, getIndustries } from '@/lib/dal/companies'
import { getInteractionsByCompany } from '@/lib/dal/interactions'
import { getProgramsByCompany } from '@/lib/dal/programs'
import { getCompanyCommitmentProgress, getCommitmentDefinitions, type CompanyCommitmentProgress, type CommitmentDefinition } from '@/lib/dal/commitment-tracking'
import { getCompanyCommitments, type Commitment } from '@/lib/dal/commitments'
import { isFeatureEnabled, isAIFeatureEnabled, getMilestoneTrackingSettings } from '@/lib/dal/settings'
import { getCompanyCurrentMilestone, getCompanyMilestoneHistoryWithDetails } from '@/lib/dal/company-milestones'
import { getCurrentUserRole } from '@/lib/dal/shared'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { CompanyHeaderCard } from './components/company-header-card'
import { CompanyInfoSection } from './components/company-info-section'
import { ContactsSection } from './components/contacts-section'
import { InteractionsSection } from './components/interactions-section'
import { ProgramsSection } from './components/programs-section'
import { CommitmentsCard } from './components/commitments-card'
import { CommitmentTracker } from './components/commitment-tracker'
import { MarketMilestonesCard } from './components/market-milestones-card'
import { Card } from '@/components/ui/card'

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CompanyDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const company = await getCompany(id)

  if (!company) {
    return {
      title: 'Company Not Found',
    }
  }

  return {
    title: company.business_name,
  }
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const { id } = await params

  // Fetch company, industries, interactions, and programs
  const company = await getCompany(id)
  const industries = await getIndustries()
  const interactions = await getInteractionsByCompany(id)
  const programEnrollments = await getProgramsByCompany(id)

  if (!company) {
    notFound()
  }

  // Get user role for permission checks
  const userRole = await getCurrentUserRole()

  // Fetch Commitment Tracking if enabled
  const trackingEnabled = await isFeatureEnabled('commitment_tracking')
  const commitmentAnalysisEnabled = await isAIFeatureEnabled('commitment_analysis')
  let trackingData = null
  let commitments: Commitment[] = []

  // Fetch Milestone Tracking if enabled
  const milestoneSettings = await getMilestoneTrackingSettings()
  let currentMilestone = null
  let milestoneHistory: any[] = []

  if (milestoneSettings.enabled) {
    try {
      const [milestone, history] = await Promise.all([
        getCompanyCurrentMilestone(id),
        getCompanyMilestoneHistoryWithDetails(id)
      ])
      currentMilestone = milestone
      milestoneHistory = history
    } catch (error) {
      console.error('Failed to fetch company milestone:', error)
    }
  }

  if (trackingEnabled) {
    try {
      // Parallel fetch
      const [commitmentProgress, commitmentDefinitions, activeCommitments] = await Promise.all([
        company.commitment_track ? getCompanyCommitmentProgress(id) : Promise.resolve([]),
        company.commitment_track ? getCommitmentDefinitions(company.commitment_track.id) : Promise.resolve([]),
        getCompanyCommitments(id, 'open')
      ])

      if (company.commitment_track) {
        trackingData = {
          trackTitle: company.commitment_track.title,
          definitions: commitmentDefinitions,
          progress: commitmentProgress
        }
      }
      commitments = activeCommitments
    } catch (error) {
      console.error('Failed to fetch commitment tracking/commitments:', error)
    }
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Smart Back Button with Breadcrumb */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref="/companies" fallbackLabel="Back to Companies" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/companies" className="hover:text-foreground">
            Companies
          </Link>
          <span>/</span>
          <span className="text-foreground">{company.business_name}</span>
        </div>
      </div>

      {/* Company Header Card */}
      <CompanyHeaderCard company={company} industries={industries} />

      {/* Two Column Layout - 65% / 35% split */}
      {/* On mobile: Contacts first, then Programs, then Interactions */}
      {/* On desktop: Interactions left (65%), Contacts + Programs right (35%) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Right Column on Desktop / First on Mobile - Milestones + Contacts + Programs */}
        <div className="lg:w-[35%] lg:order-2 space-y-6">
          {/* Market Milestones Card - Only show if milestone tracking is enabled */}
          {milestoneSettings.enabled && (
            <MarketMilestonesCard
              companyId={company.id}
              currentMilestone={currentMilestone}
              milestoneHistory={milestoneHistory}
              userRole={userRole}
            />
          )}

          <ContactsSection companyId={company.id} />
          <ProgramsSection companyId={company.id} enrollments={programEnrollments} />
        </div>

        {/* Left Column on Desktop / Second on Mobile - Interactions/Timeline */}
        <div className="flex-1 lg:w-[65%] lg:order-1 space-y-6">
          {/* Commitments Card */}
          {trackingEnabled && (
            <CommitmentsCard
              companyId={company.id}
              commitments={commitments}
              aiAnalysisEnabled={commitmentAnalysisEnabled}
            />
          )}
          
          {/* Standard Interactions List */}
          <InteractionsSection companyId={company.id} initialInteractions={interactions} />
        </div>
      </div>
    </div>
  )
}
