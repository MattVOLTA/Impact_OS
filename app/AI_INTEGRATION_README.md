# AI Integration Feature - Implementation Guide

**Issue**: #66
**Status**: Tests Written (RED Phase Complete), Ready for Database Migration
**Follows**: Test-Driven Development (TDD)

---

## Quick Start

### 1. Apply Database Migration

Open Supabase SQL Editor and run:
```bash
# URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new
```

Copy/paste SQL from: `scripts/apply-migration.ts` output

Or run:
```bash
npx tsx scripts/apply-migration.ts
```

### 2. Verify Migration
```bash
npx tsx scripts/migrate-ai-integration-simple.ts
```

Expected output: "✨ All columns already exist! Migration not needed."

### 3. Run Tests (Verify RED Phase)
```bash
# Should see 7/7 vault tests passing, DAL/actions tests failing
npm test __tests__/settings/ai-integration
```

### 4. Implement Code (GREEN Phase)

Follow implementation order:
1. Update `lib/dal/settings.ts` (add types and functions)
2. Update `app/(dashboard)/settings/actions.ts` (add server actions)
3. Create UI components in `app/(dashboard)/settings/components/`
4. Update `app/(dashboard)/settings/page.tsx`

### 5. Verify Tests Pass (GREEN Phase Complete)
```bash
npm test __tests__/settings/ai-integration
```

Expected: All tests passing ✅

---

## File Structure

### Created Files

**Tests** (TDD - Written First):
```
__tests__/settings/
├── ai-integration-vault.test.ts          # 7 tests - Vault operations
├── ai-integration-dal.test.ts            # 5 tests - DAL functions
└── ai-integration-server-actions.test.ts # 10+ tests - Server actions
```

**Migration Scripts**:
```
scripts/
├── migrate-ai-integration-simple.ts  # Check migration status
└── apply-migration.ts                # Generate SQL
```

**Documentation**:
```
AI_INTEGRATION_README.md  # This file
```

### Files to Create (Implementation)

**Components**:
```
app/(dashboard)/settings/components/
├── ai-integration-section.tsx      # Main section (Server Component)
├── ai-integration-controls.tsx     # Admin/non-admin wrapper (Client)
├── connect-openai-button.tsx       # Connection dialog (Client)
├── disconnect-openai-button.tsx    # Disconnect confirmation (Client)
└── ai-integration-toggle.tsx       # Feature flag toggle (Client)
```

### Files to Modify (Implementation)

**DAL**:
```
lib/dal/settings.ts
├── Add: OpenAIConnection interface
├── Add: getOpenAIConnection() function
├── Update: TenantConfig interface (add 5 new fields)
└── Update: isFeatureEnabled() (add 'ai_integration')
```

**Server Actions**:
```
app/(dashboard)/settings/actions.ts
├── Add: testOpenAIConnection(apiKey)
├── Add: saveOpenAIKey(apiKey)
├── Add: disconnectOpenAI()
└── Add: toggleAIIntegration(enabled)
```

**Settings Page**:
```
app/(dashboard)/settings/page.tsx
├── Import: AIIntegrationSection
└── Render: <AIIntegrationSection isAdmin={isAdmin} />
```

---

## Database Schema

### New Columns (tenant_config)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `openai_api_key_secret_id` | UUID | NULL | FK to vault.secrets |
| `openai_connected_by` | UUID | NULL | FK to users(id) |
| `openai_connected_at` | TIMESTAMPTZ | NULL | Connection timestamp |
| `openai_connection_status` | VARCHAR(20) | 'not_connected' | Status enum |
| `feature_ai_integration` | BOOLEAN | false | Feature flag |

### Constraints

**Check Constraint**:
```sql
openai_connection_status IN ('not_connected', 'connected', 'connection_failed')
```

**Foreign Keys**:
- `openai_connected_by` → `users(id)` ON DELETE SET NULL
- `openai_api_key_secret_id` → `vault.secrets(id)` ON DELETE SET NULL

---

## Implementation Checklist

### Phase 1: Database ✅
- [x] Write comprehensive tests (TDD RED phase)
- [x] Generate migration SQL
- [ ] Apply migration to Supabase
- [ ] Verify with migration check script
- [ ] Run tests to confirm columns exist

### Phase 2: DAL (GREEN Phase)
- [ ] Add `OpenAIConnection` interface
- [ ] Update `TenantConfig` interface
- [ ] Update `FeatureFlag` type
- [ ] Implement `getOpenAIConnection()`
- [ ] Update `isFeatureEnabled()`
- [ ] Run DAL tests → All passing

### Phase 3: Server Actions (GREEN Phase)
- [ ] Implement `testOpenAIConnection()`
- [ ] Implement `saveOpenAIKey()`
- [ ] Implement `disconnectOpenAI()`
- [ ] Implement `toggleAIIntegration()`
- [ ] Run server action tests → All passing

### Phase 4: UI Components
- [ ] Create `ai-integration-section.tsx`
- [ ] Create `ai-integration-controls.tsx`
- [ ] Create `connect-openai-button.tsx`
- [ ] Create `disconnect-openai-button.tsx`
- [ ] Create `ai-integration-toggle.tsx`
- [ ] Update `page.tsx` with new section

