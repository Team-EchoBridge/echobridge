/**
 * Number & Price Normalizer (Member 4)
 * Extracts and normalizes Hindi and Marathi numerals, words, and classifies kinds (price, time, count).
 * Source of truth: docs/contracts.md
 */

// Devanagari to ASCII digit mapping
const DEVANAGARI_DIGITS = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
};

// Hindi / Marathi word to number map (base numbers 0-99 and compounds)
const NUMBER_WORDS = {
  // 0 - 10
  'शून्य': 0, 'सिफर': 0,
  'एक': 1,
  'दो': 2, 'दोन': 2,
  'तीन': 3,
  'चार': 4,
  'पाँच': 5, 'पांच': 5, 'पाच': 5,
  'छह': 6, 'छः': 6, 'सहा': 6,
  'सात': 7,
  'आठ': 8,
  'नौ': 9, 'नऊ': 9,
  'दस': 10, 'दहा': 10,

  // 11 - 20
  'ग्यारह': 11, 'अकरा': 11,
  'बारह': 12, 'बारा': 12,
  'तेरह': 13, 'तेरा': 13,
  'चौदह': 14, 'चौदा': 14,
  'पंद्रह': 15, 'पंधरा': 15,
  'सोलह': 16, 'सोळा': 16,
  'सत्रह': 17, 'सतरा': 17,
  'अठारह': 18, 'अठरा': 18,
  'उन्नीस': 19, 'एकोणीस': 19,
  'बीस': 20, 'वीस': 20,

  // 21 - 30
  'इक्कीस': 21, 'एकवीस': 21,
  'बाईस': 22, 'बावीस': 22,
  'तेईस': 23, 'तेवीस': 23,
  'चौबीस': 24, 'चोवीस': 24,
  'पच्चीस': 25, 'पंचवीस': 25,
  'छब्बीस': 26, 'सव्वीस': 26,
  'सत्ताईस': 27, 'सत्तावीस': 27,
  'अट्ठाईस': 28, 'अठ्ठावीस': 28,
  'उनतीस': 29, 'एकोणतीस': 29,
  'तीस': 30,

  // 31 - 40
  'इकतीस': 31, 'एकतीस': 31,
  'बत्तीस': 32,
  'तैंतीस': 33, 'तेहेतीस': 33, 'तेहतीस': 33,
  'चौंतीस': 34, 'चौतीस': 34,
  'पैंतीस': 35, 'पस्तीस': 35,
  'छत्तीस': 36,
  'सैंतीस': 37, 'सदतीस': 37,
  'अड़तीस': 38, 'अडतीस': 38,
  'उनतालीस': 39, 'एकोणचाळीस': 39,
  'चालीस': 40, 'चाळीस': 40,

  // 41 - 50
  'इकतालीस': 41, 'एक्केचाळीस': 41,
  'बयालीस': 42, 'बेचाळीस': 42,
  'तैंतालीस': 43, 'त्रेचाळीस': 43,
  'चौंतालीस': 44, 'चव्वेचाळीस': 44,
  'पैंतालीस': 45, 'पंचेचाळीस': 45,
  'छियालीस': 46, 'शेहेचाळीस': 46,
  'सैंतालीस': 47, 'सत्तेचाळीस': 47,
  'अड़तालीस': 48, 'अठ्ठेचाळीस': 48,
  'उनचास': 49, 'एकोणपन्नास': 49,
  'पचास': 50, 'पन्नास': 50,

  // Tens up to 90
  'साठ': 60,
  'सत्तर': 70,
  'अस्सी': 80, 'ऐंशी': 80,
  'नब्बे': 90, 'नव्वद': 90,

  // Marathi specific hundred contractions
  'शंभर': 100,
  'दोनशे': 200,
  'तीनशे': 300,
  'चारशे': 400,
  'पाचशे': 500,
  'सहाशे': 600,
  'सातशे': 700,
  'आठशे': 800,
  'नऊशे': 900
};

