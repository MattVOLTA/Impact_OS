# Contributing to impactOS

Thank you for your interest in contributing to impactOS! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Git
- A Supabase account (free tier is sufficient for development)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR-USERNAME/impactos.git
   cd impactos
   ```

3. **Add the upstream remote**

   ```bash
   git remote add upstream https://github.com/original-org/impactos.git
   ```

4. **Install dependencies**

   ```bash
   cd app
   npm install
   ```

5. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Configure your Supabase credentials in `.env.local`.

6. **Run the development server**

   ```bash
   npm run dev
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- Feature branches - `feature/description` or `feat/description`
- Bug fixes - `fix/description`
- Documentation - `docs/description`

### Creating a Feature Branch

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

### Keeping Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

## Pull Request Process

1. **Ensure your code follows our standards** (see [Coding Standards](#coding-standards))

2. **Write or update tests** for your changes (see [Testing Requirements](#testing-requirements))

3. **Run the test suite** and ensure all tests pass:

   ```bash
   npm test
   ```

4. **Run linting** and fix any issues:

   ```bash
   npm run lint
   ```

5. **Create a pull request** with:
   - A clear title describing the change
   - A description of what the PR accomplishes
   - Reference to any related issues
   - Completed checklist items from the PR template

6. **Respond to review feedback** promptly

### PR Review Criteria

- Code follows project conventions
- Tests are included and passing
- Documentation is updated if needed
- No security vulnerabilities introduced
- Tenant isolation maintained (for data access changes)

## Coding Standards

### General Principles

- **Keep it simple** - Avoid over-engineering
- **Be consistent** - Follow existing patterns in the codebase
- **Write self-documenting code** - Use clear naming conventions

### TypeScript

- Use TypeScript for all new code
- Define types explicitly (avoid `any`)
- Use interfaces for object shapes
- Export types from dedicated files when shared

### React Components

- Use functional components with hooks
- Keep components focused and small
- Use server components by default, client components when needed
- Place components in appropriate directories based on scope

### Data Access Layer (DAL)

All database operations must go through the Data Access Layer:

```typescript
// Good - using DAL
import { getCompanies } from '@/lib/dal/companies'
const companies = await getCompanies()

// Bad - direct database access in components
const { data } = await supabase.from('companies').select()
```

### Server Actions

Use Next.js server actions for mutations:

```typescript
// In actions.ts
'use server'

export async function createCompany(data: CompanyInput) {
  // Validation and database operation
}
```

### File Organization

```
app/
├── app/
│   ├── (auth)/          # Auth-related pages
│   ├── (dashboard)/     # Protected dashboard pages
│   └── api/             # API routes (when necessary)
├── components/
│   ├── ui/              # shadcn/ui components
│   └── [feature]/       # Feature-specific components
├── lib/
│   ├── dal/             # Data Access Layer
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript types
└── __tests__/           # Test files mirroring app structure
```

## Testing Requirements

### Test-Driven Development (TDD)

We follow TDD principles:

1. **Write the test first** - Define expected behavior before implementation
2. **Watch it fail** - Confirm the test fails for the right reason
3. **Write minimal code** - Implement just enough to pass the test
4. **Refactor** - Clean up while keeping tests green

### Test Structure

```typescript
describe('Feature', () => {
  describe('when condition', () => {
    it('should behave as expected', async () => {
      // Arrange
      // Act
      // Assert
    })
  })
})
```

### What to Test

- **Unit tests** for utility functions and helpers
- **Integration tests** for server actions and DAL functions
- **Tenant isolation** for any data access code

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test.ts

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

### Test Tenant Isolation

For any code that accesses data, test tenant isolation:

```typescript
it('should not return data from other tenants', async () => {
  // Create data for tenant A
  // Attempt to access as tenant B
  // Assert access is denied or returns empty
})
```

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

- **Summary** - Clear description of the issue
- **Steps to reproduce** - Detailed steps to reproduce the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - Browser, OS, Node version, etc.
- **Screenshots** - If applicable

### Feature Requests

For feature requests, please include:

- **Problem statement** - What problem does this solve?
- **Proposed solution** - How do you envision it working?
- **Alternatives considered** - Other approaches you've thought of
- **Additional context** - Any other relevant information

### Security Issues

**Do not report security vulnerabilities through public issues.** Please see our [Security Policy](SECURITY.md) for responsible disclosure guidelines.

## Questions?

- Open a [GitHub Discussion](https://github.com/your-org/impactos/discussions) for general questions
- Check existing issues before creating new ones
- Join our community channels (if applicable)

---

Thank you for contributing to impactOS!
