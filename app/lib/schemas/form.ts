/**
 * Form Builder - Zod Validation Schemas
 *
 * Defines schemas for all 13 question types, conditional logic,
 * validation rules, and form structure.
 *
 * Based on: docs/requirements/form-builder-comprehensive.md
 */

import { z } from 'zod'

// ============================================================================
// Question Types (13 total)
// ============================================================================

export const questionTypeEnum = z.enum([
  'text',           // Single-line text input
  'textarea',       // Multi-line text input
  'number',         // Numeric input
  'currency',       // Monetary value input
  'select',         // Single choice dropdown
  'multiselect',    // Multiple choice checkboxes
  'yesno',          // Boolean choice (Yes/No/Prefer not to answer)
  'date',           // Date picker
  'email',          // Email address input
  'phone',          // Phone number input
  'url',            // Website address input
  'dynamic_company', // Company selector with autocomplete
  'dynamic_contact'  // Contact selector with autocomplete
])

export type QuestionType = z.infer<typeof questionTypeEnum>

// ============================================================================
// Conditional Logic (7 operators)
// ============================================================================

export const conditionOperatorEnum = z.enum([
  'equals',         // Exact match
  'not_equals',     // Inverse match
  'contains',       // Partial match (case-insensitive)
  'is_empty',       // No answer provided
  'is_not_empty',   // Answer provided
  'greater_than',   // Numeric/date comparison
  'less_than'       // Numeric/date comparison
])

export type ConditionOperator = z.infer<typeof conditionOperatorEnum>

// ============================================================================
// Validation Rules
// ============================================================================

export const validationSchema = z.object({
  // Text validation
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
  regex: z.string().optional(),
  regexDescription: z.string().optional(), // Human-readable explanation

  // Number validation
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(), // Increment value
  integerOnly: z.boolean().optional(),

  // Selection validation (multiselect)
  minSelections: z.number().int().positive().optional(),
  maxSelections: z.number().int().positive().optional(),

  // Format validation
  format: z.enum(['currency', 'email', 'phone', 'url']).optional()
}).optional()

export type ValidationRules = z.infer<typeof validationSchema>

// ============================================================================
// Conditional Logic
// ============================================================================

export const conditionalLogicSchema = z.object({
  questionId: z.string().uuid(),
  operator: conditionOperatorEnum,
  value: z.any().optional(), // Optional for is_empty/is_not_empty
  logicalOperator: z.enum(['AND', 'OR']).optional() // For multiple conditions
}).optional()

export type ConditionalLogic = z.infer<typeof conditionalLogicSchema>

// ============================================================================
// Question Schema
// ============================================================================

export const questionSchema = z.object({
  id: z.string().uuid(),
  type: questionTypeEnum,
  text: z.string().min(1, 'Question text is required').max(500),
  helpText: z.string().max(1000).optional(),
  required: z.boolean().default(false),

  // Options (for select, multiselect)
  options: z.array(z.string()).optional(),

  // Validation rules
  validation: validationSchema,

  // Conditional logic
  conditionalLogic: conditionalLogicSchema,

  // Layout options
  layout: z.enum(['full', 'half', 'third']).default('full')
})

export type Question = z.infer<typeof questionSchema>

// ============================================================================
// Section Schema
// ============================================================================

export const sectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Section title is required').max(255),
  isExpanded: z.boolean().default(true),
  questions: z.array(questionSchema)
})

export type Section = z.infer<typeof sectionSchema>

// ============================================================================
// Form Data (JSONB structure)
// ============================================================================

export const formDataSchema = z.object({
  sections: z.array(sectionSchema)
})

export type FormData = z.infer<typeof formDataSchema>

// ============================================================================
// Email Notifications Config
// ============================================================================

export const emailNotificationsSchema = z.object({
  enabled: z.boolean().default(false),
  recipients: z.array(z.string().email())
})

export type EmailNotifications = z.infer<typeof emailNotificationsSchema>

// ============================================================================
// Form Database Schema
// ============================================================================

export const formSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  form_data: formDataSchema,
  version: z.number().int().positive(),
  original_form_id: z.string().uuid().nullable(),
  valid_from: z.string().datetime(),
  valid_until: z.string().datetime().nullable(),
  is_published: z.boolean(),
  published_at: z.string().datetime().nullable(),
  program_id: z.string().uuid().nullable(),
  update_frequency: z.number().int().min(1).max(365).nullable(),
  reminder_frequency: z.number().int().min(1).max(30).nullable(),
  success_message: z.string().default('Thank you for your submission!'),
  email_notifications: emailNotificationsSchema.nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid()
})

export type Form = z.infer<typeof formSchema>

// ============================================================================
// Form Snapshot (lightweight for submissions)
// ============================================================================

