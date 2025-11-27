/**
 * Form Submission View Component
 *
 * Renders a published form for public submission with company selector
 */

'use client'

import { useState } from 'react'
import { Form as FormType } from '@/lib/schemas/form'
import { FormRenderer } from './form-renderer'
import { CompanySelector } from './company-selector'

interface FormSubmissionViewProps {
  form: FormType
}

export function FormSubmissionView({ form }: FormSubmissionViewProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)

  // If no company selected, show company selector
  if (!selectedCompanyId) {
    return (
      <CompanySelector
        tenantId={form.tenant_id}
        onCompanySelect={setSelectedCompanyId}
      />
    )
  }

  // Company selected, show form
  return <FormRenderer form={form} companyId={selectedCompanyId} />
}
