/**
 * Create New Form Page
 *
 * Form builder interface for creating customizable update forms
 */

import { FormBuilder } from '../components/form-builder'

export const metadata = {
  title: 'Create Form | impact OS',
  description: 'Create a new update form for portfolio companies'
}

export default function NewFormPage() {
  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Create Form</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Build a customizable form to collect updates from portfolio companies
        </p>
      </div>

      {/* Form Builder */}
      <FormBuilder />
    </div>
  )
}