// Multipliers
const MULTIPLIERS = {
  'सौ': 100, 'शे': 100,
  'हज़ार': 1000, 'हजार': 1000,
  'लाख': 100000,
  'करोड़': 10000000, 'कोटी': 10000000
};

// Currency / Price indicator words (exact token match)
const PRICE_WORDS = new Set([
  'रुपये', 'रुपया', 'रुपय', 'रु', 'रु.', 'रुपयां',
  'पैसे', 'किराया', 'भाडे', 'बिल', 'चार्ज', 'शुल्क',
  'अग्रिम', 'एडवांस', 'अनामत', 'खर्च', 'दर', 'rs', 'rs.', 'rupees', 'rupee', 'inr'
]);

// Time indicator words (exact token match)
const TIME_WORDS = new Set([
  'बजे', 'बजकर', 'बजके', 'वाजता', 'वाजवून', 'वाजताचे',
  'मिनट', 'मिनिट', 'मिनिटे', 'घंटे', 'तास',
  'सुबह', 'सकाळी', 'दोपहर', 'दुपारी', 'शाम', 'संध्याकाळी',
  'रात', 'रात्री', 'वेळ', 'समय', 'am', 'pm', "o'clock", 'hours', 'morning', 'afternoon', 'evening', 'night'
]);

/**
 * Converts Devanagari digit characters to standard ASCII digits.
 * e.g. "५००" -> "500"
 * @param {string} text
 * @returns {string}
 */
export function convertDevanagariDigits(text) {
  if (!text) return '';
  return text.replace(/[०-९]/g, match => DEVANAGARI_DIGITS[match] || match);
}

/**
 * Normalizes a word for token comparison (lowercase, strip trailing punctuation).
 */
