/**
 * Interaction Detail Page
 *
 * Displays full details of a single interaction with edit/delete actions.
 */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getInteraction } from '@/lib/dal/interactions'
import { InteractionDetail } from './components/interaction-detail'
import { InteractionDetailSkeleton } from './components/interaction-detail-skeleton'
import { Suspense } from 'react'

interface InteractionPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: InteractionPageProps): Promise<Metadata> {
  const { id } = await params
  const interaction = await getInteraction(id)

  if (!interaction) {
    return {
      title: 'Interaction Not Found',
    }
  }

  return {
    title: interaction.title,
  }
}

export default async function InteractionPage({ params }: InteractionPageProps) {
  const { id } = await params

  return (
    <div className="flex h-full flex-col p-6 space-y-6">
      <Suspense fallback={<InteractionDetailSkeleton />}>
        <InteractionDetailAsync id={id} />
      </Suspense>
    </div>
  )
}

async function InteractionDetailAsync({ id }: { id: string }) {
  const interaction = await getInteraction(id)

  if (!interaction) {
    notFound()
  }

  return <InteractionDetail interaction={interaction} />
}
