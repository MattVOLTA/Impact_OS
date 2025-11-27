-- Script: Link Transcript Participants to Contacts
-- Purpose: Create missing interaction_contacts associations based on meeting_transcripts participants
-- Date: 2025-11-22
--
-- IMPORTANT: This script identifies contacts who participated in meetings (based on email matching)
-- and creates the interaction_contacts junction table entries that are currently missing.
--
-- Current State:
-- - 393 participant instances matched to existing contacts
-- - Only 2 have interaction_contact associations
-- - 391 MISSING associations need to be created
--
-- This script will:
-- 1. Extract participant emails from meeting_transcripts.participants (JSONB array)
-- 2. Match emails to contacts via contact_emails table
-- 3. Create interaction_contacts records with auto_matched=true and match_confidence='high'

-- Step 1: Preview what will be created (DRY RUN)
WITH transcript_emails AS (
  SELECT
    mt.interaction_id,
    mt.tenant_id,
    jsonb_array_elements_text(mt.participants) as participant_email
  FROM meeting_transcripts mt
  WHERE mt.tenant_id = '11111111-1111-1111-1111-111111111111' -- Volta tenant
),
unique_participants AS (
  SELECT DISTINCT
    interaction_id,
    tenant_id,
    LOWER(TRIM(participant_email)) as email
  FROM transcript_emails
  WHERE TRIM(participant_email) != ''
    AND TRIM(participant_email) !~ '^[\s,]+$' -- Exclude empty/whitespace-only entries
    AND participant_email NOT LIKE '%,%' -- Exclude comma-separated lists
),
matched_contacts AS (
  SELECT
    up.interaction_id,
    up.tenant_id,
    up.email,
    c.id as contact_id,
    c.first_name,
    c.last_name,
    ce.email as contact_email,
    CASE WHEN ic.contact_id IS NOT NULL THEN true ELSE false END as already_linked
  FROM unique_participants up
  LEFT JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(up.email))
  LEFT JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = up.tenant_id
  LEFT JOIN interaction_contacts ic ON ic.interaction_id = up.interaction_id AND ic.contact_id = c.id
  WHERE c.id IS NOT NULL -- Only include matches with existing contacts
)
SELECT
  interaction_id,
  contact_id,
  email,
  first_name,
  last_name,
  already_linked,
  CASE
    WHEN already_linked THEN 'SKIP - Already linked'
    ELSE 'CREATE - Will link'
  END as action
FROM matched_contacts
ORDER BY already_linked, email, interaction_id;

-- Step 2: Get summary statistics
WITH transcript_emails AS (
  SELECT
    mt.interaction_id,
    mt.tenant_id,
    jsonb_array_elements_text(mt.participants) as participant_email
  FROM meeting_transcripts mt
  WHERE mt.tenant_id = '11111111-1111-1111-1111-111111111111'
),
unique_participants AS (
  SELECT DISTINCT
    interaction_id,
    tenant_id,
    LOWER(TRIM(participant_email)) as email
  FROM transcript_emails
  WHERE TRIM(participant_email) != ''
    AND TRIM(participant_email) !~ '^[\s,]+$'
    AND participant_email NOT LIKE '%,%'
),
matched_contacts AS (
  SELECT
    up.interaction_id,
    up.email,
    c.id as contact_id,
    CASE WHEN ic.contact_id IS NOT NULL THEN true ELSE false END as already_linked
  FROM unique_participants up
  LEFT JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(up.email))
  LEFT JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = up.tenant_id
  LEFT JOIN interaction_contacts ic ON ic.interaction_id = up.interaction_id AND ic.contact_id = c.id
  WHERE c.id IS NOT NULL
)
SELECT
  COUNT(*) as total_matches,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(DISTINCT contact_id) as unique_contacts,
  COUNT(DISTINCT interaction_id) as unique_interactions,
  COUNT(CASE WHEN already_linked THEN 1 END) as already_linked,
  COUNT(CASE WHEN NOT already_linked THEN 1 END) as will_create
FROM matched_contacts;

-- Step 3: EXECUTE - Create the missing associations
-- UNCOMMENT THE SECTION BELOW TO EXECUTE THE INSERT
/*
INSERT INTO interaction_contacts (interaction_id, contact_id, auto_matched, match_confidence, created_at)
WITH transcript_emails AS (
  SELECT
    mt.interaction_id,
    mt.tenant_id,
    jsonb_array_elements_text(mt.participants) as participant_email
  FROM meeting_transcripts mt
  WHERE mt.tenant_id = '11111111-1111-1111-1111-111111111111'
),
unique_participants AS (
  SELECT DISTINCT
    interaction_id,
    tenant_id,
    LOWER(TRIM(participant_email)) as email
  FROM transcript_emails
  WHERE TRIM(participant_email) != ''
    AND TRIM(participant_email) !~ '^[\s,]+$'
    AND participant_email NOT LIKE '%,%'
),
matched_contacts AS (
  SELECT
    up.interaction_id,
    c.id as contact_id
  FROM unique_participants up
  INNER JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(up.email))
  INNER JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = up.tenant_id
  LEFT JOIN interaction_contacts ic ON ic.interaction_id = up.interaction_id AND ic.contact_id = c.id
  WHERE ic.contact_id IS NULL -- Only create if association doesn't exist
)
SELECT DISTINCT
  interaction_id,
  contact_id,
  true as auto_matched,
  'high' as match_confidence,
  now() as created_at
FROM matched_contacts
ON CONFLICT (interaction_id, contact_id) DO NOTHING;
*/

-- Step 4: Verification query (run AFTER executing insert)
/*
SELECT
  COUNT(*) as total_associations,
  COUNT(CASE WHEN auto_matched THEN 1 END) as auto_matched_count,
  COUNT(DISTINCT contact_id) as unique_contacts,
  COUNT(DISTINCT interaction_id) as unique_interactions
FROM interaction_contacts;
*/
