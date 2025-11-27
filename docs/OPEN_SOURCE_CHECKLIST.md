# Open Source Release Checklist

This document tracks the preparation steps for making impactOS public.

## Completed Steps

- [x] **LICENSE** - Apache 2.0 license added
- [x] **README.md** - Comprehensive project overview
- [x] **CONTRIBUTING.md** - Contributor guidelines
- [x] **CODE_OF_CONDUCT.md** - Contributor Covenant v2.1
- [x] **SECURITY.md** - Security policy and reporting
- [x] **Issue Templates** - Bug report and feature request templates
- [x] **.gitignore** - Updated for comprehensive coverage
- [x] **Hardcoded IDs** - Removed Supabase project IDs from scripts

## Critical: Git History Cleanup Required

**Before making this repository public, you MUST clean the git history.**

The `.env.local` file was previously committed and contains actual credentials:
- Supabase project URL
- Supabase anon key (JWT)
- Supabase service role key

Even though the file was later deleted, the credentials remain in git history.

### Option 1: BFG Repo-Cleaner (Recommended)

```bash
# Install BFG (macOS)
brew install bfg

# Clone a fresh copy
git clone --mirror git@github.com:your-org/impactos.git

# Remove sensitive files from history
bfg --delete-files .env.local impactos.git
bfg --delete-files .mcp.json impactos.git

# Clean up
cd impactos.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Push cleaned history
git push
```

### Option 2: git filter-repo

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove sensitive files
git filter-repo --path .env.local --invert-paths
git filter-repo --path .mcp.json --invert-paths
```

### Option 3: Create Fresh Repository

If the history isn't important, the simplest approach:

1. Create a new repository
2. Copy all files (excluding `.git`)
3. Make a fresh initial commit
4. Push to the new repository

### After Cleanup

**Immediately rotate ALL credentials:**

1. **Supabase**:
   - Go to Project Settings > API
   - Regenerate anon key
   - Regenerate service role key
   - Update all deployments with new keys

2. **Any other API keys** that may have been in `.env.local`:
   - Fireflies API key
   - OpenAI API key
   - Any other secrets

## Pre-Public Checklist

Before making public:

- [ ] Git history cleaned (no secrets)
- [ ] All credentials rotated
- [ ] No hardcoded project IDs
- [ ] `.env.local.example` has placeholder values only
- [ ] All team members notified
- [ ] GitHub repository settings reviewed:
  - [ ] Branch protection rules configured
  - [ ] Vulnerability alerts enabled
  - [ ] Dependabot enabled
  - [ ] Issue/PR templates working

## Files to Review

These files may contain internal references that should be updated:

- `app/CLAUDE.md` - Internal development guide
- `docs/architecture/*.md` - May reference internal systems
- `.claude/` directory - Claude Code skills (decide if keeping)

## Contact Information

Before going public, update placeholder text in:

- `CODE_OF_CONDUCT.md` - Replace `[INSERT CONTACT EMAIL]`
- `SECURITY.md` - Replace `[INSERT SECURITY EMAIL]`
- `.github/ISSUE_TEMPLATE/config.yml` - Replace `your-org` with actual org

## Post-Public Steps

After making public:

1. Create initial release/tag
2. Announce to community
3. Monitor for security issues
4. Set up GitHub Discussions
5. Configure branch protection
6. Enable GitHub Actions for CI/CD
