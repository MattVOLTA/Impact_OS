/**
 * Data Access Layer - Settings
 *
 * Handles settings and integration configuration queries.
 * All queries automatically scoped to organization via RLS.
 */

import { cache } from 'react'
import { requireAuth, getCurrentTenantId, getCurrentOrganizationId } from './shared'

export interface TenantConfig {
  id: string
  tenant_id: string
  feature_company_updates: boolean
  feature_interactions: boolean
  feature_fireflies: boolean
  feature_advisor_profiles: boolean
  feature_commitment_tracking: boolean
  feature_ai_integration: boolean
  fireflies_connection_status: 'not_connected' | 'connected' | 'connection_failed'
  fireflies_connected_at: string | null
  fireflies_connected_by: string | null
  openai_api_key_secret_id: string | null
  openai_connected_by: string | null
  openai_connected_at: string | null
  openai_connection_status: 'not_connected' | 'connected' | 'connection_failed'
  ai_features: Record<string, boolean>
  milestone_tracking_enabled: boolean
  enabled_milestone_tracks: string[]
  created_at: string
  updated_at: string
}

export type FeatureFlag =
  | 'company_updates'
  | 'interactions'
  | 'fireflies'
  | 'advisor_profiles'
  | 'commitment_tracking'
  | 'ai_integration'

export interface FirefliesConnection {
  isConnected: boolean
  status: 'not_connected' | 'connected' | 'failed'
  connectedBy?: {
    firstName: string
    lastName: string
  }
  connectedAt?: string
  isEnabled: boolean
}

export interface FirefliesSyncConfig {
  syncStartDate: string | null
  lastSyncAt: string | null
  connectionStatus: 'connected' | 'not_connected' | null
}

export interface OpenAIConnection {
  isConnected: boolean
  status: 'not_connected' | 'connected' | 'failed'
  connectedBy?: {
    firstName: string
    lastName: string
  }
  connectedAt?: string
  isEnabled: boolean
}

export type AIFeature =
  | 'commitment_analysis'
  | 'report_generation'
  | 'meeting_insights'
  | 'company_recommendations'

export interface AIFeaturesConfig {
  commitment_analysis: boolean
  report_generation: boolean
  meeting_insights: boolean
  company_recommendations: boolean
}

/**
 * Get Fireflies connection status for current tenant
 *
 * Uses service role to bypass RLS (same circular dependency as getCurrentUserRole).
 *
 * @returns {Promise<FirefliesConnection>} Connection status and metadata
 */
export async function getFirefliesConnection(): Promise<FirefliesConnection> {
  await requireAuth()
  const tenantId = await getCurrentTenantId()

  // Use admin client to bypass RLS
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Query tenant_config for Fireflies connection info
  const { data: config, error: configError } = await adminClient
    .from('tenant_config')
    .select(`
      feature_fireflies,
      fireflies_connection_status,
      fireflies_connected_at,
      fireflies_connected_by,
      users:fireflies_connected_by (
        first_name,
        last_name
      )
    `)
    .eq('tenant_id', tenantId)
    .single()

  if (configError || !config) {
    // No config found, return defaults
    return {
      isConnected: false,
      status: 'not_connected',
      isEnabled: false,
    }
  }

  const status = (config.fireflies_connection_status as 'not_connected' | 'connected' | 'failed') || 'not_connected'
  const isConnected = status === 'connected'

  return {
    isConnected,
    status,
    connectedBy: config.users
      ? {
          firstName: (config.users as any).first_name || '',
          lastName: (config.users as any).last_name || '',
        }
      : undefined,
    connectedAt: config.fireflies_connected_at || undefined,
    isEnabled: config.feature_fireflies || false,
  }
}

/**
 * Get tenant configuration for current organization
 * Cached per request to avoid multiple DB calls
 */
export const getTenantConfig = cache(async (): Promise<TenantConfig | null> => {
  await requireAuth()
  const organizationId = await getCurrentOrganizationId()

  // Use admin client to bypass RLS
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data, error } = await adminClient
    .from('tenant_config')
    .select('*')
    .eq('tenant_id', organizationId)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch tenant config:', error)
    return null
  }

  return data as TenantConfig | null
})

