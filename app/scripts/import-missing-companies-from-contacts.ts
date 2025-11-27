/**
 * Import Missing Companies from Contact Associations
 *
 * Identifies companies from single tenant that are associated with contacts
 * in multi-tenant but the companies themselves are missing.
 *
 * Logic:
 * 1. Get all contacts from multi-tenant with their emails
 * 2. Look up those emails in single tenant to find person_id
 * 3. Get people_companies associations
 * 4. Find companies that don't exist in multi-tenant
 * 5. Import those companies
 *
 * Usage:
 *   DRY_RUN=true npm run import:missing-companies     # Preview only
 *   npm run import:missing-companies                   # Execute import
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

/**
 * Map single tenant company_type enum values to multi-tenant values
 * Single tenant: lowercase with underscores
 * Multi-tenant: Title Case with spaces
 */
function mapCompanyType(singleTenantType: string | null | undefined): string {
  if (!singleTenantType) return 'Startup'

  const typeMap: Record<string, string> = {
    'startup': 'Startup',
    'investment_fund': 'Investment Fund',
    'government': 'Government',
    'university': 'University',
    'service_provider': 'Service Provider',
    'large_corporation': 'Large Corporation',
    'non_profit': 'Non-Profit'
  }

  return typeMap[singleTenantType.toLowerCase()] || 'Startup'
}

interface ImportStats {
  companiesChecked: number
  companiesImported: number
  companiesSkipped: number
  errors: string[]
}

const stats: ImportStats = {
  companiesChecked: 0,
  companiesImported: 0,
  companiesSkipped: 0,
  errors: []
}

