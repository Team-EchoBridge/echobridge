/**
 * EchoBridge NLP Module (Member 4)
 * Source of truth: docs/contracts.md
 *
 * Full End-to-End Pipeline:
 * Audio -> STT (with SpeechContexts) -> Extract Numbers -> Translate -> Number Guard & Unclear Gate -> Result & Timings
 */

import { recognizeSpeech } from './stt.js';
import { translateText } from './translate.js';
import { extractNumbers } from './numbers.js';
import { crossCheckNumbers, isUnclear } from './guard.js';

/**
 * Process an incoming audio utterance and return recognized text,
 * translations, extracted number entities, confidence score, and stage timings.
 *
 * @param {Object} params
 * @param {ArrayBuffer|Buffer|Uint8Array} params.audio - 16-bit PCM, 16000Hz, mono audio buffer
 * @param {"hi"|"mr"} [params.srcLang='hi'] - Source language code
 * @param {Array<string>} [params.tgtLangs=['en']] - Target languages requested
 * @param {Object} [params.options] - Optional custom clients or configurations (e.g. for testing)
 * @returns {Promise<{
 *   srcText: string,
 *   translations: Record<string, string>,
 *   numbers: Array<{
 *     value: number,
 *     kind: "price" | "time" | "count",
 *     spoken: string,
 *     verified: boolean
 *   }>,
 *   confidence: number,
 *   unclear: boolean,
 *   timings: { sttMs: number, translateMs: number, guardMs: number }
 * }>}
 */
export async function process({
  audio,
  srcLang = 'hi',
  tgtLangs = ['en'],
  options = {}
}) {
  const emptyTranslations = {};
  for (const lang of tgtLangs) {
    emptyTranslations[lang] = '';
  }

  // 1. Speech Recognition (STT)
  const sttResult = await recognizeSpeech({
    audio,
    srcLang,
    client: options.sttClient
  });

  const { srcText, confidence, sttMs } = sttResult;

  // Unclear Gate Stage 1: check if speech was unrecognized or low confidence
  if (sttResult.unclear || isUnclear({ srcText, confidence })) {
    return {
      srcText: srcText || '',
      translations: emptyTranslations,
      numbers: [],
      confidence: confidence || 0,
      unclear: true,
      timings: {
        sttMs,
        translateMs: 0,
        guardMs: 0
      }
    };
  }

  // 2. Translation
  const translateResult = await translateText({
    text: srcText,
    srcLang,
    tgtLangs,
    client: options.translateClient
  });

  const { translations, translateMs } = translateResult;

  // Unclear Gate Stage 2: check if translation failed completely
  if (translateResult.unclear) {
    return {
      srcText,
      translations: emptyTranslations,
      numbers: [],
      confidence,
      unclear: true,
      timings: {
        sttMs,
        translateMs,
        guardMs: 0
      }
    };
  }

  // 3. Extract numbers and apply Guard cross-check
  const tGuardStart = Date.now();
  const rawNumbers = extractNumbers(srcText, srcLang);
  const primaryTranslation = translations[tgtLangs[0]] || translations.en || '';
  const verifiedNumbers = crossCheckNumbers(rawNumbers, primaryTranslation);
  const guardMs = Date.now() - tGuardStart;

  return {
    srcText,
    translations,
    numbers: verifiedNumbers,
    confidence,
    unclear: false,
    timings: {
      sttMs,
      translateMs,
      guardMs
    }
  };
}

export default { process };
