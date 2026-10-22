/**
 * Pre-recorded phrases for Replay Mode aligned with server/src/replay.js.
 * Includes multi-language translations (English 'en', Hindi 'hi', Marathi 'mr')
 * so the speaker console can demo multi-language captions without a microphone.
 */

export const REPLAY_RECORDINGS = [
  {
    replayId: 'phrase-hi-01',
    lang: 'hi',
    text: 'कमरा का किराया पाँच सौ रुपये है',
    tag: 'Room rent (₹500)',
    translations: {
      en: 'The room rent is five hundred rupees.',
      hi: 'कमरा का किराया पाँच सौ रुपये है।',
      mr: 'खोलीचे भाडे पाचशे रुपये आहे.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-hi-02',
    lang: 'hi',
    text: 'चेक-इन का समय दोपहर बारह बजे है',
    tag: 'Check-in time (12 PM)',
    translations: {
      en: 'Check-in time is twelve noon.',
      hi: 'चेक-इन का समय दोपहर बारह बजे है।',
      mr: 'चेक-इनची वेळ दुपारी बारा वाजता आहे.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-hi-03',
    lang: 'hi',
    text: 'वाईफाई का पासवर्ड होटल आठ सौ पांच है',
    tag: 'Wi-Fi password (805)',
    translations: {
      en: 'The Wi-Fi password is hotel eight zero five.',
      hi: 'वाईफाई का पासवर्ड होटल आठ सौ पांच है।',
      mr: 'वायफायचा पासवर्ड हॉटेल आठशे पाच आहे.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-mr-01',
    lang: 'mr',
    text: 'खोलीचे भाडे पाचशे रुपये आहे',
    tag: 'खोली भाडे (₹500)',
    translations: {
      en: 'The room rent is five hundred rupees.',
      hi: 'कमरे का किराया पाँच सौ रुपये है।',
      mr: 'खोलीचे भाडे पाचशे रुपये आहे.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-mr-02',
    lang: 'mr',
    text: 'सकाळचा नाश्ता आठ वाजता सुरू होतो',
    tag: 'नाश्ता वेळ (8 AM)',
    translations: {
      en: "Morning breakfast starts at eight o'clock.",
      hi: 'सुबह का नाश्ता आठ बजे शुरू होता है।',
      mr: 'सकाळचा नाश्ता आठ वाजता सुरू होतो.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-02',
    lang: 'mr',
    text: 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे',
    tag: 'चेक आउट (11 AM)',
    translations: {
      en: 'The check-out time is eleven in the morning.',
      hi: 'चेक आउट का समय सुबह ग्यारह बजे है।',
      mr: 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-03',
    lang: 'hi',
    text: 'नाश्ता सुबह आठ बजे शुरू होता है',
    tag: 'Breakfast time (8 AM)',
    translations: {
      en: 'Breakfast starts at eight in the morning.',
      hi: 'नाश्ता सुबह आठ बजे शुरू होता है।',
      mr: 'सकाळचा नाश्ता आठ वाजता सुरू होतो.',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-unclear',
    lang: 'hi',
    text: '[Noisy / Muffled Audio]',
    tag: 'Unclear Audio Demo',
    unclear: true,
    translations: {
      en: '',
      hi: '',
      mr: '',
    },
    audioUrl: null,
  },
  {
    replayId: 'phrase-mismatch',
    lang: 'hi',
    text: 'कमरा का किराया पाँच सौ रुपये है',
    tag: 'Number Mismatch Demo (500 vs 50)',
    translations: {
      en: 'The room rent is fifty rupees.',
      hi: 'कमरा का किराया पचास रुपये है।',
      mr: 'खोलीचे भाडे पन्नास रुपये आहे.',
    },
    audioUrl: null,
  },
];
