# Product Discovery Techniques (SVPG Framework)

Product discovery is the modern approach to finding product-market fit through continuous learning. The goal: identify valuable and viable solutions before committing to build.

## Core Discovery Principles

### Discovery vs Delivery

**Discovery**: Rapid experimentation to validate ideas before building
- Fast, cheap, iterative
- High uncertainty, learning-focused
- Prototypes, not production code
- Answer: "Should we build this?"

**Delivery**: Building and shipping validated solutions
- Slower, more expensive
- Lower uncertainty, execution-focused
- Production-quality code
- Answer: "How do we build this well?"

### Continuous Discovery

Good product teams do discovery continuously, not as a phase:
- Weekly customer contact (minimum)
- Instrumented products provide ongoing data
- Always exploring multiple opportunities
- Discovery and delivery happen in parallel

### Collaborative Discovery

Product discovery requires the trio:
- **Product Manager**: Owns value and viability
- **Product Designer**: Owns usability and user experience
- **Tech Lead/Engineer**: Owns feasibility and technical approach

All three participate in discovery activities together.

## Discovery Techniques by Risk Type

### Value Risk Techniques

**Customer Interviews**
- Purpose: Understand problems, needs, and context
- When: Early in discovery; continuously for learning
- How: Open-ended questions about problems, not solutions
- Output: Problem validation, customer quotes, pain intensity

**Prototype Testing**
- Purpose: Validate if solution solves the problem
- When: After problem validation, before building
- How: Show clickable prototypes; observe user attempts to accomplish tasks
- Output: Evidence of value (or lack thereof)

**Fake Door Tests**
- Purpose: Measure interest before building
- When: Uncertain if customers want a feature
- How: Add UI element that looks real; track clicks; explain feature isn't ready yet
- Output: Click-through rates indicating interest

**Concierge MVP**
- Purpose: Validate demand by manually delivering the service
- When: Uncertain about value proposition
- How: Manually perform the service for early customers
- Output: Willingness to pay; usage patterns; feature priorities

**Landing Pages**
- Purpose: Gauge interest in new products/features
- When: Very early validation needed
- How: Create marketing page with signup; drive traffic; measure conversion
- Output: Email signups indicating genuine interest

### Viability Risk Techniques

**Stakeholder Interviews**
- Purpose: Understand business constraints and opportunities
- When: Early and continuously throughout discovery
- How: Regular 1-on-1s with sales, marketing, legal, finance, support
- Output: Constraints identified; business case inputs; stakeholder buy-in

**Business Model Canvas**
- Purpose: Map out business viability elements
- When: Exploring new products or business models
- How: Collaborate with finance/business stakeholders to model economics
- Output: Clear understanding of costs, revenue, and business sustainability

**Go-to-Market Planning**
- Purpose: Validate marketing and sales can succeed
- When: Before committing to build
- How: Work with marketing and sales on positioning, messaging, channels
- Output: Confidence in ability to reach customers and close deals

### Usability Risk Techniques

**Low-Fidelity Prototypes**
- Purpose: Test concepts and flows quickly
- When: Early exploration of multiple approaches
- How: Sketches or wireframes tested with users
- Output: Direction on which approach to pursue

**High-Fidelity Prototypes**
- Purpose: Validate detailed design and interactions
- When: After direction is chosen; before engineering
- How: Realistic mockups/clickable prototypes tested with users
- Output: Detailed usability feedback and refinements

**Usability Testing**
- Purpose: Identify friction and confusion
- When: Throughout design iteration
- How: Observe users attempting tasks; think-aloud protocol
- Output: Specific usability issues and user mental models

**A/B Testing**
- Purpose: Compare design alternatives with real users
- When: Live product; optimizing existing features
- How: Show different versions to user segments; measure behavior
- Output: Data-driven design decisions

### Feasibility Risk Techniques

**Technical Spikes**
- Purpose: Validate technical approach and estimates
- When: Significant technical uncertainty exists
- How: Engineers time-box exploration of unknowns
- Output: Confidence in estimates; architectural decisions

**Proof of Concept**
- Purpose: Validate specific technical capabilities
- When: Unproven technology or integration
- How: Engineers build minimal version addressing the uncertainty
- Output: Feasibility confirmed or alternative approach identified

