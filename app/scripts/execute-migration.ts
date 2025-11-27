/**
 * Execute AI Integration Migration
 *
 * Applies migration using direct Supabase client with individual ALTER statements
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function executeMigration() {
  console.log('🚀 Executing AI Integration migration...\n')

  try {
    // Test if columns already exist by trying to select them
    console.log('📝 Checking if migration already applied...')

    const { data: testData, error: testError } = await adminClient
      .from('tenant_config')
      .select('openai_api_key_secret_id, openai_connected_by, openai_connected_at, openai_connection_status, feature_ai_integration')
      .limit(1)
      .maybeSingle()

    if (!testError && testData !== null) {
      console.log('✅ Migration already applied! Columns exist.')
      console.log('\nFound columns:', Object.keys(testData))
      console.log('\n✨ Ready to run tests!')
      return
    }

    console.log('⚠️  Columns not found. Migration needed.\n')
    console.log('📝 Please run the following SQL in Supabase SQL Editor:')
    console.log('https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new\n')
    console.log('---SQL START---\n')

    const sql = `
-- AI Integration Migration
-- Issue #66: Secure OpenAI API Key Storage

-- Add columns
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_api_key_secret_id UUID;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_connected_by UUID;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_connected_at TIMESTAMPTZ;
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS openai_connection_status VARCHAR(20) DEFAULT 'not_connected';
ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS feature_ai_integration BOOLEAN DEFAULT false;

-- Add check constraint
DO $$
BEGIN
  ALTER TABLE tenant_config DROP CONSTRAINT IF EXISTS openai_connection_status_check;
  ALTER TABLE tenant_config ADD CONSTRAINT openai_connection_status_check
    CHECK (openai_connection_status IN ('not_connected', 'connected', 'connection_failed'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tenant_config_openai_connected_by_fkey'
  ) THEN
    ALTER TABLE tenant_config
      ADD CONSTRAINT tenant_config_openai_connected_by_fkey
      FOREIGN KEY (openai_connected_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN tenant_config.openai_api_key_secret_id IS 'Reference to encrypted OpenAI API key in Supabase Vault';
COMMENT ON COLUMN tenant_config.openai_connected_by IS 'User who connected the OpenAI integration';
COMMENT ON COLUMN tenant_config.openai_connected_at IS 'Timestamp when OpenAI was connected';
COMMENT ON COLUMN tenant_config.openai_connection_status IS 'Connection status: not_connected, connected, or connection_failed';
COMMENT ON COLUMN tenant_config.feature_ai_integration IS 'Feature flag to enable/disable AI integration features';
`

    console.log(sql)
    console.log('\n---SQL END---\n')
    console.log('After running the SQL, re-run this script to verify.')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

executeMigration()
