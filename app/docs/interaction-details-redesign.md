# Interaction Details Page Redesign

**Status**: In Progress
**Created**: November 12, 2024
**Epic**: #5 (Interactions Capability)

## Overview

Redesign the interaction details page to show maximum context in a cleaner, more focused layout.

## Design Specification

### Breadcrumbs
- Path: `Dashboard > Interactions > [Interaction Name]`

### Header Card
- **Name** (interaction title)
- **Interaction Type - Date**
  - Type: Enum ("Meeting" initially, expandable to "Email", "Call" later)
  - Format: "Meeting - November 12, 2024"
- **Associated Contacts** (clickable badges)
  - Each badge links to contact detail page
  - No confidence scores or auto-match indicators
- **Transcript** (conditionally shown)
  - "View in Fireflies" link (only if `fireflies_transcript_id` exists)
- **Actions** (top right corner)
  - Edit button
  - Delete button
  - Same pattern as Companies and Contacts pages

### Summary Card
- **Summary text** (fully expanded, always visible)
- **Inline edit button** (dedicated button just for summary editing)
- **Metadata**
  - Created date
  - Updated date

## Technical Requirements

### Database Changes
- [ ] Add `interaction_type` enum column to `interactions` table
  - Values: `meeting`, `email`, `call`
  - Default: `meeting`
  - Nullable: NO

### UI Components
- [ ] Breadcrumbs component
- [ ] Header card with:
  - Interaction name
  - Type and date
  - Contact badges (clickable)
  - Fireflies link (conditional)
  - Edit/Delete actions (top right)
- [ ] Summary card with:
  - Summary text (fully expanded)
  - Inline edit button
  - Created/Updated timestamps

### Data Access Layer
- [ ] Update `InteractionWithRelations` type to include `interaction_type`
- [ ] Update `getInteraction()` to fetch type
- [ ] Update `createInteraction()` to accept type
- [ ] Update `updateInteraction()` to allow type changes

### Integration
- [ ] Update interactions list page to link to new details page
- [ ] Ensure edit modal works with new layout
- [ ] Ensure delete dialog works with new layout

## Out of Scope (For Now)
- Related Companies section
- Duration display
- Full transcript text display
- Audio/video URLs
- Manual notes field
- Confidence scores
- Auto-match indicators

## Success Criteria
- [ ] User can see all essential interaction context in one glance
- [ ] Contact badges link to contact detail pages
- [ ] Summary is fully visible and easily editable
- [ ] Created/Updated dates are visible
- [ ] Fireflies link appears only when transcript exists
- [ ] Edit/Delete actions work correctly from header card

## Implementation Steps

1. **Database Migration**: Add `interaction_type` enum
2. **Update DAL**: Add type to TypeScript interfaces and queries
3. **Create Breadcrumbs**: Reusable breadcrumb component
4. **Redesign Header Card**: Name, type/date, contacts, Fireflies link, actions
5. **Redesign Summary Card**: Summary text, inline edit, timestamps
6. **Update List Page**: Link rows to details page
7. **Test**: Verify all functionality works with new design

---

**Copy this content to GitHub Issue** when gh CLI is authenticated.
