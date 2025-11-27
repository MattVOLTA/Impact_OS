/**
 * Manual script to seed milestone tracks
 *
 * Run with: npx tsx scripts/seed-milestone-tracks.ts
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const TENANT_ID = '11111111-1111-1111-1111-111111111111'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const tracks = [
  {
    name: 'Hardware',
    slug: 'hardware',
    description: 'Hardware product milestone track',
    milestones: [
      {
        order: 1,
        name: 'Problem Validated',
        evidence: '5+ target customers have confirmed the problem is both urgent and unmet by existing solutions, demonstrated willingness to invest time',
        signal: 'Letters of intent, survey results, crowdfunding sign-ups showing verifiable interest'
      },
      {
        order: 2,
        name: 'Proof-of-Concept Built',
        evidence: 'Working prototype demonstrates core technology feasibility',
        signal: 'Functional prototype unit exists that performs the primary function'
      },
      {
        order: 3,
        name: 'User-Validated MVP',
        evidence: '3+ target customers have tested the MVP in real-world conditions with positive feedback',
        signal: 'Successful pilot trials or user testing with measurable satisfaction'
      },
      {
        order: 4,
        name: 'Pilot Production & First Customers',
        evidence: 'Small batch manufacturing run completed and first paying customers have received units',
        signal: 'Limited production run (tens to hundreds of units) sold and delivered'
      },
      {
        order: 5,
        name: 'Mass Production Ready',
        evidence: 'Manufacturing scale-up complete, product widely available for purchase',
        signal: 'Large-scale production run (thousands of units) with consistent quality, supply chain established'
      },
      {
        order: 6,
        name: 'Early Market Traction',
        evidence: '$100K+ in cumulative sales',
        signal: 'Product generating consistent revenue, demonstrating repeatable sales process'
      },
      {
        order: 7,
        name: 'Market Validation',
        evidence: '$1M+ in cumulative sales',
        signal: 'Strong market acceptance with established customer base'
      },
      {
        order: 8,
        name: 'Market Adoption',
        evidence: '$10M+ in cumulative sales',
        signal: 'Significant market penetration, scalable business model proven'
      }
    ]
  },
  {
    name: 'Biotech/Pharma',
    slug: 'biotech-pharma',
    description: 'Biotech and pharmaceutical product milestone track',
    milestones: [
      {
        order: 1,
        name: 'Preclinical Validation',
        evidence: 'Reproducible data demonstrating therapeutic effect in relevant disease models with acceptable safety profile',
        signal: 'Published preclinical data or regulatory filing (IND/CTA) accepted, demonstrating readiness for human testing'
      },
      {
        order: 2,
        name: 'Safety Validated in Humans',
        evidence: 'Initial human trials completed demonstrating product safety at therapeutic doses',
        signal: 'First-in-human trial results showing acceptable safety profile, documented dose range established'
      },
      {
        order: 3,
        name: 'Efficacy Demonstrated',
        evidence: 'Clinical trial in target patient population showing statistically significant therapeutic benefit',
        signal: 'Proof-of-concept trial results published or presented, demonstrating the treatment works in patients with the target condition'
      },
      {
        order: 4,
        name: 'Confirmatory Evidence',
        evidence: 'Large-scale clinical trial(s) confirming efficacy and safety in broader patient population',
        signal: 'Pivotal trial results meeting primary endpoints, sufficient to support regulatory submission (publicly announced or published)'
      },
      {
        order: 5,
        name: 'Regulatory Approval',
        evidence: 'Marketing authorization obtained from at least one major regulatory authority (FDA, EMA, Health Canada, PMDA, MHRA, etc.)',
        signal: 'Official approval letter/certificate issued, product legally authorized for commercial sale in that jurisdiction'
      },
      {
        order: 6,
        name: 'Commercial Launch',
        evidence: 'Product available to patients through healthcare system and generating revenue',
        signal: 'Product prescribed/dispensed in clinical practice, $10M+ in sales or significant licensing/partnership revenue recognized'
      }
    ]
  },
  {
    name: 'Medical Device',
    slug: 'medical-device',
    description: 'Medical device milestone track',
    milestones: [
      {
        order: 1,
        name: 'Clinical Need Validated',
        evidence: '5+ healthcare providers or target users have confirmed the unmet clinical need and expressed interest in the solution',
        signal: 'Letters of support from clinicians, healthcare facilities expressing willingness to pilot the device'
      },
      {
        order: 2,
        name: 'Prototype Validated',
        evidence: 'Working prototype demonstrates intended functionality and usability in simulated/lab conditions',
        signal: 'Successful bench testing and risk analysis (ISO 14971) completed, design controls established'
      },
      {
        order: 3,
        name: 'Clinical Evidence Generated',
        evidence: 'Clinical study (or studies) completed demonstrating safety and performance in target patient population',
        signal: 'Clinical trial results showing device performs as intended with acceptable risk profile (study may be smaller than pharma trials: 10-300 patients depending on risk class)'
      },
      {
        order: 4,
        name: 'Regulatory Clearance',
        evidence: 'Marketing authorization obtained from at least one major regulatory authority (FDA 510(k)/PMA, CE Mark, Health Canada, PMDA, MHRA, etc.)',
        signal: 'Official clearance/approval issued, device legally authorized for commercial sale in that jurisdiction'
      },
      {
        order: 5,
        name: 'Reimbursement Validated',
        evidence: 'Payment mechanism established through insurance/public payer (e.g., CPT code assigned, DRG inclusion, or private payer coverage decisions)',
        signal: 'Billing codes secured or payer contracts in place enabling healthcare providers to be reimbursed for using the device'
      },
      {
        order: 6,
        name: 'Market Adoption',
        evidence: 'Device in use at multiple healthcare facilities generating reimbursed revenue',
        signal: '$1M+ in sales with established reimbursement, demonstrating economic viability'
      },
      {
        order: 7,
        name: 'Scaled Adoption',
        evidence: 'Device widely adopted across healthcare system(s)',
        signal: '$10M+ in sales, demonstrating sustainable commercial viability and broad clinical acceptance'
      }
    ]
  }
]

async function seedTracks() {
  console.log('Starting to seed milestone tracks...')

  for (const trackTemplate of tracks) {
    console.log(`\nCreating track: ${trackTemplate.name}`)

    // Check if track already exists
    const { data: existing } = await adminClient
      .from('milestone_tracks')
      .select('id')
      .eq('tenant_id', TENANT_ID)
      .eq('slug', trackTemplate.slug)
      .maybeSingle()

    if (existing) {
      console.log(`  Track ${trackTemplate.name} already exists, skipping...`)
      continue
    }

    // Create track
    const { data: track, error: trackError } = await adminClient
      .from('milestone_tracks')
      .insert({
        tenant_id: TENANT_ID,
        name: trackTemplate.name,
        slug: trackTemplate.slug,
        description: trackTemplate.description,
        is_active: true
      })
      .select()
      .single()

    if (trackError) {
      console.error(`  Failed to create track: ${trackError.message}`)
      continue
    }

    console.log(`  ✓ Track created: ${track.id}`)

    // Create milestones for this track
    const milestonesToInsert = trackTemplate.milestones.map(m => ({
      track_id: track.id,
      order_position: m.order,
      name: m.name,
      evidence_description: m.evidence,
      objective_signal: m.signal,
      version: 1,
      is_active: true
    }))

    const { data: milestones, error: milestonesError } = await adminClient
      .from('milestone_definitions')
      .insert(milestonesToInsert)
      .select()

    if (milestonesError) {
      console.error(`  Failed to create milestones: ${milestonesError.message}`)
      continue
    }

    console.log(`  ✓ Created ${milestones.length} milestones`)
  }

  // Update tenant config to include all tracks
  const { error: configError } = await adminClient
    .from('tenant_config')
    .update({
      enabled_milestone_tracks: ['software', 'hardware', 'biotech-pharma', 'medical-device']
    })
    .eq('tenant_id', TENANT_ID)

  if (configError) {
    console.error('Failed to update tenant config:', configError)
  } else {
    console.log('\n✓ Updated tenant config with all 4 tracks enabled')
  }

  console.log('\n✅ Seeding complete!')
}

seedTracks()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seeding failed:', error)
    process.exit(1)
  })
