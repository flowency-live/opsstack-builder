/**
 * PRD Engine - Unified service for specification synthesis and completeness tracking
 * Handles both incremental updates and final polish
 */

import { LLMRouter } from './llm-router';
import type { Specification, Message } from '@/lib/models/types';

/**
 * Discriminated union for PRD Engine modes
 */
type PRDMode = 'update' | 'finalize';

interface PRDEngineInputBase {
  mode: PRDMode;
  currentSpec: Specification;
}

interface PRDEngineUpdateInput extends PRDEngineInputBase {
  mode: 'update';
  lastMessages: Message[];
  isFirstRun: boolean;
}

interface PRDEngineFinalizeInput extends PRDEngineInputBase {
  mode: 'finalize';
}

export type PRDEngineInput = PRDEngineUpdateInput | PRDEngineFinalizeInput;

export interface PRDEngineOutput {
  spec: Specification;  // FULL specification object (not partial)
  missingSections: string[];
}

/**
 * PRD Engine Service
 * Single responsibility: Transform conversation into structured specification
 */
export class PRDEngine {
  private llmRouter: LLMRouter;

  constructor(llmRouter: LLMRouter) {
    this.llmRouter = llmRouter;
  }

  /**
   * Synthesize specification from conversation
   * Returns FULL specification object (not partial patches)
   */
  async synthesize(input: PRDEngineInput): Promise<PRDEngineOutput> {
    let prompt: string;

    if (input.mode === 'update') {
      // Update mode: Patch spec based on new messages
      prompt = this.buildUpdatePrompt(input);
    } else {
      // Finalize mode: Polish spec for handoff
      prompt = this.buildFinalizePrompt(input);
    }

    console.log(`[PRD ENGINE] Mode: ${input.mode}, isFirstRun: ${input.mode === 'update' ? input.isFirstRun : 'N/A'}`);

    try {
      const response = await this.llmRouter.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 4000,
      });

      console.log(`[PRD ENGINE] Response length: ${response.content.length} chars`);

      // Parse JSON response (strip markdown code fences if present)
      let jsonContent = response.content.trim();

      // Handle markdown-wrapped JSON (OpenAI often wraps responses in ```json ... ```)
      if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent
          .replace(/^```(?:json)?\s*/, '')  // Remove opening fence (```json or ```)
          .replace(/```\s*$/, '');           // Remove closing fence
        console.log('[PRD ENGINE] Stripped markdown code fences from response');
      }

      const result = JSON.parse(jsonContent);

      console.log(`[PRD ENGINE] Parsed successfully, missingSections: ${result.missingSections?.join(', ') || 'none'}`);

      return {
        spec: result.spec,
        missingSections: result.missingSections || [],
      };
    } catch (error) {
      console.error('[PRD ENGINE] Failed:', error);
      // Return current spec unchanged on failure
      return {
        spec: input.currentSpec,
        missingSections: ['overview', 'targetUsers', 'keyFeatures', 'flows'],
      };
    }
  }

  /**
   * Build prompt for update mode
   */
  private buildUpdatePrompt(input: PRDEngineUpdateInput): string {
    const specSummaryText = JSON.stringify(input.currentSpec.plainEnglishSummary, null, 2);
    const messagesText = input.lastMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');

    return `You are updating a product specification based on new conversation.

CURRENT SPEC SUMMARY (JSON):
${specSummaryText}

NEW MESSAGES:
${messagesText}

════════════════════════════════════════════════════════════════════════════════
CRITICAL RULES - INCREMENTAL UPDATE MODE:
════════════════════════════════════════════════════════════════════════════════

1. PRESERVE ALL EXISTING CONTENT
   - The CURRENT SPEC SUMMARY above contains information captured from ALL previous conversations
   - You MUST preserve every piece of existing information unless explicitly contradicted
   - Return COMPLETE Specification object with ALL existing fields intact

2. INCREMENTAL CHANGES ONLY
   - Only ADD new information mentioned in NEW MESSAGES
   - Only REFINE existing content if NEW MESSAGES provide clarifications
   - Only REPLACE content if NEW MESSAGES explicitly correct or contradict it

3. ARRAYS ARE ADDITIVE
   - For arrays (keyFeatures, flows, rulesAndConstraints, etc.): ADD new items, don't replace
   - Only remove items if user explicitly says to remove them
   - Keep all existing array items and append new ones

4. CORRECTIONS VS ADDITIONS
   - Explicit corrections (user says "change X to Y", "not X, Y", "actually it's Y"):
     → REPLACE the old value with new value
   - Additions (user mentions new features, flows, constraints):
     → ADD to existing arrays
   - Clarifications (user provides more detail about existing items):
     → ENHANCE the existing item with new details

5. MISSING SECTIONS
   - List any missing core sections from: overview, targetUsers, keyFeatures, flows
   - Only mark as missing if genuinely empty or insufficient

EXAMPLES OF CORRECT INCREMENTAL UPDATES:

Example 1 - Addition:
  Current: keyFeatures: ["User login", "Search"]
  New message: "User: We also need notifications"
  Result: keyFeatures: ["User login", "Search", "Push notifications"]

Example 2 - Correction:
  Current: targetUsers: "Dads with young children"
  New message: "User: Actually, let's make it for all parents, not just dads"
  Result: targetUsers: "Parents with young children"

Example 3 - Refinement:
  Current: overview: "A platform for finding activities"
  New message: "User: It should focus on outdoor activities specifically"
  Result: overview: "A platform for finding outdoor activities for families"

WRITING QUALITY:
- Write overview as a polished elevator pitch, not raw conversation text
- Extract real features from the conversation, not placeholders
- Be specific and concrete
- Use UK English
- Only include information actually discussed

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
}`;
  }

  /**
   * Build prompt for finalize mode
   */
  private buildFinalizePrompt(input: PRDEngineFinalizeInput): string {
    const specSummaryText = JSON.stringify(input.currentSpec.plainEnglishSummary, null, 2);

    return `You are finalising a product specification for handoff to a development team.

CURRENT SPEC SUMMARY (JSON):
${specSummaryText}

TASK:
- Tighten wording where needed
- Ensure structure is clear and complete
- Do not invent new features
- Return the COMPLETE Specification object

Return JSON with same structure as update mode:
{
  "spec": { ... complete specification ... },
  "missingSections": []
}`;
  }
}
