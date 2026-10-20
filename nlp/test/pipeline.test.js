import test from 'node:test';
import assert from 'node:assert/strict';
import { process } from '../src/index.js';

test('process() end-to-end pipeline handles successful Hindi utterance with verified price', async () => {
  const mockSttClient = {
    recognize: async () => [
      {
        results: [
          {
            alternatives: [
              {
                transcript: 'कमरा का किराया पाँच सौ रुपये है',
                confidence: 0.94
              }
            ]
          }
        ]
      }
    ]
  };

  const mockTranslateClient = {
    translate: async () => ['The room rent is five hundred rupees.']
  };

  const dummyAudio = Buffer.alloc(1600);
  const result = await process({
    audio: dummyAudio,
    srcLang: 'hi',
    tgtLangs: ['en'],
    options: {
      sttClient: mockSttClient,
      translateClient: mockTranslateClient
    }
  });

  assert.equal(result.srcText, 'कमरा का किराया पाँच सौ रुपये है');
  assert.equal(result.translations.en, 'The room rent is five hundred rupees.');
  assert.equal(result.confidence, 0.94);
  assert.equal(result.unclear, false);
  assert.equal(result.numbers.length, 1);
  assert.equal(result.numbers[0].value, 500);
  assert.equal(result.numbers[0].kind, 'price');
  assert.equal(result.numbers[0].spoken, 'पाँच सौ');
  assert.equal(result.numbers[0].verified, true);
  assert.ok(result.timings.sttMs >= 0);
  assert.ok(result.timings.translateMs >= 0);
  assert.ok(result.timings.guardMs >= 0);
});

test('process() flags number discrepancy as verified: false while still emitting caption', async () => {
  const mockSttClient = {
    recognize: async () => [
      {
        results: [
          {
            alternatives: [
              {
                transcript: 'कमरा का किराया पाँच सौ रुपये है',
                confidence: 0.91
              }
            ]
          }
        ]
      }
    ]
  };

  // Translation mistakenly says 50 instead of 500
  const mockTranslateClient = {
    translate: async () => ['The room rent is fifty rupees.']
  };

  const dummyAudio = Buffer.alloc(1600);
  const result = await process({
    audio: dummyAudio,
    srcLang: 'hi',
    tgtLangs: ['en'],
    options: {
      sttClient: mockSttClient,
      translateClient: mockTranslateClient
    }
  });

  assert.equal(result.unclear, false);
  assert.equal(result.translations.en, 'The room rent is fifty rupees.');
  assert.equal(result.numbers.length, 1);
  assert.equal(result.numbers[0].value, 500);
  assert.equal(result.numbers[0].verified, false);
});

test('process() routes low confidence audio to unclear: true with empty translation', async () => {
  const mockSttClient = {
    recognize: async () => [
      {
        results: [
          {
            alternatives: [
              {
                transcript: 'कुछ',
                confidence: 0.28
              }
            ]
          }
        ]
      }
    ]
  };

  const dummyAudio = Buffer.alloc(1600);
  const result = await process({
    audio: dummyAudio,
    srcLang: 'hi',
    tgtLangs: ['en'],
    options: {
      sttClient: mockSttClient
    }
  });

  assert.equal(result.unclear, true);
  assert.equal(result.translations.en, '');
  assert.deepEqual(result.numbers, []);
  assert.equal(result.timings.translateMs, 0);
  assert.equal(result.timings.guardMs, 0);
});

test('process() end-to-end pipeline handles Marathi checkout time', async () => {
  const mockSttClient = {
    recognize: async () => [
      {
        results: [
          {
            alternatives: [
              {
                transcript: 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे',
                confidence: 0.96
              }
            ]
          }
        ]
      }
    ]
  };

  const mockTranslateClient = {
    translate: async () => ['The check out time is eleven in the morning.']
  };

  const dummyAudio = Buffer.alloc(1600);
  const result = await process({
    audio: dummyAudio,
    srcLang: 'mr',
    tgtLangs: ['en'],
    options: {
      sttClient: mockSttClient,
      translateClient: mockTranslateClient
    }
  });

  assert.equal(result.srcText, 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे');
  assert.equal(result.translations.en, 'The check-out time is eleven in the morning.');
  assert.equal(result.numbers.length, 1);
  assert.equal(result.numbers[0].value, 11);
  assert.equal(result.numbers[0].kind, 'time');
  assert.equal(result.numbers[0].spoken, 'अकरा');
  assert.equal(result.numbers[0].verified, true);
  assert.equal(result.unclear, false);
});