### Phase 5: Testing & Validation
- [ ] All unit tests passing (22+ tests)
- [ ] Manual test: Admin connects OpenAI
- [ ] Manual test: Non-admin sees read-only view
- [ ] Manual test: Toggle feature on/off
- [ ] Manual test: Disconnect OpenAI
- [ ] Verify tenant isolation
- [ ] Verify vault encryption

### Phase 6: Documentation
- [ ] Update `/app/CLAUDE.md`
- [ ] Update `/CLAUDE.md` (root)
- [ ] Add inline code comments
- [ ] Close GitHub issue #66

---

## Test Coverage

### Vault Operations (7 tests)
✅ Store API key encrypted in vault
✅ Retrieve API key by secret ID
✅ Delete API key from vault
✅ Store secret ID in tenant_config
✅ Retrieve API key using tenant_config
✅ Handle non-existent secrets
✅ Full workflow: create → store → retrieve

### DAL Functions (5 tests)
❌ getOpenAIConnection() - not_connected state
❌ getOpenAIConnection() - connected state
❌ getOpenAIConnection() - failed state
❌ isFeatureEnabled() - ai_integration disabled
❌ isFeatureEnabled() - ai_integration enabled

### Server Actions (10+ tests)
❌ testOpenAIConnection() - rejects empty key
❌ testOpenAIConnection() - rejects invalid format
❌ testOpenAIConnection() - accepts valid key
❌ saveOpenAIKey() - requires admin role
❌ saveOpenAIKey() - tests connection first
❌ saveOpenAIKey() - stores in vault + config
❌ saveOpenAIKey() - rollback on failure
❌ disconnectOpenAI() - requires admin role
❌ disconnectOpenAI() - deletes from vault
❌ disconnectOpenAI() - clears config
❌ toggleAIIntegration() - requires admin
❌ toggleAIIntegration() - enables feature
❌ toggleAIIntegration() - disables feature

**Legend**: ✅ Passing | ❌ Failing (expected in RED phase)

---

## Security Architecture

### Vault Storage Flow

```
User Input (API Key)
      ↓
testOpenAIConnection() ← Validate with OpenAI API
      ↓
vault_create_secret() ← Encrypt and store
      ↓
Returns: secret_id
      ↓
Store in tenant_config.openai_api_key_secret_id
```

### Retrieval Flow

```
Application needs API key
      ↓
Query tenant_config → Get secret_id
      ↓
vault_read_secret(secret_id) → Decrypt and return
      ↓
Use API key (server-side only)
```

### Security Guarantees

1. **Encryption at Rest**: Vault stores keys encrypted
2. **Tenant Isolation**: RLS policies prevent cross-tenant access
3. **Admin-Only**: Role checks before all modifications
4. **No Client Exposure**: Service role key never sent to browser
5. **Rollback Safety**: Failed updates delete vault secrets
6. **Audit Trail**: Track who connected and when

---

## Common Issues & Solutions

### Migration Fails
**Problem**: `openai_connection_status_check` already exists
**Solution**: Migration uses `DROP CONSTRAINT IF EXISTS` - safe to re-run

### Tests Fail After Migration
**Problem**: Vault tests pass but DAL tests fail
**Solution**: Expected behavior - DAL functions don't exist yet (RED phase)

### Connection Test Fails
**Problem**: OpenAI API returns 401
**Solution**: Check API key format (should start with `sk-`)

### Vault Secret Not Found
**Problem**: `vault_read_secret` returns null
**Solution**: Check `openai_api_key_secret_id` in tenant_config is correct UUID

### Cross-Tenant Access
**Problem**: User sees wrong organization's API key
**Solution**: Verify RLS policies active, check `get_active_organization_id()`

---

## Development Commands

```bash
# Check migration status
npx tsx scripts/migrate-ai-integration-simple.ts

# Run all AI Integration tests
npm test __tests__/settings/ai-integration

# Run specific test suite
npm test __tests__/settings/ai-integration-vault.test.ts

# Run tests in watch mode (TDD workflow)
npm run test:watch __tests__/settings/ai-integration

# Check TypeScript errors
npm run build

# Start dev server
npm run dev
```

---

## Related Documentation

- **GitHub Issue**: #66
- **TDD Skill**: `/Users/matt/.claude/skills/test-driven-development`
- **Fireflies Pattern**: `app/(dashboard)/settings/components/fireflies-*.tsx`
- **DAL Pattern**: `/docs/architecture/auth-best-practices.md`
- **Vault Documentation**: Supabase Vault docs

---

## Next Steps

1. ✅ Apply database migration (see Quick Start)
2. ✅ Verify tests fail correctly (RED phase)
3. ⏳ Implement DAL functions (GREEN phase)
4. ⏳ Implement server actions (GREEN phase)
5. ⏳ Build UI components
6. ⏳ Manual testing & validation
7. ⏳ Update documentation
8. ⏳ Close issue #66

---

**Last Updated**: November 22, 2025
**Phase**: RED (Tests Written, Migration Ready)
**Next**: Apply Database Migration
