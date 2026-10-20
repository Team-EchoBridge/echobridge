import test from 'node:test';
import assert from 'node:assert/strict';
import { translateText, postProcessWithGlossary } from '../src/translate.js';

test('postProcessWithGlossary standardizes terms like Wi-Fi, AC, check-in', () => {
  assert.equal(postProcessWithGlossary('Free wi fi in room'), 'Free Wi-Fi in room');
  assert.equal(postProcessWithGlossary('Turn on the ac please'), 'Turn on the AC please');
  assert.equal(postProcessWithGlossary('What is the check in time?'), 'What is the check-in time?');
  assert.equal(postProcessWithGlossary('What is the check out time?'), 'What is the check-out time?');
});

test('translateText handles empty input gracefully with empty translations and unclear: true', async () => {
  const res = await translateText({ text: '', srcLang: 'hi', tgtLangs: ['en'] });
  assert.equal(res.unclear, true);
  assert.equal(res.translations.en, '');
  assert.equal(typeof res.translateMs, 'number');
});

test('translateText translates Hindi to English with mock client', async () => {
  const mockClient = {
    translate: async (str, opts) => {
      assert.equal(opts.from, 'hi');
      assert.equal(opts.to, 'en');
      return ['The room rent is five hundred rupees.'];
    }
  };

  const res = await translateText({
    text: 'कमरा का किराया पाँच सौ रुपये है',
    srcLang: 'hi',
    tgtLangs: ['en'],
    client: mockClient
  });

  assert.equal(res.translations.en, 'The room rent is five hundred rupees.');
  assert.equal(res.unclear, false);
  assert.ok(res.translateMs >= 0);
});

test('translateText translates Marathi to English with mock client', async () => {
  const mockClient = {
    translate: async (str, opts) => {
      assert.equal(opts.from, 'mr');
      assert.equal(opts.to, 'en');
      return ['The check out time is 11 am.'];
    }
  };

  const res = await translateText({
    text: 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे',
    srcLang: 'mr',
    tgtLangs: ['en'],
    client: mockClient
  });

  // postProcessWithGlossary turns "check out" into "check-out"
  assert.equal(res.translations.en, 'The check-out time is 11 am.');
  assert.equal(res.unclear, false);
});

test('translateText succeeds on retry after transient failure', async () => {
  let attempts = 0;
  const mockClient = {
    translate: async () => {
      attempts++;
      if (attempts === 1) throw new Error('Temporary connection issue');
      return ['Hot water is available.'];
    }
  };

  const res = await translateText({
    text: 'गरम पाणी उपलब्ध आहे',
    srcLang: 'mr',
    client: mockClient
  });

  assert.equal(attempts, 2);
  assert.equal(res.translations.en, 'Hot water is available.');
  assert.equal(res.unclear, false);
});

test('translateText returns empty string and unclear: true when translation persistently fails', async () => {
  const mockClient = {
    translate: async () => {
      throw new Error('API quota exceeded');
    }
  };

  const res = await translateText({
    text: 'कमरा साफ करें',
    srcLang: 'hi',
    client: mockClient
  });

  assert.equal(res.unclear, true);
  assert.equal(res.translations.en, '');
});

