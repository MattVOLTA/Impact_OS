/**
 * Data Access Layer for Reporting
 *
 * Handles all database operations for AI-powered reporting including:
 * - Report session management (conversation history)
 * - Report artifact storage
 * - Data retrieval for report generation (demographics, interactions)
 */

import { requireAuth, getCurrentTenantId } from './shared'

// ============================================================================
// Types
// ============================================================================

export interface ReportSession {
  id: string
  tenant_id: string
  created_by: string
  created_at: string
  updated_at: string
  title: string | null
  conversation: ConversationMessage[]
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Report {
  id: string
  session_id: string
  tenant_id: string
  created_by: string
  created_at: string
  report_type: string
  title: string
  content: string
  metadata: Record<string, any>
}

export interface DemographicReachData {
  category: string
  contact_count: number
  interaction_count: number
  company_count: number
}

export interface InteractionActivityData {
  total_interactions: number
  interactions_by_type: { type: string; count: number }[]
  interactions_by_month: { month: string; count: number }[]
  top_companies: { company_name: string; interaction_count: number }[]
  recent_interactions: {
    id: string
    title: string
    meeting_date: string
    interaction_type: string
    companies: string[]
  }[]
}

// ============================================================================
// Report Session Functions
// ============================================================================

/**
 * Create a new report session
 */
export async function createReportSession(title?: string) {
  const { supabase, user } = await requireAuth()
  const tenant_id = await getCurrentTenantId()

  const { data, error } = await supabase
    .from('report_sessions')
    .insert({
      tenant_id,
      created_by: user.id,
      title: title || null,
      conversation: []
    })
    .select()
    .single()

  if (error) throw error
  return data as ReportSession
}

/**
 * Get a specific report session by ID
 */
export async function getReportSession(sessionId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('report_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) throw error
  return data as ReportSession
}

/**
 * Get all report sessions for the current tenant
 */
export async function getReportSessions(limit = 50) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('report_sessions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ReportSession[]
}

/**
 * Update report session conversation
 */
export async function updateReportSessionConversation(
  sessionId: string,
  messages: ConversationMessage[]
) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('report_sessions')
    .update({
      conversation: messages
    })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return data as ReportSession
}

/**
 * Update report session title
 */
export async function updateReportSessionTitle(
  sessionId: string,
  title: string
) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('report_sessions')
    .update({ title })
    .eq('id', sessionId)
    .select()
    .single()

  if (error) throw error
  return data as ReportSession
}

/**
 * Delete a report session (cascades to reports)
 */
export async function deleteReportSession(sessionId: string) {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('report_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

// ============================================================================
// Report Functions
// ============================================================================

/**
 * Create a new report artifact
 */
export async function createReport(
  sessionId: string,
  reportType: string,
  title: string,
  content: string,
  metadata: Record<string, any> = {}
) {
  const { supabase, user } = await requireAuth()
  const tenant_id = await getCurrentTenantId()

  const { data, error } = await supabase
    .from('reports')
    .insert({
      session_id: sessionId,
      tenant_id,
      created_by: user.id,
      report_type: reportType,
      title,
      content,
      metadata
    })
    .select()
    .single()

  if (error) throw error
  return data as Report
}

/**
 * Get a specific report by ID
 */
export async function getReport(reportId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error) throw error
  return data as Report
}

/**
 * Get all reports for a specific session
 */
export async function getReportsForSession(sessionId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Report[]
}

/**
 * Get all reports for the current tenant
 */
export async function getReports(limit = 100) {
  const { supabase } = await requireAuth()

  // Use a simpler query without join to avoid RLS issues
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  // If we need session titles, fetch them separately
  if (data && data.length > 0) {
    const sessionIds = [...new Set(data.map(r => r.session_id))]
    const { data: sessions } = await supabase
      .from('report_sessions')
      .select('id, title, created_at')
      .in('id', sessionIds)

    // Map session data to reports
    const sessionMap = new Map(sessions?.map(s => [s.id, s]) || [])

    return data.map(report => ({
      ...report,
      report_sessions: sessionMap.get(report.session_id) || { title: null, created_at: report.created_at }
    })) as (Report & { report_sessions: { title: string | null; created_at: string } })[]
  }

  return []
}

/**
 * Delete a report
 */
export async function deleteReport(reportId: string) {
  const { supabase } = await requireAuth()

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId)

  if (error) throw error
}

