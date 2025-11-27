/**
 * Sync All Company-Contact Associations
 *
 * For ALL 812 contacts in multi-tenant, check if they should have company
 * associations from single tenant and create missing relationships.
 *
 * Logic:
 * 1. Get all contacts from multi-tenant with their emails
 * 2. For each email, lookup person in single tenant (emails -> people)
 * 3. Get their people_companies associations
 * 4. Match companies by business_name
 * 5. Create missing company_contacts records
 *
 * This ensures every contact has all their company associations from single tenant.
 *
 * Usage:
 *   DRY_RUN=true npm run sync:company-contacts     # Preview only
 *   npm run sync:company-contacts                   # Execute import
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DRY_RUN = process.env.DRY_RUN === 'true'

// Multi-tenant (destination)
const multiTenantClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Single-tenant (source)
const singleTenantClient = createClient(
  process.env.SINGLE_TENANT_SUPABASE_URL!,
  process.env.SINGLE_TENANT_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const VOLTA_TENANT_ID = '11111111-1111-1111-1111-111111111111'

interface ImportStats {
  contactsChecked: number
  contactsWithEmails: number
  contactsFoundInSingleTenant: number
  relationshipsChecked: number
  relationshipsCreated: number
  relationshipsSkipped: number
  companiesNotFound: number
  errors: string[]
}

const stats: ImportStats = {
  contactsChecked: 0,
  contactsWithEmails: 0,
  contactsFoundInSingleTenant: 0,
  relationshipsChecked: 0,
  relationshipsCreated: 0,
  relationshipsSkipped: 0,
  companiesNotFound: 0,
  errors: []
}

async function main() {
  console.log('\n=== Sync All Company-Contact Associations ===')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will import data)'}`)
  console.log(`Target: All contacts in Volta tenant\n`)

  // Step 1: Get ALL contacts from multi-tenant with their emails
  console.log('Fetching all contacts from multi-tenant...\n')

  const { data: mtContacts, error: mtError } = await multiTenantClient
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      contact_emails (
        email,
        is_primary
      )
    `)
    .eq('tenant_id', VOLTA_TENANT_ID)

  if (mtError || !mtContacts) {
    console.error('Error fetching multi-tenant contacts:', mtError)
    process.exit(1)
  }

  console.log(`Found ${mtContacts.length} contacts in multi-tenant\n`)

  // Step 2: Build email lookup for single tenant
  console.log('Building single tenant email lookup...\n')

  const { data: stEmails, error: emailError } = await singleTenantClient
    .from('emails')
    .select('people_id, email, is_primary')

  if (emailError) {
    console.error('Error fetching single tenant emails:', emailError)
    process.exit(1)
  }

  // Map email -> people_id
  const emailToPeopleId = new Map<string, string>()
  stEmails?.forEach(e => {
    emailToPeopleId.set(e.email.toLowerCase(), e.people_id)
  })

  console.log(`Indexed ${emailToPeopleId.size} emails from single tenant\n`)

  // Step 3: Get all people_companies from single tenant
  console.log('Fetching people-company associations from single tenant...\n')

  const { data: stRelationships, error: relError } = await singleTenantClient
    .from('people_companies')
    .select(`
      person_id,
      company_id,
      companies:companies!inner (
        id,
        business_name,
        deleted_at
      )
    `)

  if (relError) {
    console.error('Error fetching single tenant relationships:', relError)
    process.exit(1)
  }

  // Filter out soft-deleted companies and index by person_id
  const relationshipsByPerson = new Map<string, Array<{ company_id: string; business_name: string }>>()

  stRelationships
    ?.filter((r: any) => !r.companies.deleted_at)
    .forEach((r: any) => {
      if (!relationshipsByPerson.has(r.person_id)) {
        relationshipsByPerson.set(r.person_id, [])
      }
      relationshipsByPerson.get(r.person_id)!.push({
        company_id: r.company_id,
        business_name: r.companies.business_name
      })
    })

  console.log(`Indexed relationships for ${relationshipsByPerson.size} people\n`)

  // Step 4: Build multi-tenant company lookup
  const { data: mtCompanies } = await multiTenantClient
    .from('companies')
    .select('id, business_name')
    .eq('tenant_id', VOLTA_TENANT_ID)

  const mtCompanyByName = new Map<string, string>()
  mtCompanies?.forEach((c: any) => {
    mtCompanyByName.set(c.business_name, c.id)
  })

  console.log(`Indexed ${mtCompanyByName.size} companies in multi-tenant\n`)

  // Step 5: Get existing relationships in multi-tenant
  const { data: existingRelationships } = await multiTenantClient
    .from('company_contacts')
    .select('contact_id, company_id')

  const existingRelSet = new Set<string>()
  existingRelationships?.forEach((r: any) => {
    existingRelSet.add(`${r.contact_id}:${r.company_id}`)
  })

  console.log(`Found ${existingRelationships?.length || 0} existing relationships in multi-tenant\n`)

  // Step 6: Process each contact
  console.log('=== Processing Contacts ===\n')

  let processedCount = 0

  for (const contact of mtContacts) {
    processedCount++
    stats.contactsChecked++

    const contactEmails = (contact.contact_emails || []) as Array<{ email: string; is_primary: boolean }>

    if (contactEmails.length === 0) {
      // Skip contacts without emails (shouldn't happen but just in case)
      continue
    }

    stats.contactsWithEmails++

    // Get primary email or first available
    const primaryEmail = contactEmails.find(e => e.is_primary)?.email || contactEmails[0]?.email

    if (!primaryEmail) continue

    // Look up this email in single tenant
    const stPersonId = emailToPeopleId.get(primaryEmail.toLowerCase())

    if (!stPersonId) {
      // Contact doesn't exist in single tenant (might be created manually in multi-tenant)
      continue
    }

    stats.contactsFoundInSingleTenant++

    // Get this person's company associations from single tenant
    const stCompanies = relationshipsByPerson.get(stPersonId) || []

    if (stCompanies.length === 0) {
      // Person has no company associations in single tenant
      continue
    }

    console.log(`[${processedCount}/${mtContacts.length}] ${contact.first_name} ${contact.last_name}`)
    console.log(`  Email: ${primaryEmail}`)
    console.log(`  Companies in single tenant: ${stCompanies.length}`)

    // Process each company association
    let createdCount = 0
    let skippedCount = 0

    for (const stCompany of stCompanies) {
      stats.relationshipsChecked++

      // Find company in multi-tenant
      const mtCompanyId = mtCompanyByName.get(stCompany.business_name)

      if (!mtCompanyId) {
        stats.companiesNotFound++
        console.log(`    ✗ Company not found: ${stCompany.business_name}`)
        continue
      }

      // Check if relationship already exists
      const relKey = `${contact.id}:${mtCompanyId}`

      if (existingRelSet.has(relKey)) {
        skippedCount++
        stats.relationshipsSkipped++
        continue
      }

      // Create the relationship
      if (!DRY_RUN) {
        const { error: insertError } = await multiTenantClient
          .from('company_contacts')
          .insert({
            contact_id: contact.id,
            company_id: mtCompanyId
          })

        if (insertError) {
          // Check for duplicate (race condition)
          if (insertError.code === '23505') {
            skippedCount++
            stats.relationshipsSkipped++
          } else {
            console.error(`    ✗ Error: ${insertError.message}`)
            stats.errors.push(`${contact.first_name} ${contact.last_name} → ${stCompany.business_name}: ${insertError.message}`)
          }
        } else {
          createdCount++
          stats.relationshipsCreated++
          // Add to existing set to prevent duplicates in this run
          existingRelSet.add(relKey)
        }
      } else {
        createdCount++
        stats.relationshipsCreated++
      }
    }

    if (createdCount > 0 || skippedCount > 0) {
      if (createdCount > 0) {
        console.log(`  ✓ Created ${createdCount} relationship(s)`)
      }
      if (skippedCount > 0) {
        console.log(`  ⚠ Skipped ${skippedCount} (already exist)`)
      }
      console.log('')
    }
  }

  // Print summary
  printSummary()
}

function printSummary() {
  console.log('\n=== SYNC SUMMARY ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}\n`)

  console.log('Contacts:')
  console.log(`  Total checked: ${stats.contactsChecked}`)
  console.log(`  With emails: ${stats.contactsWithEmails}`)
  console.log(`  Found in single tenant: ${stats.contactsFoundInSingleTenant}\n`)

  console.log('Relationships:')
  console.log(`  Checked: ${stats.relationshipsChecked}`)
  console.log(`  Created: ${stats.relationshipsCreated}`)
  console.log(`  Skipped (already exist): ${stats.relationshipsSkipped}\n`)

  console.log('Issues:')
  console.log(`  Companies not found in multi-tenant: ${stats.companiesNotFound}\n`)

  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`)
    stats.errors.slice(0, 10).forEach(err => console.log(`  - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`  ... and ${stats.errors.length - 10} more`)
    }
  } else {
    console.log('✓ No errors')
  }

  const totalSuccess = stats.relationshipsCreated
  const totalProcessed = stats.relationshipsChecked
  const successRate = totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(1) : '0'

  console.log(`\nNew Relationships: ${totalSuccess}`)
  console.log(`Success Rate: ${successRate}% (${totalSuccess}/${totalProcessed})`)

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. To execute sync, run: npm run sync:company-contacts')
  } else {
    console.log('\n✅ Sync complete!')
  }
}

main().catch(console.error)
