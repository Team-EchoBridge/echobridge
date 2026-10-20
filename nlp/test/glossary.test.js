import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOSPITALITY_GLOSSARY,
  getGlossary,
  getGlossaryCount,
  findMatchingTerms,
  getSpeechHints
} from '../src/glossary.js';

test('glossary contains between 50 and 80 hospitality terms', () => {
  const count = getGlossaryCount();
  assert.ok(count >= 50 && count <= 80, `Count was ${count}, expected 50 to 80`);
});

test('every glossary entry has id, en, hi, mr, and category', () => {
  const glossary = getGlossary();
  for (const item of glossary) {
    assert.equal(typeof item.id, 'string');
    assert.equal(typeof item.en, 'string');
    assert.ok(Array.isArray(item.hi) && item.hi.length > 0);
    assert.ok(Array.isArray(item.mr) && item.mr.length > 0);
    assert.equal(typeof item.category, 'string');
  }
});

test('findMatchingTerms finds terms in Hindi text', () => {
  const matches = findMatchingTerms('कमरा का किराया पाँच सौ रुपये है', 'hi');
  const ids = matches.map(m => m.id);
  assert.ok(ids.includes('room'));
  assert.ok(ids.includes('rent'));
});

test('findMatchingTerms finds terms in Marathi text', () => {
  const matches = findMatchingTerms('चेक आउट ची वेळ सकाळी अकरा वाजता आहे', 'mr');
  const ids = matches.map(m => m.id);
  assert.ok(ids.includes('checkout'));
  assert.ok(ids.includes('time'));
  assert.ok(ids.includes('in_morning'));
});

test('getSpeechHints returns unique non-empty arrays for hi and mr', () => {
  const hiHints = getSpeechHints('hi');
  const mrHints = getSpeechHints('mr');
  assert.ok(hiHints.length >= 50);
  assert.ok(mrHints.length >= 50);
  assert.ok(hiHints.includes('किराया'));
  assert.ok(mrHints.includes('भाडे'));
});

