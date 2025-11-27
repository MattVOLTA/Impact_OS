# impactOS Multi-Tenant Platform

A production-ready multi-organization SaaS platform for accelerator/incubator organizations to track direct beneficiaries and comply with Canadian government (BAI) reporting requirements.

## Tech Stack

- **Frontend**: Next.js 16.0.1 (App Router) + React 19.2.0 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **Authentication**: Supabase Auth with Custom Access Token Hooks
- **Testing**: Jest + React Testing Library

## Documentation

📚 **Complete documentation is in CLAUDE.md files**:

- **[CLAUDE.md](./CLAUDE.md)** - Development commands, architecture patterns, implementation guide
- **[../CLAUDE.md](../CLAUDE.md)** - Project overview, product strategy, compliance requirements
- **[../docs/architecture/](../docs/architecture/)** - Architecture Decision Records (ADRs) and best practices

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Setup

Create `.env.local` in this directory with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

See [CLAUDE.md](./CLAUDE.md#supabase-configuration) for complete setup instructions.

## Key Features

- ✅ Multi-organization support with data isolation
- ✅ Company & contact management with demographics tracking
- ✅ Meeting interactions with Fireflies integration
- ✅ Form builder with conditional logic
- ✅ AI-powered reporting agent
- ✅ Universal search across entities
- ✅ Self-service onboarding with email invitations
- ✅ Role-based access control (admin/editor/viewer)

## Project Structure

```
app/
├── app/               # Next.js App Router (routes and pages)
├── lib/
│   ├── dal/          # Data Access Layer (ALL auth logic here)
│   └── schemas/      # Zod validation schemas
├── components/ui/     # shadcn/ui components
├── utils/supabase/    # Supabase client factories
└── __tests__/        # Test suites
```

## Architecture Highlights

**Data Access Layer (DAL) Pattern**: All authentication and data access goes through centralized DAL functions. This provides:
- 5-10x performance improvement (1 auth call vs N per page)
- Consistent security enforcement
- Simplified testing and maintenance

**Multi-Organization Isolation**: Row-Level Security (RLS) policies automatically filter all queries by the user's active organization. Users can belong to multiple organizations and switch between them.

See [CLAUDE.md](./CLAUDE.md#multi-organization-data-access-layer-dal-pattern) for architectural details.

## Common Commands

```bash
# Testing
npm test                              # Run all tests
npm test [file]                       # Run specific test file
npm test -- --testNamePattern="name"  # Run tests matching pattern
npm run test:auth                     # Run only auth tests
npm test -- --coverage                # Generate coverage report

# Code Quality
npm run lint                          # Run ESLint

# Data Migration (from single-tenant instances)
npm run import:meetings               # Import meetings
npm run import:transcripts:dry-run    # Test transcript import
npm run import:programs:dry-run       # Test program import
```

## Development Workflow

1. **Read GitHub issue** for feature requirements
2. **Write tests FIRST** (Test-Driven Development)
3. **Implement following the stack**: Component → Server Action → DAL Function → Database
4. **Test organization isolation** to verify RLS works
5. **Update GitHub issue** with completion status

See [CLAUDE.md](./CLAUDE.md#common-development-tasks) for detailed workflows.

## Important Rules

### Authentication
- ✅ ALL auth checks go through DAL (`requireAuth()`)
- ✅ Use `getUser()` not `getSession()` on server
- ❌ NEVER check auth in components
- ❌ NEVER put auth logic in middleware (session refresh only)

### Multi-Organization Security
- ✅ Every data table has `tenant_id` column
- ✅ RLS policies enforce organization isolation
- ✅ Test cross-organization access is blocked
- ❌ NEVER query Supabase directly from components

See [CLAUDE.md](./CLAUDE.md#common-anti-patterns-to-avoid) for complete list.

## Need Help?

- **Architecture questions**: See [../docs/architecture/auth-best-practices.md](../docs/architecture/auth-best-practices.md)
- **Development patterns**: See [CLAUDE.md](./CLAUDE.md)
- **Project context**: See [../CLAUDE.md](../CLAUDE.md)
- **GitHub Issues**: Check issue #1 (master epic) for roadmap

## License

Private repository - MattVOLTA/impactOS-multi-tenant
