/**
 * Edit Form Page
 *
 * Displays form editor with ability to:
 * - Edit form metadata
 * - Edit sections and questions
 * - Publish unpublished forms
 * - View version history
 */

import { notFound } from 'next/navigation'
import { loadFormAction } from '../actions'
import { FormEditor } from './components/form-editor'

export const metadata = {
  title: 'Edit Form | impact OS',
  description: 'Edit form'
}

interface EditFormPageProps {
  params: Promise<{ id: string }>
}

export default async function EditFormPage({ params }: EditFormPageProps) {
  const { id } = await params

  const result = await loadFormAction(id)

  if (!result.success || !result.data) {
    notFound()
  }

  const form = result.data

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Edit Form</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {form.is_published ? (
                <>
                  Published form (v{form.version}) - Editing will create a new version
                </>
              ) : (
                <>Draft form - Changes will update in-place</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Form Editor */}
      <FormEditor form={form} />
    </div>
  )
}