/**
 * Check if a specific feature is enabled for current organization
 * Returns false if config not found (fail-safe)
 */
export async function isFeatureEnabled(feature: FeatureFlag): Promise<boolean> {
  const config = await getTenantConfig()

  if (!config) {
    // If no config, default all features to enabled except fireflies and ai_integration
    return feature !== 'fireflies' && feature !== 'ai_integration'
  }

  // Map feature name to config column
  const featureMap: Record<FeatureFlag, keyof TenantConfig> = {
    company_updates: 'feature_company_updates',
    interactions: 'feature_interactions',
    fireflies: 'feature_fireflies',
    advisor_profiles: 'feature_advisor_profiles',
    commitment_tracking: 'feature_commitment_tracking',
    ai_integration: 'feature_ai_integration'
  }

  const configKey = featureMap[feature]
  return config[configKey] as boolean
}

/**
 * Get Fireflies sync configuration for current tenant
 *
 * @returns {Promise<FirefliesSyncConfig>} Sync configuration
 */
export async function getFirefliesSyncConfig(): Promise<FirefliesSyncConfig> {
  await requireAuth()
  const tenantId = await getCurrentTenantId()

  // Use admin client to bypass RLS
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const { data: config, error } = await adminClient
    .from('tenant_config')
    .select(`
      fireflies_sync_start_date,
      fireflies_last_sync_at,
      fireflies_connection_status
    `)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !config) {
    // Return defaults
    return {
      syncStartDate: null,
      lastSyncAt: null,
      connectionStatus: null
    }
  }

  return {
    syncStartDate: config.fireflies_sync_start_date,
    lastSyncAt: config.fireflies_last_sync_at,
    connectionStatus: config.fireflies_connection_status as 'connected' | 'not_connected' | null
  }
}

/**
 * Get OpenAI connection status for current tenant
 *
 * Uses service role to bypass RLS (same pattern as getFirefliesConnection).
 *
 * @returns {Promise<OpenAIConnection>} Connection status and metadata
 */
export async function getOpenAIConnection(): Promise<OpenAIConnection> {
  await requireAuth()
  const tenantId = await getCurrentTenantId()

  // Use admin client to bypass RLS
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Query tenant_config for OpenAI connection info
  const { data: config, error: configError } = await adminClient
    .from('tenant_config')
    .select(`
      feature_ai_integration,
      openai_connection_status,
      openai_connected_at,
      openai_connected_by,
      users:openai_connected_by (
        first_name,
        last_name
      )
    `)
    .eq('tenant_id', tenantId)
    .single()

  if (configError || !config) {
    // No config found, return defaults
    return {
      isConnected: false,
      status: 'not_connected',
      isEnabled: false,
    }
  }

  const status = (config.openai_connection_status as 'not_connected' | 'connected' | 'failed') || 'not_connected'
  const isConnected = status === 'connected'

  return {
    isConnected,
    status,
    connectedBy: config.users
      ? {
          firstName: (config.users as any).first_name || '',
          lastName: (config.users as any).last_name || '',
        }
      : undefined,
    connectedAt: config.openai_connected_at || undefined,
    isEnabled: config.feature_ai_integration || false,
  }
}

/**
 * Get OpenAI API key from Vault for current tenant
 *
 * Retrieves the encrypted API key using the secret_id stored in tenant_config.
 * Uses service role to access Vault (same pattern as Fireflies integration).
 *
 * @returns {Promise<string | null>} Decrypted API key or null if not configured
 */
export async function getOpenAIKeyFromVault(): Promise<string | null> {
  await requireAuth()
  const tenantId = await getCurrentTenantId()

  // Use admin client to bypass RLS
  const { createClient } = await import('@supabase/supabase-js')
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  // Get secret_id from tenant_config
  const { data: config, error: configError } = await adminClient
    .from('tenant_config')
    .select('openai_api_key_secret_id')
    .eq('tenant_id', tenantId)
    .single()

  if (configError || !config?.openai_api_key_secret_id) {
    return null
  }

  // Retrieve key from vault
  const { data: apiKey, error: vaultError } = await adminClient.rpc('vault_read_secret', {
    secret_id: config.openai_api_key_secret_id
  })

  if (vaultError || !apiKey) {
    console.error('Failed to retrieve OpenAI key from vault:', vaultError)
    return null
  }

  return apiKey as string
}