async function main() {
  console.log('\n=== Import Missing Companies from Contact Associations ===')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will import data)'}`)
  console.log(`Target: Volta tenant in multi-tenant database\n`)

  // Step 1: Get all contacts from multi-tenant with emails
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
    console.error('Error fetching contacts:', mtError)
    process.exit(1)
  }

  console.log(`Found ${mtContacts.length} contacts in multi-tenant\n`)

  // Step 2: Build email -> people_id lookup
  console.log('Building single tenant email lookup...\n')

  const { data: stEmails } = await singleTenantClient
    .from('emails')
    .select('people_id, email')

  const emailToPeopleId = new Map<string, string>()
  stEmails?.forEach(e => {
    emailToPeopleId.set(e.email.toLowerCase(), e.people_id)
  })

  console.log(`Indexed ${emailToPeopleId.size} emails from single tenant\n`)

  // Step 3: Get people IDs that match our contacts
  const matchedPeopleIds = new Set<string>()

  for (const contact of mtContacts) {
    const emails = contact.contact_emails || []
    for (const emailRecord of emails) {
      const peopleId = emailToPeopleId.get(emailRecord.email.toLowerCase())
      if (peopleId) {
        matchedPeopleIds.add(peopleId)
        break
      }
    }
  }

  console.log(`Matched ${matchedPeopleIds.size} contacts to single tenant people\n`)

  // Step 4: Get all companies associated with those people (in batches to avoid URL length limits)
  console.log('Fetching company associations from single tenant...\n')

  const BATCH_SIZE = 100
  const peopleIdArray = Array.from(matchedPeopleIds)
  const allRelationships: any[] = []

  for (let i = 0; i < peopleIdArray.length; i += BATCH_SIZE) {
    const batch = peopleIdArray.slice(i, i + BATCH_SIZE)

    const { data: batchRelationships, error: relError } = await singleTenantClient
      .from('people_companies')
      .select(`
        person_id,
        company_id,
        companies:companies!inner (
          id,
          business_name,
          description,
          website,
          address,
          city,
          province,
          postal_code,
          business_registration_number,
          date_established,
          company_type,
          logo,
          deleted_at
        )
      `)
      .in('person_id', batch)

    if (relError) {
      console.error(`Error fetching relationships batch ${i / BATCH_SIZE + 1}:`, relError)
      process.exit(1)
    }

    if (batchRelationships) {
      allRelationships.push(...batchRelationships)
    }

    console.log(`  Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(peopleIdArray.length / BATCH_SIZE)}`)
  }

  console.log(`\nFetched ${allRelationships.length} total relationships\n`)

  const stRelationships = allRelationships

  // Get unique companies (filter out deleted)
  const uniqueCompanies = new Map<string, any>()

  stRelationships
    ?.filter((r: any) => !r.companies.deleted_at)
    .forEach((r: any) => {
      if (!uniqueCompanies.has(r.company_id)) {
        uniqueCompanies.set(r.company_id, r.companies)
      }
    })

  console.log(`Found ${uniqueCompanies.size} unique companies associated with contacts\n`)

  // Step 5: Check which companies are missing in multi-tenant
  const { data: mtCompanies } = await multiTenantClient
    .from('companies')
    .select('id, business_name')
    .eq('tenant_id', VOLTA_TENANT_ID)

  const mtCompanyNames = new Set<string>()
  mtCompanies?.forEach((c: any) => {
    mtCompanyNames.add(c.business_name)
  })

  console.log(`Multi-tenant has ${mtCompanyNames.size} companies\n`)

  // Step 6: Import missing companies
  console.log('=== Processing Companies ===\n')

  let processedCount = 0
  const missingCompanies = []

  for (const [companyId, company] of uniqueCompanies) {
    processedCount++
    stats.companiesChecked++

    if (mtCompanyNames.has(company.business_name)) {
      stats.companiesSkipped++
      continue
    }

    // Company is missing
    missingCompanies.push(company)

    const mappedType = mapCompanyType(company.company_type)

    console.log(`[${processedCount}/${uniqueCompanies.size}] ${company.business_name}`)
    console.log(`  Website: ${company.website || 'N/A'}`)
    console.log(`  Type: ${company.company_type || 'N/A'} → ${mappedType}`)

    if (!DRY_RUN) {
      const { data: newCompany, error: createError } = await multiTenantClient
        .from('companies')
        .insert({
          tenant_id: VOLTA_TENANT_ID,
          business_name: company.business_name,
          description: company.description,
          website_url: company.website,
          address: company.address,
          city: company.city,
          province: company.province,
          postal_code: company.postal_code,
          business_number: company.business_registration_number,
          date_established: company.date_established,
          company_type: mappedType,
          logo_url: company.logo
        })
        .select('id')
        .single()

      if (createError || !newCompany) {
        console.error(`  ✗ Error creating company: ${createError?.message}`)
        stats.errors.push(`${company.business_name}: ${createError?.message}`)
      } else {
        stats.companiesImported++
        console.log(`  ✓ Imported: ${newCompany.id}`)
      }
    } else {
      console.log(`  [DRY RUN] Would import company`)
      stats.companiesImported++
    }

    console.log('')
  }

  // Print summary
  printSummary()
}

function printSummary() {
  console.log('\n=== IMPORT SUMMARY ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}\n`)

  console.log('Companies:')
  console.log(`  Checked: ${stats.companiesChecked}`)
  console.log(`  Imported: ${stats.companiesImported}`)
  console.log(`  Skipped (already exist): ${stats.companiesSkipped}\n`)

  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('✓ No errors')
  }

  const totalSuccess = stats.companiesImported
  const totalProcessed = stats.companiesChecked
  const successRate = totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(1) : '0'

  console.log(`\nSuccess Rate: ${successRate}% (${totalSuccess}/${totalProcessed})`)

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. To execute import, run: npm run import:missing-companies')
    console.log('💡 After import completes, run: npm run sync:company-contacts')
    console.log('   to create the contact-company associations.')
  } else {
    console.log('\n✅ Import complete!')
    console.log('\n📝 Next Step: Run npm run sync:company-contacts to link contacts to companies')
  }
}

main().catch(console.error)
