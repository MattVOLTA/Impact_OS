/**
 * Server Actions - Company Management
 *
 * Following auth-best-practices.md:
 * - Auth checked in DAL (not here)
 * - Input validated with Zod
 * - RLS enforced at database level
 */

'use server'

import { revalidatePath } from 'next/cache'
import { createCompany, updateCompany, deleteCompany } from '@/lib/dal/companies'
import { createCompanySchema, updateCompanySchema } from '@/lib/schemas/company'

export async function createCompanyAction(formData: FormData) {
  try {
    // Extract and validate data
    const rawData = {
      business_name: formData.get('business_name') as string,
      company_type: formData.get('company_type') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      website_url: formData.get('website_url') as string || '',
      industry_ids: formData.getAll('industry_ids') as string[],
    }

    // Zod validation
    const validated = createCompanySchema.parse(rawData)

    // DAL handles auth check
    const company = await createCompany(validated)

    // Revalidate companies list
    revalidatePath('/companies')

    return { success: true, data: company }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to create company' }
  }
}

export async function updateCompanyAction(companyId: string, formData: FormData) {
  try {
    const rawData = {
      business_name: formData.get('business_name') as string,
      company_type: formData.get('company_type') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      website_url: formData.get('website_url') as string || '',
      industry_ids: formData.getAll('industry_ids') as string[],
    }

    const validated = updateCompanySchema.parse(rawData)

    const company = await updateCompany(companyId, validated)

    revalidatePath('/companies')

    return { success: true, data: company }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to update company' }
  }
}

export async function deleteCompanyAction(companyId: string) {
  try {
    await deleteCompany(companyId)

    revalidatePath('/companies')

    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to delete company' }
  }
}
