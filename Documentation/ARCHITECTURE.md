# Flowency Builder - System Architecture Documentation

**Version:** 1.0
**Last Updated:** 2025-12-03
**Status:** Production

## Table of Contents

1. [System Overview](#system-overview)
2. [Two-LLM Architecture](#two-llm-architecture)
3. [Services Layer](#services-layer)
4. [Token Usage & Performance](#token-usage--performance)
5. [Data Flow](#data-flow)
6. [Design Patterns](#design-patterns)

---

## System Overview

Flowency Builder is a conversational AI tool that helps users create comprehensive product specifications (PRDs) through natural dialogue. The system uses a sophisticated two-LLM architecture to balance conversational quality with specification accuracy.

### Core Principles

1. **Separation of Concerns**: Chat and specification generation are distinct responsibilities
2. **Specification as Source of Truth**: The spec drives conversation flow, not vice versa
3. **Progressive Enhancement**: Spec builds incrementally, not all at once
4. **Async Operations**: Non-blocking updates keep chat responsive
5. **Provider Resilience**: Automatic fallback between AI providers

### Tech Stack

- **Frontend**: Next.js 16.0.6 (App Router)
- **Backend**: AWS Amplify (Lambdas)
- **Database**: DynamoDB
- **AI Providers**: OpenAI (gpt-4o-mini), Anthropic (claude-3-5-haiku-20241022)
- **Streaming**: Server-Sent Events (SSE)

---

## Two-LLM Architecture

### Why Two LLMs?

The system uses **two separate LLM instances** for different purposes:

| Component | Purpose | Input | Output | Performance Requirement |
|-----------|---------|-------|--------|------------------------|
| **Chat AI** | Conversational experience | Recent context (10 messages) | Streaming text response | < 3 seconds |
| **PRD Engine** | Specification synthesis | Full conversation history | Structured JSON spec | 5-10 seconds (async) |

### Architecture Diagram

```
User Message
    ↓
┌───────────────────────────────────────────────────────┐
│  Chat AI (Streaming)                                  │
│  - Last 10 messages only                              │
│  - Stage-specific prompts                             │
│  - Fast response (< 3s)                               │
└───────────────────────────────────────────────────────┘
    ↓
Streamed Response → User
    ↓
┌───────────────────────────────────────────────────────┐
│  PRD Engine (Async, Every 3 Messages)                 │
│  - Full conversation history                          │
│  - Synthesizes structured spec                        │
│  - Runs in background (5-10s)                         │
└───────────────────────────────────────────────────────┘
    ↓
Updated Specification
    ↓
┌───────────────────────────────────────────────────────┐
│  Progress Tracker                                     │
│  - Calculates completeness                            │
│  - Detects project type                               │
│  - Identifies missing topics                          │
└───────────────────────────────────────────────────────┘
    ↓
Progress State → Conversation Engine → Next Question
```

### Design Rationale

**Problem**: A single LLM can't do both well:
- Fast conversational responses require minimal context
- Comprehensive spec synthesis requires full conversation history

**Solution**: Dedicated LLMs with different responsibilities:
- **Chat AI**: Keeps user engaged with fast, contextual responses
- **PRD Engine**: Ensures spec quality by analyzing full conversation

---

## Services Layer

### llm-router.ts

**Purpose**: Manages LLM provider selection, fallback logic, and rate limiting.

#### Key Responsibilities

1. **Provider Selection**: Chooses between OpenAI and Anthropic based on availability
2. **Automatic Fallback**: Switches providers if primary fails
3. **Rate Limiting**: Tracks token usage to prevent API quota exhaustion
4. **Dual API Support**: Handles both streaming (chat) and completion (PRD) patterns

#### Key Methods

```typescript
async sendRequest(prompt, context, options): Promise<StreamingResponse>
```
- Used by Chat AI for streaming conversations
- Attempts primary provider, falls back if fails
- Returns ReadableStream for SSE

```typescript
async complete(options): Promise<{ content: string }>
```
- Used by PRD Engine for structured responses
- Takes messages array, returns full completion
- Includes provider fallback logic

```typescript
selectProvider(purpose: 'conversation' | 'prd'): LLMProvider
```
- Determines which provider to use
- Currently returns first available (Anthropic → OpenAI)

#### Design Decisions

**Fallback Pattern**:
```typescript
try {
  return await this.sendRequestToProvider(provider, ...);
} catch (error) {
  const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';
  if (this.isProviderAvailable(fallbackProvider)) {
    return await this.sendRequestToProvider(fallbackProvider, ...);
  }
  throw error;
}
```

**Rate Limiting**: Tracks requests and tokens per minute, blocks if limits exceeded.

---

### conversation-engine.ts

**Purpose**: Orchestrates conversation flow, determines stages, and generates contextual questions.

#### Key Responsibilities

1. **Stage Determination**: Calculates current conversation stage based on progress
2. **Question Generation**: Creates next question guided by specification gaps
3. **Context Management**: Builds prompts with stage-specific personality
4. **Redundancy Prevention**: Tracks asked questions to avoid repetition

#### Conversation Stages

```typescript
type ConversationStage =
  | 'initial'      // 0 messages
  | 'discovery'    // < 30% complete
  | 'refinement'   // 30-70% complete
  | 'validation'   // 70-95% complete OR < 20 messages
  | 'completion';  // 95%+ complete AND 20+ messages
```

#### Key Methods

```typescript
async generateResponse(context): Promise<string[]>
```
- Main entry point for conversation
- Determines stage, generates question
- Uses PromptManager for stage-specific personality

```typescript
private determineConversationStage(context): ConversationStage
```
- Analyzes message count and completeness
- Enforces 20-message minimum before completion
- Prevents premature ending

#### Critical Design Decision

**20-Message Minimum Safeguard**:
```typescript
if (completeness < 95 || messageCount < MIN_MESSAGES_FOR_COMPLETION) {
  return 'validation';  // Cap at validation
}
```

**Rationale**: Prevents AI from ending conversation prematurely, even if early messages contain lots of information.

---

### prd-engine.ts

**Purpose**: Synthesizes structured specification from conversation using LLM.

#### Operating Modes

1. **Update Mode**: Incremental patch based on new messages (every 3 messages)
2. **Finalize Mode**: Polish spec for handoff (on completion)

#### Key Methods

```typescript
async synthesize(input: PRDEngineInput): Promise<PRDEngineOutput>
```
- Takes current spec + conversation context
- Returns **complete spec** (not partial patch)
- Includes `missingSections` array

#### Prompt Engineering

**Update Mode Prompt** (buildUpdatePrompt):
- Sends current spec + last messages
- Instructions: "Return COMPLETE Specification object"
- Handles user corrections explicitly
- Extracts features, not placeholders

**Critical Instructions**:
```
CRITICAL - HANDLING USER CORRECTIONS:
- If user says "change X to Y" or "not X, Y" → REPLACE field with Y
- If user says "lets not limit it to dads, make it all parents"
  → UPDATE targetUsers to "Parents" (not "Dads")
```

#### JSON Parsing Resilience

**Problem**: OpenAI wraps JSON in markdown code fences
```json
```json
{ "spec": {...} }
```
```

**Solution**:
```typescript
if (jsonContent.startsWith('```')) {
  jsonContent = jsonContent
    .replace(/^```(?:json)?\s*/, '')  // Remove opening
    .replace(/```\s*$/, '');           // Remove closing
}
```

#### Design Decision

**Always Return Full Spec**: PRD Engine returns complete specification every time, not deltas. This simplifies state management and prevents merge conflicts.

---

### progress-tracker.ts

**Purpose**: Calculates specification completeness and adapts to project complexity.

#### Key Responsibilities

1. **Project Type Detection**: Identifies project category from content (e-commerce, CRM, etc.)
2. **Complexity Scoring**: Calculates Simple/Medium/Complex based on requirements count
3. **Topic Management**: Determines required topics for this specific project
4. **Completeness Calculation**: Computes overall % complete

#### Project Types Recognized

```typescript
type ProjectType =
  | 'website' | 'booking-system' | 'crm' | 'mobile-app'
  | 'e-commerce' | 'web-application' | 'api' | 'unknown';
```

#### Complexity Calculation

```typescript
const complexityScore =
  reqCount * 1 +
  nfrCount * 2 +
  featureCount * 0.5 +
  integrationCount * 1.5;

if (complexityScore <= 5) return 'Simple';
if (complexityScore <= 15) return 'Medium';
return 'Complex';
```

#### Topic Completion Thresholds

**Updated 2025-12-03** (after premature completion bug):

```typescript
case 'overview':
  if (summary.overview.length < 100) return 'in-progress';  // was: 20

case 'users':
  if (summary.targetUsers.length < 50) return 'in-progress';  // was: 10

case 'features':
  if (summary.keyFeatures.length < 8) return 'in-progress';  // was: 3
```

#### Critical Bug Fix (2025-12-03)

**Bug**: `if (requiredTopics.length === 0) return 100;`
**Fix**: `if (requiredTopics.length === 0) return 0;`

**Impact**: Empty specs were marked 100% complete, causing immediate conversation termination.

#### Completeness Calculation

```typescript
private calculateCompleteness(topics: Topic[]): number {
  const requiredTopics = topics.filter(t => t.required);
  if (requiredTopics.length === 0) return 0;  // Critical fix!

  const completedCount = requiredTopics.filter(t => t.status === 'complete').length;
  const inProgressCount = requiredTopics.filter(t => t.status === 'in-progress').length;

  const totalProgress = completedCount + (inProgressCount * 0.5);

  return Math.round((totalProgress / requiredTopics.length) * 100);
}
```

---

### prompt-manager.ts

**Purpose**: Provides stage-specific AI personality prompts and behavioral rules.

#### Key Responsibilities

1. **Stage Personality**: Different tone/approach for each conversation phase
2. **Behavioral Rules**: Single question enforcement, forbidden topics
3. **Prompt Construction**: Combines system prompt with context

#### Stage Prompts

```typescript
initial: `
ROLE: Friendly specification consultant helping clients articulate ideas.
CRITICAL: Ask ONLY ONE question per response.
FORBIDDEN: Never ask about technical implementation...
`

discovery: `
CURRENT PHASE: Discovery
Focus on understanding WHAT they want, not HOW to build it.
Extract: target users, key features, problems being solved...
`

refinement: `
CURRENT PHASE: Refinement
We have basics, now dig deeper into edge cases and details...
`

validation: `
CURRENT PHASE: Validation
Check understanding, confirm decisions, identify gaps...
`

completion: `
CURRENT PHASE: Completion
DO NOT summarize the specification in this message.
Direct them to View Spec button.
The conversation ENDS here.
`
```

#### Single Question Enforcement

```
CRITICAL INTERACTION RULES (NON-NEGOTIABLE):
- Ask ONLY ONE question per response - NOT 2, NOT 3, ONLY ONE
- NEVER create numbered lists of questions
- NEVER use "Let's clarify a few things" followed by multiple questions
```

#### Forbidden Questions

**Post-PRD Services** (Flowency value-adds, not PRD scope):
- Analytics implementation
- Marketing strategy
- User authentication systems
- Engagement strategies
- Launch plans

**Technical Implementation**:
- What tools/platforms to use
- How to receive notifications (email/push/SMS)
- Authentication mechanisms

---

### session-manager.ts

**Purpose**: Handles DynamoDB persistence for sessions and conversation state.

#### Key Responsibilities

1. **Session CRUD**: Create, read, update sessions
2. **State Persistence**: Save/load conversation history and specification
3. **Session Recovery**: Restore state from database
4. **TTL Management**: Sessions expire after inactivity

#### Key Methods

```typescript
async createSession(): Promise<Session>
```
- Generates unique session ID
- Initializes empty spec and conversation
- Sets createdAt, lastAccessedAt timestamps

```typescript
async saveSessionState(sessionId, state): Promise<void>
```
- Persists conversation history
- Saves current specification version
- Updates progress and completeness

```typescript
async getSession(sessionId): Promise<Session | null>
```
- Retrieves full session state
- Deserializes JSON fields
- Returns null if not found/expired

#### DynamoDB Schema

```typescript
{
  id: string;                    // Partition key
  createdAt: Date;
  lastAccessedAt: Date;
  state: {
    conversationHistory: Message[];
    specification: Specification;
    progress: ProgressState;
    completeness: CompletenessState;
  }
}
```

---

### specification-generator.ts

**Purpose**: Creates initial empty specification structure.

#### Key Responsibilities

1. **Schema Generation**: Produces valid empty Specification object
2. **Version Initialization**: Sets version to 0
3. **Template Creation**: Provides structure for PRD Engine to fill

#### Generated Structure

```typescript
{
  plainEnglishSummary: {
    overview: '',
    keyFeatures: [],
    targetUsers: '',
    integrations: [],
    estimatedComplexity: 'Simple'
  },
  formalPRD: {
    introduction: '',
    glossary: {},
    requirements: [],
    nonFunctionalRequirements: []
  },
  version: 0
}
```

---

## Token Usage & Performance

### Problem Discovered: 2025-12-03

#### Timeline

**17:37 - 19:24**: Successful 25-message conversation (Anthropic)
**20:41**: Deployed completion threshold fixes
**20:42**: First timeout error (28 seconds)
**20:46**: Second timeout error (28 seconds)

#### Root Cause Analysis

**What Changed**: Anthropic API credits exhausted between 19:24 and 20:42

**Impact**:
- Chat AI fell back to OpenAI (slower for this workload)
- Full conversation history sent to OpenAI
- OpenAI took 28+ seconds to process 7+ messages
- Lambda timeout at 28 seconds (Amplify hard limit)

**Why It Manifested Now**:
- Premature completion fixes (deployed 20:41) made conversations longer
- Longer conversations = more messages in history
- More messages = exponentially slower OpenAI processing
- Previous short conversations (8 messages) never hit this issue

### Performance Comparison

| Provider | Messages | History Sent | Response Time | Outcome |
|----------|----------|--------------|---------------|---------|
| Anthropic | 25 | Full (25 msgs) | 1-3 seconds | Success |
| OpenAI | 6-7 | Full (7 msgs) | 28+ seconds | Timeout |
| OpenAI | 6-7 | Last 10 (7 msgs) | < 3 seconds | Success (proposed fix) |

### The Solution

**Trim conversation history for Chat AI**:

```typescript
// llm-router.ts - sendOpenAIRequest() and sendAnthropicRequest()

// BEFORE (full history)
const messages = context.conversationHistory.map(...);

// AFTER (last 10 messages)
const recentHistory = context.conversationHistory.slice(-10);
const messages = recentHistory.map(...);
```

**Why This Works**:

1. **Chat AI** doesn't need full history - recent context sufficient
2. **PRD Engine** still gets full history (unchanged)
3. **Specification** is source of truth, not conversation
4. **Reduces tokens** exponentially (10 vs 25+ messages)

**Impact**:
- Chat responses: 28s → <3s
- PRD quality: Unchanged (still uses full history)
- User experience: Dramatically improved

### Why Two-LLM Architecture Matters

**Without separation**: This problem would be unsolvable
- Fast chat requires limited context
- Good spec requires full context
- Can't have both with single LLM

**With separation**: Each LLM optimized for its task
- Chat AI: 10 messages, fast responses
- PRD Engine: Full history, comprehensive analysis

---

## Data Flow

### Message Processing Flow

```
1. User sends message
   ↓
2. SessionManager: Load session state from DynamoDB
   ↓
3. Add user message to conversationHistory
   ↓
4. ConversationEngine: Determine stage
   ↓
5. PromptManager: Get stage-specific prompt
   ↓
6. LLMRouter: Send to Chat AI (streaming)
   │
   ├─→ Anthropic (try first)
   └─→ OpenAI (fallback)
   ↓
7. Stream response chunks via SSE
   ↓
8. Add assistant message to conversationHistory
   ↓
9. ProgressTracker: Update progress
   ↓
10. SessionManager: Save state to DynamoDB
    ↓
11. Send completion event to client
    ↓
12. [ASYNC] Check if spec update needed
    ↓
13. [ASYNC] PRDEngine: Synthesize spec (if triggered)
    ↓
14. [ASYNC] SessionManager: Save updated spec
    ↓
15. [ASYNC] Client polls for spec updates
```

### PRD Engine Trigger Logic

```typescript
const shouldUpdateSpec =
  isFirstRun ||                              // First user message
  userMessageCount % 3 === 0 ||              // Every 3 messages
  containsKeywords(userMessage, [            // Keyword matches
    'feature', 'user', 'requirement',
    'integration', 'workflow'
  ]);
```

### Specification Version Tracking

**Problem**: Async updates arrive out of order, causing UI flicker

**Solution**: Version numbers prevent stale updates

```typescript
// Client-side (ChatInterface.tsx)
if (incomingVersion <= currentVersion) {
  console.log('[CLIENT] Ignoring stale spec update');
  return;
}
```

---

## Design Patterns

### 1. Async Fire-and-Forget

**Pattern**: Run PRD Engine after response completes

```typescript
// Close HTTP stream immediately
controller.close();

// Then run PRD Engine in background
(async () => {
  try {
    const prdResult = await prdEngine.synthesize({...});
    await sessionManager.saveSessionState(sessionId, {...});
  } catch (error) {
    console.error('[PRD] Async update failed:', error);
  }
})();
```

**Why**: Keeps chat responsive while spec builds in background

**Note**: Initial attempt to fire-and-forget BEFORE closing stream failed - Lambda execution freezes when response sent.

### 2. Provider Fallback

**Pattern**: Try primary, fallback to secondary on failure

```typescript
try {
  return await this.sendRequestToProvider(provider, ...);
} catch (error) {
  const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';
  if (this.isProviderAvailable(fallbackProvider)) {
    return await this.sendRequestToProvider(fallbackProvider, ...);
  }
  throw error;
}
```

**Why**: Resilience against API outages or quota exhaustion

### 3. Specification as Source of Truth

**Pattern**: Conversation → Spec → UI, not Conversation → UI

```
User Message
    ↓
PRD Engine (analyzes full conversation)
    ↓
Updated Specification
    ↓
Progress Tracker (analyzes spec)
    ↓
Next Question (guided by spec gaps)
```

**Why**: Ensures conversation stays focused on completing spec, not wandering

### 4. Stage-Based Prompts

**Pattern**: Different AI personality for each conversation phase

```typescript
const stagePrompt = promptManager.getSystemPrompt(stage);
const messages = [
  { role: 'system', content: stagePrompt },
  ...conversationHistory
];
```

**Why**: Natural progression from broad questions to detailed refinement

### 5. Optimistic UI Updates

**Pattern**: Show user message immediately, stream response

```typescript
// Add user message to local state
setMessages(prev => [...prev, userMessage]);

// Stream assistant response
eventSource.onmessage = (event) => {
  const chunk = JSON.parse(event.data);
  // Append to streaming message
};
```

**Why**: Feels instant, even though LLM takes seconds

---

## Known Issues & Future Work

### Current Limitations

1. **No conversation summary**: Long conversations send full history to PRD Engine
2. **No edit history**: User can't revise previous answers
3. **No branching**: Can't explore alternative directions
4. **Single conversation**: No multi-session projects

### Planned Improvements

1. **Conversation trimming**: Implemented for Chat AI, needs testing
2. **Magic link recovery**: Implemented but needs validation
3. **Share dialogue**: Implemented, branded for Flowency
4. **Anthropic credit monitoring**: Need alerts before exhaustion

### Technical Debt

1. **Error handling**: Generic error messages, needs better UX
2. **Rate limiting**: Basic implementation, needs sophistication
3. **Caching**: No LLM response caching (cost optimization)
4. **Testing**: Limited automated tests for conversation flow

---

## Deployment Notes

### Environment Variables

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DYNAMODB_TABLE_NAME=spec-wizard-sessions
AWS_REGION=eu-west-2
```

### AWS Amplify Configuration

- **Platform**: AWS Amplify Gen 2
- **Region**: eu-west-2 (London)
- **Lambda Timeout**: 28 seconds (hard limit)
- **DynamoDB**: On-demand billing
- **Node Version**: 20.x

### Git Workflow

```bash
git add .
git commit -m "Descriptive message

Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Note**: Amplify auto-deploys on push to main (currently enabled)

---

## Appendix: Key Commits

### 2025-12-03 - Premature Completion Fix

**Commit**: `c992427`

**Changes**:
- Fixed progress-tracker.ts returning 100% for empty topics
- Raised completion thresholds (overview 20→100, users 10→50, features 3→8)
- Added 20-message minimum before completion
- Raised completion threshold from 90% to 95%

### 2025-12-03 - OpenAI JSON Parsing Fix

**Commit**: `6cce992`

**Changes**:
- Strip markdown code fences from OpenAI responses
- Prevents `Unexpected token '`'` errors
- Allows graceful handling of wrapped JSON

### 2025-12-03 - Async PRD Engine

**Commit**: `cf1b5fd`

**Changes**:
- Moved PRD Engine execution to after stream closes
- Prevents 5-10 second response delays
- Uses fire-and-forget async pattern

---

## Glossary

- **Chat AI**: LLM instance handling conversational experience
- **PRD Engine**: LLM instance synthesizing structured specifications
- **Specification**: Structured product requirements document
- **Session**: User's conversation instance with state persistence
- **Stage**: Current conversation phase (initial, discovery, refinement, validation, completion)
- **Progress**: Calculated completeness percentage and topic status
- **SSE**: Server-Sent Events (streaming protocol)
- **Version**: Monotonically increasing spec revision number



