/**
 * Server Actions - Program Management
 *
 * Following auth-best-practices.md:
 * - Auth checked in DAL (not here)
 * - Input validated with Zod
 * - RLS enforced at database level
 */

'use server'

import { revalidatePath } from 'next/cache'
import {
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  enrollCompany,
  bulkEnrollCompanies,
  unenrollCompany,
  updateCompanyEnrollment,
  enrollContact,
  bulkEnrollContacts,
  unenrollContact,
  updateContactEnrollment,
  getContactsByCompany,
  getCompaniesByContact,
  getEnrolledContactsByCompany,
  getEnrolledCompaniesByContact
} from '@/lib/dal/programs'
import { getCompanies } from '@/lib/dal/companies'
import { getContacts } from '@/lib/dal/contacts'
import {
  createProgramSchema,
  updateProgramSchema,
  enrollmentDatesSchema
} from '@/lib/schemas/program'

// ============================================================================
// Program Actions
// ============================================================================

export async function createProgramAction(formData: FormData) {
  try {
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
    }

    // Zod validation
    const validated = createProgramSchema.parse(rawData)

    // DAL handles auth check
    const program = await createProgram(validated)

    // Revalidate programs list
    revalidatePath('/programs')

    return { success: true, data: program }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create program' }
  }
}

export async function updateProgramAction(programId: string, formData: FormData) {
  try {
    const rawData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || null,
    }

    const validated = updateProgramSchema.parse(rawData)

    const program = await updateProgram(programId, validated)

    revalidatePath('/programs')
    revalidatePath(`/programs/${programId}`)

    return { success: true, data: program }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update program' }
  }
}

export async function deleteProgramAction(programId: string) {
  try {
    await deleteProgram(programId)

    revalidatePath('/programs')

    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to delete program' }
  }
}

// ============================================================================
// Helper Actions (for auto-enrollment workflow)
// ============================================================================

export async function getContactsByCompanyAction(companyId: string) {
  try {
    const contacts = await getContactsByCompany(companyId)
    return { success: true, data: contacts }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to load contacts' }
  }
}

export async function getCompaniesByContactAction(contactId: string) {
  try {
    const companies = await getCompaniesByContact(contactId)
    return { success: true, data: companies }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to load companies' }
  }
}

export async function getEnrolledContactsByCompanyAction(programId: string, companyId: string) {
  try {
    const contacts = await getEnrolledContactsByCompany(programId, companyId)
    return { success: true, data: contacts }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to load enrolled contacts' }
  }
}

export async function getEnrolledCompaniesByContactAction(programId: string, contactId: string) {
  try {
    const companies = await getEnrolledCompaniesByContact(programId, contactId)
    return { success: true, data: companies }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to load enrolled companies' }
  }
}

// ============================================================================
// Search Actions (for enrollment modals)
// ============================================================================

export async function getAllProgramsAction() {
  try {
    const programs = await getPrograms(false)
    return { success: true, data: programs }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to load programs' }
  }
}

export async function searchCompaniesForEnrollment(query: string) {
  try {
    const companies = await getCompanies(query)
    return { success: true, data: companies }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to search companies' }
  }
}

export async function searchContactsForEnrollment(query: string) {
  try {
    const contacts = await getContacts(query)
    return { success: true, data: contacts }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to search contacts' }
  }
}

// ============================================================================
// Company Enrollment Actions
// ============================================================================

export async function enrollCompanyAction(
  programId: string,
  companyId: string,
  startDate: string,
  endDate?: string | null,
  contactIds?: string[] // Optional: also enroll these contacts
) {
  try {
    const validated = enrollmentDatesSchema.parse({
      start_date: startDate,
      end_date: endDate
    })

    // Enroll company
    const enrollment = await enrollCompany(programId, companyId, validated)

    // Also enroll contacts if provided
    if (contactIds && contactIds.length > 0) {
      await bulkEnrollContacts(programId, contactIds, validated)
    }

    revalidatePath(`/programs/${programId}`)
    revalidatePath(`/companies/${companyId}`)
    if (contactIds) {
      contactIds.forEach(id => revalidatePath(`/contacts/${id}`))
    }

    return { success: true, data: enrollment }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to enroll company' }
  }
}