**Architecture Review**
- Purpose: Ensure scalability and maintainability
- When: Before committing to significant builds
- How: Engineers present approach; team reviews trade-offs
- Output: Technical confidence and identified risks

## Discovery Cadence and Activities

### Weekly Customer Contact

Good product teams maintain continuous customer learning:
- Minimum: Weekly customer interactions by the product trio
- Mix of: Interviews, prototype tests, usability sessions, data reviews
- Variety: Talk to prospects, current customers, churned customers
- Cross-functional: PM, designer, and engineer all participate

### Opportunity Assessment

For each significant opportunity, answer:
1. **What problem are we solving?** (value)
2. **Who has this problem?** (target customers)
3. **How big is the opportunity?** (market size, business impact)
4. **How will we measure success?** (metrics and goals)
5. **What alternatives exist?** (competitive landscape)
6. **Why are we best positioned to solve this?** (strategic fit)
7. **What are the risks?** (all four risks assessed)
8. **What needs to be true for this to succeed?** (assumptions to validate)

### Discovery Kanban

Track discovery work visually:
- **Backlog**: Opportunities to explore
- **Exploring**: Active discovery (interviews, prototypes, tests)
- **Validating**: High-confidence ideas being de-risked
- **Ready to Build**: Validated opportunities with evidence
- **Parking Lot**: Ideas to revisit later

### Discovery Artifacts

Keep discovery lightweight but documented:
- Opportunity assessments (1-2 pages)
- Customer interview notes and key quotes
- Prototype test results
- Risk assessments (all four risks)
- Metrics and success criteria

Avoid: Heavy documentation, lengthy PRDs, waterfall requirement docs

## Avoiding Discovery Anti-Patterns

### Anti-Pattern: Discovery as a Phase

**Problem**: "We'll do discovery for 3 months, then build for 6 months"

**Why it fails**:
- Learning doesn't stop when building starts
- Conditions change during long build cycles
- Creates "throw it over the wall" handoffs

**SVPG alternative**: Continuous discovery in parallel with delivery

### Anti-Pattern: Optimization-Only "Discovery"

**Problem**: Only doing A/B testing of minor tweaks

**Why it fails**:
- Value capture, not value creation
- Misses opportunities for significant new value
- Confuses optimization with innovation

**SVPG alternative**: Balance optimization with exploring new opportunities

### Anti-Pattern: Stakeholder Requirements Gathering

**Problem**: Collecting feature requests from stakeholders as "discovery"

**Why it fails**:
- Solutions presented, not problems identified
- No validation with actual customers
- Feature team behavior, not empowered team

**SVPG alternative**: Understand stakeholder constraints; invent solutions serving customers and business

### Anti-Pattern: Solo PM Discovery

**Problem**: PM does discovery alone; hands off to design and engineering

**Why it fails**:
- Designer and engineer don't understand context
- Feasibility and usability not considered early
- Missed opportunities from diverse perspectives

**SVPG alternative**: Product trio collaborates on all discovery activities

### Anti-Pattern: Building to Learn

**Problem**: "Let's build it and see if customers use it"

**Why it fails**:
- Expensive and slow learning
- Wasted engineering effort
- Prototypes learn 10x faster

**SVPG alternative**: Prototype and test before building

## Discovery Output: Evidence-Based Decisions

Good discovery produces evidence to answer:

**Should we build this?**
- Value: Strong customer demand validated through [interviews/prototypes/tests]
- Viability: Business case positive; stakeholders aligned
- Usability: User testing shows task completion success
- Feasibility: Engineers confident in approach and timeline

**What should we build?**
- Multiple solution approaches explored
- Selected approach has strongest evidence across all four risks
- Open questions and risks documented with mitigation plans

**How will we know if we succeeded?**
- Clear metrics tied to business outcomes
- Instrumentation plan to measure success
- Timeline for evaluation

## Remember

As Marty Cagan emphasizes:
- "Discovery is about rapid experimentation to validate ideas"
- "The output of discovery is validated product backlog items"
- "Product teams should be in front of customers every week"
- "Discovery is not a phase; it's continuous"

Good discovery means:
- Fast, cheap learning before expensive building
- Cross-functional collaboration (PM + design + engineering)
- Customer-centric and evidence-based
- All four risks assessed, not just feasibility
