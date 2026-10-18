/**
 * Replay store for EchoBridge
 * Provides cached outputs for replay mode (bypasses NLP module)
 * Conforms to docs/contracts.md
 */

export const replayStore = new Map([
  [
    'phrase-01',
    {
      srcText: 'कमरा का किराया पाँच सौ रुपये है',
      translations: { en: 'The room rent is five hundred rupees.' },
      numbers: [{ value: 500, kind: 'price', spoken: 'पाँच सौ', verified: true }],
      confidence: 0.98,
      unclear: false,
      timings: { sttMs: 50, translateMs: 20, guardMs: 5 }
    }
  ],
  [
    'phrase-02',
    {
      srcText: 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे',
      translations: { en: 'The check-out time is eleven in the morning.' },
      numbers: [{ value: 11, kind: 'time', spoken: 'अकरा', verified: true }],
      confidence: 0.97,
      unclear: false,
      timings: { sttMs: 50, translateMs: 20, guardMs: 5 }
    }
  ],
  [
    'phrase-03',
    {
      srcText: 'नाश्ता सुबह आठ बजे शुरू होता है',
      translations: { en: 'Breakfast starts at eight in the morning.' },
      numbers: [{ value: 8, kind: 'time', spoken: 'आठ', verified: true }],
      confidence: 0.96,
      unclear: false,
      timings: { sttMs: 50, translateMs: 20, guardMs: 5 }
    }
  ],
  [
    'phrase-unclear',
    {
      srcText: '',
      translations: { en: '' },
      numbers: [],
      confidence: 0.25,
      unclear: true,
      timings: { sttMs: 40, translateMs: 0, guardMs: 0 }
    }
  ],
  [
    'phrase-mismatch',
    {
      srcText: 'कमरा का किराया पाँच सौ रुपये है',
      translations: { en: 'The room rent is fifty rupees.' },
      numbers: [{ value: 500, kind: 'price', spoken: 'पाँच सौ', verified: false }],
      confidence: 0.92,
      unclear: false,
      timings: { sttMs: 50, translateMs: 20, guardMs: 5 }
    }
  ]
]);

/**
 * Get replay entry by ID
 * @param {string} replayId
 */
export function getReplay(replayId) {
  return replayStore.get(replayId) || null;
}

/**
 * Register or update a replay item at runtime
 * @param {string} replayId
 * @param {object} data
 */
export function registerReplay(replayId, data) {
  replayStore.set(replayId, data);
}

