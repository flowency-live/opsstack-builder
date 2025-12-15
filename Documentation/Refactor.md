# FLOWENCY BUILDER - V0.3 REFACTOR TRACKER

**Document Purpose:** Track complete refactor from OLD (stage-based, ProgressTracker-driven) to NEW (spec-first, missingSections-driven) architecture
**Created:** 2025-12-03
**Status:** ✅ PHASES 2-5 COMPLETE | 🟡 Ready for Deployment Testing

---

## 📊 PROGRESS LOG

| Phase | Status | Deployed | Notes |
|-------|--------|----------|-------|
| Phase 1: Timeout Fix | ✅ COMPLETE | Ready for deployment | All 3 subtasks done |
| Phase 2: Schema Alignment | ✅ COMPLETE | - | All types updated, 0 TypeScript errors |
| Phase 3: Kill Old Architecture | ✅ COMPLETE | - | ProgressTracker deleted, SessionState fixed |
| Phase 4: Spec-State Prompts | ✅ COMPLETE | - | All service files updated |
| Phase 5: Completion Gates | ✅ COMPLETE | - | All completeness refs fixed |
| Phase 6: DynamoDB Schema | ⬜ PENDING | - | Schema interface updated, DB migration TBD |

**Legend:** ⬜ Pending | 🟡 In Progress | ✅ Deployed | ❌ Blocked

**Last Updated:** 2025-12-03 (Phases 2-5 COMPLETED - TypeScript build passes with 0 errors)

---

## ✅ COMPLETION SUMMARY (Phases 2-5)

**All core refactoring work is complete.** TypeScript build passes with **0 errors**.

### Architecture Change: Lambda Deprecation (Dec 3, 2025)

**Decision:** Deprecated standalone Lambda functions in favor of Next.js API routes.

**Removed from AWS:**
- API Gateway: `d3y7fiyp1c` (Flowency Build API)
- Lambda: `flowency-build-create-session`
- Lambda: `flowency-build-get-session`
- Lambda: `flowency-build-generate-magic-link`

**Removed from codebase:**
- `spec-wizard/lambda/` directory (entire directory deleted)

**Rationale:**
- Next.js API routes already provided identical functionality
- Eliminated code duplication (lambda build copied files from `lib/`)
- Reduced maintenance overhead (single codebase vs two)
- Cost savings (no API Gateway fees)
- Simplified deployment (single Amplify deployment vs Lambda + API Gateway)

**Impact:** Zero impact on functionality. All 3 Lambda endpoints already had working Next.js equivalents in `app/api/sessions/`.

---

### Files Modified (12 files):
1. **lib/models/types.ts** - Updated PlainEnglishSummary schema, Date→string types, added DEFAULT_MISSING_SECTIONS
2. **lib/services/conversation-engine.ts** - Removed progressState, fixed Date types, updated schema refs
3. **lib/services/specification-generator.ts** - Updated all prompts and schema references
4. **lib/services/export-service.ts** - Fixed Date handling, replaced old schema fields
5. **lib/services/session-manager.ts** - Fixed completeness initialization, removed lockedSections type mismatch
6. **lib/services/submission-service.ts** - Fixed Date type to ISO string
7. **lib/services/prompt-manager.ts** - Fixed LockedSection type
8. **app/api/export/markdown/route.ts** - Updated schema fields in markdown generation
9. **app/presentation/[id]/page.tsx** - Replaced old schema sections with new ones
10. **lib/store/session-store.ts** - Changed ProgressState to CompletenessState throughout
11. **lib/store/sync-service.ts** - Updated to use completeness instead of progress
12. **lib/store/use-session.ts** - Changed all ProgressState refs to CompletenessState, fixed Message timestamp

### Key Changes:
- ✅ All Date types changed to ISO strings (with `.toISOString()`)
- ✅ PlainEnglishSummary schema updated (flows, rulesAndConstraints, nonFunctional, mvpDefinition)
- ✅ Removed old fields (integrations, estimatedComplexity)
- ✅ All ProgressState references changed to CompletenessState
- ✅ All progress references changed to completeness
- ✅ Fixed all TypeScript type errors
- ✅ Updated all prompts to match new schema

### Build Verification:
```bash
$ npx tsc --noEmit
# ✅ No errors - build passes successfully
```

---

## 🔥 EXECUTIVE SUMMARY

### The Problem
The codebase is running **TWO conflicting architectures simultaneously**:

**OLD (Currently Implemented):**
```
User Message → ConversationEngine → ProgressTracker
                      ↓                      ↓
              Stage determination       Topic checklists
                      ↓                      ↓
           Stage-specific prompts    95% + 20 messages = DONE
```

**NEW (v0.3 - What We Want):**
```
User Message → Chat AI → PRD Engine (every 3 messages)
                  ↓              ↓
         Spec context       Full spec returned
                  ↓              ↓
         missingSections    readyForHandoff gates
```

### Key Issues
1. **Timeouts:** OpenAI gets full conversation history (20+ messages) → 28s timeout when Anthropic fails
2. **Checklist Interrogation:** AI asking questions to satisfy ProgressTracker topics, not build-ready spec
3. **Schema Drift:** `flows`, `rulesAndConstraints`, `nonFunctional`, `mvpDefinition` fields missing
4. **Completion Conflicts:** 4 different completion definitions fighting each other
5. **Stage System:** Forces conversation end at 95% + 20 messages, conflicts with "build-ready" rule

---

## 🔍 AUDIT FINDINGS - THE SMOKING GUNS

