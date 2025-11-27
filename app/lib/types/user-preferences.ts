/**
 * User Preferences Types
 *
 * Type definitions for user-specific preferences stored in database.
 */

export type CompanyType =
  | 'Startup'
  | 'Investment Fund'
  | 'Government'
  | 'University'
  | 'Service Provider'
  | 'Large Corporation'
  | 'Non-Profit'

export interface FilterPreferences {
  search?: string
  enrollmentStatus?: 'all' | 'active' | 'alumni' | 'not_enrolled'
  programId?: string
  companyType?: CompanyType | 'all'
}

export interface UserPreferences {
  filters: {
    companies: FilterPreferences
    contacts: FilterPreferences
  }
}
