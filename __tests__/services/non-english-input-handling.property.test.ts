/**
 * Property Test: Non-English Input Handling
 * **Feature: spec-wizard, Property 38: Non-English input handling**
 * **Validates: Requirements 21.5**
 * 
 * For any user input detected as non-English, the system should respond 
 * with a polite message indicating that English is required.
 */

import * as fc from 'fast-check';
import { ConversationEngine } from '../../lib/services/conversation-engine';
import { LLMRouter } from '../../lib/services/llm-router';
import { PromptManager } from '../../lib/services/prompt-manager';
import type { ConversationContext } from '../../lib/services/prompt-manager';
import { isEnglish, getNonEnglishMessage, detectLanguage } from '../../lib/utils/language-detection';

describe('**Feature: spec-wizard, Property 38: Non-English input handling**', () => {
  let conversationEngine: ConversationEngine;
  let llmRouter: LLMRouter;
  let promptManager: PromptManager;

  beforeAll(() => {
    // Initialize services with test configuration
    llmRouter = new LLMRouter({
      openai: {
        apiKey: process.env.OPENAI_API_KEY || 'test-key',
        defaultModel: 'gpt-4o-mini',
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
        defaultModel: 'claude-3-5-haiku-20241022',
      },
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxTokensPerMinute: 100000,
      },
    });

    promptManager = new PromptManager();
    conversationEngine = new ConversationEngine(llmRouter, promptManager);
  });

  test('language detection correctly identifies non-English text', () => {
    // Test with clear non-English indicators (special characters and scripts)
    
    // Test Spanish with special characters
    expect(isEnglish('Hola, ¿cómo estás?')).toBe(false);
    expect(isEnglish('Gracias por su ayuda')).toBe(false);

    // Test French with special characters
    expect(isEnglish('Bonjour, comment allez-vous?')).toBe(false);
    expect(isEnglish('Merci beaucoup pour votre aide')).toBe(false);

    // Test German with special characters
    expect(isEnglish('Guten Tag, wie geht es Ihnen?')).toBe(false);
    expect(isEnglish('Ich möchte eine Website erstellen')).toBe(false);

    // Test Portuguese with special characters
    expect(isEnglish('Olá, como você está?')).toBe(false);
    expect(isEnglish('Obrigado pela sua ajuda')).toBe(false);

    // Test Italian
    expect(isEnglish('Ciao, come stai?')).toBe(false);
    expect(isEnglish('Grazie mille per il tuo aiuto')).toBe(false);

    // Test Chinese
    expect(isEnglish('你好，你好吗？')).toBe(false);
    expect(isEnglish('我想建立一个网站')).toBe(false);

    // Test Japanese
    expect(isEnglish('こんにちは、お元気ですか？')).toBe(false);
    expect(isEnglish('ウェブサイトを作りたいです')).toBe(false);

    // Test Korean
    expect(isEnglish('안녕하세요, 어떻게 지내세요?')).toBe(false);
    expect(isEnglish('웹사이트를 만들고 싶습니다')).toBe(false);

    // Test Russian
    expect(isEnglish('Привет, как дела?')).toBe(false);
    expect(isEnglish('Я хочу создать веб-сайт')).toBe(false);

    // Test Arabic
    expect(isEnglish('مرحبا، كيف حالك؟')).toBe(false);
    expect(isEnglish('أريد إنشاء موقع ويب')).toBe(false);
  });

  test('language detection correctly identifies English text', () => {
    fc.assert(
      fc.property(
        fc.constant(true),
        () => {
          // Test various English phrases
          expect(isEnglish('Hello, how are you?')).toBe(true);
          expect(isEnglish('I want to build a website')).toBe(true);
          expect(isEnglish('I need a mobile app for my business')).toBe(true);
          expect(isEnglish('Can you help me create a booking system?')).toBe(true);
          expect(isEnglish('The system should allow users to login')).toBe(true);
          expect(isEnglish('We need integration with payment processors')).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('non-English input returns polite English message', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom(
          'Hola, quiero crear un sitio web',
          'Bonjour, je veux créer une application',
          'Ich möchte eine Website erstellen',
          'Olá, eu quero criar um aplicativo',
          'Ciao, voglio creare un sito web',
          '你好，我想建立一个网站',
          'こんにちは、ウェブサイトを作りたいです',
          '안녕하세요, 웹사이트를 만들고 싶습니다',
          'Привет, я хочу создать веб-сайт',
          'مرحبا، أريد إنشاء موقع ويب'
        ),
        async (sessionId, nonEnglishMessage) => {
          // Verify the message is detected as non-English
          expect(isEnglish(nonEnglishMessage)).toBe(false);

          // Create context
          const context: ConversationContext = {
            sessionId,
            conversationHistory: [],
          };

          // Process the non-English message
          const response = await conversationEngine.processMessage(
            sessionId,
            nonEnglishMessage,
            context
          );

          expect(response).toBeDefined();
          expect(response.stream).toBeDefined();

          // Read the stream
          const reader = response.stream.getReader();
          const decoder = new TextDecoder();
          let fullResponse = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullResponse += decoder.decode(value, { stream: true });
          }

          // Response should be the polite English message
          const expectedMessage = getNonEnglishMessage();
          expect(fullResponse).toBe(expectedMessage);

          // Response should be in English
          expect(isEnglish(fullResponse)).toBe(true);

          // Response should be polite and helpful
          expect(fullResponse.toLowerCase()).toContain('english');
          expect(fullResponse.toLowerCase()).toMatch(/appreciate|currently|please|feel free|happy/);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  test('polite message is consistent and in English', () => {
    fc.assert(
      fc.property(
        fc.constant(true),
        () => {
          const message = getNonEnglishMessage();

          // Message should be in English
          expect(isEnglish(message)).toBe(true);

          // Message should be polite
          expect(message.toLowerCase()).toContain('english');

          // Message should not be empty
          expect(message.length).toBeGreaterThan(0);

          // Message should be helpful and not dismissive
          expect(message.toLowerCase()).toMatch(/appreciate|currently|please|feel free|happy/);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('mixed language input with non-English indicators is detected', () => {
    // Test mixed language inputs with clear non-English indicators
    expect(isEnglish('Hola, I want to build a website')).toBe(false); // Has "hola"
    expect(isEnglish('I want to build a website, gracias')).toBe(false); // Has "gracias"
    expect(isEnglish('Bonjour, I need help with my project')).toBe(false); // Has "bonjour"
    expect(isEnglish('I need help, merci')).toBe(false); // Has "merci"
  });

  test('English input with technical terms is still recognized as English', () => {
    fc.assert(
      fc.property(
        fc.constant(true),
        () => {
          // Test English with technical terms
          expect(isEnglish('I need an API for my application')).toBe(true);
          expect(isEnglish('The system should use REST endpoints')).toBe(true);
          expect(isEnglish('We need OAuth authentication')).toBe(true);
          expect(isEnglish('Can you integrate with PostgreSQL?')).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('language detection provides reasonable language identification', () => {
    // Test language detection for clear cases
    expect(detectLanguage('Hola, ¿cómo estás?')).toBe('spanish');
    expect(detectLanguage('Gracias por todo')).toBe('spanish');
    expect(detectLanguage('Bonjour, merci beaucoup')).toBe('french');
    expect(detectLanguage('Guten Tag, danke')).toBe('german');
    expect(detectLanguage('Olá, obrigado')).toBe('portuguese');
    expect(detectLanguage('Ciao, grazie')).toBe('italian');
    expect(detectLanguage('你好，你好吗？')).toBe('chinese');
    expect(detectLanguage('こんにちは、お元気ですか？')).toBe('japanese');
    expect(detectLanguage('안녕하세요')).toBe('korean');
    expect(detectLanguage('Привет, как дела?')).toBe('russian');
    expect(detectLanguage('مرحبا')).toBe('arabic');
    expect(detectLanguage('Hello, how are you?')).toBe('english');
  });

  test('empty or whitespace-only input is handled gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('', '   ', '\n', '\t', '  \n  '),
        async (sessionId, emptyInput) => {
          // Empty input should be considered valid (English)
          expect(isEnglish(emptyInput)).toBe(true);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
