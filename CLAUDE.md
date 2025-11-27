# CLAUDE.md

## 🚀 Project Overview
**impactOS Multi-Tenant Platform**: SaaS for accelerator/incubator reporting and BAI compliance.
- **Goal**: Validate with 10 orgs recording meetings for 30 days by Feb 2026.
- **Phase**: Production-ready MVP.

## 🛠 Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind 4, shadcn/ui.
- **Database**: Supabase (PostgreSQL + RLS).
- **Auth**: Supabase Auth (SSR) + Custom Access Token Hooks.
- **AI**: Anthropic Claude (Reporting) + Fireflies.ai (Transcripts).

## ⚠️ Critical Rules
1. **Working Directory**: ALWAYS run commands and read dev docs from `/app/`.
   - See: `app/CLAUDE.md` for ALL dev commands, patterns, and testing guides.
2. **Auth Architecture**:
   - **DAL Pattern**: ALL auth/DB checks in `app/lib/dal/`. NEVER in components.
   - **Tenant Isolation**: `tenant_id` enforced via RLS and JWT claims.
   - **Reference**: `docs/architecture/auth-best-practices.md`
3. **Testing**: TDD required. Test tenant isolation (`tenant_id`) before features.

## 📂 Documentation Map
- **👩‍💻 Development Guide**: `app/CLAUDE.md` (Read this for coding)
- **🏗 Architecture**: `docs/architecture/`
- **📋 Requirements**: `docs/requirements/`
- **🇨🇦 Compliance**: `docs/BAI Metrics Pilot Data Collection - Final.md`
- **🔐 Security**: `docs/MULTI_ORG_SECURITY_ANALYSIS.md`

## 🧪 Test Tenants
- **Acme**: `1111...` (Full Access)
- **Beta**: `2222...` (No Fireflies)
- **Gamma**: `3333...` (Restricted)

## 📚 References for Agents
- **Official Best Practices**: [Claude Code Docs](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices) - *Source of truth for this file structure.*
- **Advanced Patterns**: [Hierarchical CLAUDE.md Guide](https://kuanhaohuang.com/claude-code-claude-md-advanced-tips/) - *Reference for multi-folder setups.*
- **Maintenance**: Keep this root file < 50 lines. Push details to `app/CLAUDE.md`.
