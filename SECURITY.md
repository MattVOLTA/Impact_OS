# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **matt@voltaeffect.com**.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information in your report:

- **Type of vulnerability** (e.g., SQL injection, XSS, authentication bypass, RLS policy bypass)
- **Location** of the affected source code (file path, line numbers if known)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact assessment** - what an attacker could achieve
- **Any special configuration** required to reproduce

## What to Expect

1. **Acknowledgment** - We will acknowledge receipt of your report within 48 hours
2. **Assessment** - We will investigate and assess the vulnerability's severity
3. **Updates** - We will keep you informed of our progress
4. **Resolution** - We will work on a fix and coordinate disclosure with you
5. **Credit** - We will credit you in our security advisory (unless you prefer anonymity)

## Disclosure Policy

- We follow a coordinated disclosure process
- We aim to resolve critical vulnerabilities within 7 days
- We will publish a security advisory after the fix is released
- We request that you do not publicly disclose until we've had time to address the issue

## Security Best Practices for Contributors

When contributing to impactOS, please follow these security guidelines:

### Authentication & Authorization

- **Never bypass authentication** - All protected routes must verify user sessions
- **Use the Data Access Layer** - All database operations go through `lib/dal/`
- **Verify tenant isolation** - Ensure users can only access their organization's data
- **Use `getUser()` not `getSession()`** - Server-side auth must use the secure method

### Data Handling

- **Validate all inputs** - Use Zod schemas for input validation
- **Parameterize queries** - Never concatenate user input into SQL
- **Sanitize outputs** - Prevent XSS by properly escaping user content
- **Check RLS policies** - Ensure Row Level Security covers new data patterns

### Secrets Management

- **Never commit secrets** - Use environment variables for all credentials
- **Use `.env.local`** - This file is gitignored by default
- **Rotate compromised keys** - If a secret is exposed, rotate it immediately

### Dependencies

- **Keep dependencies updated** - Run `npm audit` regularly
- **Review new dependencies** - Evaluate security posture before adding packages
- **Use lockfiles** - Ensure reproducible builds with `package-lock.json`

## Security Features

impactOS implements several security measures:

### Multi-Tenant Isolation

- **Row Level Security (RLS)** - PostgreSQL policies enforce tenant boundaries
- **JWT Claims** - Tenant ID embedded in access tokens
- **DAL Enforcement** - All queries filter by authenticated tenant

### Authentication

- **Supabase Auth** - Industry-standard authentication
- **SSR Security** - Server-side session validation
- **CSRF Protection** - Built into Next.js server actions

### Infrastructure

- **HTTPS Only** - All traffic encrypted in transit
- **Environment Isolation** - Secrets never committed to repository
- **Audit Logging** - Database operations are traceable

## Bug Bounty

We currently do not have a formal bug bounty program. However, we deeply appreciate security researchers who help us improve. Significant findings may be rewarded at our discretion.

## Contact

For security concerns, contact: **matt@voltaeffect.com**

For general questions, please use GitHub Discussions or Issues.

---

Thank you for helping keep impactOS and its users safe!
