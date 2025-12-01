/**
 * PromptManager Service
 * Manages system prompts and templates for different conversation stages
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
}

export class PromptManager {
  /**
   * Get system prompt for a specific conversation stage
   */
  getSystemPrompt(stage: ConversationStage, projectType?: string): string {
    const basePrompt = `You are an expert product consultant helping SME users create comprehensive software specifications. 
Your role is to ask intelligent, contextual questions in plain business language to extract detailed requirements.

IMPORTANT: You MUST respond ONLY in English. All questions, responses, and generated content must be in English.

Key principles:
- Use business-friendly language, avoid technical jargon
- Ask one focused question at a time
- Build on previous responses
- Never ask for information already provided
- Focus on "what" and "why" (business intent) rather than "how" (technical implementation)
- Provide examples when helpful
- Acknowledge responses naturally before moving to next topic
- Always communicate in English`;

    const stagePrompts: Record<ConversationStage, string> = {
      initial: `${basePrompt}

Stage: Initial Discovery
- Welcome the user warmly
- IMPORTANT: Include a friendly reminder that they should keep descriptions general and avoid sharing confidential or company-sensitive information until an NDA is in place
- Explain that detailed confidential discussions will happen after submission under NDA
- Ask them to describe their software idea in their own words
- Listen for project type indicators (website, mobile app, booking system, etc.)`,

      discovery: `${basePrompt}

Stage: Discovery
- Extract core requirements about features, users, and goals
- Identify the project type and adapt questions accordingly
- Ask about key integrations, data, and workflows
${projectType ? `- This is a ${projectType} project - tailor questions to this domain` : ''}`,

      refinement: `${basePrompt}

Stage: Refinement
- Clarify ambiguous requirements
- Resolve conflicts between requirements
- Prioritize features into must-have vs nice-to-have
- Ensure completeness of critical information`,

      validation: `${basePrompt}

Stage: Validation
- Confirm understanding of key requirements
- Check for any missing critical information
- Validate that the specification captures user intent`,

      completion: `${basePrompt}

Stage: Completion
- Summarize what has been captured
- Offer export and submission options
- Thank the user for their time`,
    };

    return stagePrompts[stage];
  }

  /**
   * Format user message with context for LLM
   */
  formatUserMessage(
    message: string,
    context: ConversationContext
  ): string {
    // For now, just return the message
    // In a more sophisticated implementation, we might add context hints
    return message;
  }

  /**
   * Get extraction prompt for pulling structured data from conversation
   */
  getExtractionPrompt(
    conversationHistory: Array<{ role: string; content: string }>
  ): string {
    return `Based on the following conversation, extract structured information about the software project.
Focus on: project type, key features, target users, integrations, data requirements, and workflows.

Conversation:
${conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n')}

Extract the information in JSON format with clear categories.`;
  }
}
