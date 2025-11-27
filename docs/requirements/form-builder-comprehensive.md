# Form Builder - Comprehensive Requirements Document

**Project:** impactOS Multi-Tenant
**Component:** Dynamic Form Builder
**Version:** 2.0 (Reconciled)
**Last Updated:** November 13, 2025

---

## Overview

The Form Builder is a comprehensive drag-and-drop visual editor for creating dynamic, versioned, multi-section forms with conditional logic, 13 question types, automatic data persistence, and program-based scheduling. This document reconciles the detailed technical requirements with the database architecture and testing strategy.

---

## Problem Statement

**Current State:**
- Single-tenant impactOS uses dynamic JSONB-based form builder with flexible question types
- Multi-tenant MVP has hardcoded `company_updates` table with fixed BAI compliance columns
- No way for organizations to customize update forms for their programs
- No versioning strategy for form evolution over time

**User Pain Points:**
1. **Program Managers**: Need different questions for different programs (e.g., early-stage vs growth-stage)
2. **Compliance Officers**: Must track historical submissions with original form structure for audit trails
3. **Portfolio Companies**: Receive update requests with questions that may not apply to their stage/industry
4. **Organization Admins**: Cannot adapt forms as program requirements change without losing historical context

**Impact if Not Solved:**
- Organizations locked into rigid BAI compliance schema
- Cannot customize update frequency or questions per program
- Historical data becomes unreliable when forms change
- Manual workarounds (spreadsheets, emails) undermine platform value

---

## Core Features

### 1. Form Structure

**Form Properties:**
- Unique ID (UUID)
- Program association (program_id)
- Title (editable inline)
- Description (optional, editable inline)
- Sections (ordered list)
- Published state (boolean)
- Success message (customizable)
- Email notifications (recipients array)
- Update frequency (days between updates, e.g., 30, 60, 90)
- Reminder frequency (days before due, e.g., 7, 14)
- Version tracking (version number, temporal validity)
- Timestamps (created, updated, published)
- Creator tracking (created_by)

**Section Properties:**
- Unique ID (UUID)
- Title (editable inline)
- Questions (ordered list)
- Expanded/collapsed state
- Drag-and-drop reordering

**Question Properties:**
- Unique ID (UUID)
- Type (13 types available)
- Question text (editable inline)
- Help text (optional)
- Required flag
- Conditional logic (optional)
- Validation rules (min/max, format, regex)
- Layout options (full, half, third width)
- Column positioning (for grid layouts)
- Type-specific configuration (options, format, etc.)

---

## 2. Question Types (13 Total)

### Basic Input Types

**1. Text** - Single-line text input
- Configurable placeholder
- Min/max length validation
- Custom regex patterns
- Example: "Company Name", "Website"

**2. Long Text (Textarea)** - Multi-line text input
- Configurable rows (default: 4)
- Character count display
- Max length validation
- Example: "Describe your progress this quarter"

**3. Number** - Numeric input
- Min/max value constraints
- Step increment (e.g., 0.1, 1, 10)
- Format validation (integer vs decimal)
- Example: "Number of customers", "Team size"

**4. Currency** - Monetary value input
- Currency symbol configuration (default: CAD $)
- Decimal precision (default: 2)
- Min/max constraints
- Thousand separators
- Example: "Capital raised this quarter", "Monthly recurring revenue"

### Selection Types

**5. Single Choice (Select)** - Dropdown selection
- Custom options list (add/remove/reorder)
- Default value option
- "Other" option with text input
- Example: "Current growth stage", "Industry sector"

**6. Multiple Choice (Multi-select)** - Multiple option selection
- Custom options list
- Min/max selections constraint
- Checkbox interface
- Example: "Which markets are you targeting?", "Revenue streams"

**7. Yes/No** - Boolean choice with three options:
- Yes
- No
- Prefer not to answer (if not required)
- Example: "Are you actively fundraising?", "Do you have paying customers?"

### Specialized Types

**8. Date** - Date picker
- Format configuration (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY)
- Min/max date constraints
- Default to today option
- Date range validation
- Example: "When did you launch?", "Expected next funding date"

**9. Email** - Email address input
- Email format validation (RFC 5322)
- Confirmation field option (enter email twice)
- Example: "Primary contact email"

**10. Phone** - Phone number input
- Format validation (North American default)
- International format support
- Auto-formatting as user types
- Extension support
- Example: "Business phone number"

