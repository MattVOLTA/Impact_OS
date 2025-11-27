'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Circle, ArrowRight, Target, Plus } from 'lucide-react'
import { format } from 'date-fns'
import type { Commitment } from '@/lib/schemas/commitments'

import { InlineCommitmentInput } from './inline-commitment-input'
import { InlineCommitmentItem } from './inline-commitment-item'

interface CommitmentsCardProps {
  companyId: string
  commitments: Commitment[]
  aiAnalysisEnabled: boolean
}

export function CommitmentsCard({ companyId, commitments, aiAnalysisEnabled }: CommitmentsCardProps) {
  return (
    <Card className="flex flex-col mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Open Commitments</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/companies/${companyId}/commitments`}>
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <InlineCommitmentInput companyId={companyId} aiAnalysisEnabled={aiAnalysisEnabled} />
        
        {commitments.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-4">
            <p className="text-sm">No open commitments.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {commitments.slice(0, 3).map(commitment => (
              <InlineCommitmentItem 
                key={commitment.id}
                id={commitment.id}
                initialTitle={commitment.title}
                initialStatus={commitment.status}
                initialDueDate={commitment.due_date}
              />
            ))}
            {commitments.length > 3 && (
              <div className="text-center pt-2">
                <Link 
                  href={`/companies/${companyId}/commitments`}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  + {commitments.length - 3} more
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

