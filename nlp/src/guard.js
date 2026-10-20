/**
 * Number Cross-Check & Unclear Gate (Member 4)
 * Source of truth: docs/contracts.md
 *
 * Rules:
 * - If any number has verified: false, the server still sends the caption,
 *   and listeners show the number card with a warning mark.
 * - Unclear gate triggers on low confidence, empty or very short text.
 * - When unclear is true, translation is empty and listeners speak nothing.
 */

// English number words map
const EN_NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90
};

const EN_MULTIPLIERS = {
  hundred: 100,
  thousand: 1000,
  lakh: 100000,
  million: 1000000,
  crore: 10000000
};

/**
 * Parses English words like "five hundred", "eleven", "fifty" into a number.
 * @param {string} phrase
 * @returns {number|null}
 */
export function parseEnglishNumberWords(phrase) {
  if (!phrase) return null;
  const tokens = phrase.toLowerCase().replace(/-/g, ' ').trim().split(/\s+/);
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let validTokens = 0;

  for (const token of tokens) {
    if (EN_NUMBER_WORDS[token] !== undefined) {
      current += EN_NUMBER_WORDS[token];
      validTokens++;
    } else if (EN_MULTIPLIERS[token] !== undefined) {
      const mult = EN_MULTIPLIERS[token];
      current = current === 0 ? mult : current * mult;
      total += current;
      current = 0;
      validTokens++;
    } else {
      return null;
    }
  }

  total += current;
  return validTokens > 0 ? total : null;
}

/**
 * Extracts all numbers (digits or spelled out) from an English translation.
 * @param {string} text
 * @returns {number[]}
 */
export function extractEnglishNumbers(text) {
  if (!text || typeof text !== 'string') return [];

  const foundNumbers = new Set();

  // 1. Match digits (e.g. "500", "11", "2500")
  const digitRegex = /\b(\d+)\b/g;
  let match;
  while ((match = digitRegex.exec(text)) !== null) {
    foundNumbers.add(parseInt(match[1], 10));
  }

  // 2. Match spelled out numbers (e.g. "five hundred", "fifty", "eleven")
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let i = 0;
  while (i < words.length) {
    let matchedVal = null;
    let matchedLen = 0;

    for (let len = Math.min(4, words.length - i); len >= 1; len--) {
      const candidate = words.slice(i, i + len).join(' ');
      const val = parseEnglishNumberWords(candidate);
      if (val !== null) {
        matchedVal = val;
        matchedLen = len;
        break;
      }
    }

    if (matchedVal !== null) {
      foundNumbers.add(matchedVal);
      i += matchedLen;
    } else {
      i++;
    }
  }

  return Array.from(foundNumbers);
}

/**
 * Cross-checks source numbers against the English translation.
 * Sets `verified: true` if translation contains the expected value, else `false`.
 *
 * @param {Array<{
 *   value: number,
 *   kind: "price" | "time" | "count",
 *   spoken: string,
 *   verified: boolean
 * }>} numbers - Numbers extracted from source language
 * @param {string} translation - Target English translation
 * @returns {Array<{
 *   value: number,
 *   kind: "price" | "time" | "count",
 *   spoken: string,
 *   verified: boolean
 * }>}
 */
export function crossCheckNumbers(numbers, translation) {
  if (!Array.isArray(numbers) || numbers.length === 0) return [];
  if (!translation || typeof translation !== 'string') {
    return numbers.map(n => ({ ...n, verified: false }));
  }

  const enNumbers = extractEnglishNumbers(translation);

  return numbers.map(n => {
    const verified = enNumbers.includes(n.value);
    return {
      value: n.value,
      kind: n.kind,
      spoken: n.spoken,
      verified
    };
  });
}

/**
 * Unclear Gate check.
 * Identifies whether an utterance should be marked unclear based on:
 * - Low confidence score (< minConfidence)
 * - Empty or very short transcribed text (< minLength)
 * - Explicit error/unclear flag
 *
 * @param {Object} params
 * @param {string} params.srcText - Transcribed source text
 * @param {number} params.confidence - STT confidence score (0 to 1)
 * @param {number} [params.minConfidence=0.5] - Confidence threshold
 * @param {number} [params.minLength=2] - Minimum character length threshold
 * @returns {boolean} - true if unclear, false otherwise
 */
export function isUnclear({ srcText, confidence = 0, minConfidence = 0.5, minLength = 2 }) {
  if (confidence < minConfidence) return true;
  if (!srcText || typeof srcText !== 'string') return true;
  const trimmed = srcText.trim();
  if (trimmed.length < minLength) return true;

  // Filter out single punctuation or noise
  if (/^[.,!?;:\-–—\s]+$/.test(trimmed)) return true;

  return false;
}