**11. URL** - Website address input
- URL format validation
- Protocol requirement (https://)
- Auto-prepend protocol if missing
- Example: "Company website", "LinkedIn profile"

### Dynamic Types (CRM Integration)

**12. Dynamic Field - Company** - Company selector with autocomplete
- Searches existing companies in tenant
- Real-time search as user types
- Creates new company inline (modal/dialog)
- Links to company records (foreign key)
- Displays company name + industry
- Example: "Select your portfolio company", "Partner organization"

**13. Dynamic Field - Contact** - Contact selector with autocomplete
- Searches existing contacts in tenant
- Real-time search as user types
- Creates new contact inline (modal/dialog)
- Links to contact records (foreign key)
- Displays contact name + company
- Can filter by company (show contacts from selected company)
- Example: "Who attended this meeting?", "Primary founder"

---

## 3. Layout System

### Three-Panel Layout (Desktop)

**Left Panel: Template Panel** (300px fixed width)
- Question type library
- Organized by category:
  - **Basic Input** (Text, Long Text, Number, Currency)
  - **Selection** (Single Choice, Multiple Choice, Yes/No)
  - **Specialized** (Date, Email, Phone, URL)
  - **Dynamic Fields** (Company, Contact) - expandable group
- Icons for visual recognition
- Click or drag-to-add functionality
- Search/filter question types
- Collapsible categories

**Center Panel: Form Editor** (flexible width, min 600px)
- Form title/description editors (inline editing)
- Section containers (collapsible)
- Question cards with:
  - Drag handle (6-dot grip icon)
  - Question text (editable inline)
  - Type indicator badge
  - Required indicator (red asterisk)
  - Quick actions (duplicate, delete)
  - Click to select → opens Properties Panel
- Add section button (between sections)
- Add question button (within sections)
- Preview mode toggle
- Visual drag indicators (drop zones, drag preview)
- Breadcrumb navigation

**Right Panel: Properties Panel** (400px fixed width)
- Context-aware based on selection:
  - **No selection**: Form-level properties (title, success message, email notifications)
  - **Section selected**: Section properties (title, reorder)
  - **Question selected**: Question properties
    - Question text (textarea)
    - Help text (optional)
    - Required toggle
    - Type-specific config (options, format, validation)
    - Conditional logic builder
    - Layout options (full/half/third width)
- Save/cancel buttons
- Delete confirmation

### Responsive Behavior

**Desktop (>1200px):**
- Full three-panel layout
- Drag-and-drop enabled
- All features available

**Tablet (768px - 1199px):**
- Template Panel: Collapsible overlay (hamburger menu)
- Center Panel: Full width when template collapsed
- Properties Panel: Slides over center panel when question selected
- Drag-and-drop enabled

**Mobile (<768px):**
- Single-column layout
- Template Panel: Bottom sheet modal
- Center Panel: Full width, simplified view
- Properties Panel: Full-screen modal
- **No drag-and-drop**: Up/down arrow buttons for reordering
- Touch-friendly buttons (44px min tap target)
- Simplified question cards (more compact)
- Auto-save more frequent (500ms debounce)

---

## 4. Drag-and-Drop Functionality

### Library Used
- `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd)
- Server-side rendering compatible
- Keyboard navigation support
- Touch device support (desktop only)

### Section Management
- Reorder sections vertically within form
- Visual drag indicators:
  - Grip handle (⋮⋮ icon) on hover
  - Drop zones between sections (blue highlight on drag)
  - Drag preview (semi-transparent section ghost)
- Smooth animations (300ms ease-in-out)
- Snap to drop zone
- Auto-scroll when dragging near viewport edge

### Question Management
- Reorder questions within sections
- Move questions between sections (drag across section boundaries)
- Visual drag indicators:
  - Grip handle (⋮⋮ icon) on hover
  - Drop zones between questions (blue highlight on drag)
  - Drag preview (semi-transparent question ghost)
  - Drop zone at section top/bottom (drop on section itself)
- Smooth animations (300ms ease-in-out)
- Snap to drop zone
- Auto-scroll when dragging near viewport edge
- Cross-section drag (highlight target section)

### Mobile Alternative (Touch Devices <768px)
- **No drag-and-drop** (touch events conflict with scrolling)
- Up/down arrow buttons on each section/question
- Move to section dropdown (for questions)
- Confirmation on large moves
- Haptic feedback on reorder (if supported)

---

## 5. Conditional Logic System

### Rule Builder Interface
- Add multiple conditions per question (AND/OR grouping)
- Show/hide questions based on answers to previous questions
- Logical operators: **AND** / **OR**
- Visual rule builder (not code):
  - "Show this question if..."
  - Dropdown: Select question to evaluate
  - Dropdown: Select operator
  - Input: Enter comparison value (context-aware)
  - Add rule button (+)
  - Remove rule button (×)

### Condition Operators (7 Total)

**1. Equals** - Exact match
- For: Select, Yes/No, Text, Number
- Example: "Show fundraising amount if 'Are you fundraising?' equals 'Yes'"

**2. Not Equals** - Inverse match
- For: Select, Yes/No, Text, Number
- Example: "Show alternative question if stage not equals 'Idea'"

**3. Contains** - Partial match (case-insensitive)
- For: Text, Long Text, Multi-select
- Example: "Show follow-up if description contains 'AI'"

**4. Is Empty** - No answer provided
- For: All types
- No value input needed
- Example: "Show reminder if contact email is empty"

**5. Is Not Empty** - Answer provided
- For: All types
- No value input needed
- Example: "Show follow-up questions if company selected"

**6. Greater Than** - Numeric comparison
- For: Number, Currency, Date
- Example: "Show scaling questions if team size greater than 10"

**7. Less Than** - Numeric comparison
- For: Number, Currency, Date
- Example: "Show early-stage questions if revenue less than 100000"

### Smart Value Input
- **Context-aware input field** based on question type:
  - **Select/Multi-select**: Dropdown showing available options
  - **Yes/No**: Dropdown (Yes, No, Prefer not to answer)
  - **Text/Long Text**: Text input
  - **Number/Currency**: Number input
  - **Date**: Date picker
  - **isEmpty/isNotEmpty**: No input (operator doesn't require value)
  - **Dynamic Fields**: Autocomplete selector

### Evaluation
- **Real-time condition evaluation** (as user fills form)
- Show/hide questions dynamically (no page refresh)
- **Cascading logic support**: Question C can depend on Question B, which depends on Question A
- **Prevents circular dependencies**: Validation at save time
  - Error: "Circular dependency detected: Question A → B → A"
- **Dependency graph visualization** (advanced feature)
- Conditional questions hidden by default (appear when condition met)
- Smooth expand/collapse animation (300ms)

---

## 6. Auto-Save System

### Local Storage Backup
- **Debounced saves**: 1000ms (desktop), 500ms (mobile)
- Automatic localStorage backup on every change
- Key format: `form-draft-{formId}-{userId}`
- Recovery prompt on page reload:
  - "We found an unsaved draft from [timestamp]. Restore?"
  - Restore / Discard buttons
- Clear backup after successful server save
- Max age: 7 days (auto-cleanup old drafts)

### Server Persistence (Supabase)
- Async saves to `forms` table
- **Error handling**:
  - Toast notification on failure
  - Keep localStorage backup
  - Retry button in toast
  - Exponential backoff (1s, 2s, 4s, 8s max)
- **Change detection**: Only saves if form modified (dirty flag)
- **Success confirmation**: Toast "Form saved" (auto-dismiss 2s)
- **Optimistic UI**: Update UI immediately, revert on error

### Save Triggers (Auto-Save Events)
- Form title/description changes
- Section added/removed/reordered
- Question added/removed/reordered
- Question text edited
- Question type changed
- Options added/removed (for select/multi-select)
- Validation rules modified
- Conditional logic updated
- Required flag toggled
- Layout options changed

### Manual Save
- Save button in header (always visible)
- Keyboard shortcut: Cmd/Ctrl + S
- Visual indicator: Spinner + "Saving..." text
- Disabled during save (prevent double-save)

---

## 7. Question Management

### Inline Editing
- **Click to edit**:
  - Question text → contentEditable div
  - Section title → contentEditable div
  - Form title/description → contentEditable div
- **Keyboard navigation**:
  - Tab → Next field
  - Shift+Tab → Previous field
  - Enter → Save and exit editing
  - Escape → Cancel and revert
- **Visual feedback**:
  - Blue outline when focused
  - Placeholder text when empty
  - Character count for long text (if max length set)

### Question Actions (Context Menu)
**1. Edit** - Click question card to select → Properties Panel opens
**2. Duplicate** - Clone question with new UUID:
  - Copies all properties (type, text, validation, options)
  - Appends " (Copy)" to question text
  - Inserts below original question
  - Auto-focus new question for editing
**3. Delete** - Remove question with confirmation:
  - Modal: "Delete this question? This cannot be undone."
  - Check for conditional dependencies (warn if other questions depend on it)
  - Confirm / Cancel buttons
**4. Move** - Drag-and-drop or arrow buttons (mobile)
**5. Configure** - Opens Properties Panel (same as clicking question)

### Section Actions
**1. Add Section** - Plus button between sections:
  - Creates new section with default title "New Section"
  - Auto-focus title for editing
  - Inserts at click location
**2. Duplicate Section** - Clone section with all questions:
  - New UUIDs for section and all questions
  - Appends " (Copy)" to section title
  - Inserts below original section
**3. Delete Section** - Remove with confirmation:
  - Modal: "Delete section '[title]' and all [N] questions? This cannot be undone."
  - Lists question count
  - Confirm / Cancel buttons
**4. Collapse/Expand** - Toggle section visibility in editor:
  - Chevron icon (▼ expanded, ▶ collapsed)
  - Collapsed shows section title + question count only
  - Saves state (persists across page reloads)

### Bulk Operations
- **Select multiple questions** (Shift+Click, Cmd/Ctrl+Click)
- **Bulk actions toolbar** (appears when >1 question selected):
  - Delete selected (confirmation modal)
  - Move to section (dropdown selector)
  - Duplicate selected (creates copies below)
  - Copy/paste between sections
- **Keyboard shortcuts**:
  - Cmd/Ctrl+A → Select all questions in section
  - Cmd/Ctrl+C → Copy selected questions
  - Cmd/Ctrl+V → Paste questions
  - Delete/Backspace → Delete selected questions (with confirmation)

---

## 8. Validation System

### Field-Level Validation (Question Configuration)

**Required Field**
- Toggle in Properties Panel
- Red asterisk (*) indicator
- Error message: "This field is required"

**Text Validation**
- Min length (characters)
- Max length (characters)
- Custom regex pattern (with description)
- Error messages customizable

**Number Validation**
- Min value
- Max value
- Step increment (e.g., must be multiple of 5)
- Integer only (no decimals)
- Error messages: "Must be between {min} and {max}"

**Format Validation**
- **Email**: RFC 5322 regex
- **Phone**: North American format (###) ###-####
- **URL**: Valid URL with protocol
- **Currency**: Decimal places, positive/negative
- Error messages: "Please enter a valid {format}"

**Selection Validation (Multi-select)**
- Min selections required (e.g., "Choose at least 2")
- Max selections allowed (e.g., "Choose up to 5")
- Error messages: "Select between {min} and {max} options"

### Form-Level Validation (Before Submission)
- All required fields completed
- All field-level validations passed
- Conditional logic resolved (no hidden required fields)
- No circular dependencies in conditional logic
- Dynamic fields resolve to valid records

### Validation Errors Display
- **Inline errors**: Below each question (red text + icon)
- **Summary errors**: Top of form (error count + list)
- **Scroll to first error**: Auto-scroll on submit attempt
- **Field highlighting**: Red border on invalid fields
- **Real-time validation**: As user types (debounced 500ms)
- **Submit button disabled**: Until all validations pass

---

## 9. Form Publishing & Versioning

### Draft Mode
- Default state for new forms
- **Properties**:
  - `is_published = false`
  - `published_at = NULL`
  - `valid_until = NULL`
- **Capabilities**:
  - Fully editable (all changes allowed)
  - Preview available (test mode)
  - Not visible to end users (companies)
  - Not triggering update requests
- **UI Indicator**: "Draft" badge (gray)

### Published Mode
- Activated by "Publish" button (confirmation modal)
- **Properties**:
  - `is_published = true`
  - `published_at = NOW()`
  - `valid_from = NOW()`
  - `valid_until = NULL` (current version)
- **Capabilities**:
  - Limited editing (cosmetic changes only: title, description, help text)
  - Structural changes → Creates new version
  - Public access via URL (if program allows)
  - Triggers update requests (based on schedule)
  - Submissions tracked
  - Analytics available
- **UI Indicator**: "Published" badge (green)

### Temporal Versioning Model

**Version Creation Rules:**
1. **First publish**: Version 1, `original_form_id = NULL`
2. **Structural change to published form**:
   - Close current version: Set `valid_until = NOW()`
   - Create new version:
     - `version = old_version + 1`
     - `original_form_id = first_version_id`
     - `valid_from = NOW()`
     - `valid_until = NULL`
   - Copy all properties from old version (as starting point)
   - Apply changes

**Structural Changes (Trigger Versioning):**
- Add/remove/reorder sections
- Add/remove/reorder questions
- Change question type
- Change validation rules
- Change conditional logic
- Change required flag
- Add/remove options (select/multi-select)

**Cosmetic Changes (No Versioning):**
- Update form title
- Update form description
- Update question text (wording clarification)
- Update help text
- Update success message

**Version History UI:**
- Timeline view (vertical list)
- Each version shows:
  - Version number (v1, v2, v3...)
  - Valid date range (from - until)
  - Created by (user name)
  - Change summary (e.g., "Added 3 questions", "Removed 'Funding' section")
  - Submission count (forms submitted with this version)
- Click version → View-only mode (historical snapshot)
- Cannot edit historical versions
- Cannot revert to old version (create new version with old structure instead)

**Querying Current Version:**
```sql
SELECT * FROM forms
WHERE (original_form_id = 'xxx' OR id = 'xxx')
  AND valid_until IS NULL;
```

**Querying Historical Versions:**
```sql
SELECT * FROM forms
WHERE (original_form_id = 'xxx' OR id = 'xxx')
  AND valid_until IS NOT NULL
ORDER BY version DESC;
```

---

## 10. Form Submissions

### Submission Flow

**1. Company Receives Update Request**
- Email notification (if enabled)
- Dashboard alert ("3 pending updates")
- Form list page (status: Pending, Overdue, Completed)

**2. Company Opens Form**
- Form displays with current version structure
- Progress indicator (% complete)
- Save draft button (partial progress)
- Questions shown/hidden based on conditional logic

**3. Company Completes Form**
- Real-time validation as they type
- Inline error messages for invalid fields
- Cannot submit until all validations pass
- Submit button enabled when complete

**4. Submission Saved**
- **Lightweight snapshot** created:
  - Form title, version number
  - Question IDs, text, and types (for display)
  - No full `form_data` (reduces duplication)
- **User answers** stored in `submission_data` JSONB:
  ```json
  {
    "q1": "Series A",
    "q2": 150000,
    "q3": "yes",
    "q4": "2026-03-15"
  }
  ```
- **Immutable**: Cannot edit after submission
- **Status**: Changed from `draft` → `submitted`
- **Timestamp**: `submitted_at = NOW()`

**5. Confirmation**
- Success page with custom success message
- Email confirmation sent (if configured)
- Redirect to dashboard (5-second countdown)

### Draft Submissions
- **Auto-save** as company fills form (every 30 seconds)
- **Status**: `draft`
- **Properties**:
  - `submitted_at = NULL`
  - `status = 'draft'`
- **Editable**: Company can return and continue
- **Expiration**: Draft deleted after 90 days (cleanup job)
- **Recovery**: "You have an incomplete form from [date]. Continue?"

### Viewing Submissions (Program Manager)

**Submission Detail Page:**
- Form title + version number
- Submission date and time
- Company name (link to company detail)
- Submitted by (user name)
- All questions and answers (formatted display):
  - Question text from snapshot
  - Answer formatted by question type
  - Conditional questions shown/hidden based on submission data
- Export button (PDF, CSV)
- No edit capability (read-only)

**Submission List Page:**
- Table view with columns:
  - Company name
  - Form title
  - Submission date
  - Status (Submitted, Draft)
  - Version number
- Filters:
  - Program
  - Form
  - Date range
  - Company
- Search by company name
- Sort by date (newest first)
- Pagination (50 per page)

---

## 11. Program Association & Scheduling

### Program Connection
- Form linked to program via `program_id`
- One form can serve one program
- One program can have multiple forms (e.g., Monthly Update, Quarterly Update, Exit Survey)

### Company Enrollment
- Track in `company_program_enrollments` table:
  - `company_id`
  - `program_id`
  - `start_date` (when they joined)
  - `end_date` (when they graduated/left, nullable)
- **Rule**: Company receives update requests only if:
  - Enrolled in program (enrollment exists)
  - Current date is between `start_date` and `end_date` (or `end_date` is NULL)

### Update Frequency
- Configured at form level: `update_frequency` (integer, days)
- **Examples**:
  - 30 days → Monthly updates
  - 60 days → Bi-monthly updates
  - 90 days → Quarterly updates
  - 7 days → Weekly updates (for intensive programs)
- **Calculation**:
  - First update: `enrollment.start_date + update_frequency`
  - Subsequent: `last_submission.submitted_at + update_frequency`
- **Overdue Detection**:
  - Due date: `expected_date`
  - Overdue if: `TODAY() > expected_date` and no submission

### Reminder Frequency
- Configured at form level: `reminder_frequency` (integer, days before due)
- **Examples**:
  - 7 days → Remind 1 week before due
  - 14 days → Remind 2 weeks before due
  - 3 days → Remind 3 days before due
- **Calculation**:
  - Reminder date: `due_date - reminder_frequency`
  - Send if: `TODAY() >= reminder_date` and no submission
- **Escalation**:
  - First reminder: `due_date - reminder_frequency`
  - Second reminder: `due_date - 3 days`
  - Final reminder: `due_date - 1 day`
  - Overdue reminder: `due_date + 3 days` (if still not submitted)

### Reminder Tracking
- `update_form_reminders` table tracks each reminder:
  - `form_id` (which form)
  - `company_id` (which company)
  - `contact_id` (who received email)
  - `sent_at` (when reminder sent)
  - `email_opened` (boolean, from email tracking)
  - `email_opened_at` (timestamp)
  - `form_submitted` (boolean, did they submit?)
  - `form_submitted_at` (timestamp)
  - `reminder_count` (how many reminders sent for this update request)

**Analytics Use:**
- Reminder effectiveness (open rate, submission rate)
- Average time from reminder to submission
- Companies requiring multiple reminders (engagement issue?)

---

## 12. Data Storage

### Database Schema (Supabase)

#### Forms Table (Versioned)
```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Basic info
  title TEXT NOT NULL,
  description TEXT,

  -- Question structure (JSONB)
  form_data JSONB NOT NULL,

  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  original_form_id UUID REFERENCES forms(id),

  -- Temporal validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,  -- NULL = current version

  -- Publishing
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,

  -- Program association
  program_id UUID REFERENCES programs(id),

  -- Scheduling
  update_frequency INTEGER,  -- Days between updates
  reminder_frequency INTEGER,  -- Days before due to remind

  -- Success message
  success_message TEXT DEFAULT 'Thank you for your submission!',

  -- Email notifications
  email_notifications JSONB DEFAULT '{"enabled": false, "recipients": []}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- RLS Policy
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant's forms"
  ON forms FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_forms_tenant ON forms(tenant_id);
CREATE INDEX idx_forms_program ON forms(program_id);
CREATE INDEX idx_forms_temporal ON forms(valid_from, valid_until);
CREATE UNIQUE INDEX idx_forms_active_version
  ON forms(COALESCE(original_form_id, id), tenant_id)
  WHERE valid_until IS NULL;
CREATE INDEX idx_forms_published ON forms(is_published) WHERE is_published = true;
```

#### Form Data JSONB Structure
```typescript
{
  sections: [
    {
      id: "uuid",
      title: "Company Traction",
      isExpanded: true,
      questions: [
        {
          id: "uuid",
          type: "select",
          text: "Current growth stage",
          helpText: "Select the stage that best describes your company",
          required: true,
          options: ["Idea", "MVP", "Launch", "Growth", "Scaling"],
          validation: {},
          conditionalLogic: null,
          layout: "full"  // full | half | third
        },
        {
          id: "uuid",
          type: "number",
          text: "Total customers",
          helpText: null,
          required: true,
          validation: {
            min: 0,
            max: 1000000
          },
          conditionalLogic: {
            questionId: "previous-question-uuid",
            operator: "equals",
            value: "Growth"
          },
          layout: "half"
        }
      ]
    }
  ]
}
```

#### Form Submissions Table
```sql
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  form_id UUID NOT NULL REFERENCES forms(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Lightweight snapshot (for display)
  form_snapshot JSONB NOT NULL,

  -- User's answers
  submission_data JSONB NOT NULL,

  -- Submission metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant's submissions"
  ON form_submissions FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_submissions_tenant ON form_submissions(tenant_id);
CREATE INDEX idx_submissions_form ON form_submissions(form_id);
CREATE INDEX idx_submissions_company ON form_submissions(company_id);
CREATE INDEX idx_submissions_status ON form_submissions(status);
CREATE INDEX idx_submissions_submitted ON form_submissions(submitted_at)
  WHERE status = 'submitted';
```

#### Form Snapshot JSONB Structure
```typescript
{
  title: "Q1 2026 Update",
  version: 2,
  questions: [
    {
      id: "uuid",
      text: "Current growth stage",
      type: "select"
    },
    {
      id: "uuid",
      text: "Total customers",
      type: "number"
    }
  ]
}
```

#### Submission Data JSONB Structure
```typescript
{
  "question-uuid-1": "Growth",
  "question-uuid-2": 1250,
  "question-uuid-3": "yes",
  "question-uuid-4": "2026-03-15"
}
```

#### Update Form Reminders Table
```sql
CREATE TABLE update_form_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),

  -- Reminder tracking
  due_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  email_opened BOOLEAN DEFAULT FALSE,
  email_opened_at TIMESTAMPTZ,
  form_submitted BOOLEAN DEFAULT FALSE,
  form_submitted_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE update_form_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant's reminders"
  ON update_form_reminders FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Indexes
CREATE INDEX idx_reminders_tenant ON update_form_reminders(tenant_id);
CREATE INDEX idx_reminders_company ON update_form_reminders(company_id);
CREATE INDEX idx_reminders_due_date ON update_form_reminders(due_date);
CREATE INDEX idx_reminders_pending ON update_form_reminders(form_submitted)
  WHERE form_submitted = false;
```

#### Backward Compatibility (BAI Compliance)
```sql
-- Keep company_updates table, add optional link to form submissions
ALTER TABLE company_updates
ADD COLUMN form_submission_id UUID REFERENCES form_submissions(id);

CREATE INDEX idx_company_updates_submission ON company_updates(form_submission_id);

-- Migration strategy:
-- 1. Existing company_updates rows remain as-is (manual entry)
-- 2. New form submissions can optionally create company_updates row
-- 3. BAI reports query both tables (UNION)
```

---

## 13. Technical Architecture

### Component Hierarchy

```
app/forms/[formId]/builder/page.tsx (Route Handler)
└── FormBuilderLayout (3-panel container)
    ├── TemplatePanel (left panel)
    │   ├── QuestionTypeCategory
    │   │   └── QuestionTypeButton
    │   └── SearchQuestionTypes
    │
    ├── ResponsiveFormBuilder (center panel)
    │   ├── FormHeader (title, description, actions)
    │   ├── DeviceDetector (determines desktop vs mobile)
    │   ├── DraggableSectionList (desktop only)
    │   │   └── Section
    │   │       ├── SectionHeader (drag handle, title, actions)
    │   │       └── DraggableQuestionList
    │   │           └── QuestionCard (13 types)
    │   │               ├── QuestionHeader (drag handle, type badge)
    │   │               ├── QuestionPreview (based on type)
    │   │               └── QuestionActions (duplicate, delete)
    │   └── MobileSectionList (mobile only)
    │       └── Section
    │           ├── SectionHeader (arrows, title, actions)
    │           └── MobileQuestionList
    │               └── QuestionCard
    │                   ├── QuestionHeader (arrows, type badge)
    │                   └── QuestionPreview
    │
    └── PropertiesPanel (right panel)
        ├── FormProperties (when no selection)
        ├── SectionProperties (when section selected)
        └── QuestionProperties (when question selected)
            ├── BasicSettings (text, help, required)
            ├── TypeSpecificConfig (options, format, etc.)
            ├── ValidationRules (min/max, regex)
            ├── ConditionalLogicBuilder
            │   └── RuleRow (question, operator, value, and/or)
            └── LayoutOptions (full/half/third)
```

### Key Custom Hooks

**`useAutoSave(formData, formId, debounceMs = 1000)`**
- Debounced auto-save to server
- localStorage backup on every change
- Error handling with toast notifications
- Returns: `{ isSaving, lastSaved, error, manualSave }`

**`useMobileDetect()`**
- Detects device type based on viewport width
- Updates on window resize (debounced)
- Returns: `{ isMobile, isTablet, isDesktop }`

**`useConditionEvaluation(questions, answers)`**
- Evaluates conditional logic in real-time
- Returns map of question IDs to visibility state
- Prevents infinite loops (circular dependency detection)
- Returns: `{ visibleQuestions, hasCircularDependency }`

**`useFormVersioning(formId)`**
- Manages form versioning logic
- Detects structural vs cosmetic changes
- Handles version creation
- Returns: `{ currentVersion, versions, createNewVersion, isVersioningChange }`

**`useFormBuilder(formId)`**
- Main state management hook
- Combines all form builder state
- Provides actions (add/remove/reorder sections/questions)
- Returns: `{ form, sections, selectedItem, actions, autoSave }`

### State Management

**Local React State:**
- Form structure (sections, questions)
- Selected item (section/question)
- Drag state (isDragging, draggedItem)
- UI state (panel visibility, modals)

**Server State (Supabase):**
- Persisted form data
- Form submissions
- User preferences

**Optimistic Updates:**
- Update UI immediately
- Save to server in background
- Revert on error

**localStorage:**
- Draft backups
- User preferences (panel widths, collapsed sections)
- Recent forms list

### Libraries Used

**Core:**
- `@hello-pangea/dnd` - Drag-and-drop
- `@supabase/supabase-js` - Database client
- `@supabase/ssr` - Server-side rendering support
- `zod` - Schema validation
- `react-hook-form` - Form handling

**UI Components:**
- `shadcn/ui` - Base component library
- `sonner` - Toast notifications
- `lucide-react` - Icons
- `@radix-ui/react-*` - Primitives (via shadcn)

**Utilities:**
- `date-fns` - Date manipulation
- `uuid` - UUID generation
- `lodash` - Utility functions (debounce, cloneDeep)

---

## 14. Data Access Layer (DAL) Pattern

All data access goes through DAL functions (not direct Supabase queries in components).

### lib/dal/forms.ts

```typescript
import { requireAuth } from './shared'
import { createClient } from '@/utils/supabase/server'

// Get current version of forms (active only)
export async function getForms(programId?: string) {
  const { supabase } = await requireAuth()

  let query = supabase
    .from('forms')
    .select('*')
    .is('valid_until', null)  // Only current versions
    .order('created_at', { ascending: false })

  if (programId) {
    query = query.eq('program_id', programId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Get single form by ID
export async function getForm(formId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (error) throw error
  return data
}

// Create new form (version 1)
export async function createForm(data: CreateFormInput) {
  const { supabase, user } = await requireAuth()
  const tenantId = user.tenant_id

  const { data: form, error } = await supabase
    .from('forms')
    .insert({
      tenant_id: tenantId,
      title: data.title,
      description: data.description,
      form_data: data.form_data,
      program_id: data.program_id,
      update_frequency: data.update_frequency,
      reminder_frequency: data.reminder_frequency,
      version: 1,
      valid_from: new Date().toISOString(),
      valid_until: null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return form
}

// Update form (creates new version if published and structural change)
export async function updateForm(
  formId: string,
  updates: UpdateFormInput,
  isStructuralChange: boolean
) {
  const { supabase, user } = await requireAuth()

  // Get current version
  const { data: current, error: fetchError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (fetchError) throw fetchError
  if (!current) throw new Error('Form not found')

  // If unpublished OR cosmetic change, update in place
  if (!current.is_published || !isStructuralChange) {
    const { data, error } = await supabase
      .from('forms')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', formId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Published + structural change → Create new version
  const now = new Date().toISOString()

  // Close current version
  await supabase
    .from('forms')
    .update({ valid_until: now })
    .eq('id', formId)

  // Create new version
  const { data: newVersion, error } = await supabase
    .from('forms')
    .insert({
      tenant_id: current.tenant_id,
      title: updates.title || current.title,
      description: updates.description || current.description,
      form_data: updates.form_data || current.form_data,
      program_id: current.program_id,
      update_frequency: current.update_frequency,
      reminder_frequency: current.reminder_frequency,
      success_message: updates.success_message || current.success_message,
      email_notifications: updates.email_notifications || current.email_notifications,
      version: current.version + 1,
      original_form_id: current.original_form_id || current.id,
      is_published: true,
      published_at: current.published_at,
      valid_from: now,
      valid_until: null,
      created_by: user.id
    })
    .select()
    .single()

  if (error) throw error
  return newVersion
}

// Publish form
export async function publishForm(formId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('forms')
    .update({
      is_published: true,
      published_at: new Date().toISOString()
    })
    .eq('id', formId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get form versions (history)
export async function getFormVersions(originalFormId: string) {
  const { supabase } = await requireAuth()

  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .or(`id.eq.${originalFormId},original_form_id.eq.${originalFormId}`)
    .order('version', { ascending: false })

  if (error) throw error
  return data
}

// Submit form
export async function submitForm(
  formId: string,
  companyId: string,
  submissionData: Record<string, any>
) {
  const { supabase, user } = await requireAuth()
  const tenantId = user.tenant_id

  // Get current form version
  const { data: form, error: formError } = await supabase
    .from('forms')
    .select('*')
    .eq('id', formId)
    .single()

  if (formError) throw formError
  if (!form) throw new Error('Form not found')

  // Create lightweight snapshot
  const snapshot = {
    title: form.title,
    version: form.version,
    questions: form.form_data.sections.flatMap((s: any) =>
      s.questions.map((q: any) => ({
        id: q.id,
        text: q.text,
        type: q.type
      }))
    )
  }

  // Save submission
  const { data: submission, error } = await supabase
    .from('form_submissions')
    .insert({
      form_id: formId,
      tenant_id: tenantId,
      company_id: companyId,
      form_snapshot: snapshot,
      submission_data: submissionData,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      submitted_by: user.id
    })
    .select()
    .single()

  if (error) throw error

  // Update reminder (mark as submitted)
  await supabase
    .from('update_form_reminders')
    .update({
      form_submitted: true,
      form_submitted_at: new Date().toISOString()
    })
    .eq('form_id', formId)
    .eq('company_id', companyId)
    .is('form_submitted', false)

  return submission
}

// Save draft submission
export async function saveDraftSubmission(
  formId: string,
  companyId: string,
  submissionData: Record<string, any>
) {
  const { supabase, user } = await requireAuth()
  const tenantId = user.tenant_id

  // Check for existing draft
  const { data: existing } = await supabase
    .from('form_submissions')
    .select('id')
    .eq('form_id', formId)
    .eq('company_id', companyId)
    .eq('status', 'draft')
    .single()

  if (existing) {
    // Update existing draft
    const { data, error } = await supabase
      .from('form_submissions')
      .update({
        submission_data: submissionData,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Create new draft
    const { data: form } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .single()

    const snapshot = {
      title: form.title,
      version: form.version,
      questions: form.form_data.sections.flatMap((s: any) =>
        s.questions.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type
        }))
      )
    }

    const { data, error } = await supabase
      .form('form_submissions')
      .insert({
        form_id: formId,
        tenant_id: tenantId,
        company_id: companyId,
        form_snapshot: snapshot,
        submission_data: submissionData,
        status: 'draft',
        submitted_by: user.id
      })
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// Get pending updates for a company
export async function getPendingUpdates(companyId: string) {
  const { supabase } = await requireAuth()

  // Get company enrollments
  const { data: enrollments } = await supabase
    .from('company_program_enrollments')
    .select('program_id, start_date, end_date')
    .eq('company_id', companyId)
    .or('end_date.is.null,end_date.gte.' + new Date().toISOString())

  if (!enrollments || enrollments.length === 0) return []

  const programIds = enrollments.map(e => e.program_id)

  // Get forms for those programs
  const { data: forms } = await supabase
    .from('forms')
    .select('*')
    .in('program_id', programIds)
    .eq('is_published', true)
    .is('valid_until', null)

  if (!forms) return []

  // For each form, check if update is due
  const pendingUpdates = []

  for (const form of forms) {
    // Get last submission
    const { data: lastSubmission } = await supabase
      .from('form_submissions')
      .select('submitted_at')
      .eq('form_id', form.id)
      .eq('company_id', companyId)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    // Calculate due date
    const enrollment = enrollments.find(e => e.program_id === form.program_id)
    let dueDate: Date

    if (lastSubmission) {
      dueDate = new Date(lastSubmission.submitted_at)
      dueDate.setDate(dueDate.getDate() + form.update_frequency)
    } else {
      dueDate = new Date(enrollment.start_date)
      dueDate.setDate(dueDate.getDate() + form.update_frequency)
    }

    // Check if due
    if (dueDate <= new Date()) {
      pendingUpdates.push({
        form,
        dueDate,
        isOverdue: dueDate < new Date()
      })
    }
  }

  return pendingUpdates
}
```

---

## 15. Validation Schemas (Zod)

### lib/schemas/form.ts

```typescript
import { z } from 'zod'

// Question type enum (13 types)
export const questionTypeEnum = z.enum([
  'text',
  'textarea',
  'number',
  'currency',
  'select',
  'multiselect',
  'yesno',
  'date',
  'email',
  'phone',
  'url',
  'dynamic_company',
  'dynamic_contact'
])

// Conditional logic operators (7 types)
export const conditionOperatorEnum = z.enum([
  'equals',
  'not_equals',
  'contains',
  'is_empty',
  'is_not_empty',
  'greater_than',
  'less_than'
])

// Validation rules
export const validationSchema = z.object({
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minSelections: z.number().int().positive().optional(),
  maxSelections: z.number().int().positive().optional(),
  regex: z.string().optional(),
  regexDescription: z.string().optional(),
  format: z.enum(['currency', 'email', 'phone', 'url']).optional()
}).optional()

// Conditional logic
export const conditionalLogicSchema = z.object({
  questionId: z.string().uuid(),
  operator: conditionOperatorEnum,
  value: z.any().optional(),  // Optional for is_empty/is_not_empty
  logicalOperator: z.enum(['AND', 'OR']).optional()  // For multiple conditions
}).optional()

// Question schema
export const questionSchema = z.object({
  id: z.string().uuid(),
  type: questionTypeEnum,
  text: z.string().min(1, 'Question text is required'),
  helpText: z.string().optional(),
  required: z.boolean().default(false),

  // Options (for select, multiselect)
  options: z.array(z.string()).optional(),

  // Validation rules
  validation: validationSchema,

  // Conditional logic
  conditionalLogic: conditionalLogicSchema,

  // Layout
  layout: z.enum(['full', 'half', 'third']).default('full')
})

// Section schema
export const sectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Section title is required'),
  isExpanded: z.boolean().default(true),
  questions: z.array(questionSchema)
})

// Form data (sections array)
export const formDataSchema = z.object({
  sections: z.array(sectionSchema)
})

// Email notifications config
export const emailNotificationsSchema = z.object({
  enabled: z.boolean().default(false),
  recipients: z.array(z.string().email())
})

// Create form input
export const createFormSchema = z.object({
  title: z.string().min(1, 'Form title is required').max(255),
  description: z.string().optional(),
  program_id: z.string().uuid().optional(),
  form_data: formDataSchema,
  update_frequency: z.number().int().min(1).max(365).optional(),
  reminder_frequency: z.number().int().min(1).max(30).optional(),
  success_message: z.string().optional(),
  email_notifications: emailNotificationsSchema.optional()
})

// Update form input (partial)
export const updateFormSchema = createFormSchema.partial()

// Submit form input
export const submitFormSchema = z.object({
  formId: z.string().uuid(),
  companyId: z.string().uuid(),
  submissionData: z.record(z.any())
})

// Export types
export type QuestionType = z.infer<typeof questionTypeEnum>
export type ConditionOperator = z.infer<typeof conditionOperatorEnum>
export type Question = z.infer<typeof questionSchema>
export type Section = z.infer<typeof sectionSchema>
export type FormData = z.infer<typeof formDataSchema>
export type CreateFormInput = z.infer<typeof createFormSchema>
export type UpdateFormInput = z.infer<typeof updateFormSchema>
export type SubmitFormInput = z.infer<typeof submitFormSchema>
```

---

## 16. User Stories with Test-Driven Acceptance Criteria

### Story 1: Form Builder Core

**As a** program manager
**I want to** create and edit update forms with custom questions, sections, and validation rules
**So that** I can tailor data collection to my program's specific needs

**Acceptance Criteria:**

✅ **AC1**: Can create new form with title, description, and program association
```typescript
test('creates form with basic properties', async () => {
  const form = await createForm({
    title: 'Q1 2026 Update',
    description: 'Quarterly update for portfolio companies',
    program_id: 'test-program-id'
  })

  expect(form.title).toBe('Q1 2026 Update')
  expect(form.program_id).toBe('test-program-id')
  expect(form.version).toBe(1)
  expect(form.is_published).toBe(false)
  expect(form.valid_until).toBeNull()
})
```

✅ **AC2**: Can add sections to organize questions logically
```typescript
test('adds multiple sections to form', async () => {
  const form = await createForm({
    title: 'Update Form',
    form_data: {
      sections: [
        { id: uuid(), title: 'Traction', questions: [] },
        { id: uuid(), title: 'Fundraising', questions: [] },
        { id: uuid(), title: 'Team', questions: [] }
      ]
    }
  })

  expect(form.form_data.sections).toHaveLength(3)
  expect(form.form_data.sections[0].title).toBe('Traction')
})
```

✅ **AC3**: Can add all 13 question types with proper configuration
```typescript
test('creates form with all question types', async () => {
  const allTypes: QuestionType[] = [
    'text', 'textarea', 'number', 'currency',
    'select', 'multiselect', 'yesno', 'date',
    'email', 'phone', 'url',
    'dynamic_company', 'dynamic_contact'
  ]

  const questions = allTypes.map((type, i) => ({
    id: uuid(),
    type,
    text: `Question ${i + 1}`,
    required: false
  }))

  const form = await createForm({
    title: 'All Question Types Test',
    form_data: {
      sections: [{ id: uuid(), title: 'Test', questions }]
    }
  })

  const createdTypes = form.form_data.sections[0].questions.map(q => q.type)
  expect(createdTypes).toEqual(allTypes)
})
```

✅ **AC4**: Can configure validation rules (required, min/max, regex)
```typescript
test('applies validation rules to questions', async () => {
  const form = await createForm({
    form_data: {
      sections: [{
        id: uuid(),
        title: 'Test',
        questions: [
          {
            id: uuid(),
            type: 'text',
            text: 'Company Name',
            required: true,
            validation: { minLength: 2, maxLength: 100 }
          },
          {
            id: uuid(),
            type: 'number',
            text: 'Revenue',
            required: false,
            validation: { min: 0, max: 10000000 }
          }
        ]
      }]
    }
  })

  const questions = form.form_data.sections[0].questions
  expect(questions[0].required).toBe(true)
  expect(questions[0].validation.minLength).toBe(2)
  expect(questions[1].validation.min).toBe(0)
})
```

✅ **AC5**: Can set conditional logic (show question X only if question Y = value Z)
```typescript
test('applies conditional logic to questions', async () => {
  const q1Id = uuid()
  const form = await createForm({
    form_data: {
      sections: [{
        id: uuid(),
        title: 'Fundraising',
        questions: [
          {
            id: q1Id,
            type: 'yesno',
            text: 'Are you fundraising?',
            required: true
          },
          {
            id: uuid(),
            type: 'currency',
            text: 'Target raise amount',
            required: false,
            conditionalLogic: {
              questionId: q1Id,
              operator: 'equals',
              value: 'yes'
            }
          }
        ]
      }]
    }
  })

  const conditionalQ = form.form_data.sections[0].questions[1]
  expect(conditionalQ.conditionalLogic.questionId).toBe(q1Id)
  expect(conditionalQ.conditionalLogic.operator).toBe('equals')
})
```

✅ **AC6**: Can reorder sections and questions via drag-and-drop
```typescript
test('reorders sections within form', async () => {
  const form = await createForm({
    form_data: {
      sections: [
        { id: 's1', title: 'Section 1', questions: [] },
        { id: 's2', title: 'Section 2', questions: [] },
        { id: 's3', title: 'Section 3', questions: [] }
      ]
    }
  })

  // Simulate drag-and-drop: move Section 3 to position 0
  const reordered = [
    form.form_data.sections[2],
    form.form_data.sections[0],
    form.form_data.sections[1]
  ]

  const updated = await updateForm(form.id, {
    form_data: { sections: reordered }
  }, false)

  expect(updated.form_data.sections[0].id).toBe('s3')
  expect(updated.form_data.sections[1].id).toBe('s1')
})
```

✅ **AC7**: Can preview form before publishing
```typescript
test('renders form preview with all questions', () => {
  const form = {
    title: 'Test Form',
    form_data: {
      sections: [{
        title: 'Section 1',
        questions: [
          { id: 'q1', type: 'text', text: 'Question 1', required: true },
          { id: 'q2', type: 'number', text: 'Question 2', required: false }
        ]
      }]
    }
  }

  const { container } = render(<FormPreview form={form} />)

  expect(screen.getByText('Test Form')).toBeInTheDocument()
  expect(screen.getByText('Question 1')).toBeInTheDocument()
  expect(screen.getByText('Question 2')).toBeInTheDocument()
  expect(screen.getByText('*')).toBeInTheDocument()  // Required indicator
})
```

✅ **AC8**: Can save form as draft (unpublished)
```typescript
test('saves form as draft by default', async () => {
  const form = await createForm({
    title: 'Draft Form',
    form_data: { sections: [] }
  })

  expect(form.is_published).toBe(false)
  expect(form.published_at).toBeNull()
  expect(form.valid_until).toBeNull()
})
```

✅ **AC9**: Can publish form to make it available for submissions
```typescript
test('publishes form and sets published_at timestamp', async () => {
  const form = await createForm({
    title: 'Test Form',
    form_data: { sections: [] }
  })

  const beforePublish = new Date()
  const published = await publishForm(form.id)
  const afterPublish = new Date()

  expect(published.is_published).toBe(true)
  expect(new Date(published.published_at)).toBeGreaterThanOrEqual(beforePublish)
  expect(new Date(published.published_at)).toBeLessThanOrEqual(afterPublish)
})
```

---

### Story 2: Form Versioning

**As a** program manager
**I want to** update an existing form without losing historical submission context
**So that** past submissions still display correctly and audit trails remain intact

**Acceptance Criteria:**

✅ **AC1**: Updating published form creates new version automatically
```typescript
test('creates new version when updating published form structure', async () => {
  const v1 = await createForm({ title: 'Form V1' })
  await publishForm(v1.id)

  const beforeUpdate = new Date()
  const v2 = await updateForm(v1.id, {
    form_data: {
      sections: [{
        id: uuid(),
        title: 'New Section',
        questions: []
      }]
    }
  }, true)  // true = structural change
  const afterUpdate = new Date()

  // Verify new version created
  expect(v2.version).toBe(2)
  expect(v2.original_form_id).toBe(v1.id)
  expect(v2.valid_until).toBeNull()

  // Verify old version closed
  const v1Updated = await getForm(v1.id)
  expect(v1Updated.valid_until).toBeGreaterThanOrEqual(beforeUpdate)
  expect(v1Updated.valid_until).toBeLessThanOrEqual(afterUpdate)
})
```

✅ **AC2**: Previous version marked with `valid_until` timestamp
```typescript
test('marks previous version with valid_until on structural change', async () => {
  const v1 = await createForm({ title: 'Form' })
  await publishForm(v1.id)

  const now = new Date()
  await updateForm(v1.id, { form_data: { sections: [] } }, true)

  const oldVersion = await getForm(v1.id)
  expect(oldVersion.valid_until).not.toBeNull()
  expect(new Date(oldVersion.valid_until)).toBeGreaterThanOrEqual(now)
})
```

✅ **AC3**: New version marked with `valid_from` timestamp and `valid_until = NULL`
```typescript
test('new version has valid_from and valid_until = NULL', async () => {
  const v1 = await createForm({ title: 'Form' })
  await publishForm(v1.id)

  const now = new Date()
  const v2 = await updateForm(v1.id, { form_data: { sections: [] } }, true)

  expect(new Date(v2.valid_from)).toBeGreaterThanOrEqual(now)
  expect(v2.valid_until).toBeNull()
})
```

✅ **AC4**: UI shows only current version (WHERE `valid_until IS NULL`)
```typescript
test('getForms returns only current versions', async () => {
  const v1 = await createForm({ title: 'Form A' })
  await publishForm(v1.id)
  await updateForm(v1.id, { form_data: { sections: [] } }, true)  // Creates v2

  const forms = await getForms()

  // Should only include v2 (current version)
  expect(forms).toHaveLength(1)
  expect(forms[0].version).toBe(2)
  expect(forms[0].valid_until).toBeNull()
})
```

✅ **AC5**: Historical submissions reference their original form version
```typescript
test('submission references active form version at time of submission', async () => {
  const v1 = await createForm({ title: 'Form' })
  await publishForm(v1.id)

  const submission1 = await submitForm(v1.id, 'company-id', { q1: 'answer' })

  const v2 = await updateForm(v1.id, { form_data: { sections: [] } }, true)

  const submission2 = await submitForm(v2.id, 'company-id', { q1: 'answer' })

  expect(submission1.form_id).toBe(v1.id)
  expect(submission2.form_id).toBe(v2.id)
  expect(submission1.form_id).not.toBe(submission2.form_id)
})
```

✅ **AC6**: Can view form version history (list of changes over time)
```typescript
test('retrieves all versions for a form', async () => {
  const v1 = await createForm({ title: 'Form' })
  await publishForm(v1.id)

  await updateForm(v1.id, { form_data: { sections: [] } }, true)  // v2
  await updateForm(v1.id, { form_data: { sections: [] } }, true)  // v3

  const versions = await getFormVersions(v1.id)

  expect(versions).toHaveLength(3)
  expect(versions.map(v => v.version)).toEqual([3, 2, 1])  // Descending order
})
```

✅ **AC7**: Cannot delete published form versions (soft delete only)
```typescript
test('soft deletes published form instead of hard delete', async () => {
  const form = await createForm({ title: 'Form' })
  await publishForm(form.id)

  await softDeleteForm(form.id)

  const deleted = await getForm(form.id)
  expect(deleted.deleted_at).not.toBeNull()
  expect(deleted).toBeDefined()  // Still exists in DB
})
```

✅ **AC8**: Version number auto-increments (v1, v2, v3...)
```typescript
test('version numbers increment sequentially', async () => {
  const v1 = await createForm({ title: 'Form' })
  await publishForm(v1.id)

  const v2 = await updateForm(v1.id, { form_data: { sections: [] } }, true)
  const v3 = await updateForm(v2.id, { form_data: { sections: [] } }, true)

  expect(v1.version).toBe(1)
  expect(v2.version).toBe(2)
  expect(v3.version).toBe(3)
})
```

---

### Story 3: Form Submissions

**As a** portfolio company founder
**I want to** receive and submit update forms for programs I'm enrolled in
**So that** I can provide progress updates to my accelerator/incubator

**Acceptance Criteria:**

✅ **AC1**: Can view list of pending update forms
```typescript
test('retrieves pending updates for enrolled company', async () => {
  const program = await createProgram({ name: 'Accelerator 2026' })
  const company = await createCompany({ name: 'Startup Inc' })

  await enrollCompany(program.id, company.id, {
    start_date: '2026-01-01',
    end_date: '2026-06-30'
  })

  const form = await createForm({
    title: 'Monthly Update',
    program_id: program.id,
    update_frequency: 30
  })
  await publishForm(form.id)

  // Simulate 30 days passing
  const pending = await getPendingUpdates(company.id)

  expect(pending).toHaveLength(1)
  expect(pending[0].form.id).toBe(form.id)
})
```

✅ **AC2**: Form validates answers before submission
```typescript
test('prevents submission with missing required fields', async () => {
  const form = await createForm({
    form_data: {
      sections: [{
        id: uuid(),
        title: 'Test',
        questions: [
          { id: 'q1', type: 'text', text: 'Company Name', required: true },
          { id: 'q2', type: 'number', text: 'Revenue', required: false }
        ]
      }]
    }
  })
  await publishForm(form.id)

  await expect(
    submitForm(form.id, 'company-id', { q2: 1000 })  // Missing q1
  ).rejects.toThrow('Required field missing: Company Name')
})
```

✅ **AC3**: Can save form as draft (partial completion)
```typescript
test('saves partial submission as draft', async () => {
  const form = await createForm({ form_data: { sections: [] } })
  await publishForm(form.id)

  const draft = await saveDraftSubmission(
    form.id,
    'company-id',
    { q1: 'partial answer' }
  )

  expect(draft.status).toBe('draft')
  expect(draft.submitted_at).toBeNull()
  expect(draft.submission_data).toEqual({ q1: 'partial answer' })
})
```

✅ **AC4**: Can submit completed form
```typescript
test('submits complete form successfully', async () => {
  const form = await createForm({
    form_data: {
      sections: [{
        id: uuid(),
        title: 'Test',
        questions: [
          { id: 'q1', type: 'text', text: 'Answer', required: true }
        ]
      }]
    }
  })
  await publishForm(form.id)

  const submission = await submitForm(
    form.id,
    'company-id',
    { q1: 'Complete answer' }
  )

  expect(submission.status).toBe('submitted')
  expect(submission.submitted_at).not.toBeNull()
})
```

✅ **AC5**: Receives confirmation after successful submission
```typescript
test('returns success message after submission', async () => {
  const form = await createForm({
    success_message: 'Thank you for your update!',
    form_data: { sections: [] }
  })
  await publishForm(form.id)

  const submission = await submitForm(form.id, 'company-id', {})

  expect(submission).toBeDefined()
  // UI would display form.success_message
})
```

✅ **AC6**: Cannot edit submission after submission (immutable)
```typescript
test('cannot modify submitted form', async () => {
  const form = await createForm({ form_data: { sections: [] } })
  await publishForm(form.id)

  const submission = await submitForm(form.id, 'company-id', { q1: 'Original' })

  await expect(
    updateSubmission(submission.id, { q1: 'Modified' })
  ).rejects.toThrow('Cannot modify submitted form')
})
```

✅ **AC7**: Form displays with question structure from time of submission
```typescript
test('displays submission with original form structure', async () => {
  const v1 = await createForm({
    form_data: {
      sections: [{
        id: uuid(),
        title: 'Test',
        questions: [{ id: 'q1', text: 'Original Question', type: 'text' }]
      }]
    }
  })
  await publishForm(v1.id)

  const submission = await submitForm(v1.id, 'company-id', { q1: 'Answer' })

  // Update form (changes question text)
  await updateForm(v1.id, {
    form_data: {
      sections: [{
        id: uuid(),
        title: 'Test',
        questions: [{ id: 'q1', text: 'Updated Question', type: 'text' }]
      }]
    }
  }, true)

  const displayData = await getSubmissionDisplay(submission.id)

  expect(displayData.form_snapshot.questions[0].text).toBe('Original Question')
})
```

---

### Story 4: Program Association & Scheduling

**As a** program manager
**I want to** associate forms with specific programs and track company enrollments
**So that** only companies enrolled in a program receive relevant update forms

**Acceptance Criteria:**

✅ **AC1**: Only enrolled companies receive update requests
```typescript
test('only enrolled companies see form in pending updates', async () => {
  const program = await createProgram({ name: 'Program A' })
  const form = await createForm({ program_id: program.id, update_frequency: 30 })
  await publishForm(form.id)

  const enrolledCompany = await createCompany({ name: 'Enrolled Inc' })
  const notEnrolledCompany = await createCompany({ name: 'Other Inc' })

  await enrollCompany(program.id, enrolledCompany.id, {
    start_date: '2026-01-01',
    end_date: null
  })

  const enrolled Pending = await getPendingUpdates(enrolledCompany.id)
  const notEnrolledPending = await getPendingUpdates(notEnrolledCompany.id)

  expect(enrolledPending).toContainEqual(
    expect.objectContaining({ form: expect.objectContaining({ id: form.id }) })
  )
  expect(notEnrolledPending).not.toContainEqual(
    expect.objectContaining({ form: expect.objectContaining({ id: form.id }) })
  )
})
```

✅ **AC2**: Update frequency configurable per form
```typescript
test('generates update request based on frequency', async () => {
  const form = await createForm({ update_frequency: 60 })  // Every 60 days
  await publishForm(form.id)

  await enrollCompany('program-id', 'company-id', {
    start_date: '2026-01-01',
    end_date: null
  })

  // First submission on Jan 1
  await submitForm(form.id, 'company-id', {}, { submitted_at: '2026-01-01' })

  // Check pending on March 2 (60 days later)
  const pending = await getPendingUpdates('company-id', { as_of_date: '2026-03-02' })

  expect(pending).toHaveLength(1)
})
```

✅ **AC3**: Reminder frequency configurable per form
```typescript
test('sends reminder based on reminder frequency', async () => {
  const form = await createForm({
    update_frequency: 30,
    reminder_frequency: 7  // Remind 7 days before due
  })
  await publishForm(form.id)

  await enrollCompany('program-id', 'company-id', {
    start_date: '2026-01-01',
    end_date: null
  })

  // First update due on Jan 31 (day 30)
  // Reminder should go out on Jan 24 (7 days before)
  const reminders = await getScheduledReminders({ as_of_date: '2026-01-24' })

  expect(reminders).toContainEqual(
    expect.objectContaining({
      form_id: form.id,
      company_id: 'company-id',
      due_date: '2026-01-31'
    })
  )
})
```

✅ **AC4**: Update requests stop after program `end_date`
```typescript
test('does not generate updates after enrollment ends', async () => {
  const form = await createForm({ update_frequency: 30 })
  await publishForm(form.id)

  await enrollCompany('program-id', 'company-id', {
    start_date: '2026-01-01',
    end_date: '2026-03-31'  // Program ends March 31
  })

  // Check for pending updates on April 15 (after program ended)
  const pending = await getPendingUpdates('company-id', { as_of_date: '2026-04-15' })

  expect(pending).not.toContainEqual(
    expect.objectContaining({ form: expect.objectContaining({ id: form.id }) })
  )
})
```

---

## 17. Performance Requirements

### Target Metrics

**Page Load:**
- Form builder page: **< 2 seconds** (initial load)
- Form submission page: **< 1 second** (initial load)
- Form list page: **< 1 second** (initial load)

**Interactions:**
- Auto-save latency: **< 100ms** perceived (debounced 1s actual)
- Drag operation: **60 FPS** (16ms per frame)
- Question render: **< 50ms** per question
- Conditional evaluation: **< 10ms** per condition
- Form validation: **< 100ms** for entire form

**Data:**
- Support forms with **100+ questions** without performance degradation
- Support **1000+ submissions** per form efficiently
- Handle **50+ conditional logic rules** without lag

### Optimization Strategies

**React Optimization:**
- `React.memo()` on question components (prevent unnecessary re-renders)
- `useMemo()` for expensive calculations (conditional logic evaluation)
- `useCallback()` for event handlers (drag, auto-save)
- Lazy loading for question type components (code splitting)
- Virtual scrolling for question lists (100+ questions)

**Data Fetching:**
- Stale-while-revalidate pattern (show cached data while fetching fresh)
- Pagination for form lists (50 per page)
- Lazy load form submissions (only fetch when needed)
- Debounce search inputs (500ms)
- Prefetch likely next pages

**Bundle Size:**
- Code split by route (form builder, form submission, form list)
- Code split by question type (load types on demand)
- Tree shake unused shadcn components
- Compress images/assets (WebP format)
- Use dynamic imports for heavy libraries

**Database:**
- Indexes on all foreign keys
- Composite index on `(tenant_id, valid_until)` for current version queries
- JSONB indexes on frequently queried fields (GIN index)
- Query only necessary columns (avoid `SELECT *`)
- Use connection pooling (Supabase default)

---

## 18. Accessibility Requirements

### Keyboard Navigation

**Form Builder:**
- Tab: Navigate between sections, questions, properties
- Shift+Tab: Navigate backward
- Enter: Activate selected item (edit, expand section)
- Escape: Cancel editing, close modals
- Arrow keys: Navigate within lists (sections, questions)
- Cmd/Ctrl+S: Manual save
- Cmd/Ctrl+C/V: Copy/paste questions
- Delete: Delete selected item (with confirmation)

**Form Submission:**
- Tab: Navigate between questions
- Shift+Tab: Navigate backward
- Enter: Submit form (when on submit button)
- Space: Toggle checkboxes, select options
- Arrow keys: Navigate radio buttons, dropdowns

### Screen Reader Support

**ARIA Labels:**
- All form controls have descriptive labels
- Buttons have aria-label when icon-only
- Form sections have role="region" and aria-labelledby
- Error messages have aria-live="polite"
- Loading states announced with aria-live="polite"

**Semantic HTML:**
- Proper heading hierarchy (h1 → h2 → h3)
- Form elements wrapped in `<form>` tags
- Lists use `<ul>/<ol>` with `<li>`
- Buttons use `<button>` (not `<div>`)
- Links use `<a>` with href

**Focus Management:**
- Visible focus indicators (2px blue outline)
- Focus trapped in modals
- Focus returns to trigger on modal close
- Auto-focus on first field in modals
- Skip links for main navigation

### Color Contrast

**WCAG AA Compliance:**
- Text: 4.5:1 contrast ratio minimum
- Large text: 3:1 contrast ratio minimum
- UI components: 3:1 contrast ratio minimum
- Error states use color + icon (not color alone)
- Required fields use asterisk + text (not color alone)

---

## 19. Security Considerations

### Access Control (Row-Level Security)

**Forms Table:**
```sql
-- Users can only access their tenant's forms
CREATE POLICY "forms_tenant_isolation"
  ON forms FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Form Submissions Table:**
```sql
-- Users can only access their tenant's submissions
CREATE POLICY "submissions_tenant_isolation"
  ON form_submissions FOR ALL
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Companies can only see their own submissions
CREATE POLICY "submissions_company_isolation"
  ON form_submissions FOR SELECT
  USING (
    company_id IN (
      SELECT id FROM companies
      WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    )
  );
```

### Data Protection

**XSS Prevention:**
- Sanitize all user input (question text, descriptions)
- Use `textContent` not `innerHTML` for user-generated text
- Escape HTML characters in JSONB data
- Content Security Policy (CSP) headers

**SQL Injection Prevention:**
- Supabase RLS policies (parameterized queries)
- Never concatenate user input into SQL
- Use Supabase client methods (safe by default)

**CSRF Protection:**
- Supabase handles CSRF tokens automatically
- SameSite cookies (Lax or Strict)
- Double-submit cookie pattern

**Rate Limiting:**
- Form submissions: 10 per hour per company
- Form saves: 100 per hour per user
- API requests: 1000 per hour per tenant

### Input Sanitization

**Question Text:**
- Max length: 500 characters
- Strip HTML tags
- Escape special characters

**Submission Data:**
- Validate against form schema before save
- Reject data for non-existent questions
- Validate data types (number, email, URL)
- Max payload size: 1 MB

### Privacy (GDPR/PIPEDA Compliance)

**PII Handling:**
- Form submissions may contain personal information
- Mark sensitive fields (email, phone) in schema
- Support data export (user right to data portability)
- Support data deletion (user right to erasure)

**Data Retention:**
- Draft submissions auto-delete after 90 days
- Submitted forms retained per tenant policy (default: 7 years)
- Deletion cascade: tenant → forms → submissions

---

## 20. Testing Strategy

### Unit Tests (Vitest + React Testing Library)

**Test Coverage Requirements:**
- Validation schemas (Zod): **100%** coverage
- Conditional logic evaluation: **100%** coverage
- Auto-save hooks: **90%** coverage
- DAL functions: **90%** coverage

**Key Test Files:**
```
lib/schemas/__tests__/form.test.ts
lib/dal/__tests__/forms.test.ts
hooks/__tests__/useAutoSave.test.ts
hooks/__tests__/useConditionEvaluation.test.ts
hooks/__tests__/useMobileDetect.test.ts
```

### Integration Tests (Vitest + Supabase)

**Test Coverage Requirements:**
- Form CRUD operations: **100%** coverage
- Form versioning workflow: **100%** coverage
- Submission lifecycle: **100%** coverage
- Tenant isolation: **100%** coverage

**Key Test Scenarios:**
1. Create form → Add questions → Publish → Submit → View submission
2. Create form → Publish → Update → Verify new version created
3. Tenant A creates form → Tenant B cannot access (RLS test)
4. Company submits form → Cannot edit after submission
5. Form with conditional logic → Questions show/hide correctly

### E2E Tests (Playwright)

**Critical User Flows:**
1. **Form Builder Flow**:
   - Log in as program manager
   - Create new form
   - Add 3 sections with 5 questions each
   - Configure validation rules
   - Add conditional logic
   - Preview form
   - Publish form
   - Verify form appears in forms list

2. **Form Submission Flow**:
   - Log in as company user
   - Navigate to pending updates
   - Open form
   - Fill out all required fields
   - Save draft
   - Return and continue
   - Submit form
   - Verify success message

3. **Form Versioning Flow**:
   - Create and publish form
   - Make structural change (add question)
   - Verify new version created
   - Verify old version closed
   - Submit form with new version
   - View old submission (displays old structure)

4. **Mobile Responsiveness**:
   - Open form builder on mobile viewport
   - Verify single-column layout
   - Add question using bottom sheet
   - Reorder questions using arrows (not drag-drop)
   - Save and verify auto-save works

### Tenant Isolation Tests (Critical Security)

**Must Pass 100%:**
```typescript
test('Tenant A cannot access Tenant B forms', async () => {
  const tenantA = await createTenant({ name: 'Tenant A' })
  const tenantB = await createTenant({ name: 'Tenant B' })

  const userA = await signUp(tenantA.id, 'usera@test.com', 'password')
  const userB = await signUp(tenantB.id, 'userb@test.com', 'password')

  const formB = await createForm(
    { title: 'Tenant B Form' },
    { userId: userB.id }
  )

  // Attempt to access Tenant B's form as Tenant A
  await expect(
    getForm(formB.id, { userId: userA.id })
  ).rejects.toThrow()  // Should be blocked by RLS
})

test('Tenant A cannot submit to Tenant B form', async () => {
  const tenantA = await createTenant({ name: 'Tenant A' })
  const tenantB = await createTenant({ name: 'Tenant B' })

  const userA = await signUp(tenantA.id, 'usera@test.com', 'password')
  const userB = await signUp(tenantB.id, 'userb@test.com', 'password')

  const formB = await createForm(
    { form_data: { sections: [] } },
    { userId: userB.id }
  )
  await publishForm(formB.id, { userId: userB.id })

  // Attempt to submit as Tenant A
  await expect(
    submitForm(formB.id, 'company-id', {}, { userId: userA.id })
  ).rejects.toThrow()  // Should be blocked by RLS
})
```

---

## 21. Success Metrics

### Adoption Metrics (First 30 Days)

- **Goal**: 10 organizations create at least 1 form
- **Goal**: 80%+ of forms use conditional logic (indicates customization)
- **Goal**: Average of 2-3 forms per organization
- **Measurement**: Query `SELECT COUNT(DISTINCT tenant_id) FROM forms WHERE created_at > NOW() - INTERVAL '30 days'`

### Usage Metrics (Ongoing)

- **Goal**: 70%+ submission rate (companies complete forms when requested)
- **Goal**: 90%+ of submissions have complete data (no missing required fields)
- **Goal**: <5% support requests related to form submission
- **Measurement**:
  - Submission rate: `(submitted / sent_reminders) * 100`
  - Completion rate: `(complete_submissions / total_submissions) * 100`

### Technical Metrics (Performance Monitoring)

- **Goal**: Form builder page load <2 seconds (P95)
- **Goal**: Form submission saves <1 second (P95)
- **Goal**: Zero data leakage between tenants (verified via RLS tests)
- **Goal**: <1% error rate on form saves
- **Measurement**: APM tool (e.g., Sentry, Datadog)

---

## 22. Dependencies & Blockers

### Blocked By:
- **None** (Epic #3 Authentication complete)

### Blocks:
- **Self-Service Onboarding** (forms needed for company update scheduling)
- **AI Agent Reporting** (form submissions provide data for compliance reports)

### External Dependencies:
- Supabase (database, auth)
- Vercel (hosting, edge functions)
- Resend (email notifications)

---

## 23. Out of Scope (Future Enhancements)

**Phase 2 Features:**
- File upload question type (document attachments)
- Multi-page forms (wizard interface)
- Form templates library (pre-built industry-specific forms)
- A/B testing different form versions
- Analytics on question skip rates
- Email customization for reminders (HTML templates)
- Webhooks on form submission (external integrations)
- Export submissions to CSV/Excel
- Form themes/branding (custom colors, logos)
- Question branching visualization (flowchart view)
- Bulk question import from CSV
- Calculations between fields (e.g., total = field1 + field2)
- Signature question type (digital signatures)
- Multi-language forms (i18n support)

---

## 24. Related Issues & Documentation

**GitHub Issues:**
- #1 Master Epic (project roadmap)
- #2 Multi-Tenant Foundation (database, RLS)
- #3 Authentication (DAL pattern)
- #42 Form Builder Epic (this document)

**Architecture Docs:**
- `docs/architecture/auth-best-practices.md` - DAL pattern
- `docs/architecture/adr/001-use-dal-pattern-for-auth.md` - ADR for auth

**Requirements Docs:**
- `docs/requirements/impactOS-multi-tenant-requirements.md` - Product requirements
- `docs/BAI Metrics Pilot Data Collection - Final.md` - Government compliance

---

## 25. Implementation Checklist

### Phase 1: Database & Types (Week 1)
- [ ] Create `forms` table with RLS policies
- [ ] Create `form_submissions` table with RLS policies
- [ ] Create `update_form_reminders` table with RLS policies
- [ ] Add `form_submission_id` to `company_updates` (backward compatibility)
- [ ] Define TypeScript types (13 question types)
- [ ] Define Zod validation schemas
- [ ] Write database migration tests

### Phase 2: DAL & API (Week 1-2)
- [ ] Implement `lib/dal/forms.ts` (CRUD operations)
- [ ] Implement form versioning logic
- [ ] Implement submission workflow
- [ ] Implement pending updates calculation
- [ ] Write unit tests for DAL functions (90% coverage)
- [ ] Write integration tests for versioning

### Phase 3: UI Components (Week 2-3)
- [ ] Build `FormBuilderLayout` (3-panel layout)
- [ ] Build `TemplatePanel` (question type library)
- [ ] Build `FormEditor` (center panel with sections/questions)
- [ ] Build `PropertiesPanel` (right panel configuration)
- [ ] Build 13 question type components
- [ ] Build `ConditionalLogicBuilder` (rule interface)
- [ ] Implement drag-and-drop with `@hello-pangea/dnd`
- [ ] Build mobile-responsive layout (arrows instead of drag-drop)

### Phase 4: Auto-Save & Validation (Week 3)
- [ ] Implement `useAutoSave` hook (debounced)
- [ ] Implement localStorage backup/recovery
- [ ] Implement `useConditionEvaluation` hook
- [ ] Build validation UI (inline errors)
- [ ] Build form-level validation (submit blocker)
- [ ] Write tests for conditional logic (100% coverage)

### Phase 5: Form Submission UI (Week 4)
- [ ] Build form submission page (company-facing)
- [ ] Build progress indicator
- [ ] Build draft save functionality
- [ ] Build success page (with custom message)
- [ ] Build submission list page (program manager view)
- [ ] Build submission detail page (read-only)

### Phase 6: Scheduling & Reminders (Week 4)
- [ ] Implement update frequency calculation
- [ ] Implement reminder scheduling
- [ ] Build reminder tracking
- [ ] Implement email notifications (via Resend)
- [ ] Build pending updates dashboard

### Phase 7: Testing & Polish (Week 5)
- [ ] E2E tests for critical flows (Playwright)
- [ ] Tenant isolation tests (100% pass rate)
- [ ] Performance optimization (meet target metrics)
- [ ] Accessibility audit (WCAG AA compliance)
- [ ] User acceptance testing (UAT with 2-3 organizations)
- [ ] Bug fixes and polish

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial requirements document (template panel, 13 types, auto-save) |
| 2.0 | 2025-11-13 | System | Reconciled version (merged with Issue #42 database architecture, versioning, scheduling, test-driven acceptance criteria) |

---

## References

**Codebase Locations** (will be created):
- Components: `app/components/form-builder/`
- DAL: `lib/dal/forms.ts`
- Schemas: `lib/schemas/form.ts`
- Types: `lib/types/form.ts`
- Hooks: `hooks/useAutoSave.ts`, `hooks/useConditionEvaluation.ts`, `hooks/useMobileDetect.ts`
- Route: `app/forms/[formId]/builder/page.tsx`

**External References**:
- [@hello-pangea/dnd](https://github.com/hello-pangea/dnd) - Drag-and-drop library
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Zod](https://zod.dev/) - Schema validation
- [Supabase Docs](https://supabase.com/docs) - Database, auth, RLS

---

**Last Updated**: November 13, 2025
**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 5 weeks
**Target Completion**: Week 8-10 (Phase 5 of MVP)
