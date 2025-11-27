/**
 * Public Companies API Route
 *
 * Returns companies for a specific tenant (no auth required)
 * Used by public form submission to show company selector
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const tenantId = searchParams.get('tenantId')

  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'tenantId is required' },
      { status: 400 }
    )
  }

  try {
    // Use admin client to bypass RLS (public access to company list)
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

    const { data, error } = await supabase
      .from('companies')
      .select('id, business_name, description')
      .eq('tenant_id', tenantId)
      .order('business_name')

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch companies' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Public companies API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
