# impactOS

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**Open-source platform for accelerators and incubators to track portfolio company progress, manage meetings, and generate BAI-compliant reports.**

impactOS helps startup support organizations streamline their operations with:

- **Portfolio Management** - Track companies through customizable milestone frameworks
- **Meeting Intelligence** - Import and analyze meeting transcripts from Fireflies.ai
- **Automated Reporting** - Generate reports aligned with BAI (Business Accelerator & Incubator) metrics
- **Multi-Tenant Architecture** - Securely manage multiple organizations from a single deployment

## Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19, Tailwind CSS 4, shadcn/ui
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth with SSR support
- **AI Integration**: Anthropic Claude for report generation
- **Meeting Transcripts**: Fireflies.ai integration

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (free tier works for development)
- Fireflies.ai account (optional, for meeting import)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/MattVOLTA/Impact_OS.git
   cd Impact_OS
   ```

2. **Install dependencies**

   ```bash
   cd app
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

4. **Set up Supabase**

   - Create a new Supabase project
   - Run the migrations (see `docs/` for database setup)
   - Configure authentication providers as needed

5. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
impactos/
├── app/                    # Next.js application
│   ├── app/               # App Router pages and layouts
│   ├── components/        # React components
│   ├── lib/              # Utilities and data access layer
│   └── __tests__/        # Test files
├── docs/                  # Documentation
│   ├── architecture/     # Architecture decision records
│   └── requirements/     # Feature requirements
└── .github/              # GitHub workflows and templates
```

## Development

### Running Tests

```bash
cd app
npm test                  # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage report
```

### Code Style

This project uses ESLint and Prettier for code formatting. Run linting with:

```bash
npm run lint
```

### Key Principles

- **Test-Driven Development (TDD)** - Write tests before implementation
- **Data Access Layer (DAL)** - All database operations go through `lib/dal/`
- **Row Level Security** - Tenant isolation enforced at database level
- **Server Actions** - Use Next.js server actions for mutations

## Documentation

- [Architecture Overview](docs/architecture/)
- [Authentication Best Practices](docs/architecture/auth-best-practices.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

## Roadmap

- [ ] Dashboard analytics and visualizations
- [ ] Bulk company import/export
- [ ] Custom milestone track builder
- [ ] Integration with additional meeting platforms
- [ ] Multi-language support

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Setting up your development environment
- Our code review process
- How to submit pull requests

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Supabase](https://supabase.com/) for the backend infrastructure
- [shadcn/ui](https://ui.shadcn.com/) for the component library
- [Fireflies.ai](https://fireflies.ai/) for meeting transcription

---

**Questions?** Open an issue or start a discussion. We're here to help!
