/**
 * Milestone Tracking Types
 *
 * Type definitions for the milestone tracking feature.
 * See Issue #71 for complete feature specification.
 */

export interface MilestoneTrack {
  id: string
  tenant_id: string
  name: string
  slug: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface MilestoneDefinition {
  id: string
  track_id: string
  order_position: number
  name: string
  evidence_description: string
  objective_signal: string
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface CompanyMilestone {
  id: string
  company_id: string
  milestone_definition_id: string
  status: 'working_towards' | 'completed' | 'not_verified'
  completed_at?: string | null
  is_verified?: boolean | null
  notes?: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface MilestoneHistory {
  id: string
  company_id: string
  from_milestone_id?: string | null
  to_milestone_id: string
  changed_at: string
  changed_by: string
  metadata: Record<string, any>
  created_at: string
}

// Extended types with relationships

export interface MilestoneTrackWithDefinitions extends MilestoneTrack {
  definitions?: MilestoneDefinition[]
}

export interface MilestoneDefinitionWithTrack extends MilestoneDefinition {
  track?: MilestoneTrack
}

export interface CompanyMilestoneWithDetails extends CompanyMilestone {
  milestone_definition?: MilestoneDefinition
  company?: {
    id: string
    business_name: string
  }
}

// Input types for creating/updating

export interface CreateMilestoneTrackInput {
  name: string
  slug: string
  description?: string
  is_active?: boolean
}

export interface UpdateMilestoneTrackInput {
  name?: string
  slug?: string
  description?: string
  is_active?: boolean
}

export interface CreateMilestoneDefinitionInput {
  track_id: string
  order_position: number
  name: string
  evidence_description: string
  objective_signal: string
}

export interface UpdateMilestoneDefinitionInput {
  order_position?: number
  name?: string
  evidence_description?: string
  objective_signal?: string
  is_active?: boolean
}

export interface UpdateCompanyMilestoneInput {
  status?: 'working_towards' | 'completed' | 'not_verified'
  completed_at?: string | null
  is_verified?: boolean | null
  notes?: string | null
}

export interface SetCompanyMilestoneInput {
  milestone_definition_id: string
  status: 'working_towards' | 'completed' | 'not_verified'
  completed_at?: string
  is_verified?: boolean
  notes?: string
}

// Predefined track templates

export type TrackSlug = 'software' | 'hardware' | 'biotech-pharma' | 'medical-device'

export interface MilestoneTemplateDefinition {
  order: number
  name: string
  evidence_description: string
  objective_signal: string
}

export interface MilestoneTrackTemplate {
  name: string
  slug: TrackSlug
  description: string
  milestones: MilestoneTemplateDefinition[]
}
