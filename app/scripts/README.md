# Migration Scripts

This directory contains one-time migration scripts for importing data from the Single Tenant instance to the Multi Tenant platform.

## Available Scripts

### Import Meetings from Single Tenant

**Script:** `import-meetings-from-single-tenant.ts`

Imports meeting transcripts from Single Tenant Supabase to Multi Tenant Supabase.

**What it does:**

1. Fetches all Volta contact emails from Multi Tenant `contact_emails` table
2. Finds Single Tenant meetings where speakers have those emails (excludes @voltaeffect.com emails)
3. For each meeting:
   - Creates an `interaction` record with title, date, summary, and Fireflies ID
   - Creates a `meeting_transcripts` record with full transcript, outline, summaries, speakers, participants
   - Links contacts via `interaction_contacts` (auto-matches based on email)
   - Links companies via `interaction_companies` (if company exists)
   - Creates missing external contacts with emails in `contact_emails` table
4. Works in batches of 50 meetings

**Prerequisites:**

1. Add Single Tenant credentials to `.env.local`:
   ```bash
   SINGLE_TENANT_SUPABASE_URL=https://your-single-tenant-project.supabase.co
   SINGLE_TENANT_SERVICE_ROLE_KEY=your-single-tenant-service-role-key
   ```

2. Ensure Volta tenant exists in Multi Tenant:
   - Tenant ID: `11111111-1111-1111-1111-111111111111`
   - Tenant slug: `acme` (or `volta` if renamed)

3. Ensure Volta contacts and companies exist in Multi Tenant

**Run:**

```bash
npm run import:meetings
```

**Output:**

The script will print:
- Progress for each meeting (✓ success, ⏭️ skipped, ❌ error)
- Summary statistics:
  - Total meetings found
  - Interactions imported
  - Transcripts imported
  - New contacts created
  - Contacts linked
  - Companies linked
  - Errors encountered

**Notes:**

- The script is **idempotent** - it checks if a meeting is already imported (by `fireflies_transcript_id`) and skips it
- Meetings are filtered to only include those with non-Volta speakers (excludes @voltaeffect.com)
- External contacts are created automatically if they don't exist in Multi Tenant
- All created contacts get their emails in the `contact_emails` table (NOT in `contacts.email`)
- Default role for new contacts is `founder`
- Company linking requires the company to already exist in Multi Tenant (matched by company_id)

**Troubleshooting:**

If the script fails:

1. Check environment variables are set correctly
2. Verify both Supabase instances are accessible
3. Check Volta tenant exists in Multi Tenant
4. Review error messages in the output
5. Re-run the script (it will skip already imported meetings)

## Development

To create a new migration script:

1. Create a new TypeScript file in this directory
2. Import Supabase clients for both Single and Multi Tenant
3. Add a script entry to `package.json`:
   ```json
   "scripts": {
     "migrate:your-script": "tsx scripts/your-script.ts"
   }
   ```
4. Document the script in this README
