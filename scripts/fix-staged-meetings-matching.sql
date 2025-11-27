-- Script: Fix Fireflies Staged Meetings Contact Matching
-- Purpose: Re-process match_type and matched_emails for existing staged meetings
-- Date: 2025-11-22
--
-- ISSUE: All staged meetings show match_type='no_match' because the code was querying
-- contacts.email (NULL) instead of contact_emails.email (actual data)
--
-- This script will:
-- 1. Re-match participants to contact_emails
-- 2. Update match_type and matched_emails for all staged meetings
--
-- Current State: 274 staged meetings with incorrect match_type
-- Expected Result: Meetings with known contacts will show match_type='known_contact'

-- Step 1: Preview what will be updated (DRY RUN)
WITH staged_with_matches AS (
  SELECT
    fsm.id,
    fsm.fireflies_transcript_id,
    fsm.title,
    fsm.participants,
    fsm.match_type as current_match_type,
    fsm.matched_emails as current_matched_emails,
    -- Extract participant emails
    COALESCE(
      (SELECT jsonb_agg(DISTINCT ce.email)
       FROM jsonb_array_elements_text(fsm.participants) p(email)
       JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(p.email))
       JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = fsm.tenant_id
      ),
      '[]'::jsonb
    ) as new_matched_emails,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(fsm.participants) p(email)
        JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(p.email))
        JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = fsm.tenant_id
      ) THEN 'known_contact'
      ELSE 'no_match'
    END as new_match_type
  FROM fireflies_staged_meetings fsm
  WHERE fsm.import_status = 'pending'
    OR fsm.import_status IS NULL
)
SELECT
  title,
  current_match_type,
  new_match_type,
  jsonb_array_length(COALESCE(current_matched_emails, '[]'::jsonb)) as current_matches_count,
  jsonb_array_length(new_matched_emails) as new_matches_count,
  CASE
    WHEN current_match_type != new_match_type THEN 'WILL UPDATE'
    ELSE 'NO CHANGE'
  END as action
FROM staged_with_matches
ORDER BY new_matches_count DESC, title
LIMIT 20;

-- Step 2: Summary statistics
WITH staged_with_matches AS (
  SELECT
    fsm.id,
    fsm.match_type as current_match_type,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(fsm.participants) p(email)
        JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(p.email))
        JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = fsm.tenant_id
      ) THEN 'known_contact'
      ELSE 'no_match'
    END as new_match_type
  FROM fireflies_staged_meetings fsm
  WHERE fsm.import_status = 'pending'
    OR fsm.import_status IS NULL
)
SELECT
  COUNT(*) as total_staged_meetings,
  COUNT(CASE WHEN current_match_type = 'no_match' THEN 1 END) as currently_no_match,
  COUNT(CASE WHEN new_match_type = 'known_contact' THEN 1 END) as should_be_known_contact,
  COUNT(CASE WHEN current_match_type != new_match_type THEN 1 END) as will_update
FROM staged_with_matches;

-- Step 3: EXECUTE - Update all staged meetings with correct match data
-- UNCOMMENT TO EXECUTE
/*
UPDATE fireflies_staged_meetings fsm
SET
  match_type = new_data.new_match_type,
  matched_emails = new_data.new_matched_emails,
  updated_at = now()
FROM (
  SELECT
    fsm.id,
    COALESCE(
      (SELECT jsonb_agg(DISTINCT ce.email)
       FROM jsonb_array_elements_text(fsm.participants) p(email)
       JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(p.email))
       JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = fsm.tenant_id
      ),
      '[]'::jsonb
    ) as new_matched_emails,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(fsm.participants) p(email)
        JOIN contact_emails ce ON LOWER(TRIM(ce.email)) = LOWER(TRIM(p.email))
        JOIN contacts c ON ce.contact_id = c.id AND c.tenant_id = fsm.tenant_id
      ) THEN 'known_contact'
      ELSE 'no_match'
    END as new_match_type
  FROM fireflies_staged_meetings fsm
  WHERE (fsm.import_status = 'pending' OR fsm.import_status IS NULL)
) new_data
WHERE fsm.id = new_data.id;
*/

-- Step 4: Verification (run AFTER executing update)
/*
SELECT
  match_type,
  COUNT(*) as count,
  COUNT(CASE WHEN jsonb_array_length(matched_emails) > 0 THEN 1 END) as with_matched_emails
FROM firefiles_staged_meetings
WHERE import_status = 'pending' OR import_status IS NULL
GROUP BY match_type;
*/
