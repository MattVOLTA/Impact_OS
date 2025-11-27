/**
 * Form Submission API Route
 *
 * Handles public form submissions (no auth required)
 * Creates form_submission record with snapshot
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { submitFormSchema } from '@/lib/schemas/form'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const validation = submitFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid submission data', details: validation.error },
        { status: 400 }
      )
    }

    const { formId, companyId, submissionData } = validation.data

    // Use admin client to:
    // 1. Fetch form details (need tenant_id and form_data for snapshot)
    // 2. Create submission (bypass RLS for public submission)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get form to create snapshot
    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('*')
      .eq('id', formId)
      .eq('is_published', true)
      .single()

    if (formError || !form) {
      return NextResponse.json(
        { success: false, error: 'Form not found or not published' },
        { status: 404 }
      )
    }

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

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('form_submissions')
      .insert({
        form_id: formId,
        tenant_id: form.tenant_id,
        company_id: companyId,
        form_snapshot: snapshot,
        submission_data: submissionData,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        submitted_by: null // Anonymous submission
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Error creating submission:', submissionError)
      return NextResponse.json(
        { success: false, error: 'Failed to submit form' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { submissionId: submission.id }
    })
  } catch (error) {
    console.error('Form submission API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
