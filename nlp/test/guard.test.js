import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseEnglishNumberWords,
  extractEnglishNumbers,
  crossCheckNumbers,
  isUnclear
} from '../src/guard.js';

test('parseEnglishNumberWords parses English number words', () => {
  assert.equal(parseEnglishNumberWords('five hundred'), 500);
  assert.equal(parseEnglishNumberWords('fifty'), 50);
  assert.equal(parseEnglishNumberWords('eleven'), 11);
  assert.equal(parseEnglishNumberWords('two thousand five hundred'), 2500);
});

test('extractEnglishNumbers extracts both digits and spelled-out numbers', () => {
  const fromDigits = extractEnglishNumbers('The room rent is 500 rupees.');
  assert.deepEqual(fromDigits, [500]);

  const fromWords = extractEnglishNumbers('The room rent is five hundred rupees.');
  assert.deepEqual(fromWords, [500]);

  const fromTime = extractEnglishNumbers('The check-out time is eleven in the morning.');
  assert.deepEqual(fromTime, [11]);
});

test('crossCheckNumbers verifies matching numbers (normal_result mock)', () => {
  const sourceNumbers = [
    { value: 500, kind: 'price', spoken: 'पाँच सौ', verified: false }
  ];
  const translation = 'The room rent is five hundred rupees.';
  const verified = crossCheckNumbers(sourceNumbers, translation);

  assert.equal(verified.length, 1);
  assert.equal(verified[0].value, 500);
  assert.equal(verified[0].verified, true);
});

test('crossCheckNumbers flags discrepancy when numbers mismatch (unverified_number_result mock)', () => {
  const sourceNumbers = [
    { value: 500, kind: 'price', spoken: 'पाँच सौ', verified: false }
  ];
  // Translation mistranslated 500 as fifty (50)
  const translation = 'The room rent is fifty rupees.';
  const verified = crossCheckNumbers(sourceNumbers, translation);

  assert.equal(verified.length, 1);
  assert.equal(verified[0].value, 500);
  assert.equal(verified[0].verified, false);
});

test('isUnclear flags low confidence and empty speech', () => {
  // Low confidence (matches unclear_audio_result mock)
  assert.equal(isUnclear({ srcText: 'कुछ', confidence: 0.28 }), true);

  // Normal confidence
  assert.equal(isUnclear({ srcText: 'कमरा का किराया', confidence: 0.94 }), false);

  // Empty or whitespace
  assert.equal(isUnclear({ srcText: '', confidence: 0.95 }), true);
  assert.equal(isUnclear({ srcText: '   ', confidence: 0.95 }), true);

  // Punctuation noise only
  assert.equal(isUnclear({ srcText: '...', confidence: 0.95 }), true);

  // Single character
  assert.equal(isUnclear({ srcText: 'a', confidence: 0.95 }), true);
});

