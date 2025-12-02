/**
 * Language Detection Utility
 * Detects if input text is in English or another language
 */

/**
 * Common non-English words and patterns for basic language detection
 * This is a simple heuristic approach - for production, consider using a library like franc
 * Only includes patterns that are unlikely to appear in English text
 */
const NON_ENGLISH_PATTERNS = {
  // Spanish
  spanish: ['¿', '¡', 'señor', 'señora', 'gracias', 'hola', 'adiós', 'sí', 'qué', 'cómo', 'dónde', 'español', 'por favor', 'quiero', 'necesito'],
  // French
  french: ['bonjour', 'merci', 'où', 'être', 'avoir', 'ça', 'très', 'français', 'avec', 'beaucoup', 'veux'],
  // German
  german: ['ü', 'ö', 'ä', 'ß', 'nicht', 'haben', 'guten tag', 'danke', 'bitte', 'möchte', 'eine'],
  // Portuguese
  portuguese: ['ã', 'õ', 'ç', 'você', 'obrigado', 'não', 'português', 'olá', 'quero', 'criar'],
  // Italian
  italian: ['ciao', 'grazie', 'prego', 'perché', 'quando', 'cosa', 'italiano', 'voglio', 'creare'],
  // Chinese (common characters)
  chinese: ['你', '我', '是', '的', '了', '在', '有', '个', '人', '这', '中', '大', '为', '上', '们'],
  // Japanese (hiragana/katakana)
  japanese: ['は', 'の', 'を', 'に', 'が', 'と', 'で', 'も', 'から', 'まで', 'です', 'ます'],
  // Korean (hangul) - check for Korean script range
  korean: ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'],
  // Russian (cyrillic) - only multi-character words to avoid false positives
  russian: ['это', 'как', 'что', 'или', 'для', 'все', 'был', 'том', 'его', 'она', 'привет', 'хочу', 'создать'],
  // Arabic
  arabic: ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص'],
};

/**
 * English-specific patterns and common words
 */
const ENGLISH_INDICATORS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
];

/**
 * Detect if text is likely in English
 * Returns true if text appears to be English, false otherwise
 */
export function isEnglish(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return true; // Empty text is considered valid
  }

  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();
  
  // Check for Korean script (Hangul Unicode range: AC00-D7AF)
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return false;
  }
  
  // Check for non-English patterns first (these are strong indicators)
  for (const [language, patterns] of Object.entries(NON_ENGLISH_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        return false; // Found non-English pattern
      }
    }
  }

  // If no non-English patterns found, assume it's English
  // This is a conservative approach that avoids false negatives
  // (rejecting valid English text)
  return true;
}

/**
 * Get a polite message for non-English input
 */
export function getNonEnglishMessage(): string {
  return "I appreciate your interest! Currently, I can only communicate in English. Please feel free to describe your project in English, and I'll be happy to help you create a comprehensive specification.";
}

/**
 * Detect the likely language of the text (basic detection)
 * Returns the detected language name or 'unknown'
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'unknown';
  }

  const lowerText = text.toLowerCase();

  // Check for Korean script first (Hangul Unicode range)
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'korean';
  }

  // Check each language pattern
  for (const [language, patterns] of Object.entries(NON_ENGLISH_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        matchCount++;
      }
    }
    // If we find at least one pattern from a language, it's likely that language
    // (We use 1 instead of 2 because some short phrases may only have one indicator)
    if (matchCount >= 1) {
      return language;
    }
  }

  // Check if it's English
  if (isEnglish(text)) {
    return 'english';
  }

  return 'unknown';
}
