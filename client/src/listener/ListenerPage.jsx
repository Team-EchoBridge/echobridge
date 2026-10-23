import React, { useEffect, useState, useCallback, useRef } from 'react';
import { joinRoom, onCaption } from '../shared/socket.js';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', defaultVoiceLang: 'en-IN', voiceMatch: ['en-IN', 'en-US', 'en-GB', 'en'] },
  { code: 'hi', label: 'Hindi', defaultVoiceLang: 'hi-IN', voiceMatch: ['hi-IN', 'hi'] },
  { code: 'mr', label: 'Marathi', defaultVoiceLang: 'mr-IN', voiceMatch: ['mr-IN', 'mr'] },
  { code: 'es', label: 'Spanish', defaultVoiceLang: 'es-ES', voiceMatch: ['es-ES', 'es-US', 'es-MX', 'es'] }
];

const STORAGE_LANG_KEY = 'echobridge_listener_lang';
const STORAGE_AUTOPLAY_KEY = 'echobridge_listener_autoplay';

export function ListenerPage({ roomId }) {
  const [selectedLang, setSelectedLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY);
      if (saved && SUPPORTED_LANGUAGES.some((lang) => lang.code === saved)) {
        return saved;
      }
    } catch {
      // LocalStorage access may fail in private mode
    }
    return 'en';
  });

  const [isAutoplay, setIsAutoplay] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTOPLAY_KEY);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // Ignore localStorage read failures
    }
    return true; // Default to true
  });

  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [price, setPrice] = useState('');
  const [isUnclear, setIsUnclear] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [voices, setVoices] = useState([]);

  // Audio queue refs to prevent state closure issues
  const queueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const isAutoplayRef = useRef(isAutoplay);
  const selectedLangRef = useRef(selectedLang);
  const voicesRef = useRef(voices);

  useEffect(() => {
    isAutoplayRef.current = isAutoplay;
  }, [isAutoplay]);

  useEffect(() => {
    selectedLangRef.current = selectedLang;
  }, [selectedLang]);

  useEffect(() => {
    voicesRef.current = voices;
  }, [voices]);

  // Load available speech synthesis voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voiceList = window.speechSynthesis.getVoices();
      if (voiceList && voiceList.length > 0) {
        setVoices(voiceList);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const getBestVoice = useCallback((langCode) => {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    const voiceList = voicesRef.current;
    if (!langConfig || !voiceList.length) return null;

    for (const matchPrefix of langConfig.voiceMatch) {
      const exact = voiceList.find((v) => v.lang.toLowerCase() === matchPrefix.toLowerCase());
      if (exact) return exact;
    }

    for (const matchPrefix of langConfig.voiceMatch) {
      const startsWith = voiceList.find((v) =>
        v.lang.toLowerCase().startsWith(matchPrefix.toLowerCase())
      );
      if (startsWith) return startsWith;
    }

    // Fallback: match by 2-letter language prefix
    return voiceList.find((v) => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) || null;
  }, []);

  // Process the FIFO queue one sentence at a time
  const processQueue = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingRef.current) return;
    if (queueRef.current.length === 0) return;

    const nextItem = queueRef.current.shift();
    if (!nextItem || !nextItem.text) {
      processQueue();
      return;
    }

    isPlayingRef.current = true;
    const speech = new SpeechSynthesisUtterance(nextItem.text);
    const chosenVoice = getBestVoice(nextItem.lang);
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === nextItem.lang);

    if (chosenVoice) {
      speech.voice = chosenVoice;
      speech.lang = chosenVoice.lang;
    } else {
      speech.lang = langConfig?.defaultVoiceLang || nextItem.lang;
    }

    speech.rate = 0.9;

    speech.onend = () => {
      isPlayingRef.current = false;
      processQueue();
    };

    speech.onerror = () => {
      isPlayingRef.current = false;
      processQueue();
    };

    window.speechSynthesis.speak(speech);
  }, [getBestVoice]);

  // Save selected language to localStorage
  const handleLanguageChange = (langCode) => {
    setSelectedLang(langCode);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, langCode);
    } catch {
      // Ignore localStorage write failures
    }
  };

  // Toggle autoplay
  const handleAutoplayToggle = (e) => {
    const newVal = e.target.checked;
    setIsAutoplay(newVal);
    try {
      localStorage.setItem(STORAGE_AUTOPLAY_KEY, String(newVal));
    } catch {
      // Ignore
    }
    if (!newVal) {
      // Clear queue and cancel active speech if autoplay turned off
      queueRef.current = [];
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isPlayingRef.current = false;
    }
  };

  // Unlock mobile audio on first user tap
  const handleUnlockAudio = () => {
    setIsAudioUnlocked(true);
    setIsAutoplay(true);
    try {
      localStorage.setItem(STORAGE_AUTOPLAY_KEY, 'true');
    } catch {
      // Ignore
    }

    if ('speechSynthesis' in window) {
      // Play a short silent/blank utterance to unlock mobile Safari / Chrome audio
      const silent = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(silent);
    }
  };

  useEffect(() => {
    let active = true;

    setOriginalText('');
    setTranslatedText('');
    setPrice('');
    setIsUnclear(false);
    setError('');
    setStatus('Joining room...');
    setIsConnected(false);

    // Register the listener before joining so we don't miss captions.
    const unsubscribe = onCaption((data) => {
      if (!active) return;

      // Filter captions meant for this target language if tgtLang is provided
      if (data.tgtLang && data.tgtLang !== selectedLang) {
        return;
      }

      setOriginalText(data.srcText || '');
      setTranslatedText(data.tgtText || '');
      setIsUnclear(Boolean(data.unclear));

      // Prefer structured number data from the backend.
      const numbers = Array.isArray(data.numbers) ? data.numbers : [];
      const numberText = numbers
        .map((item) => {
          if (item == null) return '';
          if (typeof item === 'string' || typeof item === 'number') {
            return String(item);
          }
          return item.text ?? item.value ?? item.amount ?? '';
        })
        .filter((value) => value !== '')
        .join(', ');

      // Fall back to numbers found in the caption.
      const matches = (data.tgtText || '').match(
        /(?:₹|INR\s*)\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:rupees|INR)/gi
      );

      setPrice(numberText || (matches ? matches.join(' • ') : ''));

      if (data.unclear) {
        setStatus('Speech unclear');
      } else {
        setStatus('Live captions');
      }

      // Sequential Speech Queue (Autoplay)
      if (!data.unclear && data.tgtText && isAutoplayRef.current) {
        queueRef.current.push({
          text: data.tgtText,
          lang: selectedLangRef.current,
          seq: data.seq
        });
        processQueue();
      }
    });

    joinRoom(roomId, selectedLang)
      .then((result) => {
        if (!active) return;

        if (result?.ok) {
          setIsConnected(true);
          setStatus('Connected — waiting for speech');
          setError('');
        } else {
          setStatus('Unable to join room');
          setError(result?.error || 'Could not join this room. Check the room ID.');
        }
      })
      .catch((err) => {
        if (!active) return;
        setStatus('Connection error');
        setError(err?.message || 'Could not connect to the server.');
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [roomId, selectedLang, processQueue]);

  const replayTranslation = () => {
    if (!translatedText || isUnclear) return;

    if (!('speechSynthesis' in window)) {
      setError('Audio playback is not supported by this browser.');
      return;
    }

    // Cancel running speech and clear pending queue for immediate replay
    window.speechSynthesis.cancel();
    queueRef.current = [];
    isPlayingRef.current = true;

    const speech = new SpeechSynthesisUtterance(translatedText);
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang);
    const chosenVoice = getBestVoice(selectedLang);

    if (chosenVoice) {
      speech.voice = chosenVoice;
      speech.lang = chosenVoice.lang;
    } else {
      speech.lang = langConfig?.defaultVoiceLang || selectedLang;
    }

    speech.rate = 0.9;

    speech.onend = () => {
      isPlayingRef.current = false;
      processQueue();
    };

    speech.onerror = () => {
      isPlayingRef.current = false;
      processQueue();
    };

    window.speechSynthesis.speak(speech);
  };

  const currentLangLabel =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label || selectedLang.toUpperCase();

  const cardStyle = {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
  };

  return (
    <main
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '700px',
        margin: '0 auto',
        padding: '24px',
        color: '#1f2937',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ marginBottom: '6px' }}>EchoBridge</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Live Tour Translation</p>
      </header>

      {/* Mobile Audio Permission Banner */}
      {!isAudioUnlocked && (
        <section
          style={{
            ...cardStyle,
            backgroundColor: '#eff6ff',
            borderColor: '#93c5fd',
            textAlign: 'center',
            padding: '16px',
          }}
        >
          <p style={{ margin: '0 0 10px', color: '#1e40af', fontWeight: 'bold' }}>
            Enable Live Audio Translation
          </p>
          <button
            onClick={handleUnlockAudio}
            style={{
              padding: '10px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
            }}
          >
            🔊 Tap to Enable Live Audio
          </button>
        </section>
      )}

      {/* Language Selector & Autoplay Toggle Card */}
      <section style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <label style={{ fontWeight: 'bold', fontSize: '15px' }}>
            🌐 Listening Language:
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = lang.code === selectedLang;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleLanguageChange(lang.code)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: active ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#eff6ff' : '#ffffff',
                    color: active ? '#1d4ed8' : '#475569',
                    fontWeight: active ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.15s ease-in-out',
                  }}
                >
                  {lang.label} ({lang.code})
                </button>
              );
            })}
          </div>
        </div>

        {/* Autoplay Toggle Switch */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid #f1f5f9',
            paddingTop: '12px',
          }}
        >
          <label
            htmlFor="autoplay-toggle"
            style={{
              fontWeight: 'bold',
              fontSize: '14px',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>▶️</span> Autoplay Live Speech
          </label>
          <input
            id="autoplay-toggle"
            type="checkbox"
            checked={isAutoplay}
            onChange={handleAutoplayToggle}
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer',
              accentColor: '#2563eb',
            }}
          />
        </div>
      </section>

      <section style={cardStyle}>
        <p style={{ margin: '0 0 8px' }}>
          <strong>Room:</strong> {roomId}
        </p>

        <p style={{ margin: 0 }}>
          <strong>Status:</strong>{' '}
          <span style={{ color: isConnected ? '#15803d' : '#b45309' }}>
            {status}
          </span>
        </p>
      </section>

      {error && (
        <section
          role="alert"
          style={{
            ...cardStyle,
            backgroundColor: '#fef2f2',
            borderColor: '#fecaca',
            color: '#b91c1c',
          }}
        >
          <strong>Connection issue</strong>
          <p style={{ marginBottom: 0 }}>{error}</p>
        </section>
      )}

      <section style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#64748b' }}>
          ORIGINAL SPEECH
        </h2>
        <p style={{ fontSize: '20px', lineHeight: 1.6, overflowWrap: 'anywhere' }}>
          {originalText || 'Waiting for the speaker...'}
        </p>
      </section>

      <section style={cardStyle}>
        <h2 style={{ fontSize: '16px', color: '#64748b' }}>
          {currentLangLabel.toUpperCase()} TRANSLATION
        </h2>
        <p style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1.5 }}>
          {translatedText || `Your ${currentLangLabel} translation will appear here.`}
        </p>
      </section>

      {price && (
        <section
          style={{
            ...cardStyle,
            backgroundColor: '#ecfdf5',
            border: '2px solid #86efac',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 8px', color: '#166534' }}>
            IMPORTANT NUMBER / PRICE
          </p>
          <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>
            {price}
          </p>
        </section>
      )}

      {/* Replay / Manual Play Action Button */}
      <button
        onClick={replayTranslation}
        disabled={!translatedText || isUnclear}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '18px',
          fontWeight: 'bold',
          backgroundColor: translatedText && !isUnclear ? '#2563eb' : '#94a3b8',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          cursor: translatedText && !isUnclear ? 'pointer' : 'not-allowed',
          marginBottom: '16px',
          transition: 'background-color 0.15s ease-in-out',
        }}
      >
        🔁 Replay {currentLangLabel} Translation
      </button>

      {isUnclear && (
        <section
          role="alert"
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '16px',
          }}
        >
          <p style={{ margin: 0, color: '#9a3412', fontWeight: 'bold' }}>
            ⚠️ Unclear audio
          </p>
          <p style={{ marginBottom: 0, color: '#9a3412' }}>
            Please ask the speaker to repeat. The translation may be inaccurate.
          </p>
        </section>
      )}

      <p
        style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#64748b',
          marginTop: '24px',
        }}
      >
        EchoBridge · Listener Interface · Live Mode
      </p>
    </main>
  );
}

export default ListenerPage;
