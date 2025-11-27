/**
 * Import Program Enrollments from Single Tenant to Multi Tenant
 *
 * Consolidates 4 single_tenant programs into 1 "Volta Residency" program:
 * - 10X (8 companies)
 * - Old Catalyst (6 companies)
 * - Volta Residency (235 companies)
 * - Zero 2 X (17 companies)
 *
 * Total: 234 unique companies (some in multiple programs)
 *
 * Process:
 * 1. Import companies (skip if exists, match by business_name)
 * 2. Create company enrollments (earliest start_date, actual end_date)
 * 3. Import associated contacts (match by email, fallback to name)
 * 4. Create contact enrollments (same dates as company)
 *
 * Usage:
 *   DRY_RUN=true npm run import:programs-full     # Preview
 *   npm run import:programs-full                   # Execute
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const DRY_RUN = process.env.DRY_RUN === 'true'

// Check for required env vars
if (!process.env.SINGLE_TENANT_SUPABASE_URL || !process.env.SINGLE_TENANT_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Single Tenant credentials in .env.local:')
  console.error('   - SINGLE_TENANT_SUPABASE_URL')
  console.error('   - SINGLE_TENANT_SERVICE_ROLE_KEY')
  console.error('\nGet these from your Supabase project settings: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api')
  process.exit(1)
}

// Single-tenant (source)
const stClient = createClient(
  process.env.SINGLE_TENANT_SUPABASE_URL!,
  process.env.SINGLE_TENANT_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Multi-tenant (destination)
const mtClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VOLTA_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const PROGRAMS_TO_CONSOLIDATE = ['10X ', 'Old Catalyst ', 'Volta Residency', 'Zero 2 X']
const TARGET_PROGRAM_NAME = 'Volta Residency'

interface ImportStats {
  companiesProcessed: number
  companiesCreated: number
  companiesExisted: number
  companyEnrollments: number
  contactsProcessed: number
  contactsCreated: number
  contactsExisted: number
  contactEnrollments: number
  errors: string[]
}

const stats: ImportStats = {
  companiesProcessed: 0,
  companiesCreated: 0,
  companiesExisted: 0,
  companyEnrollments: 0,
  contactsProcessed: 0,
  contactsCreated: 0,
  contactsExisted: 0,
  contactEnrollments: 0,
  errors: []
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗')
  console.log('║  Program Enrollment Import: Single Tenant → Multi Tenant  ║')
  console.log('╚═══════════════════════════════════════════════════════════╝\n')
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (preview only)' : '▶️  LIVE IMPORT'}\n`)

  // Get target program
  const { data: voltaProgram } = await mtClient
    .from('programs')
    .select('id, name')
    .eq('tenant_id', VOLTA_TENANT_ID)
    .eq('name', TARGET_PROGRAM_NAME)
    .single()

  if (!voltaProgram) {
    console.error(`❌ Program "${TARGET_PROGRAM_NAME}" not found in multi-tenant!`)
    process.exit(1)
  }

  console.log(`✓ Target program: ${voltaProgram.name}`)
  console.log(`  ID: ${voltaProgram.id}\n`)

  // Phase 1: Companies + Enrollments
  await importCompaniesPhase(voltaProgram.id)

  // Phase 2: Contacts + Enrollments
  await importContactsPhase(voltaProgram.id)

  // Summary
  printSummary()
}

async function importCompaniesPhase(voltaProgramId: string) {
  console.log('═══ PHASE 1: Companies + Enrollments ═══\n')

  // Get all program enrollments from single_tenant
  const { data: enrollments, error: enrollError } = await stClient
    .from('program_companies')
    .select(`
      company_id,
      start_date,
      end_date,
      program:programs!inner (
        name
      ),
      company:companies!inner (
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
    .in('program.name', PROGRAMS_TO_CONSOLIDATE)
    .is('company.deleted_at', null)

  if (enrollError || !enrollments) {
    console.error('❌ Failed to fetch enrollments:', enrollError)
    process.exit(1)
  }

  console.log(`Found ${enrollments.length} enrollments from single_tenant`)

  // Consolidate by company (earliest start, keep NULL end if any active)
  const companyMap = new Map<string, {
    company: any
    start_date: string
    end_date: string | null
    programs: string[]
  }>()

  for (const enrollment of enrollments) {
    const company = (enrollment as any).company
    const existing = companyMap.get(company.business_name)

    if (!existing) {
      companyMap.set(company.business_name, {
        company,
        start_date: enrollment.start_date,
        end_date: enrollment.end_date,
        programs: [(enrollment as any).program.name]
      })
    } else {
      if (enrollment.start_date < existing.start_date) {
        existing.start_date = enrollment.start_date
      }
      if (enrollment.end_date === null) {
        existing.end_date = null
      } else if (existing.end_date !== null && enrollment.end_date > existing.end_date) {
        existing.end_date = enrollment.end_date
      }
      existing.programs.push((enrollment as any).program.name)
    }
  }

  const companies = Array.from(companyMap.values())
  console.log(`Consolidated to ${companies.length} unique companies\n`)

  // Process each company
  for (const companyData of companies) {
    stats.companiesProcessed++
    const company = companyData.company

    console.log(`[${stats.companiesProcessed}/${companies.length}] ${company.business_name}`)
    console.log(`  Programs: ${companyData.programs.join(', ')}`)
    console.log(`  Dates: ${companyData.start_date} → ${companyData.end_date || 'Active'}`)

    // Check if exists
    const { data: existing } = await mtClient
      .from('companies')
      .select('id')
      .eq('tenant_id', VOLTA_TENANT_ID)
      .eq('business_name', company.business_name)
      .maybeSingle()

    let companyId: string

    if (existing) {
      console.log(`  ✓ Exists`)
      stats.companiesExisted++
      companyId = existing.id
    } else {
      if (!DRY_RUN) {
        const provinceMap: Record<string, string> = {
          'NS': 'Nova Scotia',
          'NL': 'Newfoundland and Labrador',
          'PE': 'Prince Edward Island',
          'NB': 'New Brunswick',
          'ON': 'Ontario',
          'QC': 'Quebec',
          'MB': 'Manitoba',
          'SK': 'Saskatchewan',
          'AB': 'Alberta',
          'BC': 'British Columbia',
          'YT': 'Yukon',
          'NT': 'Northwest Territories',
          'NU': 'Nunavut'
        }

        const { data: created, error: createError } = await mtClient
          .from('companies')
          .insert({
            tenant_id: VOLTA_TENANT_ID,
            business_name: company.business_name,
            description: company.description,
            website_url: company.website,
            address: company.address,
            city: company.city,
            province: provinceMap[company.province] || company.province,
            postal_code: company.postal_code,
            business_number: company.business_registration_number,
            date_established: company.date_established,
            company_type: 'Startup',
            logo_url: company.logo
          })
          .select('id')
          .single()

        if (createError || !created) {
          console.error(`  ✗ Error:`, createError?.message)
          stats.errors.push(`${company.business_name}: ${createError?.message}`)
          continue
        }

        companyId = created.id
        console.log(`  ✓ Created`)
        stats.companiesCreated++
      } else {
        console.log(`  [DRY RUN] Would create`)
        stats.companiesCreated++
        continue
      }
    }

    // Create enrollment
    if (!DRY_RUN) {
      const { error: enrollError } = await mtClient
        .from('company_program_enrollments')
        .insert({
          program_id: voltaProgramId,
          company_id: companyId,
          start_date: companyData.start_date,
          end_date: companyData.end_date
        })

      if (enrollError) {
        if (enrollError.code !== '23505') {
          console.error(`  ✗ Enrollment error:`, enrollError.message)
          stats.errors.push(`${company.business_name} enrollment: ${enrollError.message}`)
        }
      } else {
        stats.companyEnrollments++
        console.log(`  ✓ Enrolled`)
      }
    } else {
      console.log(`  [DRY RUN] Would enroll`)
      stats.companyEnrollments++
    }

    console.log('')
  }
}

async function importContactsPhase(voltaProgramId: string) {
  console.log('\n═══ PHASE 2: Contacts + Enrollments ═══\n')

  // Get contacts from all_contacts_email view in single_tenant
  const { data: contacts, error: contactsError } = await stClient
    .from('all_contacts_email')
    .select('id, first_name, last_name, email, phone_number, linkedin_url, bio, photo, title')
    .is('deleted_at', null)

  if (contactsError || !contacts) {
    console.error('❌ Failed to fetch contacts:', contactsError)
    return
  }

  console.log(`Found ${contacts.length} total contacts in single_tenant`)

  // Get people-companies associations
  const { data: peopleCompanies } = await stClient
    .from('people_companies')
    .select('person_id, company_id')

  if (!peopleCompanies) {
    console.error('❌ Failed to fetch people-company associations')
    return
  }

  // Filter to only contacts associated with our imported companies
  const { data: importedCompanies } = await mtClient
    .from('companies')
    .select('id, business_name')
    .eq('tenant_id', VOLTA_TENANT_ID)

  const importedCompanyNames = new Set((importedCompanies || []).map(c => c.business_name))

  // Get company names from single_tenant for our program companies
  const { data: stCompanies } = await stClient
    .from('companies')
    .select('id, business_name')

  const stCompanyMap = new Map((stCompanies || []).map(c => [c.id, c.business_name]))

  // Filter associations to only those with companies we imported
  const relevantAssociations = (peopleCompanies || []).filter(pc => {
    const companyName = stCompanyMap.get(pc.company_id)
    return companyName && importedCompanyNames.has(companyName)
  })

  const relevantPersonIds = new Set(relevantAssociations.map(a => a.person_id))
  const relevantContacts = contacts.filter(c => relevantPersonIds.has(c.id))

  console.log(`Filtered to ${relevantContacts.length} contacts associated with program companies\n`)

  // Get company enrollments for date lookup
  const { data: companyEnrollments } = await mtClient
    .from('company_program_enrollments')
    .select('company_id, start_date, end_date')
    .eq('program_id', voltaProgramId)

  const companyDatesMap = new Map(
    (companyEnrollments || []).map(e => [e.company_id, { start_date: e.start_date, end_date: e.end_date }])
  )

  // Get people-companies associations
  const { data: associations } = await stClient.rpc('exec_sql', {
    query: `
      SELECT pc.person_id, pc.company_id, c.business_name
      FROM people_companies pc
      JOIN companies c ON pc.company_id = c.id
      WHERE pc.person_id IN (${contacts.map((c: any) => `'${c.id}'`).join(',')})
    `
  })

  // Process each contact
  for (const contact of contacts) {
    stats.contactsProcessed++
    console.log(`[${stats.contactsProcessed}/${contacts.length}] ${contact.first_name} ${contact.last_name}`)

    // Match contact in multi-tenant
    let existingContact = null

    // Try email first
    if (contact.email) {
      const { data } = await mtClient
        .from('contacts')
        .select('id')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('email', contact.email)
        .maybeSingle()
      existingContact = data
    }

    // Fallback to name
    if (!existingContact) {
      const { data } = await mtClient
        .from('contacts')
        .select('id')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('first_name', contact.first_name)
        .eq('last_name', contact.last_name)
        .maybeSingle()
      existingContact = data
    }

    let contactId: string

    if (existingContact) {
      console.log(`  ✓ Exists`)
      stats.contactsExisted++
      contactId = existingContact.id
    } else {
      if (!DRY_RUN) {
        const { data: created, error: createError } = await mtClient
          .from('contacts')
          .insert({
            tenant_id: VOLTA_TENANT_ID,
            first_name: contact.first_name,
            last_name: contact.last_name,
            email: contact.email,
            phone: contact.phone_number,
            linkedin_url: contact.linkedin_url,
            bio: contact.bio,
            photo_url: contact.photo,
            role: contact.title?.toLowerCase().includes('founder') ? 'founder' : 'team_member'
          })
          .select('id')
          .single()

        if (createError || !created) {
          console.error(`  ✗ Error:`, createError?.message)
          stats.errors.push(`Contact ${contact.first_name} ${contact.last_name}: ${createError?.message}`)
          continue
        }

        contactId = created.id
        console.log(`  ✓ Created`)
        stats.contactsCreated++
      } else {
        console.log(`  [DRY RUN] Would create`)
        stats.contactsCreated++
        continue
      }
    }

    // Get companies this contact is associated with
    const contactCompanies = (associations || []).filter((a: any) => a.person_id === contact.id)

    for (const assoc of contactCompanies) {
      // Find multi-tenant company
      const { data: mtCompany } = await mtClient
        .from('companies')
        .select('id')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('business_name', assoc.business_name)
        .maybeSingle()

      if (!mtCompany) continue

      // Link contact to company
      if (!DRY_RUN) {
        await mtClient
          .from('company_contacts')
          .upsert({
            company_id: mtCompany.id,
            contact_id: contactId,
            is_primary: false
          }, {
            onConflict: 'company_id,contact_id',
            ignoreDuplicates: true
          })
      }

      // Get company enrollment dates
      const dates = companyDatesMap.get(mtCompany.id)
      if (!dates) continue

      // Create contact enrollment with same dates
      if (!DRY_RUN) {
        const { error: enrollError } = await mtClient
          .from('program_contacts')
          .insert({
            program_id: voltaProgramId,
            contact_id: contactId,
            start_date: dates.start_date,
            end_date: dates.end_date
          })

        if (enrollError && enrollError.code !== '23505') {
          stats.errors.push(`Contact enrollment ${contact.first_name} ${contact.last_name}: ${enrollError.message}`)
        } else if (!enrollError) {
          stats.contactEnrollments++
        }
      } else {
        stats.contactEnrollments++
      }
    }

    if (!DRY_RUN && contactCompanies.length > 0) {
      console.log(`  ✓ Enrolled via ${contactCompanies.length} ${contactCompanies.length === 1 ? 'company' : 'companies'}`)
    }
  }
}

function printSummary() {
  console.log('\n╔═══════════════════════════════════════╗')
  console.log('║         IMPORT SUMMARY                ║')
  console.log('╚═══════════════════════════════════════╝\n')

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}\n`)

  console.log('📊 Companies:')
  console.log(`   Processed: ${stats.companiesProcessed}`)
  console.log(`   Created: ${stats.companiesCreated}`)
  console.log(`   Already existed: ${stats.companiesExisted}`)
  console.log(`   Enrollments: ${stats.companyEnrollments}\n`)

  console.log('👥 Contacts:')
  console.log(`   Processed: ${stats.contactsProcessed}`)
  console.log(`   Created: ${stats.contactsCreated}`)
  console.log(`   Already existed: ${stats.contactsExisted}`)
  console.log(`   Enrollments: ${stats.contactEnrollments}\n`)

  if (stats.errors.length > 0) {
    console.log(`❌ Errors (${stats.errors.length}):`)
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`))
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more`)
    }
  } else {
    console.log('✅ No errors')
  }

  if (DRY_RUN) {
    console.log('\n💡 To execute import: npm run import:programs-full')
  } else {
    console.log('\n✅ Import complete!')
  }
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
