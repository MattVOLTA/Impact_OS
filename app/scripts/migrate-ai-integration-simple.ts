/**
 * Simple Migration Script: AI Integration Columns
 *
 * Adds OpenAI API key storage columns to tenant_config table
 * Issue #66: AI Integration - Secure OpenAI API Key Storage
 *
 * Uses direct Supabase REST API for DDL operations
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
})

async function runMigration() {
  console.log('🚀 Starting AI Integration migration...\n')

  try {
    // Use raw SQL through PostgREST query
    console.log('📝 Checking current tenant_config schema...')

    // First, check if columns already exist
    const { data: existingData, error: checkError } = await adminClient
      .from('tenant_config')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Failed to query tenant_config:', checkError)
      process.exit(1)
    }

    const existingColumns = existingData ? Object.keys(existingData) : []
    console.log(`✅ Found ${existingColumns.length} existing columns`)

    const newColumns = [
      'openai_api_key_secret_id',
      'openai_connected_by',
      'openai_connected_at',
      'openai_connection_status',
      'feature_ai_integration'
    ]

    const missingColumns = newColumns.filter(col => !existingColumns.includes(col))

    if (missingColumns.length === 0) {
      console.log('\n✨ All columns already exist! Migration not needed.')
      process.exit(0)
    }

    console.log(`\n⚠️  Missing columns: ${missingColumns.join(', ')}`)
    console.log('\n📝 Please run the following SQL manually in Supabase SQL Editor:\n')

    const sql = `
-- AI Integration Migration
-- Issue #66: AI Integration - Secure OpenAI API Key Storage

ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS openai_api_key_secret_id UUID,
  ADD COLUMN IF NOT EXISTS openai_connected_by UUID,
  ADD COLUMN IF NOT EXISTS openai_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS openai_connection_status VARCHAR(20) DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS feature_ai_integration BOOLEAN DEFAULT false;

-- Add check constraint
ALTER TABLE tenant_config DROP CONSTRAINT IF EXISTS openai_connection_status_check;
ALTER TABLE tenant_config ADD CONSTRAINT openai_connection_status_check
  CHECK (openai_connection_status IN ('not_connected', 'connected', 'connection_failed'));

-- Add foreign key constraints (commented out - add manually if vault.secrets accessible)
-- ALTER TABLE tenant_config
--   ADD CONSTRAINT tenant_config_openai_api_key_secret_id_fkey
--   FOREIGN KEY (openai_api_key_secret_id) REFERENCES vault.secrets(id) ON DELETE SET NULL;

ALTER TABLE tenant_config
  ADD CONSTRAINT IF NOT EXISTS tenant_config_openai_connected_by_fkey
  FOREIGN KEY (openai_connected_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN tenant_config.openai_api_key_secret_id IS 'Reference to encrypted OpenAI API key in Supabase Vault';
COMMENT ON COLUMN tenant_config.openai_connected_by IS 'User who connected the OpenAI integration';
COMMENT ON COLUMN tenant_config.openai_connected_at IS 'Timestamp when OpenAI was connected';
COMMENT ON COLUMN tenant_config.openai_connection_status IS 'Connection status: not_connected, connected, or connection_failed';
COMMENT ON COLUMN tenant_config.feature_ai_integration IS 'Feature flag to enable/disable AI integration features';
`

    console.log(sql)
    console.log('\n📍 Instructions:')
    console.log('1. Go to your Supabase project SQL Editor')
    console.log('2. Paste the SQL above')
    console.log('3. Click "Run"')
    console.log('4. Re-run this script to verify')

  } catch (error) {
    console.error('\n❌ Migration check failed:', error)
    process.exit(1)
  }
}

runMigration()