### 1. TIMEOUT ROOT CAUSE
**File:** [lib/services/llm-router.ts](../spec-wizard/lib/services/llm-router.ts)
- **Line 146:** `...context.conversationHistory.map(...)` - NO SLICING
- **Line 205:** `context.conversationHistory.map(...)` - NO SLICING
- **Impact:** When Anthropic fails → OpenAI gets 20+ messages → 28s → Lambda timeout

### 2. ARCHITECTURAL SCHIZOPHRENIA
**Current:** ProgressTracker calculates `overallCompleteness` → drives stage → stage determines completion
**v0.3:** PRD Engine returns `missingSections` → TS calculates `readyForHandoff` → no stages

**Evidence:**
- [conversation-engine.ts:221-238](../spec-wizard/lib/services/conversation-engine.ts#L221-L238) - Stage driven by ProgressTracker
- [messages/route.ts:140-142](../spec-wizard/app/api/sessions/[id]/messages/route.ts#L140-L142) - ProgressTracker still called
- [progress-tracker.ts](../spec-wizard/lib/services/progress-tracker.ts) - Entire 474-line file shouldn't exist

### 3. SCHEMA MISMATCH

**Current Schema (WRONG):**
```typescript
export interface PlainEnglishSummary {
  overview: string;
  keyFeatures: string[];
  targetUsers: string;
  integrations: string[];  // ← Not in v0.3
  estimatedComplexity?: 'Simple' | 'Medium' | 'Complex';  // ← Not in v0.3
}
```

**v0.3 Required Schema:**
```typescript
export interface PlainEnglishSummary {
  overview: string;
  targetUsers: string;
  keyFeatures: string[];
  flows: string[];  // ← MISSING
  rulesAndConstraints: string[];  // ← MISSING
  nonFunctional: string[];  // ← MISSING
  mvpDefinition: {  // ← MISSING
    included: string[];
    excluded: string[];
  };
}
```

**Impact:** PRD Engine can't populate missing fields → `missingSections` always has "flows" → `readyForHandoff` always false

### 4. FOUR CONFLICTING COMPLETION GATES

**Gate #1 - ProgressTracker:** 100 chars overview, 50 chars users, 8 features
**Gate #2 - ConversationEngine:** 95% completeness + 20 messages
**Gate #3 - messages/route.ts:** 50 chars overview, 20 chars users, 5 features, no missingSections
**Gate #4 - v0.3 Design:** 20 chars overview, 10 chars users, 3 features, 1 flow, no missingSections

### 5. SESSION STATE DRIFT

**File:** [session-manager.ts:186-190](../spec-wizard/lib/services/session-manager.ts#L186-L190)
```typescript
// MISSING completeness field
const sessionState: SessionState = {
  conversationHistory,
  specification,
  progress,  // ← Still using ProgressTracker
  // completeness: MISSING!
  // lockedSections: MISSING!
};
```

---

## ⚠️ CRITICAL IMPLEMENTATION NOTES

### 1. Date vs ISO String Type Reality
**Problem:** TypeScript types say `Date`, but JSON serialization makes them ISO strings

**Files Affected:**
- `types.ts` - `CompletenessState.lastEvaluated`, `Specification.lastUpdated`
- `session-manager.ts` - All date handling
- `messages/route.ts` - Date assignments

**Solution Options:**
- **Option A (Recommended):** Change types to `string` everywhere, use ISO strings consistently
- **Option B:** Keep `Date` types but explicitly `new Date(isoString)` on every read from JSON

**Decision:** Use **Option A** - change `lastEvaluated` and `lastUpdated` to `string` in types

```typescript
// BEFORE
export interface CompletenessState {
  missingSections: string[];
  readyForHandoff: boolean;
  lastEvaluated: Date;  // ← LIE - becomes ISO string in JSON
}

// AFTER
export interface CompletenessState {
  missingSections: string[];
  readyForHandoff: boolean;
  lastEvaluated: string;  // ← TRUTH - ISO string
}
```

**Apply to:**
- [ ] `types.ts` - `CompletenessState.lastEvaluated: string`
- [ ] `types.ts` - `Specification.lastUpdated: string`
- [ ] `session-manager.ts` - Use `new Date().toISOString()` everywhere
- [ ] `messages/route.ts` - Use `new Date().toISOString()` everywhere

### 2. Default missingSections List - Single Source of Truth

**The List (v0.3 Complete):**
```typescript
['overview', 'targetUsers', 'keyFeatures', 'flows', 'rulesAndConstraints', 'nonFunctional', 'mvpDefinition']
```

**MUST BE IDENTICAL in ALL these locations:**
1. `session-manager.ts:82` - `createSession()` initial state
2. `session-manager.ts:231` - `completeness` default in `createSession()`
3. `session-manager.ts:270` - getSession() fallback when no spec exists
4. `session-manager.ts:563` - getSession() fallback when spec exists but no completeness
5. `session-manager.ts:590` - getSession() else branch fallback
6. `prd-engine.ts` - PRD prompt example of `missingSections`

**Verification Checklist:**
- [ ] All 6 locations use EXACT same array
- [ ] No typos (e.g., "mvpDefintion" vs "mvpDefinition")
- [ ] Same order everywhere (for easier debugging)

**Consider:** Extract to a constant:
```typescript
// In types.ts or constants.ts
export const DEFAULT_MISSING_SECTIONS = [
  'overview',
  'targetUsers',
  'keyFeatures',
  'flows',
  'rulesAndConstraints',
  'nonFunctional',
  'mvpDefinition'
] as const;
```

### 3. PRD Engine Prompt Schema MUST Match TypeScript Types

**Critical:** The JSON schema in PRD engine prompt (Phase 2.3) must be byte-for-byte identical to the TS types

**Verification:**
```typescript
// types.ts PlainEnglishSummary
export interface PlainEnglishSummary {
  overview: string;
  targetUsers: string;
  keyFeatures: string[];
  flows: string[];
  rulesAndConstraints: string[];
  nonFunctional: string[];
  mvpDefinition: {
    included: string[];
    excluded: string[];
  };
}

// prd-engine.ts prompt MUST have exact same fields
"plainEnglishSummary": {
  "overview": "...",
  "targetUsers": "...",
  "keyFeatures": [...],
  "flows": [...],           // ← Must exist
  "rulesAndConstraints": [...],  // ← Must exist
  "nonFunctional": [...],   // ← Must exist
  "mvpDefinition": {        // ← Must exist
    "included": [...],
    "excluded": [...]
  }
}
```

**NO EXTRA FIELDS in PRD prompt** like:
- ❌ `integrations` (old schema)
- ❌ `estimatedComplexity` (old schema)
- ❌ Any other creative additions

**Checklist:**
- [ ] Field names match exactly
- [ ] Field types match exactly (string vs string[])
- [ ] No fields in prompt that aren't in types
- [ ] No fields in types that aren't in prompt
- [ ] Same nesting structure

### 4. Phase Coupling - DO NOT GET CLEVER

**RULE:** Phase 1 alone. Phases 2-5 together. No exceptions.

**Why this matters:**
```
Phase 2 changes types → Phase 3 removes old code that depends on old types
Phase 3 removes ProgressState → Phase 4 removes code that calls it
Phase 4 changes prompts → Phase 5 changes gates that prompts reference
```

**DON'T DO THIS:**
- ❌ Deploy Phase 2 alone → Type errors at runtime (missing fields)
- ❌ Deploy Phase 3 alone → Missing completeness field crashes
- ❌ Deploy Phase 4 alone → AI gets wrong prompt structure
- ❌ Deploy Phase 2+3 without 4+5 → Half-migrated state

**DO THIS:**
- ✅ Phase 1 (timeout fix) → Deploy → Test 24h
- ✅ Phases 2-5 (big bang) → Deploy together → Test thoroughly
- ✅ Phase 6 (DB schema) → Deploy after 2-5 stable

**If Production Breaks During 2-5:**
- Rollback ALL of 2-5, not individual phases
- Fix on branch, redeploy all together

---

## 🛠️ REFACTOR PLAN

### PHASE 1: IMMEDIATE TIMEOUT FIX 🚨
**Status:** ✅ COMPLETED
**Deploy:** ASAP (standalone, non-breaking)
**Test:** Deploy to prod, verify no timeouts for 24h

#### 1.1 Fix llm-router.ts History Slicing

- [x] **File:** `spec-wizard/lib/services/llm-router.ts`
- [x] **Location:** Lines 130-150 (OpenAI streaming)

**BEFORE:**
```typescript
const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: 'system', content: prompt },
  ...context.conversationHistory.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  })),
];
```

**AFTER:**
```typescript
const recentHistory = context.conversationHistory.slice(-10);  // ← CRITICAL FIX
const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
  { role: 'system', content: prompt },
  ...recentHistory.map((msg) => ({
    role: msg.role as 'user' | 'assistant' | 'system',
    content: msg.content,
  })),
];
```

- [x] **File:** `spec-wizard/lib/services/llm-router.ts`
- [x] **Location:** Lines 189-208 (Anthropic streaming)

**BEFORE:**
```typescript
const messages = context.conversationHistory.map((msg) => ({
  role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
  content: msg.content,
}));
```

**AFTER:**
```typescript
const recentHistory = context.conversationHistory.slice(-10);  // ← CRITICAL FIX
const messages = recentHistory.map((msg) => ({
  role: msg.role === 'assistant' ? ('assistant' as const) : ('user' as const),
  content: msg.content,
}));
```

#### 1.2 Reduce ConversationEngine Pruning

- [x] **File:** `spec-wizard/lib/services/conversation-engine.ts`
- [x] **Location:** Line 160

**BEFORE:**
```typescript
const prunedHistory = this.pruneConversationHistory(
  conversationHistory,
  lockedSections,
  15  // ← Too high
);
```

**AFTER:**
```typescript
const prunedHistory = this.pruneConversationHistory(
  conversationHistory,
  lockedSections,
  10  // Match llm-router limit
);
```

#### 1.3 Temporarily Disable Examples

- [x] **File:** `spec-wizard/lib/services/conversation-engine.ts`
- [x] **Location:** Lines 125-128

**BEFORE:**
```typescript
const withExamples = this.enhancePromptWithExamples(withLockedSections, stage);
const finalPrompt = this.enhancePromptForBusinessLanguage(withExamples);
```

**AFTER:**
```typescript
// COMMENT OUT FOR NOW (reduce token usage)
// const withExamples = this.enhancePromptWithExamples(withLockedSections, stage);
// const finalPrompt = this.enhancePromptForBusinessLanguage(withExamples);
const finalPrompt = this.enhancePromptForBusinessLanguage(withLockedSections);
```

**Files Changed:** 2
- `lib/services/llm-router.ts`
- `lib/services/conversation-engine.ts`

**Verification:** Deploy, test with long conversations (10+ messages), verify response time < 5s

---

### PHASE 2: SCHEMA ALIGNMENT
**Status:** 🟡 80% COMPLETE
**Deploy:** With Phases 3-5 (breaking changes)
**Test:** TypeScript build succeeds, ~40 errors remaining (mostly old schema refs)

#### 2.1 Fix Date vs ISO String Types

- [x] **File:** `spec-wizard/lib/models/types.ts`
- [x] **Location:** Line 118 (CompletenessState)

**REPLACE:**
```typescript
export interface CompletenessState {
  missingSections: string[];
  readyForHandoff: boolean;
  lastEvaluated: Date;  // ← Wrong - becomes ISO string in JSON
}
```

**WITH:**
```typescript
export interface CompletenessState {
  missingSections: string[];
  readyForHandoff: boolean;
  lastEvaluated: string;  // ← Correct - ISO string
}
```

- [x] **File:** `spec-wizard/lib/models/types.ts`
- [x] **Location:** Line 68 (Specification)

**REPLACE:**
```typescript
export interface Specification {
  id: string;
  version: number;
  plainEnglishSummary: PlainEnglishSummary;
  formalPRD: FormalPRD;
  lastUpdated: Date;  // ← Wrong
}
```

**WITH:**
```typescript
export interface Specification {
  id: string;
  version: number;
  plainEnglishSummary: PlainEnglishSummary;
  formalPRD: FormalPRD;
  lastUpdated: string;  // ← Correct - ISO string
}
```

- [x] **File:** `spec-wizard/lib/services/session-manager.ts`
- [x] **Search & Replace:** All `new Date()` assignments to `lastEvaluated` or `lastUpdated` → use `new Date().toISOString()`

- [x] **File:** `spec-wizard/app/api/sessions/[id]/messages/route.ts`
- [x] **Search & Replace:** All `new Date()` assignments to `lastEvaluated` or `lastUpdated` → use `new Date().toISOString()`

#### 2.2 Update PlainEnglishSummary Type

- [x] **File:** `spec-wizard/lib/models/types.ts`
- [x] **Location:** Lines 23-29

**REPLACE:**
```typescript
export interface PlainEnglishSummary {
  overview: string;
  keyFeatures: string[];
  targetUsers: string;
  integrations: string[];
  estimatedComplexity?: 'Simple' | 'Medium' | 'Complex';
}
```

**WITH:**
```typescript
export interface PlainEnglishSummary {
  overview: string;
  targetUsers: string;
  keyFeatures: string[];
  flows: string[];
  rulesAndConstraints: string[];
  nonFunctional: string[];
  mvpDefinition: {
    included: string[];
    excluded: string[];
  };
}
```

#### 2.2 Update Default Spec in SessionManager

- [x] **File:** `spec-wizard/lib/services/session-manager.ts`
- [x] **Location:** Lines 62-67

**REPLACE:**
```typescript
plainEnglishSummary: {
  overview: '',
  keyFeatures: [],
  targetUsers: '',
  integrations: [],
},
```

**WITH:**
```typescript
plainEnglishSummary: {
  overview: '',
  targetUsers: '',
  keyFeatures: [],
  flows: [],
  rulesAndConstraints: [],
  nonFunctional: [],
  mvpDefinition: {
    included: [],
    excluded: [],
  },
},
```

- [x] **File:** `spec-wizard/lib/services/session-manager.ts`
- [x] **Location:** Lines 165-169 (duplicate location in getSession)

**Apply same change as above**

#### 2.3 Extract DEFAULT_MISSING_SECTIONS Constant

- [x] **File:** `spec-wizard/lib/models/types.ts`
- [x] **Location:** Add near top of file (after imports)

**ADD:**
```typescript
/**
 * Default sections that must be completed for a build-ready spec
 * IMPORTANT: This is the single source of truth - use this constant everywhere
 */
export const DEFAULT_MISSING_SECTIONS = [
  'overview',
  'targetUsers',
  'keyFeatures',
  'flows',
  'rulesAndConstraints',
  'nonFunctional',
  'mvpDefinition'
] as const;
```

- [x] **Update all references** in `session-manager.ts` to use `DEFAULT_MISSING_SECTIONS`
- [x] **Update reference** in `messages/route.ts` if any hardcoded arrays exist

#### 2.4 Update PRD Engine Prompt

- [x] **File:** `spec-wizard/lib/services/prd-engine.ts`
- [x] **Location:** Lines 142-171

**REPLACE the JSON schema in prompt WITH:**
```typescript
Return JSON with this exact structure:
{
  "spec": {
    "plainEnglishSummary": {
      "overview": "1-2 sentence elevator pitch describing what the product does and who it's for",
      "targetUsers": "clear description of who will use this",
      "keyFeatures": ["feature 1", "feature 2", "feature 3"],
      "flows": ["user workflow 1: describe key user journey", "workflow 2"],
      "rulesAndConstraints": ["business rule 1", "constraint 1"],
      "nonFunctional": ["performance expectation", "reliability need"],
      "mvpDefinition": {
        "included": ["core feature 1 for v1", "core feature 2"],
        "excluded": ["future feature 1", "nice-to-have 1"]
      }
    },
    "formalPRD": {
      "introduction": "professional introduction paragraph for the PRD",
      "glossary": {},
      "requirements": [
        {
          "id": "req-1",
          "userStory": "As a [user], I want [goal], so that [benefit]",
          "acceptanceCriteria": ["WHEN [trigger] THEN THE System SHALL [response]"],
          "priority": "must-have"
        }
      ],
      "nonFunctionalRequirements": [
        {
          "id": "nfr-1",
          "category": "Performance",
          "description": "THE System SHALL [requirement]"
        }
      ]
    }
  },
  "missingSections": ["flows"]
}
```

**Files Changed:** 4
- `lib/models/types.ts` (Date types, PlainEnglishSummary, DEFAULT_MISSING_SECTIONS constant)
- `lib/services/session-manager.ts` (new schema fields, ISO strings, use constant)
- `lib/services/prd-engine.ts` (update prompt schema)
- `app/api/sessions/[id]/messages/route.ts` (ISO strings)

**Verification:**
- [ ] `npm run build` succeeds (~40 errors remaining, mostly old schema refs in exports)
- [ ] No critical TypeScript errors blocking core functionality
- [x] All `DEFAULT_MISSING_SECTIONS` references use the constant
- [x] PRD prompt schema matches types exactly

---

### PHASE 3: KILL OLD ARCHITECTURE
**Status:** 🟡 90% COMPLETE
**Deploy:** With Phases 2,4,5 (breaking changes)
**Test:** Conversations complete without ProgressTracker, no runtime errors

#### 3.1 Delete ProgressTracker Entirely

- [x] **DELETE FILE:** `spec-wizard/lib/services/progress-tracker.ts` (474 lines)
- [x] **DELETE FILE:** `spec-wizard/lambda/src/lib/services/progress-tracker.ts`
- [x] **Remove exports** from `lib/services/index.ts` and `lambda/src/lib/services/index.ts`

#### 3.2 Remove ProgressTracker from messages/route.ts

- [x] **File:** `spec-wizard/app/api/sessions/[id]/messages/route.ts`
- [x] **Line 12:** DELETE `import { ProgressTracker } from '@/lib/services/progress-tracker';`
- [x] **Line 35:** DELETE `const progressTracker = new ProgressTracker();`
- [ ] **Lines 139-142:** DELETE entire block:
```typescript
const updatedProgress = await progressTracker.updateProgress(
  session.state.specification
);
```

- [ ] **Lines 145-152:** REMOVE `progress` field from `updatedState`:

**BEFORE:**
```typescript
const updatedState: SessionState = {
  conversationHistory: finalHistory,
  specification: session.state.specification,
  progress: updatedProgress,  // ← DELETE
  userInfo: session.state.userInfo,
  lockedSections: session.state.lockedSections,
  completeness: session.state.completeness,
};
```

**AFTER:**
```typescript
const updatedState: SessionState = {
  conversationHistory: finalHistory,
  specification: session.state.specification,
  userInfo: session.state.userInfo,
  lockedSections: session.state.lockedSections,
  completeness: session.state.completeness,
};
```

- [ ] **Line 162:** REMOVE `progress` from `completionData`:

**BEFORE:**
```typescript
const completionData = {
  messageId: assistantMessage.id,
  specUpdated: false,
  specification: session.state.specification,
  completeness: session.state.completeness,
  progress: updatedProgress,  // ← DELETE
  latency: Date.now() - startTime,
};
```

**AFTER:**
```typescript
const completionData = {
  messageId: assistantMessage.id,
  specUpdated: false,
  specification: session.state.specification,
  completeness: session.state.completeness,
  latency: Date.now() - startTime,
};
```

- [ ] **Line 212:** DELETE `const finalProgress = await progressTracker.updateProgress(updatedSpecification);`

- [ ] **Lines 215-222:** REMOVE `progress` from `finalState`:

**BEFORE:**
```typescript
const finalState: SessionState = {
  conversationHistory: finalHistory,
  specification: updatedSpecification,
  progress: finalProgress,  // ← DELETE
  userInfo: session.state.userInfo,
  lockedSections: session.state.lockedSections,
  completeness: updatedCompleteness,
};
```

**AFTER:**
```typescript
const finalState: SessionState = {
  conversationHistory: finalHistory,
  specification: updatedSpecification,
  userInfo: session.state.userInfo,
  lockedSections: session.state.lockedSections,
  completeness: updatedCompleteness,
};
```

#### 3.3 Update SessionState Type

- [ ] **File:** `spec-wizard/lib/models/types.ts`
- [ ] **Location:** Lines 124-131

**BEFORE:**
```typescript
export interface SessionState {
  conversationHistory: Message[];
  specification: Specification;
  progress: ProgressState;  // ← DELETE
  userInfo?: ContactInfo;
  lockedSections?: LockedSection[];
  completeness?: CompletenessState;
}
```

**AFTER:**
```typescript
export interface SessionState {
  conversationHistory: Message[];
  specification: Specification;
  userInfo?: ContactInfo;
  lockedSections?: LockedSection[];
  completeness: CompletenessState;  // Make required (remove ?)
}
```

#### 3.4 Fix SessionManager to Always Provide completeness

- [ ] **File:** `spec-wizard/lib/services/session-manager.ts`
- [ ] **Location:** Lines 76-86

**BEFORE:**
```typescript
state: {
  conversationHistory: [],
  specification: { ... },
  progress: {  // ← DELETE
    topics: [],
    overallCompleteness: 0,
    projectComplexity: 'Simple',
  },
  completeness: {
    missingSections: ['overview', 'targetUsers', 'keyFeatures', 'flows'],
    readyForHandoff: false,
    lastEvaluated: now,
  },
},
```

**AFTER:**
```typescript
state: {
  conversationHistory: [],
  specification: { ... },
  completeness: {
    missingSections: ['overview', 'targetUsers', 'keyFeatures', 'flows', 'rulesAndConstraints', 'nonFunctional', 'mvpDefinition'],
    readyForHandoff: false,
    lastEvaluated: now,
  },
  lockedSections: [],
},
```

- [ ] **File:** `spec-wizard/lib/services/session-manager.ts`
- [ ] **Location:** Lines 154-190

**REPLACE:**
```typescript
let specification: Specification;
let progress;

if (specResponse.Items && specResponse.Items.length > 0) {
  const specRecord = specResponse.Items[0] as SpecificationRecord;
  specification = recordToSpecification(specRecord);
  progress = JSON.parse(specRecord.progressState);
} else {
  // Default spec...
  progress = {
    topics: [],
    overallCompleteness: 0,
    projectComplexity: 'Simple',
  };
}

const sessionState: SessionState = {
  conversationHistory,
  specification,
  progress,
};
```

**WITH:**
```typescript
let specification: Specification;
let completeness: CompletenessState;

if (specResponse.Items && specResponse.Items.length > 0) {
  const specRecord = specResponse.Items[0] as SpecificationRecord;
  specification = recordToSpecification(specRecord);
  // Try to parse completeness if it exists in DB
  completeness = specRecord.completenessState
    ? JSON.parse(specRecord.completenessState)
    : {
        missingSections: ['overview', 'targetUsers', 'keyFeatures', 'flows', 'rulesAndConstraints', 'nonFunctional', 'mvpDefinition'],
        readyForHandoff: false,
        lastEvaluated: new Date(),
      };
} else {
  // Default spec - not in DB yet
  specification = {
    id: sessionId,
    version: 0,
    plainEnglishSummary: {
      overview: '',
      keyFeatures: [],
      targetUsers: '',
      flows: [],
      rulesAndConstraints: [],
      nonFunctional: [],
      mvpDefinition: { included: [], excluded: [] },
    },
    formalPRD: {
      introduction: '',
      glossary: {},
      requirements: [],
      nonFunctionalRequirements: [],
    },
    lastUpdated: new Date(sessionRecord.createdAt),
  };
  completeness = {
    missingSections: ['overview', 'targetUsers', 'keyFeatures', 'flows', 'rulesAndConstraints', 'nonFunctional', 'mvpDefinition'],
    readyForHandoff: false,
    lastEvaluated: new Date(),
  };
}

const sessionState: SessionState = {
  conversationHistory,
  specification,
  completeness,
  lockedSections: sessionRecord.lockedSections || [],
};
```

**Files Changed:** 4
- `lib/models/types.ts`
- `lib/services/session-manager.ts`
- `app/api/sessions/[id]/messages/route.ts`
- **DELETED:** `lib/services/progress-tracker.ts`

**Verification:** Test full conversation flow, verify completeness tracked correctly

---

### PHASE 4: REPLACE STAGE SYSTEM WITH SPEC-STATE PROMPTS
**Status:** ⬜ PENDING
**Deploy:** With Phases 2,3,5 (breaking changes)
**Test:** Conversations driven by missingSections, not stages

#### 4.1 Rewrite PromptManager for v0.3

- [ ] **File:** `spec-wizard/lib/services/prompt-manager.ts`
- [ ] **Action:** COMPLETE REWRITE

**REPLACE ENTIRE FILE WITH:**
```typescript
/**
 * PromptManager - v0.3
 * Spec-first, no stages, missingSections-driven
 */

export type ConversationStage =
  | 'initial'
  | 'discovery'
  | 'refinement'
  | 'validation'
  | 'completion';

export interface ConversationContext {
  sessionId: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  currentSpecification?: any;
  progressState?: any;
  projectType?: string;
  userIntent?: Record<string, any>;
  lockedSections?: Array<{
    name: string;
    summary: string;
    lockedAt: Date;
  }>;
}

export class PromptManager {
  /**
   * Get system prompt with spec context
   * v0.3: Spec-first, no stages
   */
  getSystemPrompt(specState: {
    overview: string;
    targetUsers: string;
    keyFeatures: string[];
    flows: string[];
    rulesAndConstraints: string[];
    nonFunctional: string[];
    mvpDefinition: { included: string[]; excluded: string[] };
    missingSections: string[];
  }): string {
    return `
You are Flowency's Product Partner Assistant.
Help users shape ideas into build-ready MVP specifications (PRD).

## CURRENT SPEC STATE
Overview: ${specState.overview || 'Not yet defined'}
Target Users: ${specState.targetUsers || 'Not yet defined'}
Key Features: ${specState.keyFeatures.join(', ') || 'None captured'}
Flows: ${specState.flows.join(', ') || 'Not yet defined'}
Rules & Constraints: ${specState.rulesAndConstraints.join(', ') || 'None captured'}
Non-Functional: ${specState.nonFunctional.join(', ') || 'Not specified'}
MVP Scope: ${specState.mvpDefinition.included.join(', ') || 'Not defined'}
Missing Sections: ${specState.missingSections.join(', ')}

## Instructions
- Ask ONLY about items in Missing Sections
- Do NOT repeat questions already answered
- Ask one question only OR request a single short paragraph
- Challenge ambiguity once per topic, then proceed
- Respect "don't know", "move on", "skip": drop that topic
- Do NOT finish until PRD is build-ready (unless user says "wrap up")
- When user provides long message, extract details silently and ask minimal follow-up
- Be concise, clear, non-technical

${this.getCoreBehaviourRules()}
`.trim();
  }

  private getCoreBehaviourRules(): string {
    return `
## Core Behaviour Rules
1. Challenge ambiguity once, then move on
2. Prioritise progress over interrogation
3. Summarise and reframe frequently
4. Adapt tone to user confidence
5. Ask ONLY ONE question at a time
6. Never repeat questions in the spec
7. Never enter technical implementation
8. Maintain momentum
9. Begin questions with brief affirmation
10. Avoid demographic/segmentation unless user introduces it
11. Ask for typical use-case scenario, not segments
12. Never push prioritisation unless asked
13. When user is actively expanding, don't interrupt
14. Don't revisit concepts unless user changes them
15. Treat user's detail level as sufficient
16. Don't satisfy PRD template artificially
17. Extract from long messages silently
18. Mirror user enthusiasm briefly
19. If user says "wrap it up", stop asking questions
`.trim();
  }

  /**
   * Format user message (placeholder for future context injection)
   */
  formatUserMessage(message: string, context: ConversationContext): string {
    return message.trim();
  }
}
```

#### 4.2 Update ConversationEngine to Use Spec State

- [ ] **File:** `spec-wizard/lib/services/conversation-engine.ts`
- [ ] **Location:** Lines 97-104

**REPLACE:**
```typescript
const stage = this.determineConversationStage(context);
const systemPrompt = this.promptManager.getSystemPrompt(
  stage,
  context.projectType
);
```

**WITH:**
```typescript
const specState = {
  overview: context.currentSpecification?.plainEnglishSummary.overview || '',
  targetUsers: context.currentSpecification?.plainEnglishSummary.targetUsers || '',
  keyFeatures: context.currentSpecification?.plainEnglishSummary.keyFeatures || [],
  flows: context.currentSpecification?.plainEnglishSummary.flows || [],
  rulesAndConstraints: context.currentSpecification?.plainEnglishSummary.rulesAndConstraints || [],
  nonFunctional: context.currentSpecification?.plainEnglishSummary.nonFunctional || [],
  mvpDefinition: context.currentSpecification?.plainEnglishSummary.mvpDefinition || { included: [], excluded: [] },
  missingSections: (context as any).completeness?.missingSections || [],
};

const systemPrompt = this.promptManager.getSystemPrompt(specState);
```

#### 4.3 Delete Stage-Related Functions

- [ ] **File:** `spec-wizard/lib/services/conversation-engine.ts`
- [ ] **Lines 221-239:** DELETE `determineConversationStage()` function entirely
- [ ] **Lines 180-216:** DELETE `generateFollowUpQuestions()` function entirely

#### 4.4 Simplify Context Enhancement

- [ ] **File:** `spec-wizard/lib/services/conversation-engine.ts`
- [ ] **Location:** Lines 106-128

**REPLACE:**
```typescript
const withSpecContext = this.enhancePromptWithSpecContext(systemPrompt, context.currentSpecification);
const withRedundancyCheck = this.enhancePromptWithRedundancyCheck(withSpecContext, context);
const withLockedSections = this.enhancePromptWithLockedSections(withRedundancyCheck, (context as any).lockedSections);
const withExamples = this.enhancePromptWithExamples(withLockedSections, stage);
const finalPrompt = this.enhancePromptForBusinessLanguage(withExamples);
```

**WITH:**
```typescript
// Spec state already in system prompt - no additional layering needed
const finalPrompt = systemPrompt;
```

**Files Changed:** 2
- `lib/services/prompt-manager.ts` (complete rewrite)
- `lib/services/conversation-engine.ts` (simplified)

**Verification:** Verify AI asks questions based on missingSections, not arbitrary stage logic

---

### PHASE 5: FIX readyForHandoff GATES
**Status:** ⬜ PENDING
**Deploy:** With Phases 2,3,4 (breaking changes)
**Test:** Spec marked ready only when truly build-ready

#### 5.1 Update Completion Logic in messages/route.ts

- [ ] **File:** `spec-wizard/app/api/sessions/[id]/messages/route.ts`
- [ ] **Location:** Lines 199-203

**REPLACE:**
```typescript
const readyForHandoff =
  updatedSpecification.plainEnglishSummary.overview.length > 50 &&
  updatedSpecification.plainEnglishSummary.targetUsers.length > 20 &&
  updatedSpecification.plainEnglishSummary.keyFeatures.length >= 5 &&
  missingSections.length === 0;
```

**WITH (match v0.3):**
```typescript
const readyForHandoff =
  updatedSpecification.plainEnglishSummary.overview.length > 20 &&
  updatedSpecification.plainEnglishSummary.targetUsers.length > 10 &&
  updatedSpecification.plainEnglishSummary.keyFeatures.length >= 3 &&
  updatedSpecification.plainEnglishSummary.flows.length >= 1 &&
  missingSections.length === 0;
```

**Files Changed:** 1
- `app/api/sessions/[id]/messages/route.ts`

**Verification:** Test completion triggers correctly with realistic specs

---

### PHASE 6: UPDATE DYNAMODB SCHEMA (If Needed)
**Status:** ⬜ PENDING
**Deploy:** After Phases 2-5 stable
**Test:** Specs persist correctly, old sessions migrate cleanly

#### 6.1 Check DynamoDB Schema File

- [ ] **File:** `spec-wizard/lib/models/dynamodb-schema.ts`
- [ ] Verify `SpecificationRecord` has `completenessState` field (not `progressState`)
- [ ] Verify `specificationToRecord()` saves completeness
- [ ] Verify `recordToSpecification()` loads completeness
- [ ] If migration needed, add logic to handle old records with `progressState`

**Verification:** Old sessions load correctly, new sessions save completeness

---

## 📊 FILES SUMMARY

**Modified (9 files):**
1. `spec-wizard/lib/services/llm-router.ts` - Add slice(-10) for chat history
2. `spec-wizard/lib/services/conversation-engine.ts` - Simplify, remove stages, use spec state
3. `spec-wizard/lib/models/types.ts` - Update PlainEnglishSummary, SessionState, Date→string, add constant
4. `spec-wizard/lib/services/session-manager.ts` - Fix completeness initialization, use new schema
5. `spec-wizard/lib/services/prd-engine.ts` - Update prompt for new schema
6. `spec-wizard/lib/services/prompt-manager.ts` - Complete rewrite for v0.3
7. `spec-wizard/app/api/sessions/[id]/messages/route.ts` - Remove ProgressTracker calls, ISO strings
8. `spec-wizard/lib/models/dynamodb-schema.ts` - Update schema (if needed in Phase 6)

**Deleted (1 file):**
9. `spec-wizard/lib/services/progress-tracker.ts` - DELETE ENTIRELY (474 lines)

---

## 📦 DEPLOYMENT STRATEGY

### Step 1: Phase 1 (Timeout Fix) - URGENT
1. **Deploy:** Phase 1 ONLY (isolated, non-breaking)
2. **Monitor:** Check CloudWatch logs for response times
3. **Verify:** No timeouts for 24 hours
4. **Rollback Plan:** Revert llm-router.ts if issues

### Step 2: Phases 2-5 (Breaking Changes) - Big Bang
1. **Branch:** Create `refactor/v0.3` branch
2. **Deploy:** All of Phases 2-5 together (they depend on each other)
3. **Monitor:** Check completeness tracking, spec generation
4. **Verify:** Conversations complete successfully, specs accurate
5. **Rollback Plan:** Revert entire branch if critical issues

### Step 3: Phase 6 (DynamoDB) - Optional
1. **Assess:** Check if DynamoDB schema needs updates
2. **Test:** Verify old sessions load correctly
3. **Deploy:** Schema changes if needed
4. **Monitor:** No data loss, migrations clean

---

## 🧪 TESTING CHECKLIST

### After Phase 1:
- [ ] Long conversation (15+ messages) completes without timeout
- [ ] OpenAI fallback works when Anthropic fails
- [ ] Response time consistently < 5 seconds

### After Phases 2-5:
- [ ] New session initializes with correct completeness structure
- [ ] PRD Engine populates all new schema fields (flows, rules, nonFunctional, mvpDefinition)
- [ ] missingSections drives conversation (not stages)
- [ ] readyForHandoff triggers correctly
- [ ] TypeScript builds without errors
- [ ] No runtime errors in conversation flow

### After Phase 6:
- [ ] Old sessions migrate cleanly
- [ ] New sessions save completeness to DynamoDB
- [ ] No data loss during migration

---

## 🔗 REFERENCE FILES

| File | Purpose | Status |
|------|---------|--------|
| [FlowencyAI.md](./FlowencyAI.md) | v0.3 Design Spec | Source of Truth |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | OLD Architecture Docs | Needs Update After Refactor |
| [types.ts](../spec-wizard/lib/models/types.ts) | Core Type Definitions | NEEDS UPDATE |
| [llm-router.ts](../spec-wizard/lib/services/llm-router.ts) | LLM Provider Routing | NEEDS UPDATE |
| [conversation-engine.ts](../spec-wizard/lib/services/conversation-engine.ts) | Chat Orchestration | NEEDS UPDATE |
| [prd-engine.ts](../spec-wizard/lib/services/prd-engine.ts) | Spec Synthesis | NEEDS UPDATE |
| [prompt-manager.ts](../spec-wizard/lib/services/prompt-manager.ts) | System Prompts | NEEDS REWRITE |
| [session-manager.ts](../spec-wizard/lib/services/session-manager.ts) | Session Persistence | NEEDS UPDATE |
| [messages/route.ts](../spec-wizard/app/api/sessions/[id]/messages/route.ts) | Message Handler | NEEDS UPDATE |
| [progress-tracker.ts](../spec-wizard/lib/services/progress-tracker.ts) | OLD - Topic Tracking | DELETE |

---

## 📝 NOTES & DECISIONS

### Why Phases 2-5 Must Deploy Together
- Phase 2 changes schema
- Phase 3 removes ProgressTracker (depends on new schema)
- Phase 4 changes prompts (depends on completeness not progress)
- Phase 5 changes gates (depends on new schema fields)
- **Cannot deploy individually without breaking production**

### Why Phase 1 Can Deploy Alone
- History slicing is internal to llm-router
- Doesn't affect data model or API contract
- Pure performance optimization
- Easy rollback if issues

### Post-Refactor Documentation Tasks
- [ ] Update ARCHITECTURE.md to reflect v0.3
- [ ] Remove all references to ProgressTracker and stages
- [ ] Update FlowencyAI.md with actual deployed code
- [ ] Add migration guide for any future schema changes

---

## 🚀 READY TO START?

**Next Action:** Begin Phase 1 - Timeout Fix

1. Checkout new branch: `git checkout -b fix/timeout-llm-router`
2. Apply changes to `llm-router.ts` and `conversation-engine.ts`
3. Test locally
4. Deploy to staging
5. Deploy to production
6. Monitor for 24h

**After 24h stable:** Begin Phases 2-5 on branch `refactor/v0.3`
