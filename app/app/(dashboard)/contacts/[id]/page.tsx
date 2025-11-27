/**
 * Contact Detail Page
 *
 * Server Component that displays full contact profile.
 * Shows contact info, bio, companies, and interactions.
 *
 * See Epic #25 for requirements.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getContact } from '@/lib/dal/contacts'
import { getInteractionsByContact } from '@/lib/dal/interactions'
import { getProgramsByContact } from '@/lib/dal/programs'
import { SmartBackButton } from '@/components/ui/smart-back-button'
import { ContactHeaderCard } from './components/contact-header-card'
import { BioSection } from './components/bio-section'
import { AssociatedCompaniesSection } from './components/associated-companies-section'
import { InteractionsSection } from './components/interactions-section'
import { ProgramsSection } from './components/programs-section'

// Force dynamic rendering (no caching)
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ContactDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: ContactDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const contact = await getContact(id)

  if (!contact) {
    return {
      title: 'Contact Not Found',
    }
  }

  return {
    title: `${contact.first_name} ${contact.last_name}`,
  }
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params

  // Fetch contact and program enrollments via DAL
  const contact = await getContact(id)
  const programEnrollments = await getProgramsByContact(id)
  const interactions = await getInteractionsByContact(id)

  if (!contact) {
    notFound()
  }

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      {/* Smart Back Button with Breadcrumb */}
      <div className="flex items-center gap-3">
        <SmartBackButton fallbackHref="/contacts" fallbackLabel="Back to Contacts" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/contacts" className="hover:text-foreground">
            Contacts
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {contact.first_name} {contact.last_name}
          </span>
        </div>
      </div>

      {/* Contact Header Card */}
      <ContactHeaderCard contact={contact} />

      {/* Two Column Layout - 65% / 35% split */}
      {/* Mobile order: Bio, Companies, Programs, Interactions */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column on Desktop - Bio + Interactions */}
        <div className="flex-1 lg:w-[65%] space-y-6">
          <div className="lg:order-1">
            <BioSection contact={contact} />
          </div>
          <div className="lg:order-3">
            <InteractionsSection contactId={contact.id} initialInteractions={interactions} />
          </div>
        </div>

        {/* Right Column on Desktop - Companies + Programs */}
        <div className="lg:w-[35%] space-y-6">
          <div className="lg:order-2">
            <AssociatedCompaniesSection contact={contact} />
          </div>
          <div className="lg:order-4">
            <ProgramsSection contactId={contact.id} enrollments={programEnrollments} />
          </div>
        </div>
      </div>
    </div>
  )
}
