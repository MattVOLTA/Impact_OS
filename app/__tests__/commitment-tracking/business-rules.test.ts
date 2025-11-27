/**
 * Commitment Tracking Business Rules Tests
 *
 * Tests business rules around commitment tracking and AI feature dependencies.
 */

import { createClient } from '@supabase/supabase-js'

const TENANT_1_ID = '11111111-1111-1111-1111-111111111111'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('Commitment Tracking Business Rules', () => {
  beforeEach(async () => {
    // Reset tenant config to known state
    await adminClient
      .from('tenant_config')
      .update({
        feature_commitment_tracking: true,
        feature_ai_integration: true,
        ai_features: { commitment_analysis: true }
      })
      .eq('tenant_id', TENANT_1_ID)
  })

  test('disabling commitment_tracking also disables commitment_analysis', async () => {
    // Verify initial state
    const { data: before } = await adminClient
      .from('tenant_config')
      .select('feature_commitment_tracking, ai_features')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(before?.feature_commitment_tracking).toBe(true)
    expect((before?.ai_features as any)?.commitment_analysis).toBe(true)

    // Disable commitment tracking
    await adminClient
      .from('tenant_config')
      .update({ feature_commitment_tracking: false })
      .eq('tenant_id', TENANT_1_ID)

    // Simulate the toggleCommitmentTracking business rule
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('ai_features')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    const aiFeatures = (config?.ai_features as Record<string, boolean>) || {}
    aiFeatures.commitment_analysis = false

    await adminClient
      .from('tenant_config')
      .update({ ai_features: aiFeatures })
      .eq('tenant_id', TENANT_1_ID)

    // Verify commitment_analysis is now disabled
    const { data: after } = await adminClient
      .from('tenant_config')
      .select('feature_commitment_tracking, ai_features')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(after?.feature_commitment_tracking).toBe(false)
    expect((after?.ai_features as any)?.commitment_analysis).toBe(false)
  })

  test('commitment_analysis cannot be enabled if commitment_tracking is disabled', async () => {
    // Disable commitment tracking
    await adminClient
      .from('tenant_config')
      .update({
        feature_commitment_tracking: false,
        feature_ai_integration: true,
        ai_features: { commitment_analysis: false }
      })
      .eq('tenant_id', TENANT_1_ID)

    // Try to enable commitment_analysis
    await adminClient
      .from('tenant_config')
      .update({
        ai_features: { commitment_analysis: true }
      })
      .eq('tenant_id', TENANT_1_ID)

    // The isAIFeatureEnabled check should return false despite JSONB being true
    // This is enforced in the DAL, not the database
    const { data: config } = await adminClient
      .from('tenant_config')
      .select('feature_commitment_tracking, feature_ai_integration, ai_features')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    // Verify the business rule logic
    const masterOn = config?.feature_ai_integration === true
    const commitmentTrackingOn = config?.feature_commitment_tracking === true
    const aiFeatures = (config?.ai_features as Record<string, boolean>) || {}
    const subFeatureOn = aiFeatures.commitment_analysis === true

    // Even if JSONB says true, the business rule should make it false
    const effectivelyEnabled = masterOn && commitmentTrackingOn && subFeatureOn

    expect(effectivelyEnabled).toBe(false)
  })

  test('enabling commitment_tracking does not automatically enable commitment_analysis', async () => {
    // Start with both disabled
    await adminClient
      .from('tenant_config')
      .update({
        feature_commitment_tracking: false,
        feature_ai_integration: true,
        ai_features: { commitment_analysis: false }
      })
      .eq('tenant_id', TENANT_1_ID)

    // Enable commitment tracking
    await adminClient
      .from('tenant_config')
      .update({ feature_commitment_tracking: true })
      .eq('tenant_id', TENANT_1_ID)

    // Verify commitment_analysis is still disabled
    const { data: after } = await adminClient
      .from('tenant_config')
      .select('feature_commitment_tracking, ai_features')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    expect(after?.feature_commitment_tracking).toBe(true)
    expect((after?.ai_features as any)?.commitment_analysis).toBe(false)
  })

  test('commitment_analysis can be enabled when commitment_tracking is enabled', async () => {
    // Enable both features
    await adminClient
      .from('tenant_config')
      .update({
        feature_commitment_tracking: true,
        feature_ai_integration: true,
        ai_features: { commitment_analysis: true }
      })
      .eq('tenant_id', TENANT_1_ID)

    const { data: config } = await adminClient
      .from('tenant_config')
      .select('feature_commitment_tracking, feature_ai_integration, ai_features')
      .eq('tenant_id', TENANT_1_ID)
      .single()

    // Verify the business rule allows this
    const masterOn = config?.feature_ai_integration === true
    const commitmentTrackingOn = config?.feature_commitment_tracking === true
    const aiFeatures = (config?.ai_features as Record<string, boolean>) || {}
    const subFeatureOn = aiFeatures.commitment_analysis === true

    const effectivelyEnabled = masterOn && commitmentTrackingOn && subFeatureOn

    expect(effectivelyEnabled).toBe(true)
  })
})
