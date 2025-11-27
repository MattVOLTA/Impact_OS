/**
 * Public Form Submission Page
 *
 * Allows anyone (unauthenticated) to view and submit a published form
 * URL: /f/{formId}
 *
 * Security:
 * - No authentication required (intentionally public)
 * - Only shows published forms (is_published = true)
 * - Only shows current version (valid_until IS NULL)
 */

import { notFound } from 'next/navigation'
import { getPublicForm } from '@/lib/dal/forms'
import { FormSubmissionView } from './components/form-submission-view'

export const metadata = {
  title: 'Submit Form | impact OS',
  description: 'Submit your company update'
}

interface PublicFormPageProps {
  params: Promise<{ id: string }>
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { id } = await params

  // Fetch form without authentication (public access)
  const form = await getPublicForm(id)

  // Return 404 if form doesn't exist or isn't published
  if (!form) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Form Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{form.title}</h1>
        {form.description && (
          <p className="text-muted-foreground text-lg">{form.description}</p>
        )}
      </div>

      {/* Form Submission Interface */}
      <FormSubmissionView form={form} />
    </div>
  )
}
