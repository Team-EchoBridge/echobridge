import test from 'node:test';
import assert from 'node:assert/strict';
import {
  convertDevanagariDigits,
  classifyKind,
  parseSpokenNumberWords,
  extractNumbers
} from '../src/numbers.js';

test('convertDevanagariDigits converts Devanagari to ASCII digits', () => {
  assert.equal(convertDevanagariDigits('५००'), '500');
  assert.equal(convertDevanagariDigits('०१२३४५६७८९'), '0123456789');
  assert.equal(convertDevanagariDigits('किराया ५०० रु'), 'किराया 500 रु');
});

test('classifyKind identifies price context', () => {
  assert.equal(classifyKind('किराया ५०० रुपये'), 'price');
  assert.equal(classifyKind('भाडे दोन हजार रुपये'), 'price');
  assert.equal(classifyKind('Advance deposit 1000 rs'), 'price');
});

test('classifyKind identifies time context', () => {
  assert.equal(classifyKind('सकाळी अकरा वाजता'), 'time');
  assert.equal(classifyKind('दोपहर दो बजे'), 'time');
  assert.equal(classifyKind('check out at 11 am'), 'time');
});

test('classifyKind falls back to count', () => {
  assert.equal(classifyKind('तीन चादरें'), 'count');
  assert.equal(classifyKind('दोन खोल्या'), 'count');
});

test('parseSpokenNumberWords parses single and compound words', () => {
  assert.equal(parseSpokenNumberWords('पाँच'), 5);
  assert.equal(parseSpokenNumberWords('अकरा'), 11);
  assert.equal(parseSpokenNumberWords('पाँच सौ'), 500);
  assert.equal(parseSpokenNumberWords('दोन हजार'), 2000);
  assert.equal(parseSpokenNumberWords('पाचशे'), 500);
  assert.equal(parseSpokenNumberWords('दोनशे'), 200);
  assert.equal(parseSpokenNumberWords('दोन हजार पाचशे'), 2500);
});

test('extractNumbers extracts Hindi price from spoken words', () => {
  const res = extractNumbers('कमरा का किराया पाँच सौ रुपये है', 'hi');
  assert.equal(res.length, 1);
  assert.equal(res[0].value, 500);
  assert.equal(res[0].kind, 'price');
  assert.equal(res[0].spoken, 'पाँच सौ');
  assert.equal(res[0].verified, false);
});

test('extractNumbers extracts Marathi time from spoken words', () => {
  const res = extractNumbers('चेक आउट ची वेळ सकाळी अकरा वाजता आहे', 'mr');
  assert.equal(res.length, 1);
  assert.equal(res[0].value, 11);
  assert.equal(res[0].kind, 'time');
  assert.equal(res[0].spoken, 'अकरा');
  assert.equal(res[0].verified, false);
});

test('extractNumbers extracts Devanagari digit prices', () => {
  const res = extractNumbers('खोलीचे भाडे ५०० रुपये आहे', 'mr');
  assert.equal(res.length, 1);
  assert.equal(res[0].value, 500);
  assert.equal(res[0].kind, 'price');
  assert.equal(res[0].spoken, '५००');
});

test('extractNumbers handles multiple numbers in a sentence', () => {
  const res = extractNumbers('दोन खोल्यांचे भाडे चार हजार रुपये आहे', 'mr');
  assert.equal(res.length, 2);

  const countItem = res.find(r => r.kind === 'count');
  const priceItem = res.find(r => r.kind === 'price');

  assert.ok(countItem);
  assert.equal(countItem.value, 2);
  assert.ok(priceItem);
  assert.equal(priceItem.value, 4000);
});

