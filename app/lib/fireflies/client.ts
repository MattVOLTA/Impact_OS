/**
 * Fireflies GraphQL API Client
 *
 * Provides methods to fetch meeting transcripts and metadata from Fireflies.ai
 */

interface FirefliesParticipant {
  email: string
  name?: string
  displayName?: string
}

interface FirefliesMeetingMetadata {
  id: string
  title: string
  date: Date
  duration: number // seconds
  organizer?: string
  host?: string
  participants: string[] // email addresses
}

interface FirefliesFullTranscript extends FirefliesMeetingMetadata {
  transcript: string
  outline: string
  summary: string
  actionItems?: string
  speakers: { name: string; person_id?: string }[]
  participantDetails: FirefliesParticipant[]
}

interface FirefliesTranscriptsQueryResponse {
  transcripts: Array<{
    id: string
    title: string
    date: string
    duration: number
    organizer_email?: string
    host_email?: string
    participants?: string[]
  }>
}

interface FirefliesTranscriptDetailResponse {
  transcript: {
    id: string
    title: string
    date: string
    duration: number
    organizer_email?: string
    host_email?: string
    transcript_text?: string
    transcript_outline?: string
    summary?: {
      keywords?: string
      action_items?: string
      overview?: string
      shorthand_bullet?: string
      short_summary?: string
      bullet_gist?: string
      gist?: string
    }
    sentences?: Array<{
      text: string
      speaker_name?: string
      speaker_id?: string
    }>
    participants?: Array<{
      email: string
      name?: string
      displayName?: string
    }>
  }
}

/**
 * Fireflies GraphQL API Client
 */
export class FirefliesClient {
  private apiKey: string
  private endpoint = 'https://api.fireflies.ai/graphql'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Fetch meetings by date range (lightweight metadata only)
   *
   * Note: Fireflies GraphQL API doesn't support date filtering in the query,
   * so we fetch all transcripts and filter client-side.
   */
  async fetchMeetingsByDateRange(
    fromDate: Date,
    toDate: Date
  ): Promise<FirefliesMeetingMetadata[]> {
    const query = `
      query GetTranscripts {
        transcripts {
          id
          title
          date
          duration
          organizer_email
          host_email
          participants
        }
      }
    `

    const response = await this.makeRequest<FirefliesTranscriptsQueryResponse>(query, {})

    if (!response.transcripts) {
      console.warn('No transcripts returned from Fireflies API')
      return []
    }

    console.log(`Received ${response.transcripts.length} total transcripts from Fireflies`)

    // Filter by date range client-side
    const meetings = response.transcripts
      .filter(meeting => {
        const meetingDate = new Date(meeting.date)
        return meetingDate >= fromDate && meetingDate <= toDate
      })
      .map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        date: new Date(meeting.date),
        duration: meeting.duration,
        organizer: meeting.organizer_email,
        host: meeting.host_email,
        participants: meeting.participants || []
      }))

    console.log(`Filtered to ${meetings.length} meetings in date range (${fromDate.toISOString()} to ${toDate.toISOString()})`)
    return meetings
  }

  /**
   * Fetch full transcript data by ID (heavy operation)
   */
  async fetchFullTranscript(transcriptId: string): Promise<FirefliesFullTranscript> {
    const query = `
      query GetTranscript {
        transcript(id: "${transcriptId}") {
          id
          title
          date
          duration
          organizer_email
          host_email
          sentences {
            text
            speaker_name
            speaker_id
          }
          participants
          summary {
            keywords
            action_items
            overview
            shorthand_bullet
            bullet_gist
            gist
            short_summary
          }
        }
      }
    `

    const response = await this.makeRequest<FirefliesTranscriptDetailResponse>(query, {})
    const meeting = response.transcript

    // Build speakers array from sentences
    const speakerMap = new Map<string, { name: string; person_id?: string }>()

    meeting.sentences?.forEach(sentence => {
      if (sentence.speaker_name && !speakerMap.has(sentence.speaker_name)) {
        speakerMap.set(sentence.speaker_name, {
          name: sentence.speaker_name,
          person_id: sentence.speaker_id
        })
      }
    })

    // Build full transcript text from sentences
    const transcriptText = meeting.sentences
      ?.map(s => `${s.speaker_name}: ${s.text}`)
      .join('\n') || ''

    // Participants might be an array of strings (emails) or objects
    const participantEmails: string[] = Array.isArray(meeting.participants)
      ? meeting.participants.map((p: any) => typeof p === 'string' ? p : p.email)
      : []

    return {
      id: meeting.id,
      title: meeting.title,
      date: new Date(meeting.date),
      duration: meeting.duration,
      organizer: meeting.organizer_email,
      host: meeting.host_email,
      participants: participantEmails,
      transcript: transcriptText,
      outline: '', // Fireflies doesn't provide separate outline in GraphQL
      summary: meeting.summary?.short_summary || meeting.summary?.overview || meeting.summary?.gist || '',
      actionItems: meeting.summary?.action_items,
      speakers: Array.from(speakerMap.values()),
      participantDetails: [] // Not available in GraphQL response
    }
  }

  /**
   * Make GraphQL request to Fireflies API
   */
  private async makeRequest<T>(query: string, variables: Record<string, any>): Promise<T> {
    const requestBody = variables && Object.keys(variables).length > 0
      ? { query, variables }
      : { query }

    console.log('Fireflies API Request:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    console.log('Fireflies API Response Status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Fireflies API Error Response:', errorText)
      throw new Error(`Fireflies API error: ${response.status} ${response.statusText}`)
    }

    const json = await response.json()
    console.log('Fireflies API Response Data:', JSON.stringify(json, null, 2))

    if (json.errors) {
      throw new Error(`Fireflies GraphQL error: ${JSON.stringify(json.errors)}`)
    }

    return json.data as T
  }
}

/**
 * Create a Fireflies client instance
 */
export function createFirefliesClient(apiKey?: string): FirefliesClient {
  const key = apiKey || process.env.FIREFLIES_API_KEY

  if (!key) {
    throw new Error('FIREFLIES_API_KEY environment variable is required')
  }

  return new FirefliesClient(key)
}
