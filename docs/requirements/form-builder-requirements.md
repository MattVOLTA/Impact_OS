# Form Builder - Requirements Document

**Project:** impactOS  
**Component:** Dynamic Form Builder  
**Version:** 1.0  
**Last Updated:** November 13, 2025

---

## Overview

The Form Builder is a drag-and-drop visual editor for creating dynamic, multi-section forms with conditional logic, multiple question types, and automatic data persistence.

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
- Success message (custom)
- Email notifications (recipients array)
- Timestamps (created, updated)
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
- Question text (editable)
- Help text (optional)
- Required flag
- Conditional logic (optional)
- Validation rules
- Layout options (full, half, third width)
- Column positioning (for grid layouts)
- Type-specific configuration

---

## 2. Question Types (13 Total)

### Basic Input Types
1. **Text** - Single-line text input
   - Configurable placeholder
   - Min/max length validation
   
2. **Long Text (Textarea)** - Multi-line text input
   - Configurable rows
   - Character count
   
3. **Number** - Numeric input
   - Min/max value constraints
   - Step increment
   - Format validation

4. **Currency** - Monetary value input
   - Currency symbol configuration
   - Decimal precision
   - Min/max constraints

### Selection Types
5. **Single Choice (Select)** - Dropdown selection
   - Custom options list
   - Default value
   
6. **Multiple Choice (Multi-select)** - Multiple option selection
   - Custom options list
   - Min/max selections
   
7. **Yes/No** - Boolean choice with three options:
   - Yes
   - No
   - Prefer not to answer (if not required)

### Specialized Types
8. **Date** - Date picker
   - Format configuration
   - Min/max date constraints
   - Default to today option

9. **Email** - Email address input
   - Email format validation
   - Confirmation field option

10. **Phone** - Phone number input
    - Format validation
    - International format support

11. **URL** - Website address input
    - URL format validation
    - Protocol requirement

### Dynamic Types
12. **Dynamic Field - Company** - Company selector
    - Searches existing companies
    - Creates new companies
    - Links to company records

13. **Dynamic Field - Contact** - Contact selector
    - Searches existing contacts
    - Creates new contacts
    - Links to contact records

---

## 3. Layout System

### Three-Panel Layout

**Left Panel: Template Panel**
- Question type library
- Organized by category
- Expandable groups (e.g., Dynamic Fields)
- Click-to-add functionality
- Icons for visual recognition

**Center Panel: Form Editor**
- Form title/description editors
- Section containers
- Question cards with inline editing
- Drag handles for reordering
- Preview of form structure
- Add question buttons

**Right Panel: Properties Panel**
- Selected item properties
- Conditional logic builder
- Validation settings
- Layout options
- Advanced configuration

### Responsive Behavior
- **Desktop:** Full drag-and-drop with three panels
- **Mobile:** Simplified single-column layout
- **Tablet:** Adaptive layout with collapsible panels
- Auto-detection of device type

---

## 4. Drag-and-Drop Functionality

### Section Management
- Reorder sections vertically
- Visual drag indicators
- Grip handle for grabbing
- Smooth animations during drag
- Drop zones between sections

### Question Management
- Reorder questions within sections
- Move questions between sections
- Visual drag indicators
- Grip handle for grabbing
- Smooth animations during drag
- Drop zones between questions

### Mobile Alternative
- Up/down arrow buttons
- Touch-friendly controls
- No drag-and-drop on mobile

---

## 5. Conditional Logic System

### Rule Builder Interface
- Add multiple conditions per question
- Question visibility based on answers
- Logical operators: AND / OR

### Condition Types
1. **Equals** - Exact match
2. **Not Equals** - Inverse match
3. **Contains** - Partial match (text)
4. **Is Empty** - No answer provided
5. **Is Not Empty** - Answer provided
6. **Greater Than** - Numeric comparison
7. **Less Than** - Numeric comparison

### Smart Value Input
- Context-aware value fields
- Dropdown for select/multiselect questions
- Text input for open-ended questions
- Date picker for date questions
- No value needed for isEmpty/isNotEmpty

### Evaluation
- Real-time condition evaluation
- Show/hide questions dynamically
- Cascading logic support
- Prevents circular dependencies

---

## 6. Auto-Save System

### Local Storage Backup
- Debounced saves (1000ms default)
- Automatic localStorage backup
- Recovery on page reload
- Clear backup after successful server save

### Server Persistence
- Async saves to Supabase
- Error handling with toast notifications
- Retry logic for failed saves
- Change detection (only saves if modified)
- Success confirmation

### Save Triggers
- Question text changes
- Option modifications
- Section reordering
- Question reordering
- Conditional logic updates
- Form title/description edits

---

## 7. Question Management

### Inline Editing
- Click question text to edit
- Tab to next field
- Enter to save, Escape to cancel
- Visual feedback during editing

### Question Actions
1. **Edit** - Inline text editing
2. **Duplicate** - Clone with new ID
3. **Delete** - Remove with confirmation
4. **Move** - Drag-and-drop reordering
5. **Configure** - Properties panel

### Bulk Operations
- Add multiple questions at once
- Delete section with all questions
- Duplicate section with questions

---

## 8. Validation System

### Field-Level Validation
- Required field enforcement
- Type-specific validation (email, URL, phone)
- Min/max length
- Min/max value (numbers)
- Custom regex patterns
- Error messages

### Form-Level Validation
- All required fields completed
- All validations passed
- Conditional logic resolved
- No circular dependencies

---

## 9. Form Publishing

### Draft Mode
- Unpublished forms are editable
- Preview available
- Testing allowed
- Not visible to end users