export const formSnapshotSchema = z.object({
  title: z.string(),
  version: z.number().int(),
  questions: z.array(z.object({
    id: z.string().uuid(),
    text: z.string(),
    type: questionTypeEnum
  }))
})

export type FormSnapshot = z.infer<typeof formSnapshotSchema>

// ============================================================================
// Form Submission Database Schema
// ============================================================================

export const formSubmissionSchema = z.object({
  id: z.string().uuid(),
  form_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  company_id: z.string().uuid(),
  form_snapshot: formSnapshotSchema,
  submission_data: z.record(z.string(), z.any()), // Key-value pairs: questionId → answer
  status: z.enum(['draft', 'submitted']),
  submitted_at: z.string().datetime().nullable(),
  submitted_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type FormSubmission = z.infer<typeof formSubmissionSchema>

// ============================================================================
// Update Form Reminder Database Schema
// ============================================================================

export const updateFormReminderSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  form_id: z.string().uuid(),
  company_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  due_date: z.string().date(),
  sent_at: z.string().datetime().nullable(),
  email_opened: z.boolean(),
  email_opened_at: z.string().datetime().nullable(),
  form_submitted: z.boolean(),
  form_submitted_at: z.string().datetime().nullable(),
  reminder_count: z.number().int().min(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export type UpdateFormReminder = z.infer<typeof updateFormReminderSchema>

// ============================================================================
// Input Schemas (for API/DAL operations)
// ============================================================================

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

export type CreateFormInput = z.infer<typeof createFormSchema>

// Update form input (partial)
export const updateFormSchema = createFormSchema.partial()

export type UpdateFormInput = z.infer<typeof updateFormSchema>

// Submit form input
export const submitFormSchema = z.object({
  formId: z.string().uuid(),
  companyId: z.string().uuid(),
  submissionData: z.record(z.string(), z.any()) // Key-value pairs: questionId → answer
})

export type SubmitFormInput = z.infer<typeof submitFormSchema>

// Save draft submission input
export const saveDraftSubmissionSchema = z.object({
  formId: z.string().uuid(),
  companyId: z.string().uuid(),
  submissionData: z.record(z.string(), z.any()) // Partial answers allowed
})

export type SaveDraftSubmissionInput = z.infer<typeof saveDraftSubmissionSchema>

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validates that a submission has all required fields filled
 */
export function validateSubmissionData(
  form: Form,
  submissionData: Record<string, any>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const section of form.form_data.sections) {
    for (const question of section.questions) {
      // Skip if question has conditional logic that hides it
      // (This check would need the full submission data to evaluate)

      if (question.required) {
        const answer = submissionData[question.id]
        if (answer === undefined || answer === null || answer === '') {
          errors.push(`Required field missing: ${question.text}`)
        }
      }

      // Type-specific validation
      const answer = submissionData[question.id]
      if (answer !== undefined && answer !== null && answer !== '') {
        // Validate based on question type and validation rules
        if (question.validation) {
          const val = question.validation

          // Text length validation
          if (val.minLength && typeof answer === 'string' && answer.length < val.minLength) {
            errors.push(`${question.text}: Minimum length is ${val.minLength}`)
          }
          if (val.maxLength && typeof answer === 'string' && answer.length > val.maxLength) {
            errors.push(`${question.text}: Maximum length is ${val.maxLength}`)
          }

          // Number range validation
          if (val.min !== undefined && typeof answer === 'number' && answer < val.min) {
            errors.push(`${question.text}: Must be at least ${val.min}`)
          }
          if (val.max !== undefined && typeof answer === 'number' && answer > val.max) {
            errors.push(`${question.text}: Must be at most ${val.max}`)
          }

          // Multi-select validation
          if (val.minSelections && Array.isArray(answer) && answer.length < val.minSelections) {
            errors.push(`${question.text}: Select at least ${val.minSelections} options`)
          }
          if (val.maxSelections && Array.isArray(answer) && answer.length > val.maxSelections) {
            errors.push(`${question.text}: Select at most ${val.maxSelections} options`)
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Detects circular dependencies in conditional logic
 */
export function detectCircularDependencies(sections: Section[]): boolean {
  const graph: Record<string, string[]> = {}

  // Build dependency graph
  for (const section of sections) {
    for (const question of section.questions) {
      if (question.conditionalLogic) {
        if (!graph[question.id]) {
          graph[question.id] = []
        }
        graph[question.id].push(question.conditionalLogic.questionId)
      }
    }
  }

  // DFS to detect cycles
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(node: string): boolean {
    visited.add(node)
    recursionStack.add(node)

    const neighbors = graph[node] || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true
        }
      } else if (recursionStack.has(neighbor)) {
        return true // Cycle detected
      }
    }

    recursionStack.delete(node)
    return false
  }

  for (const node in graph) {
    if (!visited.has(node)) {
      if (hasCycle(node)) {
        return true
      }
    }
  }

  return false
}
