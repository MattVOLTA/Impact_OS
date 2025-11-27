/**
 * Import Missing Contacts from Single Tenant
 *
 * Imports contacts that exist in single tenant people_companies relationships
 * but are missing from the multi-tenant database.
 *
 * This script:
 * 1. Fetches all contacts from single tenant people_companies
 * 2. Gets their emails from the emails table
 * 3. Checks which contacts are missing in multi-tenant
 * 4. Imports missing contacts with their primary email
 * 5. Creates contact_emails records for each imported contact
 *
 * Usage:
 *   DRY_RUN=true npm run import:missing-contacts     # Preview only
 *   npm run import:missing-contacts                   # Execute import
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
  contactsImported: number
  contactsSkipped: number
  contactEmailsCreated: number
  contactsWithoutEmail: number
  errors: string[]
}

const stats: ImportStats = {
  contactsChecked: 0,
  contactsImported: 0,
  contactsSkipped: 0,
  contactEmailsCreated: 0,
  contactsWithoutEmail: 0,
  errors: []
}

async function main() {
  console.log('\n=== Missing Contacts Import ===')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will import data)'}`)
  console.log(`Target: Volta tenant in multi-tenant database\n`)

  // Step 1: Get all contacts from people_companies in single tenant
  console.log('Fetching contacts from single tenant people_companies...\n')

  const { data: relationships, error: relError } = await singleTenantClient
    .from('people_companies')
    .select(`
      person_id,
      people:people!inner (
        id,
        first_name,
        last_name,
        phone_number,
        linkedin_url,
        bio,
        photo,
        title,
        deleted_at
      )
    `)

  if (relError || !relationships) {
    console.error('Error fetching relationships:', relError)
    process.exit(1)
  }

  // Filter out soft-deleted and get unique people
  const uniquePeople = new Map()
  relationships
    .filter((r: any) => !r.people.deleted_at)
    .forEach((r: any) => {
      if (!uniquePeople.has(r.person_id)) {
        uniquePeople.set(r.person_id, r.people)
      }
    })

  console.log(`Found ${uniquePeople.size} unique contacts in single tenant\n`)

  // Step 2: Get emails for all people
  console.log('Fetching contact emails...\n')

  const personIds = Array.from(uniquePeople.keys())

  const { data: emails, error: emailError } = await singleTenantClient
    .from('emails')
    .select('people_id, email, is_primary')
    .in('people_id', personIds)

  if (emailError) {
    console.error('Error fetching emails:', emailError)
    process.exit(1)
  }

  // Build email lookup map (prefer primary email)
  const emailsByPerson = new Map<string, Array<{ email: string; is_primary: boolean }>>()

  emails?.forEach(e => {
    if (!emailsByPerson.has(e.people_id)) {
      emailsByPerson.set(e.people_id, [])
    }
    emailsByPerson.get(e.people_id)!.push(e)
  })

  console.log(`Found emails for ${emailsByPerson.size} contacts\n`)

  // Step 3: Get existing contacts in multi-tenant
  console.log('Fetching existing contacts from multi-tenant...\n')

  const { data: mtContactEmails } = await multiTenantClient
    .from('contact_emails')
    .select(`
      email,
      contact:contacts!inner (
        id,
        tenant_id
      )
    `)
    .eq('contact.tenant_id', VOLTA_TENANT_ID)

  const existingEmailsSet = new Set(
    mtContactEmails?.map((ce: any) => ce.email.toLowerCase()) || []
  )

  console.log(`Multi-tenant has ${existingEmailsSet.size} contact emails\n`)

  // Step 4: Import missing contacts
  console.log('=== Processing Contacts ===\n')

  let processedCount = 0
  let contactsToImport = []

  for (const [personId, person] of uniquePeople) {
    processedCount++
    stats.contactsChecked++

    const personEmails = emailsByPerson.get(personId) || []

    if (personEmails.length === 0) {
      console.log(`[${processedCount}/${uniquePeople.size}] ${person.first_name} ${person.last_name}`)
      console.log(`  ⚠ No email found, skipping\n`)
      stats.contactsWithoutEmail++
      continue
    }

    // Get primary email or first available
    const primaryEmail = personEmails.find(e => e.is_primary)?.email || personEmails[0]?.email

    console.log(`[${processedCount}/${uniquePeople.size}] ${person.first_name} ${person.last_name}`)
    console.log(`  Primary Email: ${primaryEmail}`)

    // Check if contact already exists
    if (existingEmailsSet.has(primaryEmail.toLowerCase())) {
      console.log(`  ✓ Already exists in multi-tenant\n`)
      stats.contactsSkipped++
      continue
    }

    console.log(`  → Missing from multi-tenant`)

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would import contact with ${personEmails.length} email(s)\n`)
      stats.contactsImported++
      continue
    }

    // Import contact
    const { data: newContact, error: createError } = await multiTenantClient
      .from('contacts')
      .insert({
        tenant_id: VOLTA_TENANT_ID,
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        phone: person.phone_number,
        title: person.title,
        bio: person.bio,
        linkedin_url: person.linkedin_url,
        photo_url: person.photo
      })
      .select('id')
      .single()

    if (createError || !newContact) {
      console.error(`  ✗ Error creating contact: ${createError?.message}`)
      stats.errors.push(`${person.first_name} ${person.last_name}: ${createError?.message}`)
      console.log('')
      continue
    }

    console.log(`  ✓ Contact created: ${newContact.id}`)
    stats.contactsImported++

    // Import all emails for this contact
    for (const emailRecord of personEmails) {
      const { error: emailError } = await multiTenantClient
        .from('contact_emails')
        .insert({
          contact_id: newContact.id,
          email: emailRecord.email,
          is_primary: emailRecord.is_primary,
          is_verified: false
        })

      if (emailError) {
        // Ignore duplicate email errors
        if (emailError.code !== '23505') {
          console.error(`  ⚠ Error creating email ${emailRecord.email}: ${emailError.message}`)
        }
      } else {
        stats.contactEmailsCreated++
      }
    }

    console.log(`  ✓ Created ${personEmails.length} email address(es)\n`)
  }

  // Print summary
  printSummary()
}

function printSummary() {
  console.log('\n=== IMPORT SUMMARY ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}\n`)

  console.log('Contacts:')
  console.log(`  Checked: ${stats.contactsChecked}`)
  console.log(`  Imported: ${stats.contactsImported}`)
  console.log(`  Skipped (already exist): ${stats.contactsSkipped}`)
  console.log(`  Without email: ${stats.contactsWithoutEmail}\n`)

  console.log('Contact Emails:')
  console.log(`  Created: ${stats.contactEmailsCreated}\n`)

  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('✓ No errors')
  }

  const totalSuccess = stats.contactsImported
  const totalProcessed = stats.contactsChecked - stats.contactsWithoutEmail
  const successRate = totalProcessed > 0 ? ((totalSuccess / totalProcessed) * 100).toFixed(1) : '0'

  console.log(`\nSuccess Rate: ${successRate}% (${totalSuccess}/${totalProcessed})`)

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. To execute import, run: npm run import:missing-contacts')
    console.log('💡 After import completes, run: npm run import:company-contacts')
    console.log('   to link the newly imported contacts to their companies.')
  } else {
    console.log('\n✅ Import complete!')
    console.log('\n📝 Next Step: Run npm run import:company-contacts to link contacts to companies')
  }
}

main().catch(console.error)
