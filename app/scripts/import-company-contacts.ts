/**
 * Import Company-Contact Associations from Single Tenant
 *
 * Links contacts to companies based on the people_companies relationships
 * from the single tenant database.
 *
 * Matching Logic:
 * - Contacts: Match by primary email address (or any email if no primary)
 * - Companies: Match by exact business_name
 *
 * Usage:
 *   DRY_RUN=true npm run import:company-contacts     # Preview only
 *   npm run import:company-contacts                   # Execute import
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
  relationshipsChecked: number
  relationshipsCreated: number
  relationshipsSkipped: number
  contactsNotFound: number
  companiesNotFound: number
  contactsWithoutEmail: number
  errors: string[]
}

const stats: ImportStats = {
  relationshipsChecked: 0,
  relationshipsCreated: 0,
  relationshipsSkipped: 0,
  contactsNotFound: 0,
  companiesNotFound: 0,
  contactsWithoutEmail: 0,
  errors: []
}

async function main() {
  console.log('\n=== Company-Contact Association Import ===')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will import data)'}`)
  console.log(`Target: Volta tenant in multi-tenant database\n`)

  // Step 1: Get all people_companies relationships from single tenant
  console.log('Fetching company-contact relationships from single tenant...\n')

  const { data: relationships, error: relError } = await singleTenantClient
    .from('people_companies')
    .select(`
      person_id,
      company_id,
      people:people!inner (
        id,
        first_name,
        last_name,
        deleted_at
      ),
      companies:companies!inner (
        id,
        business_name,
        deleted_at
      )
    `)

  if (relError || !relationships) {
    console.error('Error fetching relationships:', relError)
    process.exit(1)
  }

  // Filter out soft-deleted records
  const activeRelationships = relationships.filter(
    (r: any) => !r.people.deleted_at && !r.companies.deleted_at
  )

  console.log(`Found ${activeRelationships.length} active company-contact relationships\n`)

  // Step 2: Get emails for all people
  console.log('Fetching contact emails...\n')

  const personIds = [...new Set(activeRelationships.map((r: any) => r.person_id))]

  const { data: emails, error: emailError } = await singleTenantClient
    .from('emails')
    .select('people_id, email, is_primary')
    .in('people_id', personIds)

  if (emailError) {
    console.error('Error fetching emails:', emailError)
    process.exit(1)
  }

  // Build email lookup map (prefer primary email)
  const emailMap = new Map<string, string>()
  const emailsByPerson = new Map<string, typeof emails>()

  emails?.forEach(e => {
    if (!emailsByPerson.has(e.people_id)) {
      emailsByPerson.set(e.people_id, [])
    }
    emailsByPerson.get(e.people_id)!.push(e)
  })

  // For each person, get primary email or first available
  emailsByPerson.forEach((personEmails, personId) => {
    const primaryEmail = personEmails.find(e => e.is_primary)
    const email = primaryEmail?.email || personEmails[0]?.email
    if (email) {
      emailMap.set(personId, email)
    }
  })

  console.log(`Found emails for ${emailMap.size}/${personIds.length} contacts\n`)

  // Step 3: Build multi-tenant lookup maps
  console.log('Building multi-tenant lookup maps...\n')

  // Get all contacts from multi-tenant with their emails
  const { data: mtContacts } = await multiTenantClient
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

  // Build contact email lookup
  const mtContactsByEmail = new Map<string, string>()
  mtContacts?.forEach((contact: any) => {
    // Get primary email or first available
    const primaryEmail = contact.contact_emails?.find((e: any) => e.is_primary)
    const email = primaryEmail?.email || contact.contact_emails?.[0]?.email
    if (email) {
      mtContactsByEmail.set(email.toLowerCase(), contact.id)
    }
  })

  console.log(`Multi-tenant has ${mtContactsByEmail.size} contacts with emails`)

  // Get all companies from multi-tenant
  const { data: mtCompanies } = await multiTenantClient
    .from('companies')
    .select('id, business_name')
    .eq('tenant_id', VOLTA_TENANT_ID)

  const mtCompaniesByName = new Map<string, string>()
  mtCompanies?.forEach((company: any) => {
    mtCompaniesByName.set(company.business_name, company.id)
  })

  console.log(`Multi-tenant has ${mtCompaniesByName.size} companies\n`)

  // Step 4: Process each relationship
  console.log('=== Processing Relationships ===\n')

  let processedCount = 0

  for (const rel of activeRelationships) {
    processedCount++
    stats.relationshipsChecked++

    const person = rel.people as any
    const company = rel.companies as any

    console.log(`[${processedCount}/${activeRelationships.length}] ${person.first_name} ${person.last_name} → ${company.business_name}`)

    // Get email for this person
    const email = emailMap.get(rel.person_id)
    if (!email) {
      console.log(`  ⚠ No email found for contact`)
      stats.contactsWithoutEmail++
      console.log('')
      continue
    }

    console.log(`  Email: ${email}`)

    // Find contact in multi-tenant
    const mtContactId = mtContactsByEmail.get(email.toLowerCase())
    if (!mtContactId) {
      console.log(`  ✗ Contact not found in multi-tenant`)
      stats.contactsNotFound++
      console.log('')
      continue
    }

    console.log(`  ✓ Contact found: ${mtContactId}`)

    // Find company in multi-tenant
    const mtCompanyId = mtCompaniesByName.get(company.business_name)
    if (!mtCompanyId) {
      console.log(`  ✗ Company not found in multi-tenant`)
      stats.companiesNotFound++
      console.log('')
      continue
    }

    console.log(`  ✓ Company found: ${mtCompanyId}`)

    // Check if relationship already exists
    if (!DRY_RUN) {
      const { data: existing } = await multiTenantClient
        .from('company_contacts')
        .select('contact_id')
        .eq('contact_id', mtContactId)
        .eq('company_id', mtCompanyId)
        .maybeSingle()

      if (existing) {
        console.log(`  ⚠ Relationship already exists, skipping`)
        stats.relationshipsSkipped++
        console.log('')
        continue
      }

      // Create the relationship
      const { error: insertError } = await multiTenantClient
        .from('company_contacts')
        .insert({
          contact_id: mtContactId,
          company_id: mtCompanyId
        })

      if (insertError) {
        console.error(`  ✗ Error creating relationship: ${insertError.message}`)
        stats.errors.push(`${person.first_name} ${person.last_name} → ${company.business_name}: ${insertError.message}`)
      } else {
        console.log(`  ✓ Relationship created`)
        stats.relationshipsCreated++
      }
    } else {
      console.log(`  [DRY RUN] Would create relationship`)
      stats.relationshipsCreated++
    }

    console.log('')
  }

  // Print summary
  printSummary()
}

function printSummary() {
  console.log('\n=== IMPORT SUMMARY ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}\n`)

  console.log('Relationships:')
  console.log(`  Checked: ${stats.relationshipsChecked}`)
  console.log(`  Created: ${stats.relationshipsCreated}`)
  console.log(`  Skipped (already exist): ${stats.relationshipsSkipped}\n`)

  console.log('Issues:')
  console.log(`  Contacts without email: ${stats.contactsWithoutEmail}`)
  console.log(`  Contacts not found in multi-tenant: ${stats.contactsNotFound}`)
  console.log(`  Companies not found in multi-tenant: ${stats.companiesNotFound}\n`)

  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('✓ No errors')
  }

  const totalSuccess = stats.relationshipsCreated
  const totalProcessed = stats.relationshipsChecked
  const successRate = totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(1) : '0'

  console.log(`\nSuccess Rate: ${successRate}% (${totalSuccess}/${totalProcessed})`)

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. To execute import, run: npm run import:company-contacts')
  } else {
    console.log('\n✅ Import complete!')
  }
}

main().catch(console.error)
