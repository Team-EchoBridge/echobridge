/**
 * Google Cloud Translation Integration (Member 4)
 * Source of truth: docs/contracts.md
 *
 * Rules:
 * - Translates source text (Hindi/Marathi) into requested target languages (default: English 'en').
 * - Integrates hospitality glossary post-processing or phrase consistency.
 * - One retry on failure, resolving safely with empty translations and unclear: true on persistent failure.
 */

import 'dotenv/config';
import { v2 as translateV2 } from '@google-cloud/translate';
import { withTimeoutAndRetry } from './stt.js';
import { HOSPITALITY_GLOSSARY } from './glossary.js';

let defaultTranslateClient = null;

/**
 * Returns a cached Translate client instance or custom client.
 */
export function getTranslateClient(customClient = null) {
  if (customClient) return customClient;
  if (!defaultTranslateClient) {
    try {
      defaultTranslateClient = new translateV2.Translate();
    } catch (err) {
      return null;
    }
  }
  return defaultTranslateClient;
}

/**
 * Standardizes common hospitality phrasing in translated English text
 * to ensure clear and consistent terminology.
 * @param {string} text
 * @returns {string}
 */
export function postProcessWithGlossary(text) {
  if (!text || typeof text !== 'string') return '';
  let refined = text;

  // Ensure common hospitality terms are capitalized/phrased properly
  refined = refined.replace(/\bwi\s*fi\b/gi, 'Wi-Fi');
  refined = refined.replace(/\bac\b/gi, 'AC');
  refined = refined.replace(/\bcheck\s*in\b/gi, 'check-in');
  refined = refined.replace(/\bcheck\s*out\b/gi, 'check-out');

  return refined.trim();
}

/**
 * Translates text into target languages (default: ['en']).
 *
 * @param {Object} params
 * @param {string} params.text - Transcribed source text
 * @param {"hi"|"mr"} [params.srcLang="hi"] - Source language
 * @param {string[]} [params.tgtLangs=['en']] - Target languages
 * @param {number} [params.timeoutMs=5000] - Timeout per attempt
 * @param {object} [params.client=null] - Optional injected client
 * @returns {Promise<{
 *   translations: Record<string, string>,
 *   translateMs: number,
 *   unclear: boolean
 * }>}
 */
export async function translateText({
  text,
  srcLang = 'hi',
  tgtLangs = ['en'],
  timeoutMs = 5000,
  client = null
}) {
  const t0 = Date.now();

  const emptyTranslations = {};
  for (const lang of tgtLangs) {
    emptyTranslations[lang] = '';
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      translations: emptyTranslations,
      translateMs: Date.now() - t0,
      unclear: true
    };
  }

  const translateClient = getTranslateClient(client);
  if (!translateClient) {
    return {
      translations: emptyTranslations,
      translateMs: Date.now() - t0,
      unclear: true
    };
  }

  try {
    const translations = { ...emptyTranslations };

    for (const tgtLang of tgtLangs) {
      const [translationResult] = await withTimeoutAndRetry(
        () => translateClient.translate(text, { from: srcLang, to: tgtLang }),
        timeoutMs,
        1 // 1 retry
      );

      const translatedStr = Array.isArray(translationResult)
        ? translationResult[0]
        : translationResult;

      translations[tgtLang] = postProcessWithGlossary(translatedStr || '');
    }

    return {
      translations,
      translateMs: Date.now() - t0,
      unclear: false
    };
  } catch (err) {
    // Graceful resolution per contracts.md
    return {
      translations: emptyTranslations,
      translateMs: Date.now() - t0,
      unclear: true
    };
  }
}

