/**
 * Program Detail Page
 *
 * Server Component that displays program details with company and contact enrollments.
 *
 * Layout:
 * - Program header (name, description, stats)
 * - Two sections: Companies (left 50%) and Contacts (right 50%)
 * - Each section has enrollment manager for bulk/individual enrollment
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProgram, getCompanyEnrollments, getContactEnrollments } from '@/lib/dal/programs'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { ProgramHeaderCard } from './components/program-header-card'
import { CompanyEnrollmentsSection } from './components/company-enrollments-section'
import { ContactEnrollmentsSection } from './components/contact-enrollments-section'

interface ProgramDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ProgramDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const program = await getProgram(id)

  if (!program) {
    return {
      title: 'Program Not Found',
    }
  }

  return {
    title: program.name,
  }
}

export default async function ProgramDetailPage({ params }: ProgramDetailPageProps) {
  const { id } = await params

  // Fetch program and enrollments
  const program = await getProgram(id)
  const companyEnrollments = await getCompanyEnrollments(id)
  const contactEnrollments = await getContactEnrollments(id)

  if (!program) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Smart Back Button with Breadcrumb */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref="/programs" fallbackLabel="Back to Programs" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/programs" className="hover:text-foreground">
            Programs
          </Link>
          <span>/</span>
          <span className="text-foreground">{program.name}</span>
        </div>
      </div>

      {/* Program Header Card */}
      <ProgramHeaderCard program={program} />

      {/* Two Column Layout - 50% / 50% split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Companies Section */}
        <CompanyEnrollmentsSection
          programId={program.id}
          enrollments={companyEnrollments}
        />

        {/* Contacts Section */}
        <ContactEnrollmentsSection
          programId={program.id}
          enrollments={contactEnrollments}
        />
      </div>
    </div>
  )
}
