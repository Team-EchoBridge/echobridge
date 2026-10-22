import React, { useEffect, useState, useCallback } from 'react';
import { joinRoom, onCaption, onRoomClosed } from '../shared/socket.js';

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', defaultVoiceLang: 'en-IN', voiceMatch: ['en-IN', 'en-US', 'en-GB', 'en'] },
  { code: 'hi', label: 'Hindi', defaultVoiceLang: 'hi-IN', voiceMatch: ['hi-IN', 'hi'] },
  { code: 'mr', label: 'Marathi', defaultVoiceLang: 'mr-IN', voiceMatch: ['mr-IN', 'mr'] },
  { code: 'es', label: 'Spanish', defaultVoiceLang: 'es-ES', voiceMatch: ['es-ES', 'es-US', 'es-MX', 'es'] }
];

const STORAGE_KEY = 'echobridge_listener_lang';

export function ListenerPage({ roomId }) {
  const [selectedLang, setSelectedLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LANGUAGES.some((lang) => lang.code === saved)) {
        return saved;
      }
    } catch {
      // LocalStorage access may fail in private mode
    }
    return 'en';
  });

  const [originalText, setOriginalText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [price, setPrice] = useState('');
  const [isUnclear, setIsUnclear] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [error, setError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [voices, setVoices] = useState([]);

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

  // Save selected language to localStorage
  const handleLanguageChange = (langCode) => {
    setSelectedLang(langCode);
    try {
      localStorage.setItem(STORAGE_KEY, langCode);
    } catch {
      // Ignore localStorage write failures
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
    });

    const unsubscribeClosed = onRoomClosed(({ reason }) => {
      if (!active) return;
      setIsConnected(false);
      setStatus('Session ended');
      setError(reason || 'The speaker has ended the session.');
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
      if (unsubscribeClosed) unsubscribeClosed();
    };
  }, [roomId, selectedLang]);

  const getBestVoice = useCallback((langCode) => {
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
    if (!langConfig || !voices.length) return null;

    for (const matchPrefix of langConfig.voiceMatch) {
      const exact = voices.find((v) => v.lang.toLowerCase() === matchPrefix.toLowerCase());
      if (exact) return exact;
    }

    for (const matchPrefix of langConfig.voiceMatch) {
      const startsWith = voices.find((v) =>
        v.lang.toLowerCase().startsWith(matchPrefix.toLowerCase())
      );
      if (startsWith) return startsWith;
    }

    // Fallback: match by 2-letter language prefix
    return voices.find((v) => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) || null;
  }, [voices]);

  const playTranslation = () => {
    if (!translatedText) return;

    if (!('speechSynthesis' in window)) {
      setError('Audio playback is not supported by this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(translatedText);
    const chosenVoice = getBestVoice(selectedLang);

    if (chosenVoice) {
      speech.voice = chosenVoice;
      speech.lang = chosenVoice.lang;
    } else {
      const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang);
      speech.lang = langConfig?.defaultVoiceLang || 'en-IN';
    }

    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  };

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '700px',
        margin: '0 auto',
        padding: '24px 16px',
        color: '#0f172a',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.02em' }}>
          EchoBridge
        </h1>
        <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Live Tour Translation</p>
      </header>

      {/* Language Picker Header */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '16px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <label
          htmlFor="lang-select"
          style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}
        >
          SELECT YOUR LANGUAGE
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              style={{
                flex: '1 1 auto',
                padding: '10px 14px',
                borderRadius: '10px',
                border: selectedLang === lang.code ? '2px solid #2563eb' : '1px solid #cbd5e1',
                backgroundColor: selectedLang === lang.code ? '#eff6ff' : '#ffffff',
                color: selectedLang === lang.code ? '#1d4ed8' : '#334155',
                fontWeight: selectedLang === lang.code ? '700' : '500',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.15s ease',
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </section>

      {/* Room Information & Live Connection Status */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '16px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Room Code
          </span>
          <div style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{roomId}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '600',
              padding: '4px 10px',
              borderRadius: '9999px',
              backgroundColor: isConnected ? '#dcfce7' : '#fee2e2',
              color: isConnected ? '#15803d' : '#b91c1c',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#16a34a' : '#dc2626',
              }}
            />
            {status}
          </span>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {error}
        </div>
      )}

      {/* Original Speech */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>
          ORIGINAL SPEECH
        </h2>
        <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.5, color: originalText ? '#1e293b' : '#94a3b8' }}>
          {originalText || 'Waiting for the speaker...'}
        </p>
      </section>

      {/* Target Language Translation */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '700', color: '#64748b', letterSpacing: '0.05em' }}>
          TRANSLATION ({SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label.toUpperCase()})
        </h2>
        <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', lineHeight: 1.4, color: translatedText ? '#0f172a' : '#94a3b8' }}>
          {translatedText || 'Translation will appear here...'}
        </p>
      </section>

      {/* Highlighted Number / Price Card */}
      {price && (
        <section
          style={{
            backgroundColor: '#f0fdf4',
            padding: '16px 20px',
            borderRadius: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            border: '2px solid #86efac',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: '800', color: '#166534', letterSpacing: '0.05em' }}>
            KEY NUMBER / PRICE
          </span>
          <div style={{ fontSize: '32px', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>{price}</div>
        </section>
      )}

      {/* Play Audio Button */}
      <button
        type="button"
        onClick={playTranslation}
        disabled={!translatedText}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '17px',
          fontWeight: '700',
          backgroundColor: translatedText ? '#2563eb' : '#94a3b8',
          color: '#ffffff',
          border: 'none',
          borderRadius: '14px',
          cursor: translatedText ? 'pointer' : 'not-allowed',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: translatedText ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
          transition: 'all 0.15s ease',
        }}
      >
        🔊 Listen in {SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang)?.label}
      </button>

      {/* Unclear Audio Warning Banner */}
      {isUnclear && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fff7ed',
            border: '1px solid #fdba74',
            padding: '14px 16px',
            borderRadius: '12px',
            marginBottom: '16px',
            color: '#9a3412',
          }}
        >
          <div style={{ fontWeight: '700', fontSize: '15px', marginBottom: '2px' }}>⚠️ Unclear Audio</div>
          <div style={{ fontSize: '13px' }}>
            The speech was noisy or incomplete. Please ask the speaker to repeat.
          </div>
        </div>
      )}

      <footer style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '32px' }}>
        EchoBridge · Multi-Language Live Listener
      </footer>
    </div>
  );
}

export default ListenerPage;
