/**
 * Form Renderer Component
 *
 * Interactive form renderer for public submissions
 * Handles all 13 question types, validation, and conditional logic
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form as FormType, Section } from '@/lib/schemas/form'
import { Button } from '@/components/ui/button'
import { Save, Send } from 'lucide-react'
import { QuestionInput } from './question-input'
import { useConditionEvaluation } from '@/hooks/useConditionEvaluation'
import { validateSubmissionData } from '@/lib/schemas/form'

interface FormRendererProps {
  form: FormType
  companyId: string
}

export function FormRenderer({ form, companyId }: FormRendererProps) {
  const router = useRouter()
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Evaluate conditional logic to determine visible questions
  const { visibleQuestions, hasCircularDependency } = useConditionEvaluation(
    form.form_data.sections,
    answers
  )

  // Update answer for a question
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }))
    // Clear error for this question when user changes it
    if (errors[questionId]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[questionId]
        return newErrors
      })
    }
  }

  // Validate and submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate submission data
    const validation = validateSubmissionData(form, answers)

    if (!validation.valid) {
      // Convert array of error messages to object keyed by question ID
      const errorMap: Record<string, string> = {}
      validation.errors.forEach((error) => {
        // Extract question text from error message
        const match = error.match(/^([^:]+):/)
        if (match) {
          const questionText = match[1]
          // Find question ID by text (not ideal, but works for now)
          for (const section of form.form_data.sections) {
            const question = section.questions.find((q) => q.text === questionText)
            if (question) {
              errorMap[question.id] = error
            }
          }
        }
      })
      setErrors(errorMap)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: form.id,
          companyId,
          submissionData: answers
        })
      })

      const result = await response.json()

      if (!result.success) {
        console.error('Submission failed:', result.error)
        alert('Failed to submit form: ' + result.error)
        return
      }

      // Navigate to success page
      router.push(`/f/${form.id}/success`)
    } catch (error) {
      console.error('Submission error:', error)
      alert('An error occurred while submitting the form')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show error if circular dependency detected
  if (hasCircularDependency) {
    return (
      <div className="border rounded-lg p-6 bg-destructive/10">
        <p className="text-destructive font-semibold">
          This form has a configuration error (circular dependency in conditional logic).
          Please contact the form administrator.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form Sections */}
      {form.form_data.sections.map((section) => (
        <div key={section.id} className="border rounded-lg p-6 bg-card">
          {/* Section Title */}
          <h2 className="text-xl font-semibold mb-6">{section.title}</h2>

          {/* Questions Grid */}
          <div className="grid grid-cols-12 gap-6">
            {section.questions
              .filter((question) => visibleQuestions.has(question.id))
              .map((question) => {
                const layoutClass =
                  question.layout === 'half'
                    ? 'col-span-12 md:col-span-6'
                    : question.layout === 'third'
                    ? 'col-span-12 md:col-span-4'
                    : 'col-span-12'

                return (
                  <div key={question.id} className={layoutClass}>
                    <QuestionInput
                      question={question}
                      value={answers[question.id]}
                      onChange={(value) => handleAnswerChange(question.id, value)}
                      error={errors[question.id]}
                    />
                  </div>
                )
              })}
          </div>
        </div>
      ))}

      {/* Submit Actions */}
      <div className="flex items-center justify-end gap-3 border-t pt-6">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Send className="h-4 w-4 mr-2 animate-pulse" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit Form
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
