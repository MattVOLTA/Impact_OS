/**
 * Import Program Enrollments from Single Tenant
 *
 * Imports companies and contacts from 4 single_tenant programs into
 * the "Volta Residency" program in multi_tenant.
 *
 * Programs to consolidate:
 * - 10X
 * - Old Catalyst
 * - Volta Residency
 * - Zero 2 X
 *
 * Logic:
 * - Company start_date = earliest start_date across all 4 programs
 * - Company end_date = actual end_date from single_tenant (NULL = active)
 * - Contact enrollment dates = same as company dates
 * - Contact matching: Email preferred, fallback to first_name + last_name
 *
 * Usage:
 *   DRY_RUN=true npm run import:programs     # Preview only
 *   npm run import:programs                   # Execute import
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
const PROGRAMS_TO_IMPORT = ['10X ', 'Old Catalyst ', 'Volta Residency', 'Zero 2 X']

interface ImportStats {
  companiesChecked: number
  companiesCreated: number
  companiesSkipped: number
  enrollmentsCreated: number
  contactsChecked: number
  contactsCreated: number
  contactsSkipped: number
  contactEnrollmentsCreated: number
  errors: string[]
}

const stats: ImportStats = {
  companiesChecked: 0,
  companiesCreated: 0,
  companiesSkipped: 0,
  enrollmentsCreated: 0,
  contactsChecked: 0,
  contactsCreated: 0,
  contactsSkipped: 0,
  contactEnrollmentsCreated: 0,
  errors: []
}

async function main() {
  console.log('\n=== Program Enrollment Import ===')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE (will import data)'}`)
  console.log(`Target: Volta Residency program in multi-tenant\n`)

  // Step 1: Get Volta Residency program ID in multi-tenant
  const { data: voltaProgram } = await multiTenantClient
    .from('programs')
    .select('id, name')
    .eq('tenant_id', VOLTA_TENANT_ID)
    .eq('name', 'Volta Residency')
    .single()

  if (!voltaProgram) {
    console.error('ERROR: Volta Residency program not found in multi-tenant!')
    process.exit(1)
  }

  console.log(`✓ Found target program: ${voltaProgram.name} (${voltaProgram.id})\n`)

  // Step 2: Phase 1 - Import Companies + Company Enrollments
  await importCompaniesAndEnrollments(voltaProgram.id)

  // Step 3: Phase 2 - Import Contacts + Contact Enrollments
  if (!DRY_RUN || process.env.PHASE === '2') {
    await importContactsAndEnrollments(voltaProgram.id)
  }

  // Print summary
  printSummary()
}

async function importCompaniesAndEnrollments(voltaProgramId: string) {
  console.log('=== PHASE 1: Companies + Company Enrollments ===\n')

  // Get all program enrollments from single_tenant
  const { data: enrollments, error } = await singleTenantClient
    .from('program_companies')
    .select(`
      program_id,
      company_id,
      start_date,
      end_date,
      program:programs!inner (
        id,
        name
      ),
      company:companies!inner (
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
        logo
      )
    `)
    .in('program.name', PROGRAMS_TO_IMPORT)

  if (error || !enrollments) {
    console.error('Error fetching enrollments:', error)
    process.exit(1)
  }

  console.log(`Found ${enrollments.length} enrollments across ${PROGRAMS_TO_IMPORT.length} programs\n`)

  // Group enrollments by company and get earliest start_date
  const companyEnrollments = new Map<string, {
    company: any
    earliestStart: string
    latestEnd: string | null
    programs: string[]
  }>()

  for (const enrollment of enrollments) {
    const companyId = enrollment.company_id
    const existing = companyEnrollments.get(companyId)

    if (!existing) {
      companyEnrollments.set(companyId, {
        company: enrollment.company,
        earliestStart: enrollment.start_date,
        latestEnd: enrollment.end_date,
        programs: [(enrollment.program as any).name]
      })
    } else {
      // Update to earliest start_date
      if (enrollment.start_date < existing.earliestStart) {
        existing.earliestStart = enrollment.start_date
      }
      // Track which programs this company was in
      if (!(enrollment.program as any).name.includes(existing.programs)) {
        existing.programs.push((enrollment.program as any).name)
      }
      // Keep end_date (prefer NULL if any enrollment is still active)
      if (enrollment.end_date === null) {
        existing.latestEnd = null
      } else if (existing.latestEnd !== null && enrollment.end_date > existing.latestEnd) {
        existing.latestEnd = enrollment.end_date
      }
    }
  }

  console.log(`Consolidated to ${companyEnrollments.size} unique companies\n`)

  // Import each company + enrollment
  let processedCount = 0

  for (const [singleTenantCompanyId, data] of companyEnrollments) {
    processedCount++
    stats.companiesChecked++

    const company = data.company
    console.log(`[${processedCount}/${companyEnrollments.size}] Processing: ${company.business_name}`)
    console.log(`  Programs: ${data.programs.join(', ')}`)
    console.log(`  Dates: ${data.earliestStart} → ${data.latestEnd || 'Ongoing'}`)

    // Check if company exists in multi-tenant
    const { data: existingCompany } = await multiTenantClient
      .from('companies')
      .select('id, business_name')
      .eq('tenant_id', VOLTA_TENANT_ID)
      .eq('business_name', company.business_name)
      .maybeSingle()

    let multiTenantCompanyId: string

    if (existingCompany) {
      console.log(`  ✓ Company exists: ${existingCompany.id}`)
      stats.companiesSkipped++
      multiTenantCompanyId = existingCompany.id
    } else {
      console.log(`  → Creating company...`)

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
            company_type: company.company_type || 'Startup',
            logo_url: company.logo
          })
          .select('id')
          .single()

        if (createError || !newCompany) {
          console.error(`  ✗ Error creating company: ${createError?.message}`)
          stats.errors.push(`Failed to create ${company.business_name}: ${createError?.message}`)
          continue
        }

        multiTenantCompanyId = newCompany.id
        stats.companiesCreated++
        console.log(`  ✓ Created: ${multiTenantCompanyId}`)
      } else {
        console.log(`  [DRY RUN] Would create company`)
        stats.companiesCreated++
        continue
      }
    }

    // Create enrollment
    console.log(`  → Creating enrollment...`)

    if (!DRY_RUN) {
      const { error: enrollError } = await multiTenantClient
        .from('company_program_enrollments')
        .insert({
          program_id: voltaProgramId,
          company_id: multiTenantCompanyId,
          start_date: data.earliestStart,
          end_date: data.latestEnd
        })

      if (enrollError) {
        // Check if already enrolled (duplicate key error)
        if (enrollError.code === '23505') {
          console.log(`  ⚠ Already enrolled, skipping`)
        } else {
          console.error(`  ✗ Error creating enrollment: ${enrollError.message}`)
          stats.errors.push(`Failed to enroll ${company.business_name}: ${enrollError.message}`)
          continue
        }
      } else {
        stats.enrollmentsCreated++
        console.log(`  ✓ Enrolled`)
      }
    } else {
      console.log(`  [DRY RUN] Would create enrollment: ${data.earliestStart} → ${data.latestEnd || 'Ongoing'}`)
      stats.enrollmentsCreated++
    }

    console.log('')
  }
}

async function importContactsAndEnrollments(voltaProgramId: string) {
  console.log('\n=== PHASE 2: Contacts + Contact Enrollments ===\n')

  // Get all contacts associated with companies in our programs
  const { data: peopleData, error } = await singleTenantClient
    .from('all_contacts_email')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone_number,
      linkedin_url,
      bio,
      photo,
      title
    `)
    .not('deleted_at', 'is', null)

  if (error) {
    console.error('Error fetching contacts:', error)
    return
  }

  // Get people-company associations
  const { data: associations } = await singleTenantClient
    .from('people_companies')
    .select(`
      person_id,
      company_id,
      company:companies!inner (
        business_name
      )
    `)

  // Filter to only contacts associated with companies in our programs
  const { data: programCompanies } = await singleTenantClient
    .from('program_companies')
    .select('company_id')
    .in('program.name', PROGRAMS_TO_IMPORT)

  const programCompanyIds = new Set(programCompanies?.map(pc => pc.company_id) || [])

  const relevantAssociations = (associations || []).filter(a =>
    programCompanyIds.has(a.company_id)
  )

  const relevantPeopleIds = new Set(relevantAssociations.map(a => a.person_id))
  const relevantPeople = (peopleData || []).filter(p => relevantPeopleIds.has(p.id))

  console.log(`Found ${relevantPeople.length} contacts associated with program companies\n`)

  // Get company enrollments to determine contact enrollment dates
  const { data: companyEnrollments } = await multiTenantClient
    .from('company_program_enrollments')
    .select('company_id, start_date, end_date')
    .eq('program_id', voltaProgramId)

  const companyDatesMap = new Map(
    (companyEnrollments || []).map(e => [e.company_id, { start_date: e.start_date, end_date: e.end_date }])
  )

  // Import each contact
  let processedCount = 0

  for (const person of relevantPeople) {
    processedCount++
    stats.contactsChecked++

    console.log(`[${processedCount}/${relevantPeople.length}] Processing: ${person.first_name} ${person.last_name}`)

    // Check if contact exists in multi-tenant
    let existingContact = null

    // Try email match first
    if (person.email) {
      const { data } = await multiTenantClient
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('email', person.email)
        .maybeSingle()

      existingContact = data
    }

    // Fallback to name match
    if (!existingContact) {
      const { data } = await multiTenantClient
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('first_name', person.first_name)
        .eq('last_name', person.last_name)
        .maybeSingle()

      existingContact = data
    }

    let multiTenantContactId: string

    if (existingContact) {
      console.log(`  ✓ Contact exists: ${existingContact.id}`)
      stats.contactsSkipped++
      multiTenantContactId = existingContact.id
    } else {
      console.log(`  → Creating contact...`)

      if (!DRY_RUN) {
        const { data: newContact, error: createError } = await multiTenantClient
          .from('contacts')
          .insert({
            tenant_id: VOLTA_TENANT_ID,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            phone: person.phone_number,
            linkedin_url: person.linkedin_url,
            bio: person.bio,
            photo_url: person.photo,
            role: person.title?.toLowerCase().includes('founder') ? 'founder' : 'team_member'
          })
          .select('id')
          .single()

        if (createError || !newContact) {
          console.error(`  ✗ Error creating contact: ${createError?.message}`)
          stats.errors.push(`Failed to create contact ${person.first_name} ${person.last_name}: ${createError?.message}`)
          continue
        }

        multiTenantContactId = newContact.id
        stats.contactsCreated++
        console.log(`  ✓ Created: ${multiTenantContactId}`)
      } else {
        console.log(`  [DRY RUN] Would create contact`)
        stats.contactsCreated++
        continue
      }
    }

    // Get companies this contact is associated with
    const contactAssociations = relevantAssociations.filter(a => a.person_id === person.id)

    // For each associated company, create contact enrollment with same dates
    for (const assoc of contactAssociations) {
      // Find the multi-tenant company ID
      const { data: mtCompany } = await multiTenantClient
        .from('companies')
        .select('id')
        .eq('tenant_id', VOLTA_TENANT_ID)
        .eq('business_name', (assoc.company as any).business_name)
        .maybeSingle()

      if (!mtCompany) {
        console.log(`  ⚠ Company not found in multi-tenant: ${(assoc.company as any).business_name}`)
        continue
      }

      // Get company enrollment dates
      const companyDates = companyDatesMap.get(mtCompany.id)
      if (!companyDates) {
        console.log(`  ⚠ Company not enrolled yet: ${(assoc.company as any).business_name}`)
        continue
      }

      // Also link contact to company in company_contacts if not already linked
      if (!DRY_RUN) {
        await multiTenantClient
          .from('company_contacts')
          .upsert({
            company_id: mtCompany.id,
            contact_id: multiTenantContactId,
            is_primary: false
          }, {
            onConflict: 'company_id,contact_id',
            ignoreDuplicates: true
          })
      }

      // Create contact enrollment with same dates as company
      console.log(`  → Enrolling in program (via ${(assoc.company as any).business_name})...`)

      if (!DRY_RUN) {
        const { error: enrollError } = await multiTenantClient
          .from('program_contacts')
          .insert({
            program_id: voltaProgramId,
            contact_id: multiTenantContactId,
            start_date: companyDates.start_date,
            end_date: companyDates.end_date
          })

        if (enrollError) {
          if (enrollError.code === '23505') {
            console.log(`  ⚠ Already enrolled, skipping`)
          } else {
            console.error(`  ✗ Error creating contact enrollment: ${enrollError.message}`)
            stats.errors.push(`Failed to enroll contact ${person.first_name} ${person.last_name}: ${enrollError.message}`)
          }
        } else {
          stats.contactEnrollmentsCreated++
          console.log(`  ✓ Enrolled: ${companyDates.start_date} → ${companyDates.end_date || 'Ongoing'}`)
        }
      } else {
        console.log(`  [DRY RUN] Would enroll: ${companyDates.start_date} → ${companyDates.end_date || 'Ongoing'}`)
        stats.contactEnrollmentsCreated++
      }
    }

    console.log('')
  }
}

function printSummary() {
  console.log('\n=== IMPORT SUMMARY ===\n')
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE IMPORT'}\n`)

  console.log('Companies:')
  console.log(`  Checked: ${stats.companiesChecked}`)
  console.log(`  Created: ${stats.companiesCreated}`)
  console.log(`  Skipped (already exist): ${stats.companiesSkipped}`)
  console.log(`  Enrollments created: ${stats.enrollmentsCreated}\n`)

  console.log('Contacts:')
  console.log(`  Checked: ${stats.contactsChecked}`)
  console.log(`  Created: ${stats.contactsCreated}`)
  console.log(`  Skipped (already exist): ${stats.contactsSkipped}`)
  console.log(`  Enrollments created: ${stats.contactEnrollmentsCreated}\n`)

  if (stats.errors.length > 0) {
    console.log(`Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  } else {
    console.log('✓ No errors')
  }

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. To execute import, run: npm run import:programs')
  } else {
    console.log('\n✅ Import complete!')
  }
}

main().catch(console.error)
