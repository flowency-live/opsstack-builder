# FLOWENCY BUILDER — SYSTEM BIBLE

**Version:** 0.3.1
**Last Updated:** 2025-12-04
**Status:** ✅ Production Ready

This document is the **single source of truth** for Flowency Builder's architecture, design decisions, and implementation details. All code changes MUST be reflected here.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [The Feedback Loop (Critical)](#the-feedback-loop-critical)
4. [Service Layer](#service-layer)
5. [Data Schemas](#data-schemas)
6. [Prompt Engineering](#prompt-engineering)
7. [Critical Design Decisions](#critical-design-decisions)
8. [Deployment](#deployment)
9. [Change Log](#change-log)

---

## System Overview

### What is Flowency Builder?

A conversational AI assistant that helps users create **build-ready product specifications (PRDs)** through natural dialogue. The system uses a sophisticated two-LLM architecture to balance conversational quality with specification accuracy.

### Tech Stack

```
Frontend:  Next.js 16.0.6 (App Router), React 19.2.0, Zustand
Backend:   AWS Amplify (Serverless), Next.js API Routes
Database:  DynamoDB (on-demand billing)
Storage:   S3 (specification PDFs, exports)
Email:     AWS SES (magic links, sharing)
AI:        OpenAI (gpt-4o-mini), Anthropic (claude-3-5-haiku-20241022)
PDF:       @sparticuz/chromium + puppeteer-core (serverless-compatible)
```

### Core Principles

1. **Spec-First Architecture** - Specification drives conversation, not vice versa
2. **Incremental Refinement** - Spec builds gradually, never regenerates from scratch
3. **Living PRD** - Specification is always exportable at any stage
4. **Gap-Driven Conversation** - AI asks about missing sections only
5. **No Quick Fixes** - Production-grade solutions, no workarounds

---

## Core Architecture

### Two-LLM Design

The system uses **two separate LLM instances** for different purposes:

| Component | Purpose | Context | Performance | When |
|-----------|---------|---------|-------------|------|
| **Chat AI** | Conversational experience | Last 10 messages + spec state + missingSections | < 3 seconds | Every user message |
| **PRD Engine** | Specification synthesis | Last 6 messages + current spec | 5-10 seconds | Every 3 messages (async) |

#### Why Two LLMs?

**Problem**: A single LLM cannot optimize for both:
- Fast conversational responses (requires minimal context)
- Comprehensive spec synthesis (requires full conversation understanding)

**Solution**: Specialized LLMs with distinct responsibilities:
- **Chat AI**: Keeps user engaged with fast, context-aware responses
- **PRD Engine**: Ensures spec quality through deep analysis

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER MESSAGE                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION MANAGER                                                 │
│  - Load session state from DynamoDB                              │
│  - Get current specification + completeness                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CONVERSATION ENGINE                                             │
│  - reconstructContext(history, spec, completeness)               │
│  - Inject missingSections into prompt                            │
│  - Determine conversation stage                                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  CHAT AI (LLM Router → Anthropic/OpenAI)                        │
│  - Streaming response (< 3s)                                     │
│  - Sees: last 10 messages + spec summary + missingSections       │
│  - Asks about GAPS ONLY                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    [STREAM RESPONSE TO USER]
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION MANAGER                                                 │
│  - Save conversation history                                     │
│  - Close HTTP stream                                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    [EVERY 3 MESSAGES - ASYNC]
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PRD ENGINE (Background)                                         │
│  - Receives: last 6 messages + current spec                      │
│  - PRESERVES all existing content                                │
│  - ADDS new information incrementally                            │
│  - Returns: FULL updated spec + missingSections                  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COMPLETENESS CALCULATION                                        │
│  - missingSections: ["overview", "flows", ...]                   │
│  - readyForHandoff: boolean (all sections complete)              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  SESSION MANAGER                                                 │
│  - Save updated spec + completeness                              │
│  - Increment version number                                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
                    [NEXT MESSAGE SEES UPDATED STATE]
```

---

## The Feedback Loop (Critical)

### The Problem (Fixed Dec 4, 2025)

**Before the fix**, the system had a broken feedback loop:

```
User dumps 90% complete spec
    ↓
PRD Engine extracts everything (version 0 → 1)
    ↓
❌ Conversation Engine BLOCKS spec context (version === 0 guard)
    ↓
❌ AI asks basic questions (can't see captured info)
    ↓
After 3 messages: PRD Engine gets ONLY last 3 messages
    ↓
❌ Regenerates spec from 3 messages (destroys initial dump)
    ↓
SPEC DEGRADES over time instead of improving
```

**Root Causes:**
1. `missingSections` computed but never passed to conversation engine
2. Spec context blocked when `version === 0`
3. PRD engine only received 3 messages (insufficient context)
4. No incremental update rules - full regeneration each time

### The Solution (Current Implementation)

**After the fix**, the system maintains a proper feedback loop:

```
User Message → Conversation Engine
    ↓
✅ Receives completeness.missingSections
    ↓
✅ Injects missingSections into prompt
    ↓
✅ Shows spec state: "Overview: X, Features: Y, Z"
    ↓
✅ Shows missing: "MISSING: flows, constraints"
    ↓
AI asks about GAPS ONLY (gap-driven questioning)
    ↓
Every 3 messages → PRD Engine
    ↓
✅ Receives last 6 messages (not 3) for context
    ↓
✅ PRESERVES all existing spec content
    ↓
✅ ADDS new information incrementally
    ↓
✅ Returns updated missingSections
    ↓
Next message → AI sees UPDATED spec + NEW missingSections
    ↓
SPEC BUILDS incrementally, exportable at any point
```

### Key Implementation Details

#### 1. Conversation Engine ([conversation-engine.ts:145-177](spec-wizard/lib/services/conversation-engine.ts#L145-L177))

```typescript
async reconstructContext(
  sessionId: string,
  conversationHistory: Message[],
  specification?: Specification,
  lockedSections?: LockedSection[],
  completeness?: CompletenessState  // ✅ NOW RECEIVED
): Promise<ConversationContext> {
  return {
    sessionId,
    conversationHistory: prunedHistory.map(...),
    currentSpecification: specification,
    completeness,  // ✅ PASSED THROUGH
    projectType,
    userIntent,
    lockedSections,
  };
}
```

#### 2. Spec Context Injection ([conversation-engine.ts:296-345](spec-wizard/lib/services/conversation-engine.ts#L296-L345))

```typescript
private enhancePromptWithSpecContext(
  prompt: string,
  specification?: Specification,
  completeness?: CompletenessState  // ✅ NOW RECEIVED
): string {
  // ✅ REMOVED: if (specification.version === 0) return prompt;

  const missingSections = completeness?.missingSections ?? [];

  let specContext = `
CURRENT SPECIFICATION STATE:
Overview: ${overview || 'Not yet defined'}
Target Users: ${targetUsers || 'Not yet defined'}
Features Captured: ${keyFeatures.length} features
Key Features: ${keyFeatures.slice(0, 5).join(', ')}
User Flows: ${flows.length} flows captured

MISSING SECTIONS (focus your questions here):  // ✅ CRITICAL
${missingSections.map(section => `- ${section}`).join('\n')}

INSTRUCTIONS:
- Reference what we already know from the spec
- Focus questions on MISSING SECTIONS above
- Don't repeat questions about captured information
- Build on existing knowledge`;

  return `${prompt}${specContext}`;
}
```

#### 3. Messages Route ([messages/route.ts:81-86](spec-wizard/app/api/sessions/[id]/messages/route.ts#L81-L86))

```typescript
const context = await conversationEngine.reconstructContext(
  sessionId,
  updatedHistory,
  session.state.specification,
  session.state.lockedSections,
  session.state.completeness  // ✅ NOW PASSED
);
```

#### 4. Smart Message Selection ([messages/route.ts:166-183](spec-wizard/app/api/sessions/[id]/messages/route.ts#L166-L183))

```typescript
// Detect large initial spec dump
const firstUserMessage = finalHistory.find(m => m.role === 'user');
const isLargeInitialDump = isFirstRun &&
  firstUserMessage &&
  firstUserMessage.content.length > 500 &&
  /feature|requirement|user|flow|spec|product/i.test(firstUserMessage.content);

// ✅ Smart message selection:
// - First run OR large dump: pass ALL history
// - Subsequent runs: pass last 6 messages (not 3!)
const messagesToPass = (isFirstRun || isLargeInitialDump)
  ? finalHistory
  : finalHistory.slice(-6);  // ✅ Was: slice(-3)
```

#### 5. PRD Engine Incremental Rules ([prd-engine.ts:119-172](spec-wizard/lib/services/prd-engine.ts#L119-L172))

```typescript
return `You are updating a product specification based on new conversation.

CURRENT SPEC SUMMARY (JSON):
${specSummaryText}

NEW MESSAGES:
${messagesText}

════════════════════════════════════════════════════════════════
CRITICAL RULES - INCREMENTAL UPDATE MODE:
════════════════════════════════════════════════════════════════

1. PRESERVE ALL EXISTING CONTENT
   - The CURRENT SPEC SUMMARY above contains ALL previous conversations
   - You MUST preserve every piece unless explicitly contradicted
   - Return COMPLETE Specification object with ALL existing fields

2. INCREMENTAL CHANGES ONLY
   - Only ADD new information from NEW MESSAGES
   - Only REFINE if NEW MESSAGES provide clarifications
   - Only REPLACE if NEW MESSAGES explicitly correct or contradict

3. ARRAYS ARE ADDITIVE
   - For arrays (keyFeatures, flows, etc.): ADD new items, don't replace
   - Only remove items if user explicitly says to remove them
   - Keep all existing array items and append new ones

4. CORRECTIONS VS ADDITIONS
   - Explicit corrections ("change X to Y", "not X, actually Y"):
     → REPLACE the old value
   - Additions (user mentions new features):
     → ADD to existing arrays
   - Clarifications (more detail about existing items):
     → ENHANCE the existing item

EXAMPLES OF CORRECT INCREMENTAL UPDATES:

Example 1 - Addition:
  Current: keyFeatures: ["User login", "Search"]
  New message: "User: We also need notifications"
  Result: keyFeatures: ["User login", "Search", "Push notifications"]

Example 2 - Correction:
  Current: targetUsers: "Dads with young children"
  New message: "User: Actually, make it all parents, not just dads"
  Result: targetUsers: "Parents with young children"

Example 3 - Refinement:
  Current: overview: "A platform for finding activities"
  New message: "User: It should focus on outdoor activities"
  Result: overview: "A platform for finding outdoor activities for families"
`;
```

#### 6. Stage Determination ([conversation-engine.ts:222-243](spec-wizard/lib/services/conversation-engine.ts#L222-L243))

```typescript
private determineConversationStage(context: ConversationContext): ConversationStage {
  const messageCount = context.conversationHistory.length;
  const missingSections = context.completeness?.missingSections ?? [];  // ✅ NEW
  const readyForHandoff = context.completeness?.readyForHandoff ?? false;

  const MIN_MESSAGES_FOR_COMPLETION = 20;

  if (messageCount === 0) {
    return 'initial';
  } else if (!context.currentSpecification || context.currentSpecification.version === 0) {
    return 'discovery';
  } else if (missingSections.length > 3) {  // ✅ Gap-driven
    return 'discovery';
  } else if (missingSections.length > 0) {  // ✅ Gap-driven
    return 'refinement';
  } else if (!readyForHandoff || messageCount < MIN_MESSAGES_FOR_COMPLETION) {
    return 'validation';
  } else {
    return 'completion';
  }
}
```

---

## Service Layer

### LLM Router ([llm-router.ts](spec-wizard/lib/services/llm-router.ts))

**Purpose**: Manages AI provider selection, fallback logic, and rate limiting.

**Key Responsibilities:**
1. Provider selection (Anthropic → OpenAI fallback)
2. Automatic retry with alternate provider
3. Rate limiting (requests/minute, tokens/minute)
4. Dual API support (streaming for chat, completion for PRD)

**Key Methods:**

```typescript
async sendRequest(
  prompt: string,
  context: ConversationContext,
  options: { stream: boolean }
): Promise<StreamingResponse>
```
- Used by Chat AI for streaming responses
- Attempts Anthropic first, falls back to OpenAI
- Returns ReadableStream for Server-Sent Events
- **CRITICAL**: Only sends last 10 messages from context (performance)

```typescript
async complete(options: {
  messages: Message[];
  temperature: number;
  maxTokens: number;
}): Promise<{ content: string }>
```
- Used by PRD Engine for structured JSON responses
- Takes full message array (no pruning)
- Includes provider fallback logic
- Strips markdown code fences from OpenAI responses

**Fallback Pattern:**
```typescript
try {
  return await this.sendRequestToProvider(provider, ...);
} catch (error) {
  const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai';
  if (this.isProviderAvailable(fallbackProvider)) {
    console.warn(`[LLM] ${provider} failed, falling back to ${fallbackProvider}`);
    return await this.sendRequestToProvider(fallbackProvider, ...);
  }
  throw error;
}
```

---

### Conversation Engine ([conversation-engine.ts](spec-wizard/lib/services/conversation-engine.ts))

**Purpose**: Orchestrates conversation flow, injects spec context, determines stages.

**Key Responsibilities:**
1. Reconstruct conversation context with completeness state
2. Inject spec state + missingSections into prompts
3. Determine conversation stage based on gaps
4. Prevent redundant questions
5. Manage conversation history pruning

**Critical Methods:**

```typescript
async processMessage(
  sessionId: string,
  userMessage: string,
  context: ConversationContext
): Promise<StreamingResponse>
```
- Main entry point for conversation
- Determines stage → gets system prompt → injects spec context
- Adds redundancy check → locked sections → business language filter
- Calls LLM Router for streaming response

```typescript
async reconstructContext(
  sessionId: string,
  conversationHistory: Message[],
  specification?: Specification,
  lockedSections?: LockedSection[],
  completeness?: CompletenessState
): Promise<ConversationContext>
```
- **CRITICAL**: Now accepts completeness parameter
- Extracts project type and user intent
- Prunes history to last 10 messages
- Returns context object with ALL state

```typescript
private enhancePromptWithSpecContext(
  prompt: string,
  specification?: Specification,
  completeness?: CompletenessState
): string
```
- **CRITICAL**: Injects missingSections into prompt
- Shows current spec state (overview, users, features, flows)
- Lists missing sections for gap-driven questioning
- NO VERSION GUARD (always injects if spec exists)

---

### PRD Engine ([prd-engine.ts](spec-wizard/lib/services/prd-engine.ts))

**Purpose**: Synthesizes structured specification from conversation using LLM.

**Operating Modes:**
1. **Update Mode**: Incremental patch based on new messages (every 3 messages)
2. **Finalize Mode**: Polish spec for handoff (on completion)

**Key Method:**

```typescript
async synthesize(input: PRDEngineInput): Promise<PRDEngineOutput>
```

**Input:**
```typescript
{
  mode: 'update',
  currentSpec: Specification,      // Full current spec
  lastMessages: Message[],         // Last 6 messages (or all if first run)
  isFirstRun: boolean
}
```

**Output:**
```typescript
{
  spec: Specification,              // FULL updated spec (not delta)
  missingSections: string[]         // Gaps to fill
}
```

**Critical Design Decisions:**

1. **Always Returns Full Spec**: PRD Engine returns complete specification every time, not deltas. Simplifies state management.

2. **Incremental Update Rules**: Explicit preservation and additive behavior enforced via prompt engineering (see Feedback Loop section).

3. **JSON Parsing Resilience**:
```typescript
// OpenAI wraps JSON in markdown code fences
if (jsonContent.startsWith('```')) {
  jsonContent = jsonContent
    .replace(/^```(?:json)?\s*/, '')  // Remove opening
    .replace(/```\s*$/, '');           // Remove closing
}
```

4. **Fallback on Failure**: Returns current spec unchanged if parsing fails, preventing data loss.

---

### Session Manager ([session-manager.ts](spec-wizard/lib/services/session-manager.ts))

**Purpose**: Handles DynamoDB persistence for sessions and conversation state.

**Key Methods:**

```typescript
async createSession(): Promise<Session>
```
- Generates unique session ID (UUID)
- Initializes empty spec (version 0)
- Sets createdAt, lastAccessedAt timestamps
- Returns session object

```typescript
async saveSessionState(sessionId: string, state: SessionState): Promise<void>
```
- Persists conversation history
- Saves current specification + version
- Saves completeness state (missingSections, readyForHandoff)
- Updates lastAccessedAt timestamp

```typescript
async getSession(sessionId: string): Promise<Session | null>
```
- Retrieves full session state from DynamoDB
- Deserializes JSON fields
- Returns null if not found or expired
- Updates lastAccessedAt on access

**DynamoDB Schema:**
```typescript
{
  id: string;                    // Partition key (session ID)
  createdAt: string;             // ISO timestamp
  lastAccessedAt: string;        // ISO timestamp
  state: {
    conversationHistory: Message[];
    specification: Specification;
    completeness: CompletenessState;
    userInfo: Record<string, any>;
    lockedSections: LockedSection[];
  }
}
```

---

### Prompt Manager ([prompt-manager.ts](spec-wizard/lib/services/prompt-manager.ts))

**Purpose**: Provides stage-specific AI personality prompts and behavioral rules.

**Key Responsibilities:**
1. Stage personality (different tone for each phase)
2. Behavioral rules (single question enforcement, forbidden topics)
3. Prompt construction (combines base persona + stage + project type)

**Base Persona:**
- Jason Jones tone: direct, concise, no-nonsense, radically candid
- UK English mandatory
- Flowency Build positioning ("we" language)
- Challenge vagueness, push for clarity
- **Critical Rule**: Ask ONLY ONE question per response

**Stage Prompts:**

```typescript
initial: `
CURRENT PHASE: Initial Discovery
Your job:
- Understand, at a high level, what the user wants to build
- Clarify the core problem and intent
- Do NOT dive into detailed features yet

SPECIAL: DETECTING EXISTING SPECIFICATIONS
If user's first message contains existing spec/brief (paragraphs, bullets, features):
→ "Great! I can see you've got a specification started. Let me review..."
→ Ask single clarifying question about most unclear part
→ DO NOT ask them to re-explain everything
`

discovery: `
CURRENT PHASE: Discovery
Your job:
- Identify who will use the software
- Clarify what each user needs to accomplish
- Identify core flows and outcomes
- Define Version 1 boundaries
- Challenge vagueness ruthlessly

TOPIC BOUNDARIES - DO NOT ASK ABOUT:
- Scalability or performance (post-PRD)
- Infrastructure or deployment (we handle this)
- Security architecture (we handle this)
- Technical implementation details
`

refinement: `
CURRENT PHASE: Refinement
Your job:
- Map the flows (how people will actually use this)
- Define what the system must do (features + behaviours)
- Recommend sensible defaults based on best practice
- PROPOSE solutions based on expertise, don't ask users to design
`

validation: `
CURRENT PHASE: Validation
Your job:
- Read back what we've captured — clearly, in bullets
- Check if anything is missing or contradictory
- Identify open decisions affecting WHAT we're building (not HOW)
- Ensure nothing ambiguous remains
`

completion: `
CURRENT PHASE: Completion
Your job:
- DO NOT summarize the specification in this message
- Confirm everything has been captured
- Tell client: "Your specification is complete and ready for review."
- Tell them: "Click 'View Spec' to review, then Export or Share to send to us."
- End with: "We'll review and get back to you with a proposal within 48 hours."

CRITICAL:
- DO NOT ask about next steps, development roadmap, marketing, analytics
- DO NOT summarize or play back spec content - direct to View Spec
- The conversation ENDS here
`
```

**Forbidden Questions (Explicitly Listed in Prompt):**
- What tools or platforms to use
- Do you have a team or resources
- What tech stack are you considering
- How will users receive notifications (email/push/SMS)
- What rating system should we use
- How will reviews be displayed
- What analytics do you want to track
- How will you market this
- Do you have a marketing strategy
- What about user authentication

**Button Formats:**
```
Quick options: [Option 1] | [Option 2] | [Something else]

Action buttons (after substantial progress):
"We've captured core features. [BUTTON:View Spec] [BUTTON:Continue Refining]"
```

---

### Export Service ([export-service.ts](spec-wizard/lib/services/export-service.ts))

**Purpose**: Generates PDF and Markdown exports of specifications.

**Key Features:**

1. **Serverless PDF Generation**:
```typescript
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const browser = await puppeteer.launch({
  args: chromium.args,
  defaultViewport: chromium.defaultViewport,
  executablePath: await chromium.executablePath(),
  headless: chromium.headless,
});
```

2. **HTML Template**: Professional A4 layout with:
- Flowency Build branding
- Specification metadata (version, last updated)
- Plain English Summary
- User Flows
- Rules & Constraints
- Non-Functional Requirements
- MVP Definition
- Formal PRD sections

3. **Markdown Export**: GitHub-flavored markdown for easy editing

**Critical Fix (Dec 3, 2025)**: Changed from `puppeteer` to `@sparticuz/chromium` for Lambda compatibility (~50MB vs 300MB+ bundle).

---

## Data Schemas

### ConversationContext ([prompt-manager.ts:13-32](spec-wizard/lib/services/prompt-manager.ts#L13-L32))

```typescript
export interface ConversationContext {
  sessionId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  currentSpecification?: Specification;
  completeness?: {                    // ✅ ADDED Dec 4, 2025
    missingSections: string[];
    readyForHandoff: boolean;
    lastEvaluated: string;            // ISO timestamp
  };
  projectType?: string;
  userIntent?: Record<string, any>;
  lockedSections?: Array<{
    name: string;
    summary: string;
    lockedAt: string;                 // ISO timestamp
  }>;
}
```

---

### CompletenessState ([types.ts](spec-wizard/lib/models/types.ts))

```typescript
export interface CompletenessState {
  missingSections: string[];          // ["overview", "flows", "constraints"]
  readyForHandoff: boolean;           // All sections complete + quality thresholds met
  lastEvaluated: string;              // ISO timestamp
}

// Default missing sections for new specs
export const DEFAULT_MISSING_SECTIONS = [
  'overview',
  'targetUsers',
  'keyFeatures',
  'flows',
  'rulesAndConstraints',
  'nonFunctional',
  'mvpDefinition'
];
```

---

### Specification ([types.ts](spec-wizard/lib/models/types.ts))

```typescript
export interface Specification {
  id: string;                         // UUID
  version: number;                    // Monotonically increasing (0, 1, 2, ...)
  lastUpdated: string;                // ISO timestamp

  plainEnglishSummary: {
    overview: string;                 // Elevator pitch (1-2 sentences)
    targetUsers: string;              // Who uses this
    keyFeatures: string[];            // Core features
    flows: string[];                  // User journeys
    rulesAndConstraints: string[];    // Business rules
    nonFunctional: string[];          // Performance, reliability expectations
    mvpDefinition: {
      included: string[];             // V1 scope
      excluded: string[];             // Future features
    };
  };

  formalPRD: {
    introduction: string;
    glossary: Record<string, string>;
    requirements: Array<{
      id: string;                     // "req-1", "req-2"
      userStory: string;              // "As a [user], I want [goal], so that [benefit]"
      acceptanceCriteria: string[];   // "WHEN [trigger] THEN THE System SHALL [response]"
      priority: 'must-have' | 'should-have' | 'nice-to-have';
    }>;
    nonFunctionalRequirements: Array<{
      id: string;                     // "nfr-1", "nfr-2"
      category: string;               // "Performance", "Security", "Reliability"
      description: string;            // "THE System SHALL [requirement]"
    }>;
  };
}
```

---

### SessionState ([types.ts](spec-wizard/lib/models/types.ts))

```typescript
export interface SessionState {
  conversationHistory: Message[];
  specification: Specification;
  completeness: CompletenessState;    // ✅ Replaces old ProgressState
  userInfo: Record<string, any>;
  lockedSections: LockedSection[];
}

export interface Message {
  id: string;                         // UUID
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;                  // ISO timestamp (NOT Date object)
}

export interface LockedSection {
  name: string;                       // Section name
  summary: string;                    // Brief summary of locked decision
  lockedAt: string;                   // ISO timestamp
}
```

**CRITICAL**: All `Date` fields are `string` (ISO format) for JSON serialization compatibility.

---

## Prompt Engineering

### Chat AI Prompt Construction

**Assembly Order:**
```typescript
1. Base Persona (from prompt-manager.ts BASE_PERSONA)
2. Stage-Specific Prompt (initial/discovery/refinement/validation/completion)
3. Project Type Hints (optional: ecommerce, booking, ai_agent)
4. Spec Context Injection (current spec + missingSections)  // ✅ CRITICAL
5. Redundancy Check (information already provided)
6. Locked Sections (decisions finalized)
7. Business Language Filter (avoid technical jargon)
```

**Example Final Prompt (Discovery Stage):**
```
You are an AI product partner operating in Jason Jones' tone:
direct, concise, no-nonsense, and radically candid — but never rude.
Use **UK English** at all times.

You represent Flowency Build, the team who will BUILD this product.
Use "we" and "our" language. You are a collaborative partner.

Your behavioural rules:
- Challenge vagueness immediately
- Do not accept contradictions
- Push for clarity, constraints, and real examples
- Always think like an engineer asking: "Can WE build this?"
- Ask ONLY ONE question per response

────────────────────────────────────────
CURRENT PHASE: Discovery

Your job:
- Identify who will use the software
- Clarify what each user needs to accomplish
- Identify core flows and outcomes
- Challenge vagueness ruthlessly

────────────────────────────────────────

CURRENT SPECIFICATION STATE:
Overview: A platform for dads to find local activities for their children
Target Users: Dads with young children (ages 2-8)
Features Captured: 3 features
Key Features: Map-based activity discovery, Save favorites, Get notifications
User Flows: 0 flows captured

MISSING SECTIONS (focus your questions here):
- flows
- rulesAndConstraints
- nonFunctional
- mvpDefinition

INSTRUCTIONS:
- Reference what we already know from the spec
- Focus questions on MISSING SECTIONS above
- Don't repeat questions about captured information
- Build on existing knowledge

────────────────────────────────────────

LANGUAGE GUIDELINES:
- Use plain business language that any SME owner can understand
- Avoid technical jargon like: API, REST, GraphQL, microservices
- Focus on business outcomes and user needs, not implementation details
- Ask about "what" and "why" rather than "how"
```

---

### PRD Engine Prompt (Update Mode)

**See [The Feedback Loop](#the-feedback-loop-critical) section above for full prompt.**

**Key Components:**
1. Current spec summary (JSON)
2. New messages (last 6 for context)
3. Critical rules section (incremental update mode)
4. Examples (addition, correction, refinement)
5. Expected JSON output structure

**Result Handling:**
```typescript
const result = JSON.parse(jsonContent);

return {
  spec: result.spec,                  // FULL specification
  missingSections: result.missingSections || []
};
```

---

## Critical Design Decisions

### 1. Spec-First Architecture

**Decision**: Specification drives conversation flow, not conversation history.

**Rationale**:
- Ensures conversation stays focused on completing spec
- Prevents wandering or repetitive questions
- Makes spec exportable at any point
- Source of truth for progress tracking

**Implementation**:
- PRD Engine analyzes conversation → updates spec
- Completeness calculated from spec state
- Chat AI references spec state to avoid redundancy
- missingSections drives next question

---

### 2. Incremental Refinement (No Regeneration)

**Decision**: Spec builds incrementally; never regenerates from scratch.

**Rationale**:
- Preserves initial information dumps
- Prevents information loss over time
- Allows users to front-load large specs
- More intuitive user experience (spec improves, doesn't reset)

**Implementation**:
- PRD Engine receives current spec + new messages
- Explicit preservation rules in prompt
- Array operations are additive (append, not replace)
- Full spec returned each time (not deltas)

**Fixed**: Dec 4, 2025 (previously was regenerating from last 3 messages only)

---

### 3. Two-LLM Architecture

**Decision**: Separate LLMs for chat and spec synthesis.

**Rationale**:
- Fast chat requires minimal context (10 messages)
- Quality spec requires deep analysis (full history understanding)
- Can't optimize single LLM for both conflicting goals
- Async spec updates keep chat responsive

**Trade-offs**:
- Increased complexity (two prompts to maintain)
- Higher token costs (two API calls)
- **BUT**: Much better user experience (fast + comprehensive)

---

### 4. Gap-Driven Conversation

**Decision**: AI only asks about missing sections, not free exploration.

**Rationale**:
- Prevents redundant questions
- Keeps conversation focused and efficient
- User can see progress toward completion
- More predictable conversation flow

**Implementation**:
- missingSections injected into chat prompt
- Stage determination based on missing count
- Completeness calculated from spec coverage
- readyForHandoff when all sections complete

---

### 5. Version-Based State Management

**Decision**: Specification version increments on each update; client ignores stale versions.

**Rationale**:
- Async PRD updates can arrive out of order
- Prevents UI flicker from stale updates
- Enables optimistic UI patterns
- Simple integer comparison (no complex timestamps)

**Implementation**:
```typescript
// Client-side (ChatInterface.tsx)
if (incomingVersion <= currentVersion) {
  console.log('[CLIENT] Ignoring stale spec update');
  return;
}

// Server-side (messages/route.ts)
const updatedSpecification = {
  ...prdResult.spec,
  id: session.state.specification.id,
  version: session.state.specification.version + 1,  // ✅ Increment
  lastUpdated: new Date().toISOString()
};
```

---

### 6. No Quick Fixes Policy

**Decision**: Always implement production-grade solutions, never workarounds.

**Rationale**:
- Technical debt compounds quickly
- Workarounds become permanent
- Quality over speed for long-term maintainability
- Cost-effectiveness considered but quality prioritized

**Examples**:
- PDF generation: Used @sparticuz/chromium instead of pure JS PDF library (better quality)
- Feedback loop fix: Proper architectural solution instead of prompt hacks
- Lambda deprecation: Consolidated to Next.js instead of maintaining duplicates

---

### 7. 20-Message Minimum Before Completion

**Decision**: Conversation cannot end before 20 messages, even if spec appears complete.

**Rationale**:
- Prevents premature termination from initial info dumps
- Ensures sufficient refinement and validation
- Gives AI chance to probe edge cases
- Balances efficiency with thoroughness

**Implementation**:
```typescript
const MIN_MESSAGES_FOR_COMPLETION = 20;

if (!readyForHandoff || messageCount < MIN_MESSAGES_FOR_COMPLETION) {
  return 'validation';  // Cap at validation
} else {
  return 'completion';
}
```

---

### 8. Provider Fallback (Anthropic → OpenAI)

**Decision**: Attempt Anthropic first, fall back to OpenAI on failure.

**Rationale**:
- Anthropic typically faster for this workload
- OpenAI provides resilience against outages
- No single point of failure
- Automatic recovery from quota exhaustion

**Trade-off**: Must maintain compatibility with both APIs (different response formats, rate limits, streaming protocols).

---

### 9. Async Fire-and-Forget PRD Updates

**Decision**: Close HTTP stream immediately, then run PRD Engine in background.

**Rationale**:
- PRD synthesis takes 5-10 seconds
- User should see chat response immediately (< 3s)
- Spec update can happen asynchronously
- Client polls for spec updates separately

**Critical Learning**: Must close stream BEFORE starting async work, otherwise Lambda execution freezes.

**Implementation**:
```typescript
// Close stream immediately
controller.close();

// Then run PRD Engine in background
(async () => {
  try {
    const prdResult = await prdEngine.synthesize({...});
    await sessionManager.saveSessionState(sessionId, {...});
  } catch (error) {
    console.error('[PRD] Async update failed:', error);
    // Session still has conversation saved, just no spec update
  }
})();
```

---

## Deployment

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DYNAMODB_TABLE_NAME=spec-wizard-sessions
AWS_REGION=eu-west-2
NEXT_PUBLIC_APP_URL=https://www.my.flowency.build

# Optional (for email features)
AWS_SES_FROM_EMAIL=noreply@flowency.build
```

---

### AWS Amplify Configuration

```yaml
Platform:  AWS Amplify Gen 2
Region:    eu-west-2 (London)
Runtime:   Node.js 20.x
Timeout:   28 seconds (hard limit, cannot be changed)
Billing:   DynamoDB on-demand, S3 standard
Auto-Deploy: Enabled on push to main branch
```

---

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Type checking (0 errors required)
npm run type-check

# Linting
npm run lint
```

---

### Git Workflow

```bash
git add .
git commit -m "Clear description of what changed

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

**Note**: Amplify auto-deploys on push to main. Test locally first with `npm run build`.

---

### Dependencies

**Core:**
- Next.js 16.0.6
- React 19.2.0
- Zustand 5.0.9 (state management)

**AI:**
- @anthropic-ai/sdk ^0.71.0
- openai ^6.9.1

**AWS:**
- @aws-sdk/client-dynamodb ^3.940.0
- @aws-sdk/lib-dynamodb ^3.940.0
- @aws-sdk/client-s3 ^3.940.0
- @aws-sdk/client-ses ^3.940.0

**PDF:**
- @sparticuz/chromium ^133.0.0
- puppeteer-core ^24.32.0

---

## Change Log

### v0.3.1 — Dec 4, 2025 (Feedback Loop Fix)

**Breaking Changes**: None (backward compatible)

**Fixed**:
- ✅ Broken spec-driven conversation loop
- ✅ Spec regenerating instead of building incrementally
- ✅ Large initial dumps being lost
- ✅ AI asking redundant questions about captured info

**Changes**:
1. Pass `completeness` to `reconstructContext()` ([conversation-engine.ts:145-177](spec-wizard/lib/services/conversation-engine.ts#L145-L177))
2. Inject `missingSections` into conversation prompt ([conversation-engine.ts:296-345](spec-wizard/lib/services/conversation-engine.ts#L296-L345))
3. Remove `version === 0` guard blocking spec context
4. Update stage determination to use `missingSections.length`
5. Change PRD engine to receive last 6 messages (was 3) ([messages/route.ts:181-183](spec-wizard/app/api/sessions/[id]/messages/route.ts#L181-L183))
6. Add large dump detection for initial messages
7. Strengthen PRD engine prompt with explicit preservation rules ([prd-engine.ts:119-172](spec-wizard/lib/services/prd-engine.ts#L119-L172))
8. Add examples for additive vs corrective updates

**Files Modified**: 4
- lib/services/conversation-engine.ts
- lib/services/prd-engine.ts
- lib/services/prompt-manager.ts
- app/api/sessions/[id]/messages/route.ts

**Commit**: `2eb9b15` — "Fix spec-driven conversation loop for incremental PRD updates"

---

### v0.3.0 — Dec 3, 2025 (Schema Refactor)

**Breaking Changes**: Schema change (ProgressState → CompletenessState)

**Fixed**:
- ✅ All TypeScript build errors from schema migration
- ✅ Date type mismatches (changed to ISO strings)
- ✅ PlainEnglishSummary schema updated

**Changes**:
1. Renamed ProgressState → CompletenessState
2. Updated PlainEnglishSummary fields (flows, rulesAndConstraints, nonFunctional, mvpDefinition)
3. Removed old fields (integrations, estimatedComplexity)
4. Changed all Date types to string (ISO format)
5. Fixed all service files to use new schema

**Files Modified**: 12 (see Refactor.md for full list)

**Commits**: Multiple (phases 2-5 of refactor)

---

### v0.2.1 — Dec 3, 2025 (Lambda Deprecation)

**Breaking Changes**: Removed Lambda functions (functionality preserved in Next.js routes)

**Deprecated**:
- API Gateway: `d3y7fiyp1c`
- Lambda: `flowency-build-create-session`
- Lambda: `flowency-build-get-session`
- Lambda: `flowency-build-generate-magic-link`

**Rationale**: Next.js API routes already provided identical functionality. Eliminated code duplication and simplified deployment.

**Impact**: Zero impact on functionality (equivalents exist in `app/api/sessions/`)

---

### v0.2.0 — Dec 3, 2025 (PDF Export Fix)

**Fixed**: PDF export 500 error on production

**Changes**:
- Installed @sparticuz/chromium (~50MB Lambda-optimized)
- Changed from `puppeteer` to `puppeteer-core`
- Updated export-service.ts to use serverless Chromium

**Cost**: ~$0.05/month additional Lambda execution time

---

### v0.1.2 — Dec 3, 2025 (Premature Completion Fix)

**Fixed**: Conversations ending after 6-8 messages

**Changes**:
1. Fixed ProgressTracker returning 100% for empty topics
2. Raised completion thresholds (overview 20→100 chars, users 10→50 chars, features 3→8)
3. Added 20-message minimum before completion
4. Raised completion threshold from 90% to 95%

---

### v0.1.1 — Dec 3, 2025 (OpenAI Fallback)

**Fixed**: Timeout errors when Anthropic credits exhausted

**Changes**:
- Trimmed conversation history to last 10 messages for Chat AI
- Added markdown code fence stripping for OpenAI JSON responses
- Improved provider fallback logging

---

### v0.1.0 — Dec 2, 2025 (Initial Production)

**Initial release**:
- Two-LLM architecture
- Stage-based conversation flow
- Async PRD synthesis
- DynamoDB persistence
- Magic link recovery
- PDF/Markdown export
- Share via email

---

## Glossary

- **Chat AI**: LLM instance handling conversational experience (fast, limited context)
- **PRD Engine**: LLM instance synthesizing structured specifications (comprehensive, full context)
- **Specification**: Structured product requirements document (the "living PRD")
- **Session**: User's conversation instance with state persistence
- **Stage**: Current conversation phase (initial, discovery, refinement, validation, completion)
- **Completeness**: State object containing missingSections and readyForHandoff
- **missingSections**: Array of spec sections that are empty or insufficient (drives conversation)
- **Feedback Loop**: Spec → missingSections → Chat AI → User → PRD Engine → Updated Spec (cycle)
- **Gap-Driven Conversation**: AI asks only about missing sections, not free exploration
- **Incremental Refinement**: Spec builds gradually, never regenerates from scratch
- **SSE**: Server-Sent Events (streaming protocol for real-time chat)
- **Version**: Monotonically increasing spec revision number (prevents stale updates)

---

**END OF SYSTEM BIBLE**

*This document must be updated whenever core architecture, data schemas, or critical design decisions change.*
