/**
 * Seed Script: System Standard Commitment Tracks
 *
 * Creates the default "System Standard SaaS Track" if it doesn't exist.
 * Uses System Standard (tenant_id = NULL).
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey)

const SAAS_TRACK = {
  title: 'System Standard SaaS',
  description: 'Standard commercial readiness levels for SaaS startups.',
  is_system_standard: true,
  steps: [
    {
      title: 'Problem Validation',
      description: '10 Customer Interviews conducted with consistent pain point patterns.',
      order_index: 1
    },
    {
      title: 'Solution Validation',
      description: '5 Signed Letters of Intent (LOIs) or Pre-sales.',
      order_index: 2
    },
    {
      title: 'MVP Delivery',
      description: 'First working prototype in hands of 3 unaffiliated users.',
      order_index: 3
    },
    {
      title: 'First Value',
      description: 'First $1 of Revenue OR First Repeated Usage (Retention).',
      order_index: 4
    },
    {
      title: 'Sustainable Growth',
      description: '$10k MRR or Breakeven Cashflow.',
      order_index: 5
    },
    {
      title: 'Scale',
      description: '5+ Full Time Employees hired.',
      order_index: 6
    }
  ]
}

async function main() {
  console.log('🚀 Seeding System Standard Commitment Tracks...')

  // 1. Check if track exists
  const { data: existing } = await adminClient
    .from('commitment_tracks')
    .select('id')
    .eq('title', SAAS_TRACK.title)
    .is('tenant_id', null)
    .maybeSingle()

  let trackId = existing?.id

  if (trackId) {
    console.log('✅ SaaS Track already exists.')
  } else {
    // 2. Create Track
    const { data: track, error: trackError } = await adminClient
      .from('commitment_tracks')
      .insert({
        tenant_id: null, // System Standard
        title: SAAS_TRACK.title,
        description: SAAS_TRACK.description,
        is_system_standard: true
      })
      .select()
      .single()

    if (trackError) {
      console.error('❌ Failed to create track:', trackError)
      process.exit(1)
    }

    trackId = track.id
    console.log(`✅ Created Track: ${track.title}`)
  }

  // 3. Create/Update Definitions
  // We delete existing definitions and recreate to ensure order
  await adminClient.from('commitment_definitions').delete().eq('track_id', trackId)

  const definitions = SAAS_TRACK.steps.map(step => ({
    track_id: trackId,
    title: step.title,
    description: step.description,
    order_index: step.order_index
  }))

  const { error: defError } = await adminClient
    .from('commitment_definitions')
    .insert(definitions)

  if (defError) {
    console.error('❌ Failed to create definitions:', defError)
    process.exit(1)
  }

  console.log(`✅ Created ${definitions.length} definitions for SaaS Track.`)
  console.log('✨ Done!')
}

main().catch(console.error)