### Published Mode
- Locked from major changes
- Public access via URL
- Submissions tracked
- Analytics available

---

## 10. Data Storage

### Database Schema (Supabase)

**forms table:**
```sql
- id (uuid, primary key)
- program_id (uuid, foreign key)
- title (text)
- description (text, nullable)
- form_data (jsonb) - Contains sections array
- is_published (boolean)
- created_at (timestamp)
- updated_at (timestamp)
- created_by (uuid, foreign key)
```

**form_data JSONB structure:**
```typescript
{
  sections: FormSection[]
  successMessage: string
  emailNotifications: {
    enabled: boolean
    recipients: string[]
  }
}
```

**submissions table:**
```sql
- id (uuid, primary key)
- form_id (uuid, foreign key)
- program_id (uuid, foreign key)
- submission_data (jsonb)
- submitted_at (timestamp)
- submitted_by (uuid, foreign key, nullable)
```

---

## 11. Integration Points

### Program Connection
- Forms belong to programs
- Program-specific field mapping
- Selected fields for CRM sync
- Field display order

### Contact/Company Integration
- Dynamic field questions link to records
- Search existing records
- Create new records inline
- Bidirectional sync

### Email Notifications
- Form submission triggers
- Configurable recipients
- Email template support
- Submission data included

---

## 12. User Experience

### Performance
- Optimistic UI updates
- Debounced auto-save (1s)
- Lazy loading for large forms
- Virtual scrolling for questions
- Cached question components

### Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management
- Tab order
- Skip links

### Visual Feedback
- Loading states
- Success/error toasts
- Drag indicators
- Hover states
- Active states
- Validation errors

---

## 13. Technical Architecture

### Component Hierarchy
```
FormBuilderPage (Route Handler)
└── FormBuilderLayout (3-panel container)
    ├── TemplatePanel (left)
    ├── ResponsiveFormBuilder (center)
    │   ├── DraggableSectionList (desktop)
    │   │   └── Section
    │   │       └── DraggableQuestionList
    │   │           └── Question Components
    │   └── MobileSectionList (mobile)
    │       └── Section
    │           └── MobileQuestionList
    │               └── Question Components
    └── PropertiesPanel (right)
        └── RuleBuilder (conditional logic)
```

### Key Hooks
- `useAutoSave` - Debounced persistence
- `useMobileDetect` - Device detection
- `useConditionEvaluation` - Logic evaluation

### State Management
- Local React state for UI
- Optimistic updates
- Server state via Supabase
- localStorage for recovery

### Libraries Used
- `@hello-pangea/dnd` - Drag-and-drop
- `sonner` - Toast notifications
- `shadcn/ui` - UI components
- `@supabase/supabase-js` - Database client

---

## 14. Error Handling

### Client-Side Errors
- Validation failures → inline error messages
- Save failures → toast notification + localStorage backup
- Network errors → retry with exponential backoff
- Invalid state → reset to last valid state

### Server-Side Errors
- Database errors → user-friendly messages
- Permission errors → redirect to auth
- Not found → 404 page
- Conflict errors → merge UI

---

## 15. Future Enhancements (Not Yet Implemented)

### Potential Features
- Form templates library
- Question branching visualization
- Bulk question import (CSV)
- Form versioning
- A/B testing support
- Multi-language forms
- File upload question type
- Signature question type
- Calculations between fields
- Form analytics dashboard
- Submission exports
- Form themes/branding
- Webhook integrations
- API access for submissions

---

## 16. Testing Requirements

### Unit Tests Needed
- Question type creators
- Validation logic
- Conditional logic evaluation
- Auto-save hooks

### Integration Tests Needed
- Form CRUD operations
- Drag-and-drop functionality
- Conditional logic chains
- Submission flow

### E2E Tests Needed
- Complete form creation
- Form publishing workflow
- Submission as end user
- Mobile responsiveness

---

## 17. Performance Benchmarks

### Target Metrics
- Form load: < 1s
- Auto-save latency: < 100ms perceived
- Drag operation: 60 FPS
- Question render: < 50ms
- Conditional evaluation: < 10ms

### Optimization Strategies
- Component memoization
- Virtual scrolling for 100+ questions
- Debounced event handlers
- Code splitting by question type
- Image/asset optimization

---

## 18. Security Considerations

### Access Control
- Forms scoped to programs
- Program membership required
- Role-based editing permissions
- Published forms may be public

### Data Protection
- XSS prevention in user input
- SQL injection prevention (Supabase RLS)
- CSRF tokens
- Rate limiting on submissions
- Input sanitization

### Privacy
- PII handling in submissions
- GDPR compliance considerations
- Data retention policies
- Submission anonymization option

---

## Glossary

- **Form** - Complete structure with title, sections, questions
- **Section** - Logical grouping of questions with a title
- **Question** - Individual field with type, text, and configuration
- **Conditional Logic** - Rules that show/hide questions based on answers
- **Dynamic Field** - Question type that links to existing records (Company/Contact)
- **Template Panel** - UI component showing available question types
- **Rule Builder** - UI for creating conditional logic
- **Auto-Save** - Automatic persistence of form changes

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-13 | System | Initial requirements document |

---

## References

- **Codebase Location:** `/Volumes/SD/Apps/impactos/src/components/form-builder/`
- **Type Definitions:** `/Volumes/SD/Apps/impactos/src/lib/types/form.ts`
- **Question Registry:** `/Volumes/SD/Apps/impactos/src/lib/registry/question-types.tsx`
- **Route Handler:** `/Volumes/SD/Apps/impactos/src/app/forms/[formId]/builder/page.tsx`

