/**
 * Interaction Detail Component
 *
 * Displays interaction details using consistent two-column layout.
 * Matches ContactDetail and CompanyDetail patterns.
 */

import Link from 'next/link'
import type { InteractionWithRelations } from '@/lib/dal/interactions'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { InteractionHeaderCard } from './interaction-header-card'
import { SummarySection } from './summary-section'
import { AssociatedCompaniesSection } from './associated-companies-section'
import { AssociatedContactsSection } from './associated-contacts-section'

interface InteractionDetailProps {
  interaction: InteractionWithRelations
}

export function InteractionDetail({ interaction }: InteractionDetailProps) {
  return (
    <>
      {/* Smart Back Button with Breadcrumb */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref="/interactions" fallbackLabel="Back to Interactions" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/interactions" className="hover:text-foreground">
            Interactions
          </Link>
          <span>/</span>
          <span className="text-foreground">{interaction.title || 'Untitled'}</span>
        </div>
      </div>

      {/* Interaction Header Card */}
      <InteractionHeaderCard interaction={interaction} />

      {/* Two Column Layout - 65% / 35% split */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column (65%) - Summary */}
        <div className="flex-1 lg:w-[65%] space-y-6">
          <SummarySection interaction={interaction} />
        </div>

        {/* Right Column (35%) - Companies + Contacts */}
        <div className="lg:w-[35%] space-y-6">
          <AssociatedCompaniesSection interaction={interaction} />
          <AssociatedContactsSection interaction={interaction} />
        </div>
      </div>
    </>
  )
}
