# Product Requirements: Company Commitments Feature

## 1. Problem Statement
**The "Coaching Amnesia" Problem**

Currently, coaches and founders engage in high-value check-in meetings where critical decisions and tactical agreements are made. However, these commitments often evaporate the moment the call ends because there is no shared, codified system of record.

This lack of continuity creates two specific failures:
1.  **Accountability Drift**: Founders may unintentionally de-prioritize agreed-upon tasks because they aren't written down in a shared space.
2.  **Coaching Context Loss**: Coaches spend the first 10 minutes of every meeting trying to remember "What did we agree you'd do last time?" instead of moving the company forward.

We need a way to bridge the gap between *intention* (during the meeting) and *action* (between meetings) without turning the coach into a data-entry clerk.

## 2. Four Risks Assessment

### Value Risk (Will customers buy/use this?)
*   **Risk**: Founders may view this as "homework" or a "performance improvement plan" rather than a helpful tool.
*   **Assessment**: **Medium**.
*   **Mitigation**: The feature must be framed as *support*, not *surveillance*. The "email notification" feature is critical here—it gives the founder immediate value (a to-do list) without them having to log in.

### Usability Risk (Can users figure out how to use it?)
*   **Risk**: Coaches are busy and often resist administrative tasks. If entering commitments takes more than 30 seconds, they won't do it.
*   **Assessment**: **High**.
*   **Mitigation**: The UI must be designed for *live use* during a conversation.
    *   **"Smart List" UX**: A simple, inline-editable list that feels like a scratchpad.
    *   **AI Augmentation**: We will use **GPT-5 Nano** to instantly analyze the text as they type, auto-extracting dates and checking for measurability. This removes the need for date pickers or complex forms.

### Viability Risk (Does this work for our business?)
*   **Risk**: Does this distract from the "Big Picture" strategic coaching that Impact OS is known for?
*   **Assessment**: **Low**.
*   **Mitigation**: By explicitly keeping the commitments *simple* (tactical) and *uncategorized* (not forced into Team/Market/Tech dimensions), we avoid over-engineering. This aligns with the "Being Less Wrong Over Time" principle by tracking execution velocity.

### Feasibility Risk (Can we build it?)
*   **Risk**: Real-time analysis of text without lag.
*   **Assessment**: **Low (with GPT-5 Nano)**.
*   **Mitigation**:
    *   **Model**: We will use `gpt-5-nano` (released Aug 2025) for its extreme speed and low cost.
    *   **Architecture**:
        *   **Optimistic UI**: Show the text immediately.
        *   **Async Analysis**: Background call to `gpt-5-nano` using the **new Responses API syntax** (specifically using the `developer` role for system instructions and **Structured Outputs** for strict JSON parsing).
        *   **Context Awareness**: We will pass previous commitments to the model so it can detect duplicates or updates naturally.

## 3. Requirements

### The Problem Space (What & Why)
*   **Users**: Coaches (primary inputters) and Founders (primary consumers).
*   **Trigger**: The regular "Check-in" meeting.
*   **Pain Point**: Verbal agreements are lost; progress tracking is subjective ("I feel like we're moving fast" vs. "We completed 5/5 commitments").

### The Solution Space (Proposed Approach)

#### Core Entity: `Commitment`
*   `description` (Text, required)
*   `target_date` (Date, optional - AI extracted)
*   `status`: `Pending` | `Complete` | `Not Complete` | `Carried Over` | `Abandoned`
*   `company_id` (FK)
*   `coach_id` (FK - Author)
*   `meeting_id` (Optional FK - to link to specific interaction)

#### The "Smart List" Workflow
1.  **Review (The "Look Back")**:
    *   Coach sees open commitments from previous sessions.
    *   Quickly toggles status (Complete/Not Complete).
2.  **Drafting (The "Look Forward")**:
    *   Coach types freely: *"Get 3 intros to investors by Friday"*
    *   **AI "Nudge"**:
        *   System detects "Friday" -> Sets Date.
        *   System detects "3 intros" -> Marks as Measurable (Green Dot).
        *   If vague (*"Work on sales"*), System shows subtle tooltip: *"Make it specific? e.g. 'Call 10 leads'"*.
3.  **Commit & Notify**:
    *   Click "Send Commitments" to finalize.
    *   System emails the summary to the Founder.

### Technical Implementation Details (GPT-5 Nano)
*   **Prompt Structure**:
    *   **Role**: `developer` (Not `system`).
    *   **Task**: "Analyze this commitment text. Extract the date. Evaluate if it is objectively measurable. Check against this list of previous commitments for duplicates."
    *   **Output Schema** (Strict JSON):
        ```json
        {
          "extracted_date": "ISO-8601",
          "is_measurable": boolean,
          "suggestion": "string (if not measurable)",
          "is_duplicate": boolean
        }
        ```

## 4. Discovery Plan
*Before writing code, we should validate:*
1.  **The "Live" Constraint**: Can we watch a coach try to type while talking? Do they actually do it, or do they wait until the end?
2.  **The Email Value**: Ask founders, "If you got a bulleted list of what you agreed to immediately after the call, would you read it?"