/**
 * Check if specific AI feature is enabled
 *
 * Requires both:
 * 1. Master switch (feature_ai_integration) ON
 * 2. Sub-feature flag in ai_features ON
 * 3. Business Rule: commitment_analysis requires feature_commitment_tracking to be ON
 *
 * Issue #69: Granular AI Feature Controls
 * Issue #70: Commitment Tracking dependency
 *
 * @param feature - Specific AI feature to check
 * @returns True if all requirements met
 */
export async function isAIFeatureEnabled(feature: AIFeature): Promise<boolean> {
  const config = await getTenantConfig()

  // Master switch must be ON
  if (!config?.feature_ai_integration) {
    return false
  }

  // Business Rule: commitment_analysis requires commitment_tracking to be enabled
  if (feature === 'commitment_analysis' && !config?.feature_commitment_tracking) {
    return false
  }

  // Check sub-feature in JSONB
  const aiFeatures = (config.ai_features as Record<string, boolean>) || {}
  return aiFeatures[feature] === true
}

/**
 * Get all AI feature states for current tenant
 *
 * @returns Object with all AI feature flags
 */
export async function getAIFeatures(): Promise<AIFeaturesConfig> {
  const config = await getTenantConfig()

  const aiFeatures = (config?.ai_features as Record<string, boolean>) || {}

  return {
    commitment_analysis: aiFeatures.commitment_analysis || false,
    report_generation: aiFeatures.report_generation || false,
    meeting_insights: aiFeatures.meeting_insights || false,
    company_recommendations: aiFeatures.company_recommendations || false
  }
}

/**
 * Get milestone tracking settings for current tenant
 *
 * @returns {Promise<{ enabled: boolean, enabledTracks: string[] }>} Milestone tracking settings
 */
export async function getMilestoneTrackingSettings(): Promise<{
  enabled: boolean
  enabledTracks: string[]
}> {
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const { data: config } = await supabase
    .from('tenant_config')
    .select('milestone_tracking_enabled, enabled_milestone_tracks')
    .eq('tenant_id', tenantId)
    .single()

  return {
    enabled: config?.milestone_tracking_enabled || false,
    enabledTracks: config?.enabled_milestone_tracks || []
  }
}

/**
 * Enable milestone tracking for tenant
 *
 * @param {string[]} trackSlugs - Array of track slugs to enable (optional, defaults to all)
 * @returns {Promise<void>}
 */
export async function enableMilestoneTracking(trackSlugs?: string[]): Promise<void> {
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const enabledTracks = trackSlugs || ['software', 'hardware', 'biotech-pharma', 'medical-device']

  const { error } = await supabase
    .from('tenant_config')
    .update({
      milestone_tracking_enabled: true,
      enabled_milestone_tracks: enabledTracks
    })
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to enable milestone tracking: ${error.message}`)
  }
}

/**
 * Disable milestone tracking for tenant
 *
 * Note: This does not delete existing milestone data, only hides the feature.
 *
 * @returns {Promise<void>}
 */
export async function disableMilestoneTracking(): Promise<void> {
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const { error } = await supabase
    .from('tenant_config')
    .update({
      milestone_tracking_enabled: false
    })
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to disable milestone tracking: ${error.message}`)
  }
}

/**
 * Update enabled milestone tracks
 *
 * @param {string[]} trackSlugs - Array of track slugs to enable
 * @returns {Promise<void>}
 */
export async function updateEnabledMilestoneTracks(trackSlugs: string[]): Promise<void> {
  const { supabase } = await requireAuth()
  const tenantId = await getCurrentTenantId()

  const { error } = await supabase
    .from('tenant_config')
    .update({
      enabled_milestone_tracks: trackSlugs
    })
    .eq('tenant_id', tenantId)

  if (error) {
    throw new Error(`Failed to update enabled milestone tracks: ${error.message}`)
  }
}