function cleanToken(token) {
  return token.toLowerCase().replace(/^[^\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+$/gu, '');
}

export function classifyKind(context) {
  if (!context) return 'count';
  const tokens = Array.isArray(context)
    ? context.map(cleanToken)
    : context.split(/\s+/).map(cleanToken);

  if (tokens.some(t => PRICE_WORDS.has(t))) return 'price';
  if (tokens.some(t => TIME_WORDS.has(t))) return 'time';
  return 'count';
}

/**
 * Determines whether the surrounding words around an extracted number indicate
 * price, time, or count.
 * In Hindi and Marathi:
 * - Direct post-modifiers: "५०० रुपये" (price), "११ वाजता" (time), "२ बजे" (time)
 * - Direct pre-modifiers: "किराया ५००" (price), "भाडे ४०००" (price), "सकाळी ११" (time)
 * - Count is the default when referring to items, rooms, people, etc.
 *
 * @param {string[]} rawWords - Array of all tokens in sentence
 * @param {number} startIndex - Start index of the number
 * @param {number} length - Number of tokens comprising the number
 * @returns {"price" | "time" | "count"}
 */
export function classifySurroundings(rawWords, startIndex, length) {
  const prev1 = startIndex > 0 ? cleanToken(rawWords[startIndex - 1]) : '';
  const prev2 = startIndex > 1 ? cleanToken(rawWords[startIndex - 2]) : '';
  const next1 = (startIndex + length) < rawWords.length ? cleanToken(rawWords[startIndex + length]) : '';
  const next2 = (startIndex + length + 1) < rawWords.length ? cleanToken(rawWords[startIndex + length + 1]) : '';

  // 1. Check direct post-modifier (highest confidence in Indic languages)
  if (PRICE_WORDS.has(next1)) return 'price';
  if (TIME_WORDS.has(next1)) return 'time';

  // 2. Check direct pre-modifier
  if (PRICE_WORDS.has(prev1)) return 'price';
  if (TIME_WORDS.has(prev1)) return 'time';

  // 3. Check 2nd post-modifier (e.g. "५०० भारतीय रुपये", "११ वाजता सकाळी")
  if (PRICE_WORDS.has(next2) && ['भारतीय', 'फक्त', 'मात्र'].includes(next1)) return 'price';
  if (TIME_WORDS.has(next2)) return 'time';

  // 4. Check 2nd pre-modifier if connector intervenes (e.g. "भाडे फक्त ५००")
  if (PRICE_WORDS.has(prev2) && ['फक्त', 'मात्र', 'का', 'ची', 'चे', 'चा'].includes(prev1)) return 'price';
  if (TIME_WORDS.has(prev2) && ['ला', 'लाच', 'सुमारे'].includes(prev1)) return 'time';

  return 'count';
}

/**
 * Parses a sequence of spoken number words (e.g., "पाँच सौ", "दोन हजार पाचशे", "अकरा")
 * into a single numeric value.
 * @param {string} phrase
 * @returns {number|null}
 */
export function parseSpokenNumberWords(phrase) {
  if (!phrase) return null;
  const tokens = phrase.trim().split(/\s+/);
  if (tokens.length === 0) return null;

  let total = 0;
  let current = 0;
  let validTokens = 0;

  for (const token of tokens) {
    if (NUMBER_WORDS[token] !== undefined) {
      const val = NUMBER_WORDS[token];
      if (val >= 100 && (val % 100 === 0)) {
        current += val;
      } else {
        current += val;
      }
      validTokens++;
    } else if (MULTIPLIERS[token] !== undefined) {
      const mult = MULTIPLIERS[token];
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
 * Extracts all numbers from Hindi or Marathi text.
 * Detects:
 * - Digits (Arabic or Devanagari)
 * - Single or multi-word number phrases ("पाँच सौ", "अकरा", "दोन हजार पाचशे")
 * Returns array conforming to contract numbers field.
 *
 * @param {string} text - Source utterance text
 * @param {"hi"|"mr"} [lang="hi"] - Source language
 * @returns {Array<{
 *   value: number,
 *   kind: "price" | "time" | "count",
 *   spoken: string,
 *   verified: boolean
 * }>}
 */
export function extractNumbers(text, lang = 'hi') {
  if (!text || typeof text !== 'string') return [];

  const rawWords = text.trim().split(/\s+/);
  const normalizedWords = convertDevanagariDigits(text).trim().split(/\s+/);

  const rawResults = [];

  let i = 0;
  while (i < rawWords.length) {
    const rawWord = rawWords[i];
    const normWord = normalizedWords[i];

    // Check if the current token is a pure digit (e.g., "500", "५००")
    const cleanNorm = normWord.replace(/[^\d]/g, '');
    if (cleanNorm.length > 0 && /^\d+$/.test(cleanNorm)) {
      const val = parseInt(cleanNorm, 10);
      const kind = classifySurroundings(rawWords, i, 1);

      rawResults.push({
        value: val,
        kind,
        spoken: rawWord,
        verified: false,
        pos: i
      });
      i++;
      continue;
    }

    // Check if this starts a spoken number phrase
    let matchedPhrase = null;
    let matchedValue = null;
    let matchedLen = 0;

    for (let len = Math.min(4, rawWords.length - i); len >= 1; len--) {
      const candidate = rawWords.slice(i, i + len).join(' ');
      const val = parseSpokenNumberWords(candidate);
      if (val !== null) {
        matchedPhrase = candidate;
        matchedValue = val;
        matchedLen = len;
        break;
      }
    }

    if (matchedPhrase && matchedValue !== null) {
      const kind = classifySurroundings(rawWords, i, matchedLen);

      rawResults.push({
        value: matchedValue,
        kind,
        spoken: matchedPhrase,
        verified: false,
        pos: i
      });

      i += matchedLen;
    } else {
      i++;
    }
  }

  // Deduplicate
  const unique = [];
  for (const item of rawResults) {
    const exists = unique.some(u => u.value === item.value && u.spoken === item.spoken);
    if (!exists) {
      unique.push({
        value: item.value,
        kind: item.kind,
        spoken: item.spoken,
        verified: item.verified
      });
    }
  }

  return unique;
}
