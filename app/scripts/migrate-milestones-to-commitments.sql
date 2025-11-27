/**
 * Migration: Milestone Tracking → Commitment Tracking
 *
 * Renames all database tables, columns, and constraints to align with
 * "Commitment Tracking" terminology.
 *
 * CRITICAL: Run this migration during low-traffic window with full backup.
 *
 * Issue: #70
 */

BEGIN;

-- Step 1: Rename tables
ALTER TABLE milestone_tracks RENAME TO commitment_tracks;
ALTER TABLE milestone_definitions RENAME TO commitment_definitions;
ALTER TABLE company_milestones RENAME TO company_commitments_progress;

-- Step 2: Rename columns
ALTER TABLE companies RENAME COLUMN milestone_track_id TO commitment_track_id;
ALTER TABLE company_commitments_progress RENAME COLUMN milestone_id TO commitment_id;
ALTER TABLE tenant_config RENAME COLUMN feature_milestones TO feature_commitment_tracking;

-- Step 3: Update foreign key constraint names
ALTER TABLE companies
  RENAME CONSTRAINT companies_milestone_track_id_fkey
  TO companies_commitment_track_id_fkey;

ALTER TABLE commitment_tracks
  RENAME CONSTRAINT milestone_tracks_tenant_id_fkey
  TO commitment_tracks_tenant_id_fkey;

ALTER TABLE commitment_definitions
  RENAME CONSTRAINT milestone_definitions_track_id_fkey
  TO commitment_definitions_track_id_fkey;

ALTER TABLE company_commitments_progress
  RENAME CONSTRAINT company_milestones_company_id_fkey
  TO company_commitments_progress_company_id_fkey;

ALTER TABLE company_commitments_progress
  RENAME CONSTRAINT company_milestones_milestone_id_fkey
  TO company_commitments_progress_commitment_id_fkey;

ALTER TABLE company_commitments_progress
  RENAME CONSTRAINT company_milestones_tenant_id_fkey
  TO company_commitments_progress_tenant_id_fkey;

ALTER TABLE company_commitments_progress
  RENAME CONSTRAINT company_milestones_verified_by_user_id_fkey
  TO company_commitments_progress_verified_by_user_id_fkey;

-- Step 4: Update RLS policy names (if they exist with milestone references)
-- Check existing policies first
DO $$
BEGIN
    -- Rename RLS policies for commitment_tracks
    IF EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'commitment_tracks'
        AND policyname LIKE '%milestone%'
    ) THEN
        -- Note: Policy names may vary, adjust as needed
        -- This is a template - actual policy names should be verified
        ALTER POLICY "milestone_tracks_tenant_isolation" ON commitment_tracks
            RENAME TO "commitment_tracks_tenant_isolation";
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Policy doesn't exist, skip
        NULL;
END $$;

COMMIT;

-- Verification queries (run after migration)
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%commitment%';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'tenant_config' AND column_name LIKE '%commitment%';
-- SELECT conname FROM pg_constraint WHERE conname LIKE '%commitment%';
