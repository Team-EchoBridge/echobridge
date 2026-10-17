/**
 * NLP Adapter for server
 * Integrates with /nlp module if available, or gracefully falls back to mock contract data
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for repeated phrases: Map<cacheKey, { en: string, numbers: Array<object> }>
const translationCache = new Map();

/**
 * Load mock NLP data for fallback when Member 4 module is in development
 */
let mockNlpResults = null;
try {
  const mockPath = path.resolve(__dirname, '../../docs/mocks/mock-nlp-result.json');
  if (fs.existsSync(mockPath)) {
    mockNlpResults = JSON.parse(fs.readFileSync(mockPath, 'utf8'));
  }
} catch (err) {
  console.warn('[NLP Adapter] Could not load mock-nlp-result.json:', err.message);
}

/**
 * Dynamic import of nlp module
 */
let realNlpProcess = null;
async function getNlpProcess() {
  if (realNlpProcess) return realNlpProcess;
  try {
    const nlpModule = await import('../../nlp/src/index.js');
    if (typeof nlpModule.process === 'function') {
      realNlpProcess = nlpModule.process;
      console.log('[NLP Adapter] Real /nlp module loaded successfully.');
      return realNlpProcess;
    }
  } catch (err) {
    // Module still being authored by Member 4
  }
  return null;
}

/**
 * Process utterance through real NLP or mock fallback
 * @param {{ audio: any, srcLang: string, tgtLangs: string[] }} params
 * @returns {Promise<{
 *   srcText: string,
 *   translations: { en: string },
 *   numbers: Array<{ value: number, kind: "price" | "time" | "count", spoken: string, verified: boolean }>,
 *   confidence: number,
 *   unclear: boolean,
 *   timings: { sttMs: number, translateMs: number, guardMs: number }
 * }>}
 */
export async function processUtterance({ audio, srcLang, tgtLangs = ['en'] }) {
  const nlpProcess = await getNlpProcess();

  if (nlpProcess) {
    try {
      return await nlpProcess({ audio, srcLang, tgtLangs });
    } catch (err) {
      console.error('[NLP Adapter] /nlp process error, falling back to safe contract:', err);
    }
  }

  // Fallback to contract mocks
  if (mockNlpResults) {
    if (srcLang === 'mr' && mockNlpResults.marathi_phrase_result) {
      return JSON.parse(JSON.stringify(mockNlpResults.marathi_phrase_result.result));
    }
    if (mockNlpResults.normal_result) {
      return JSON.parse(JSON.stringify(mockNlpResults.normal_result.result));
    }
  }

  // Safe fallback compliant with contracts.md
  return {
    srcText: srcLang === 'hi' ? 'कमरा का किराया पाँच सौ रुपये है' : 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे',
    translations: { en: srcLang === 'hi' ? 'The room rent is five hundred rupees.' : 'The check-out time is eleven in the morning.' },
    numbers: [{
      value: srcLang === 'hi' ? 500 : 11,
      kind: srcLang === 'hi' ? 'price' : 'time',
      spoken: srcLang === 'hi' ? 'पाँच सौ' : 'अकरा',
      verified: true
    }],
    confidence: 0.95,
    unclear: false,
    timings: { sttMs: 800, translateMs: 300, guardMs: 20 }
  };
}

/**
 * Cache lookup/store for repeated phrases
 */
export function getCachedTranslation(srcText, tgtLang) {
  const key = `${srcText.trim()}:${tgtLang}`;
  return translationCache.get(key);
}

export function setCachedTranslation(srcText, tgtLang, data) {
  const key = `${srcText.trim()}:${tgtLang}`;
  translationCache.set(key, data);
}

