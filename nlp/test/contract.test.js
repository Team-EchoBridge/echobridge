import test from 'node:test';
import assert from 'node:assert/strict';
import { process } from '../src/index.js';

test('process() returns expected contract shape for Hindi', async () => {
  const dummyAudio = Buffer.alloc(3200); // 100ms dummy PCM audio
  const result = await process({ audio: dummyAudio, srcLang: 'hi', tgtLangs: ['en'] });

  assert.equal(typeof result.srcText, 'string');
  assert.ok(result.translations && typeof result.translations.en === 'string');
  assert.ok(Array.isArray(result.numbers));
  assert.equal(typeof result.confidence, 'number');
  assert.equal(typeof result.unclear, 'boolean');
  assert.ok(result.timings);
  assert.equal(typeof result.timings.sttMs, 'number');
  assert.equal(typeof result.timings.translateMs, 'number');
  assert.equal(typeof result.timings.guardMs, 'number');

  if (result.numbers.length > 0) {
    const num = result.numbers[0];
    assert.equal(typeof num.value, 'number');
    assert.ok(['price', 'time', 'count'].includes(num.kind));
    assert.equal(typeof num.spoken, 'string');
    assert.equal(typeof num.verified, 'boolean');
  }
});

test('process() returns expected contract shape for Marathi', async () => {
  const dummyAudio = Buffer.alloc(3200);
  const result = await process({ audio: dummyAudio, srcLang: 'mr', tgtLangs: ['en'] });

  assert.equal(typeof result.srcText, 'string');
  assert.ok(result.translations && typeof result.translations.en === 'string');
  assert.ok(Array.isArray(result.numbers));
  assert.equal(typeof result.confidence, 'number');
  assert.equal(typeof result.unclear, 'boolean');
  assert.ok(result.timings);
});

