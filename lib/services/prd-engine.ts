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

      // Parse JSON response
      const result = JSON.parse(response.content);

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

RULES:
1. Return COMPLETE Specification object (not partial patches)
2. Only change sections affected by new messages
3. Copy unchanged sections through as-is
4. Add to lists (features, requirements) - don't replace entire lists
5. List any missing core sections from: overview, targetUsers, keyFeatures, flows

IMPORTANT:
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
      "keyFeatures": ["clean feature descriptions as bullet points"],
      "targetUsers": "clear description of who will use this",
      "integrations": ["external systems/services mentioned"],
      "estimatedComplexity": "Simple"
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