export async function bulkEnrollCompaniesAction(
  programId: string,
  companyIds: string[],
  startDate: string,
  endDate?: string | null
) {
  try {
    const validated = enrollmentDatesSchema.parse({
      start_date: startDate,
      end_date: endDate
    })

    const enrollments = await bulkEnrollCompanies(programId, companyIds, validated)

    revalidatePath(`/programs/${programId}`)

    return { success: true, data: enrollments }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to bulk enroll companies' }
  }
}

export async function updateCompanyEnrollmentAction(
  programId: string,
  companyId: string,
  startDate: string,
  endDate?: string | null,
  contactIds?: string[] // Optional: also update these contacts
) {
  try {
    const validated = enrollmentDatesSchema.parse({
      start_date: startDate,
      end_date: endDate
    })

    // Update company enrollment
    const enrollment = await updateCompanyEnrollment(programId, companyId, validated)

    // Also update contacts if provided
    if (contactIds && contactIds.length > 0) {
      for (const contactId of contactIds) {
        await updateContactEnrollment(programId, contactId, validated)
      }
    }

    revalidatePath(`/programs/${programId}`)
    revalidatePath(`/companies/${companyId}`)
    if (contactIds) {
      contactIds.forEach(id => revalidatePath(`/contacts/${id}`))
    }

    return { success: true, data: enrollment }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update enrollment' }
  }
}

export async function unenrollCompanyAction(programId: string, companyId: string) {
  try {
    await unenrollCompany(programId, companyId)

    revalidatePath(`/programs/${programId}`)
    revalidatePath(`/companies/${companyId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to unenroll company' }
  }
}

// ============================================================================
// Contact Enrollment Actions
// ============================================================================

export async function enrollContactAction(
  programId: string,
  contactId: string,
  startDate: string,
  endDate?: string | null,
  companyIds?: string[] // Optional: also enroll these companies
) {
  try {
    const validated = enrollmentDatesSchema.parse({
      start_date: startDate,
      end_date: endDate
    })

    // Enroll contact
    const enrollment = await enrollContact(programId, contactId, validated)

    // Also enroll companies if provided
    if (companyIds && companyIds.length > 0) {
      await bulkEnrollCompanies(programId, companyIds, validated)
    }

    revalidatePath(`/programs/${programId}`)
    revalidatePath(`/contacts/${contactId}`)
    if (companyIds) {
      companyIds.forEach(id => revalidatePath(`/companies/${id}`))
    }

    return { success: true, data: enrollment }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to enroll contact' }
  }
}

export async function bulkEnrollContactsAction(
  programId: string,
  contactIds: string[],
  startDate: string,
  endDate?: string | null
) {
  try {
    const validated = enrollmentDatesSchema.parse({
      start_date: startDate,
      end_date: endDate
    })

    const enrollments = await bulkEnrollContacts(programId, contactIds, validated)

    revalidatePath(`/programs/${programId}`)

    return { success: true, data: enrollments }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to bulk enroll contacts' }
  }
}

export async function updateContactEnrollmentAction(
  programId: string,
  contactId: string,
  startDate: string,
  endDate?: string | null,
  companyIds?: string[] // Optional: also update these companies
) {
  try {
    const validated = enrollmentDatesSchema.parse({
      start_date: startDate,
      end_date: endDate
    })

    // Update contact enrollment
    const enrollment = await updateContactEnrollment(programId, contactId, validated)

    // Also update companies if provided
    if (companyIds && companyIds.length > 0) {
      for (const companyId of companyIds) {
        await updateCompanyEnrollment(programId, companyId, validated)
      }
    }

    revalidatePath(`/programs/${programId}`)
    revalidatePath(`/contacts/${contactId}`)
    if (companyIds) {
      companyIds.forEach(id => revalidatePath(`/companies/${id}`))
    }

    return { success: true, data: enrollment }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update contact enrollment' }
  }
}

export async function unenrollContactAction(programId: string, contactId: string) {
  try {
    await unenrollContact(programId, contactId)

    revalidatePath(`/programs/${programId}`)
    revalidatePath(`/contacts/${contactId}`)

    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to unenroll contact' }
  }
}
