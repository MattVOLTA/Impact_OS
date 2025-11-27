/**
 * Onboarding Flow Component
 *
 * Multi-step wizard for new user onboarding:
 * 1. Create organization
 * 2. Invite team members (optional)
 * 3. Complete
 *
 * Part of Issue #54: Self-Service Onboarding
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CreateOrgStep } from './create-org-step'
import { InviteTeamStep } from './invite-team-step'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 'create-org' | 'invite-team' | 'complete'

interface StepIndicatorProps {
  active: boolean
  completed: boolean
  children: React.ReactNode
}

function StepIndicator({ active, completed, children }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold',
          completed && 'border-green-500 bg-green-500 text-white',
          active && !completed && 'border-primary bg-primary text-white',
          !active && !completed && 'border-white/30 bg-white/20 text-white/60'
        )}
      >
        {completed ? <Check className="h-5 w-5" /> : null}
      </div>
      <span
        className={cn(
          'text-sm font-medium',
          active || completed ? 'text-white' : 'text-white/60'
        )}
      >
        {children}
      </span>
    </div>
  )
}

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('create-org')
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  function handleOrgCreated(orgId: string) {
    setOrganizationId(orgId)
    setStep('invite-team')
  }

  function handleSkipInvites() {
    router.push('/dashboard')
  }

  function handleInvitesComplete() {
    router.push('/dashboard')
  }

  return (
    <div className="space-y-12">
      {/* Progress indicator */}
      <div className="flex justify-between">
        <StepIndicator
          active={step === 'create-org'}
          completed={step !== 'create-org'}
        >
          Create Organization
        </StepIndicator>

        <div className="flex-1 border-t-2 border-white/30 self-center mx-4 mt-[-20px]" />

        <StepIndicator
          active={step === 'invite-team'}
          completed={step === 'complete'}
        >
          Invite Team
        </StepIndicator>

        <div className="flex-1 border-t-2 border-white/30 self-center mx-4 mt-[-20px]" />

        <StepIndicator active={step === 'complete'} completed={false}>
          Complete
        </StepIndicator>
      </div>

      {/* Step content */}
      <div className="rounded-lg bg-white/95 p-8 shadow-xl backdrop-blur-sm">
        {step === 'create-org' && <CreateOrgStep onComplete={handleOrgCreated} />}

        {step === 'invite-team' && organizationId && (
          <InviteTeamStep
            organizationId={organizationId}
            onComplete={handleInvitesComplete}
            onSkip={handleSkipInvites}
          />
        )}
      </div>
    </div>
  )
}
