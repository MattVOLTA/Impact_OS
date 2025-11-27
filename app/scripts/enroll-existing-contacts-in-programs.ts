/**
 * Enroll Existing Contacts in Programs
 *
 * This script enrolls contacts that were created but not enrolled.
 * Matches contacts to companies and uses company enrollment dates.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const mtClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const stClient = createClient(
  process.env.SINGLE_TENANT_SUPABASE_URL!,
  process.env.SINGLE_TENANT_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VOLTA_TENANT_ID = '11111111-1111-1111-1111-111111111111'
const VOLTA_PROGRAM_ID = '9de9da17-d724-454a-beb9-a04333fe7552'

async function main() {
  console.log('\n=== Enrolling Contacts in Volta Residency ===\n')

  // Get people-company associations from single_tenant
  const { data: peopleCompanies } = await stClient
    .from('people_companies')
    .select('person_id, company_id')

  // Get company names from single_tenant
  const { data: stCompanies } = await stClient
    .from('companies')
    .select('id, business_name')

  const stCompanyMap = new Map((stCompanies || []).map(c => [c.id, c.business_name]))

  // Get contacts and companies from multi-tenant
  const { data: mtContacts } = await mtClient
    .from('contacts')
    .select('id, first_name, last_name, email')
    .eq('tenant_id', VOLTA_TENANT_ID)

  const { data: mtCompanies } = await mtClient
    .from('companies')
    .select('id, business_name')
    .eq('tenant_id', VOLTA_TENANT_ID)

  const mtCompanyMap = new Map((mtCompanies || []).map(c => [c.business_name, c.id]))

  // Get company enrollment dates
  const { data: companyEnrollments } = await mtClient
    .from('company_program_enrollments')
    .select('company_id, start_date, end_date')
    .eq('program_id', VOLTA_PROGRAM_ID)

  const companyDatesMap = new Map(
    (companyEnrollments || []).map(e => [e.company_id, { start_date: e.start_date, end_date: e.end_date }])
  )

  // Get contacts from single_tenant with their IDs
  const { data: stContacts } = await stClient
    .from('all_contacts_email')
    .select('id, first_name, last_name, email')
    .is('deleted_at', null)

  // Create email and name maps for matching
  const stContactEmailMap = new Map((stContacts || []).filter(c => c.email).map(c => [c.email, c.id]))
  const stContactNameMap = new Map((stContacts || []).map(c => [`${c.first_name}|${c.last_name}`, c.id]))

  let enrolled = 0
  let linked = 0

  console.log(`Processing ${mtContacts?.length || 0} contacts...\n`)

  for (const mtContact of mtContacts || []) {
    // Match to single_tenant contact
    let stContactId = mtContact.email ? stContactEmailMap.get(mtContact.email) : null
    if (!stContactId) {
      stContactId = stContactNameMap.get(`${mtContact.first_name}|${mtContact.last_name}`)
    }

    if (!stContactId) continue

    // Get companies this contact is associated with in single_tenant
    const contactAssociations = (peopleCompanies || []).filter(pc => pc.person_id === stContactId)

    for (const assoc of contactAssociations) {
      const companyName = stCompanyMap.get(assoc.company_id)
      if (!companyName) continue

      const mtCompanyId = mtCompanyMap.get(companyName)
      if (!mtCompanyId) continue

      // Link to company
      await mtClient
        .from('company_contacts')
        .upsert({
          company_id: mtCompanyId,
          contact_id: mtContact.id,
          is_primary: false
        }, {
          onConflict: 'company_id,contact_id',
          ignoreDuplicates: true
        })

      linked++

      // Get company dates and enroll contact
      const dates = companyDatesMap.get(mtCompanyId)
      if (!dates) continue

      const { error } = await mtClient
        .from('program_contacts')
        .insert({
          program_id: VOLTA_PROGRAM_ID,
          contact_id: mtContact.id,
          start_date: dates.start_date,
          end_date: dates.end_date
        })

      if (!error) {
        enrolled++
      } else if (error.code !== '23505') {
        console.error(`Error enrolling ${mtContact.first_name} ${mtContact.last_name}:`, error.message)
      }
    }
  }

  console.log(`\n✅ Complete!`)
  console.log(`   Linked to companies: ${linked}`)
  console.log(`   Enrolled in program: ${enrolled}`)
}

main().catch(console.error)