// ============================================================================
// Company & Contact Search Functions
// ============================================================================

/**
 * Search for companies by name (fuzzy search)
 */
export async function searchCompanies(query: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('companies')
    .select('id, business_name, website_url, email, phone, description')
    .ilike('business_name', `%${query}%`)
    .order('business_name')
    .limit(10)

  if (error) throw error
  return data
}

/**
 * Search for contacts by name (fuzzy search)
 */
export async function searchContacts(query: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      email,
      title,
      company_contacts!inner(companies(id, business_name))
    `)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .order('last_name')
    .limit(10)

  if (error) throw error
  return data
}

/**
 * Get recent interactions for a specific company
 */
export async function getCompanyInteractions(companyId: string, limit = 10) {
  const { supabase } = await requireAuth()

  // First get interaction IDs for this company
  const { data: interactionCompanies, error: icError } = await supabase
    .from('interaction_companies')
    .select('interaction_id')
    .eq('company_id', companyId)

  if (icError) throw icError

  if (!interactionCompanies || interactionCompanies.length === 0) {
    return []
  }

  const interactionIds = interactionCompanies.map(ic => ic.interaction_id)

  // Then get the interactions ordered by date
  const { data, error } = await supabase
    .from('interactions')
    .select('id, title, meeting_date, interaction_type, summary, notes, fireflies_transcript_id')
    .in('id', interactionIds)
    .order('meeting_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Get recent interactions for a specific contact
 */
export async function getContactInteractions(contactId: string, limit = 10) {
  const { supabase } = await requireAuth()

  // First get interaction IDs for this contact
  const { data: interactionContacts, error: icError } = await supabase
    .from('interaction_contacts')
    .select('interaction_id')
    .eq('contact_id', contactId)

  if (icError) throw icError

  if (!interactionContacts || interactionContacts.length === 0) {
    return []
  }

  const interactionIds = interactionContacts.map(ic => ic.interaction_id)

  // Then get the interactions ordered by date
  const { data, error } = await supabase
    .from('interactions')
    .select('id, title, meeting_date, interaction_type, summary, notes, fireflies_transcript_id')
    .in('id', interactionIds)
    .order('meeting_date', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Get detailed transcript and AI summaries for an interaction
 */
export async function getInteractionTranscript(interactionId: string) {
  const { supabase } = await requireAuth()

  // Get interaction details
  const { data: interaction, error: interactionError } = await supabase
    .from('interactions')
    .select(`
      id,
      title,
      meeting_date,
      interaction_type,
      summary,
      notes,
      fireflies_transcript_id
    `)
    .eq('id', interactionId)
    .single()

  if (interactionError) throw interactionError

  // Get transcript if available
  let transcript = null
  if (interaction.fireflies_transcript_id) {
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('meeting_transcripts')
      .select(`
        fireflies_summary,
        transcript_detailed_summary,
        fireflies_action_items,
        speakers,
        participants
      `)
      .eq('fireflies_transcript_id', interaction.fireflies_transcript_id)
      .single()

    if (!transcriptError && transcriptData) {
      transcript = transcriptData
    }
  }

  return {
    ...interaction,
    transcript
  }
}

// ============================================================================
// Data Retrieval Functions for Report Generation
// ============================================================================

/**
 * Get demographic reach data for BAI reporting
 *
 * @param startDate - Optional start date filter (ISO format)
 * @param endDate - Optional end date filter (ISO format)
 */
export async function getBAIDemographicsData(
  startDate?: string,
  endDate?: string
): Promise<DemographicReachData[]> {
  const { supabase } = await requireAuth()

  // Build the query with optional date filtering on interactions
  let interactionQuery = supabase
    .from('interactions')
    .select('id, meeting_date')

  if (startDate) {
    interactionQuery = interactionQuery.gte('meeting_date', startDate)
  }
  if (endDate) {
    interactionQuery = interactionQuery.lte('meeting_date', endDate)
  }

  const { data: interactions, error: interactionError } = await interactionQuery

  if (interactionError) throw interactionError

  const interactionIds = interactions.map(i => i.id)

  // Get demographic categories
  const { data: categories, error: catError } = await supabase
    .from('demographic_categories')
    .select('*')
    .order('name')

  if (catError) throw catError

  // Get all contact demographics
  const { data: contactDemographics, error: cdError } = await supabase
    .from('contact_demographics')
    .select(`
      contact_id,
      demographic_category_id,
      contacts!inner(id, company_contacts!inner(company_id))
    `)

  if (cdError) throw cdError

  // Get interaction contacts (filtered by date range if provided)
  const { data: interactionContacts, error: icError } = await supabase
    .from('interaction_contacts')
    .select('interaction_id, contact_id')
    .in('interaction_id', interactionIds.length > 0 ? interactionIds : ['00000000-0000-0000-0000-000000000000'])

  if (icError) throw icError

  // Process the data to count contacts, interactions, and companies per demographic
  const demographicData: Record<string, DemographicReachData> = {}

  categories.forEach(category => {
    demographicData[category.id] = {
      category: category.name,
      contact_count: 0,
      interaction_count: 0,
      company_count: 0
    }
  })

  // Count unique contacts per demographic
  const contactsByDemographic: Record<string, Set<string>> = {}
  const companiesByDemographic: Record<string, Set<string>> = {}

  contactDemographics.forEach(cd => {
    if (!contactsByDemographic[cd.demographic_category_id]) {
      contactsByDemographic[cd.demographic_category_id] = new Set()
    }
    contactsByDemographic[cd.demographic_category_id].add(cd.contact_id)

    // Count unique companies
    if (!companiesByDemographic[cd.demographic_category_id]) {
      companiesByDemographic[cd.demographic_category_id] = new Set()
    }
    ;(cd.contacts as any).company_contacts.forEach((cc: any) => {
      companiesByDemographic[cd.demographic_category_id].add(cc.company_id)
    })
  })

  // Count interactions per demographic
  const interactionsByDemographic: Record<string, Set<string>> = {}

  interactionContacts.forEach(ic => {
    const contactDemos = contactDemographics.filter(cd => cd.contact_id === ic.contact_id)
    contactDemos.forEach(cd => {
      if (!interactionsByDemographic[cd.demographic_category_id]) {
        interactionsByDemographic[cd.demographic_category_id] = new Set()
      }
      interactionsByDemographic[cd.demographic_category_id].add(ic.interaction_id)
    })
  })

  // Populate the counts
  Object.keys(demographicData).forEach(categoryId => {
    demographicData[categoryId].contact_count = contactsByDemographic[categoryId]?.size || 0
    demographicData[categoryId].interaction_count = interactionsByDemographic[categoryId]?.size || 0
    demographicData[categoryId].company_count = companiesByDemographic[categoryId]?.size || 0
  })

  return Object.values(demographicData)
}

/**
 * Get interaction activity data for reporting
 *
 * @param startDate - Optional start date filter (ISO format)
 * @param endDate - Optional end date filter (ISO format)
 * @param limit - Number of recent interactions to return (default: 10)
 */
export async function getInteractionActivityData(
  startDate?: string,
  endDate?: string,
  limit = 10
): Promise<InteractionActivityData> {
  const { supabase } = await requireAuth()

  // Build base query
  let query = supabase
    .from('interactions')
    .select('*')

  if (startDate) {
    query = query.gte('meeting_date', startDate)
  }
  if (endDate) {
    query = query.lte('meeting_date', endDate)
  }

  const { data: interactions, error } = await query

  if (error) throw error

  // Calculate total interactions
  const total_interactions = interactions.length

  // Group by interaction type
  const typeMap: Record<string, number> = {}
  interactions.forEach(i => {
    typeMap[i.interaction_type] = (typeMap[i.interaction_type] || 0) + 1
  })
  const interactions_by_type = Object.entries(typeMap).map(([type, count]) => ({
    type,
    count
  }))

  // Group by month
  const monthMap: Record<string, number> = {}
  interactions.forEach(i => {
    const month = i.meeting_date.substring(0, 7) // YYYY-MM
    monthMap[month] = (monthMap[month] || 0) + 1
  })
  const interactions_by_month = Object.entries(monthMap)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Get top companies by interaction count
  const { data: interactionCompanies, error: icError } = await supabase
    .from('interaction_companies')
    .select(`
      company_id,
      companies!inner(business_name)
    `)
    .in('interaction_id', interactions.map(i => i.id))

  if (icError) throw icError

  const companyMap: Record<string, { name: string; count: number }> = {}
  interactionCompanies.forEach(ic => {
    const companyName = (ic.companies as any).business_name
    if (!companyMap[ic.company_id]) {
      companyMap[ic.company_id] = { name: companyName, count: 0 }
    }
    companyMap[ic.company_id].count++
  })

  const top_companies = Object.values(companyMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(c => ({
      company_name: c.name,
      interaction_count: c.count
    }))

  // Get recent interactions with companies
  const recentInteractionIds = interactions
    .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
    .slice(0, limit)
    .map(i => i.id)

  const { data: recentCompanies, error: rcError } = await supabase
    .from('interaction_companies')
    .select(`
      interaction_id,
      companies!inner(business_name)
    `)
    .in('interaction_id', recentInteractionIds)

  if (rcError) throw rcError

  const companiesByInteraction: Record<string, string[]> = {}
  recentCompanies.forEach(rc => {
    if (!companiesByInteraction[rc.interaction_id]) {
      companiesByInteraction[rc.interaction_id] = []
    }
    companiesByInteraction[rc.interaction_id].push((rc.companies as any).business_name)
  })

  const recent_interactions = interactions
    .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())
    .slice(0, limit)
    .map(i => ({
      id: i.id,
      title: i.title,
      meeting_date: i.meeting_date,
      interaction_type: i.interaction_type,
      companies: companiesByInteraction[i.id] || []
    }))

  return {
    total_interactions,
    interactions_by_type,
    interactions_by_month,
    top_companies,
    recent_interactions
  }
}

// ============================================================================
// Discovery Tools for Conversational Reporting
// ============================================================================

/**
 * Preview data coverage for a given scope
 * Returns summary statistics without full data load
 */
export async function previewDataCoverage(
  startDate?: string,
  endDate?: string
): Promise<{
  companies_count: number
  contacts_count: number
  interactions_count: number
  demographic_categories: {
    category: string
    contact_count: number
    has_data: boolean
  }[]
  date_range: { start: string; end: string }
}> {
  const { supabase } = await requireAuth()

  // Count companies
  const { count: companiesCount, error: companiesError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })

  if (companiesError) throw companiesError

  // Count contacts
  const { count: contactsCount, error: contactsError } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })

  if (contactsError) throw contactsError

  // Count interactions (with optional date filtering)
  let interactionsQuery = supabase
    .from('interactions')
    .select('*', { count: 'exact', head: true })

  if (startDate) {
    interactionsQuery = interactionsQuery.gte('meeting_date', startDate)
  }
  if (endDate) {
    interactionsQuery = interactionsQuery.lte('meeting_date', endDate)
  }

  const { count: interactionsCount, error: interactionsError } = await interactionsQuery

  if (interactionsError) throw interactionsError

  // Get demographic category coverage
  const { data: categories, error: categoriesError } = await supabase
    .from('demographic_categories')
    .select('id, name')
    .order('name')

  if (categoriesError) throw categoriesError

  // Count contacts per demographic category
  const { data: contactDemographics, error: cdError } = await supabase
    .from('contact_demographics')
    .select('demographic_category_id, contact_id')

  if (cdError) throw cdError

  // Group by category
  const categoryMap = new Map<string, Set<string>>()
  contactDemographics.forEach(cd => {
    if (!categoryMap.has(cd.demographic_category_id)) {
      categoryMap.set(cd.demographic_category_id, new Set())
    }
    categoryMap.get(cd.demographic_category_id)!.add(cd.contact_id)
  })

  const demographic_categories = categories.map(cat => ({
    category: cat.name,
    contact_count: categoryMap.get(cat.id)?.size || 0,
    has_data: (categoryMap.get(cat.id)?.size || 0) > 0
  }))

  return {
    companies_count: companiesCount || 0,
    contacts_count: contactsCount || 0,
    interactions_count: interactionsCount || 0,
    demographic_categories,
    date_range: {
      start: startDate || '',
      end: endDate || ''
    }
  }
}

/**
 * Identify data quality issues in current scope
 * Flags missing/incomplete data for user awareness
 */
export async function identifyDataQualityIssues(
  startDate?: string,
  endDate?: string
): Promise<{
  missing_industries: { company_id: string; business_name: string }[]
  contacts_without_demographics: number
  companies_without_interactions: { company_id: string; business_name: string }[]
  low_coverage_demographics: string[]
}> {
  const { supabase } = await requireAuth()

  // Find companies without industry tags
  const { data: companiesWithoutIndustries, error: industriesError } = await supabase
    .from('companies')
    .select('id, business_name, company_industries!left(company_id)')
    .is('company_industries.company_id', null)
    .limit(20)

  if (industriesError) throw industriesError

  const missing_industries = companiesWithoutIndustries.map(c => ({
    company_id: c.id,
    business_name: c.business_name
  }))

  // Count contacts without demographics
  const { data: allContacts, error: contactsError } = await supabase
    .from('contacts')
    .select('id')

  if (contactsError) throw contactsError

  const { data: contactsWithDemographics, error: cdError } = await supabase
    .from('contact_demographics')
    .select('contact_id')

  if (cdError) throw cdError

  const contactsWithDemoSet = new Set(contactsWithDemographics.map(cd => cd.contact_id))
  const contacts_without_demographics = allContacts.filter(
    c => !contactsWithDemoSet.has(c.id)
  ).length

  // Find companies without interactions in date range
  let interactionsQuery = supabase
    .from('interactions')
    .select('id, interaction_companies!inner(company_id)')

  if (startDate) {
    interactionsQuery = interactionsQuery.gte('meeting_date', startDate)
  }
  if (endDate) {
    interactionsQuery = interactionsQuery.lte('meeting_date', endDate)
  }

  const { data: interactions, error: interactionsError } = await interactionsQuery

  if (interactionsError) throw interactionsError

  const companiesWithInteractions = new Set(
    interactions.flatMap(i => (i.interaction_companies as any).map((ic: any) => ic.company_id))
  )

  const { data: allCompanies, error: allCompaniesError } = await supabase
    .from('companies')
    .select('id, business_name')

  if (allCompaniesError) throw allCompaniesError

  const companies_without_interactions = allCompanies
    .filter(c => !companiesWithInteractions.has(c.id))
    .slice(0, 20)
    .map(c => ({
      company_id: c.id,
      business_name: c.business_name
    }))

  // Find low-coverage demographic categories (< 5 contacts)
  const coverage = await previewDataCoverage(startDate, endDate)
  const low_coverage_demographics = coverage.demographic_categories
    .filter(cat => cat.contact_count > 0 && cat.contact_count < 5)
    .map(cat => cat.category)

  return {
    missing_industries,
    contacts_without_demographics,
    companies_without_interactions,
    low_coverage_demographics
  }
}

/**
 * Suggest report outline based on available data
 * Proposes structure before generation
 */
export async function suggestReportOutline(
  reportType: 'demographic_reach' | 'interaction_activity' | 'custom',
  startDate?: string,
  endDate?: string
): Promise<{
  suggested_sections: string[]
  data_availability: Record<string, 'high' | 'medium' | 'low'>
  estimated_insights: string[]
}> {
  const { supabase } = await requireAuth()

  const coverage = await previewDataCoverage(startDate, endDate)
  const suggested_sections: string[] = []
  const data_availability: Record<string, 'high' | 'medium' | 'low'> = {}
  const estimated_insights: string[] = []

  if (reportType === 'demographic_reach') {
    suggested_sections.push(
      'Executive Summary',
      'Demographic Coverage Overview',
      'Category Breakdown',
      'Engagement Metrics by Category',
      'Data Gaps & Recommendations'
    )

    // Assess data availability
    const hasDemographics = coverage.demographic_categories.some(c => c.has_data)
    data_availability['Demographic Coverage Overview'] = hasDemographics ? 'high' : 'low'
    data_availability['Category Breakdown'] = hasDemographics ? 'high' : 'low'
    data_availability['Engagement Metrics by Category'] = coverage.interactions_count > 10 ? 'high' : 'medium'

    // Generate insights preview
    const topCategories = coverage.demographic_categories
      .filter(c => c.has_data)
      .sort((a, b) => b.contact_count - a.contact_count)
      .slice(0, 2)

    if (topCategories.length > 0) {
      estimated_insights.push(
        `Strongest representation: ${topCategories[0].category} (${topCategories[0].contact_count} contacts)`
      )
    }

    const lowCategories = coverage.demographic_categories.filter(c => !c.has_data)
    if (lowCategories.length > 0) {
      estimated_insights.push(`${lowCategories.length} categories with no data yet`)
    }
  } else if (reportType === 'interaction_activity') {
    suggested_sections.push(
      'Executive Summary',
      'Overall Engagement Metrics',
      'Interaction Trends',
      'Top Companies by Engagement',
      'Recent Activity Highlights'
    )

    data_availability['Overall Engagement Metrics'] = coverage.interactions_count > 0 ? 'high' : 'low'
    data_availability['Interaction Trends'] = coverage.interactions_count > 10 ? 'high' : 'medium'
    data_availability['Top Companies by Engagement'] = coverage.companies_count > 0 ? 'high' : 'low'

    if (coverage.interactions_count > 0) {
      estimated_insights.push(`${coverage.interactions_count} total interactions recorded`)
    }
    if (coverage.companies_count > 0) {
      estimated_insights.push(`Engaging with ${coverage.companies_count} companies`)
    }
  } else {
    // Custom report
    suggested_sections.push(
      'Executive Summary',
      'Data Overview',
      'Key Findings',
      'Recommendations'
    )

    data_availability['Data Overview'] = 'medium'
    data_availability['Key Findings'] = coverage.interactions_count > 5 ? 'medium' : 'low'
  }

  return {
    suggested_sections,
    data_availability,
    estimated_insights: estimated_insights.slice(0, 3)
  }
}

/**
 * Preview key insights without full report generation
 * Quick 3-5 headline findings for user decision-making
 */
export async function previewKeyInsights(
  startDate?: string,
  endDate?: string
): Promise<{
  insights: Array<{
    category: 'engagement' | 'demographics' | 'growth' | 'gaps'
    headline: string
    detail: string
    confidence: 'high' | 'medium' | 'low'
  }>
}> {
  const { supabase } = await requireAuth()

  const insights: Array<{
    category: 'engagement' | 'demographics' | 'growth' | 'gaps'
    headline: string
    detail: string
    confidence: 'high' | 'medium' | 'low'
  }> = []

  const coverage = await previewDataCoverage(startDate, endDate)
  const quality = await identifyDataQualityIssues(startDate, endDate)

  // Engagement insights
  if (coverage.interactions_count > 0) {
    insights.push({
      category: 'engagement',
      headline: `${coverage.interactions_count} interactions recorded`,
      detail: `Tracking engagement with ${coverage.companies_count} companies`,
      confidence: 'high'
    })
  }

  // Demographics insights
  const categoriesWithData = coverage.demographic_categories.filter(c => c.has_data)
  if (categoriesWithData.length > 0) {
    const topCategory = categoriesWithData.sort((a, b) => b.contact_count - a.contact_count)[0]
    insights.push({
      category: 'demographics',
      headline: `Strongest representation: ${topCategory.category}`,
      detail: `${topCategory.contact_count} contacts identified in this category`,
      confidence: 'high'
    })
  }

  // Data gaps insights
  if (quality.missing_industries.length > 0) {
    insights.push({
      category: 'gaps',
      headline: `${quality.missing_industries.length} companies missing industry data`,
      detail: 'This may affect BAI compliance reporting accuracy',
      confidence: 'high'
    })
  }

  if (quality.contacts_without_demographics > 0) {
    insights.push({
      category: 'gaps',
      headline: `${quality.contacts_without_demographics} contacts without demographic data`,
      detail: 'Consider adding demographic information for complete reporting',
      confidence: 'medium'
    })
  }

  if (quality.low_coverage_demographics.length > 0) {
    insights.push({
      category: 'demographics',
      headline: `${quality.low_coverage_demographics.length} categories have limited coverage`,
      detail: `Categories with <5 contacts: ${quality.low_coverage_demographics.join(', ')}`,
      confidence: 'medium'
    })
  }

  return {
    insights: insights.slice(0, 5) // Limit to 5 insights
  }
}
