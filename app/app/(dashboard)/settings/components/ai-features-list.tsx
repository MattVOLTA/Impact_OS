/**
 * AI Features List Component
 *
 * Displays list of AI-powered features with individual toggles
 * Issue #69: Granular AI Feature Controls
 */

'use client'

import { AIFeatureToggle } from './ai-feature-toggle'

interface AIFeaturesListProps {
  features: {
    commitment_analysis: boolean
    report_generation: boolean
    meeting_insights: boolean
    company_recommendations: boolean
  }
  isAdmin: boolean
  commitmentTrackingEnabled: boolean
}

export function AIFeaturesList({ features, isAdmin, commitmentTrackingEnabled }: AIFeaturesListProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-1">AI-Powered Features</h4>
        <p className="text-xs text-muted-foreground">
          Enable or disable specific AI features for your organization
        </p>
      </div>

      <div className="space-y-2">
        {/* Commitment Analysis - LIVE */}
        <AIFeatureToggle
          feature="commitment_analysis"
          label="Commitment Analysis"
          description="Real-time SMART validation and measurability scoring for commitments"
          enabled={features.commitment_analysis}
          isAdmin={isAdmin}
          disabledReason={!commitmentTrackingEnabled ? 'Commitment Tracking' : undefined}
        />

        {/* Enhanced Reports - COMING SOON */}
        <AIFeatureToggle
          feature="report_generation"
          label="Enhanced Reports"
          description="AI-generated insights and pattern analysis in reports"
          enabled={features.report_generation}
          isAdmin={isAdmin}
          comingSoon
        />

        {/* Meeting Insights - COMING SOON */}
        <AIFeatureToggle
          feature="meeting_insights"
          label="Meeting Insights"
          description="Auto-extract action items and key decisions from transcripts"
          enabled={features.meeting_insights}
          isAdmin={isAdmin}
          comingSoon
        />

        {/* Company Recommendations - COMING SOON */}
        <AIFeatureToggle
          feature="company_recommendations"
          label="Company Recommendations"
          description="AI-powered portfolio pattern analysis and suggestions"
          enabled={features.company_recommendations}
          isAdmin={isAdmin}
          comingSoon
        />
      </div>
    </div>
  )
}
