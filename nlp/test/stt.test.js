import test from 'node:test';
import assert from 'node:assert/strict';
import { recognizeSpeech, withTimeoutAndRetry } from '../src/stt.js';

test('recognizeSpeech returns unclear: true on empty audio', async () => {
  const result = await recognizeSpeech({ audio: Buffer.alloc(0), srcLang: 'hi' });
  assert.equal(result.unclear, true);
  assert.equal(result.srcText, '');
  assert.equal(typeof result.sttMs, 'number');
});

test('recognizeSpeech formats request and parses successful response with speech contexts', async () => {
  let capturedRequest = null;
  const mockClient = {
    recognize: async (req) => {
      capturedRequest = req;
      return [
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
      ];
    }
  };

  const dummyAudio = Buffer.alloc(1600);
  const result = await recognizeSpeech({
    audio: dummyAudio,
    srcLang: 'hi',
    client: mockClient
  });

  assert.equal(capturedRequest.config.encoding, 'LINEAR16');
  assert.equal(capturedRequest.config.sampleRateHertz, 16000);
  assert.equal(capturedRequest.config.languageCode, 'hi-IN');
  assert.ok(capturedRequest.config.speechContexts[0].phrases.length >= 50);

  assert.equal(result.srcText, 'कमरा का किराया पाँच सौ रुपये है');
  assert.equal(result.confidence, 0.94);
  assert.equal(result.unclear, false);
  assert.ok(result.sttMs >= 0);
});

test('recognizeSpeech maps Marathi to mr-IN', async () => {
  let capturedRequest = null;
  const mockClient = {
    recognize: async (req) => {
      capturedRequest = req;
      return [
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
      ];
    }
  };

  const dummyAudio = Buffer.alloc(1600);
  const result = await recognizeSpeech({
    audio: dummyAudio,
    srcLang: 'mr',
    client: mockClient
  });

  assert.equal(capturedRequest.config.languageCode, 'mr-IN');
  assert.equal(result.srcText, 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे');
});

test('recognizeSpeech succeeds on second attempt after one retry', async () => {
  let attempts = 0;
  const mockClient = {
    recognize: async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error('Temporary network glitch');
      }
      return [
        {
          results: [
            {
              alternatives: [{ transcript: 'सफाई पाहिजे', confidence: 0.9 }]
            }
          ]
        }
      ];
    }
  };

  const result = await recognizeSpeech({
    audio: Buffer.alloc(1600),
    srcLang: 'mr',
    client: mockClient
  });

  assert.equal(attempts, 2);
  assert.equal(result.srcText, 'सफाई पाहिजे');
  assert.equal(result.unclear, false);
});

test('recognizeSpeech resolves with unclear: true after retry fails instead of throwing', async () => {
  let attempts = 0;
  const mockClient = {
    recognize: async () => {
      attempts++;
      throw new Error('Persistent provider failure');
    }
  };

  const result = await recognizeSpeech({
    audio: Buffer.alloc(1600),
    srcLang: 'hi',
    client: mockClient
  });

  // Exactly 2 attempts (initial + 1 retry)
  assert.equal(attempts, 2);
  assert.equal(result.unclear, true);
  assert.equal(result.srcText, '');
});

test('recognizeSpeech resolves with unclear: true on timeout instead of throwing', async () => {
  const hangingClient = {
    recognize: async () => new Promise(() => {}) // Never resolves
  };

  const result = await recognizeSpeech({
    audio: Buffer.alloc(1600),
    srcLang: 'hi',
    timeoutMs: 50, // Short timeout for test speed
    client: hangingClient
  });

  assert.equal(result.unclear, true);
  assert.equal(result.srcText, '');
});

