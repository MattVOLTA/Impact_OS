/**
 * Form Submission Success Page
 *
 * Shown after successful form submission
 */

import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
  title: 'Submission Successful | impact OS',
  description: 'Your form has been submitted'
}

export default function SubmissionSuccessPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="border rounded-lg p-12 bg-card text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-6">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>

        <h1 className="text-3xl font-bold mb-3">Thank You!</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your form has been submitted successfully.
        </p>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Your responses have been recorded and will be reviewed by the program team.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  )
}
