# Requirements: Market Milestone & Velocity Engine (Revised)

**Status:** Ready for Build
**Context:** ImpactOS Submission

---

## Part 1: Problem Space

**1.1 Problem Statement**
Support organizations struggle to objectively measure portfolio progress ("Learning Velocity") across diverse industries. Current reporting is sporadic and qualitative. Directors cannot prove which interventions actually accelerate a company's journey from idea to scale.

**1.2 Success Metrics**
*   **Primary:** **"Velocity Visibility"** - Ability to visualize a company's "Time to Next Milestone" relative to their Industry Track.
*   **Secondary:** **"Attribution Rate"** - % of milestones achieved *during* active program enrollment vs. outside of it.

## Part 2: Solution Space (Coach-Led Verification)

**2.1 Core Capability: "Milestone Tracks"**
*   **Standardization:** ImpactOS provides "System Standard" Templates (SaaS, Hardware, MedTech).
*   **Flexibility:** Tenants can "Copy and Customize" templates to create Custom Tracks.
*   **Assignment:** Each company is assigned one Primary Track (e.g., "This is a HealthTech company").

**2.2 Core Capability: "Coach-Verified Progression"**
*   **The Trigger:** The Coach (Advisor/Director) is the "Arbiter of Truth." They manually log when a milestone is reached based on their interactions (meetings, updates).
*   **The Flow:**
    1.  Coach interacts with Founder (via Meeting/Email).
    2.  Coach goes to "Company Profile" -> "Milestones."
    3.  Coach marks "Problem Validation" as **Achieved**.
    4.  **Optional:** Coach adds a note or uploads proof (e.g., "Reviewed customer discovery logs"). This is NOT mandatory, preventing friction for lightweight programs.
*   **The Log:** The system records `achieved_at` timestamp automatically. This is the "Golden Data" for calculating velocity.

**2.3 Core Capability: "Company Timeline"**
*   **The View:** A unified vertical timeline on the Company Profile that weaves together:
    *   **Milestone Achievements:** "Reached Problem Validation" (Golden Star Icon)
    *   **Interaction Logs:** "Meeting with Coach Sarah: Discussed GTM" (Calendar Icon)
    *   **Company Updates:** "Submitted Q3 Update: Revenue +20%" (Chart Icon)
*   **The Insight:** This visualizes *cause and effect*. You see a cluster of Coaching Meetings followed by a Milestone Achievement.

**2.4 Data Model: Company-Owned History**
*   Milestones travel with the Company.
*   Programs are simply "Time Windows" overlaid on that history for reporting.

---

## Part 3: Technical Implementation (Schema)

**3.1 Database Schema**
We need a flexible system where "Tracks" define the *structure* and "Progress" records the *instance*.

**Feature Flag:**
To support permission-based access, we will add a `feature_milestones` boolean to the `tenant_config` table.
*   **Disabled (Default):** Milestones UI is hidden.
*   **Enabled:** Admins can toggle this in "Organization Settings," revealing the functionality to coaches/users.

```sql
-- 0. UPDATE TENANT CONFIG (Feature Flag)
ALTER TABLE tenant_config ADD COLUMN feature_milestones boolean DEFAULT false;

-- 1. MILESTONE TRACKS (The Templates)
-- Examples: "SaaS Standard", "MedTech Regulatory"
CREATE TABLE milestone_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id), -- NULL for System Standards
  title text NOT NULL,
  description text,
  is_system_standard boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 2. MILESTONE DEFINITIONS (The Steps)
-- Examples: "Problem Validation", "MVP", "Series A"
CREATE TABLE milestone_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES milestone_tracks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. COMPANY PROGRESS (The Log)
-- Records WHEN a company hit a milestone
CREATE TABLE company_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestone_definitions(id),
  
  -- The "State"
  status text CHECK (status IN ('pending', 'achieved')),
  
  -- The "Golden Data" for Velocity
  achieved_at timestamptz, -- When it happened
  logged_at timestamptz DEFAULT now(), -- When it was recorded in system
  
  -- The "Coach Verification" (Optional)
  verified_by_user_id uuid REFERENCES users(id),
  evidence_note text, -- Optional context
  evidence_url text   -- Optional link
);
```

**3.2 Logic Changes**
*   **Company Creation:** Needs a new field to select `milestone_track_id`.
*   **Company Profile:**
    *   Add "Milestone Roadmap" component (Top Right?).
    *   Replace separate "Interactions" list with unified "Company Timeline" component.

---

## Part 4: Open Questions
1.  **Default Track:** Should we default all new companies to "SaaS Standard" if not specified? (Yes, for MVP simplicity).
2.  **Edits:** Can a coach "Undo" a milestone? (Yes, mistakes happen).
