import React, { useEffect, useState } from 'react';
import { joinRoom, onCaption, onRoomClosed } from '../shared/socket.js';

export function ListenerPage({ roomId }) {
const [originalText, setOriginalText] = useState('');
const [translatedText, setTranslatedText] = useState('');
const [price, setPrice] = useState('');
const [isUnclear, setIsUnclear] = useState(false);
const [status, setStatus] = useState('Connecting...');
const [error, setError] = useState('');
const [isConnected, setIsConnected] = useState(false);

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

  // Fall back to numbers found in the English caption.
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

joinRoom(roomId, 'en')
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

const unsubscribeClosed = onRoomClosed(({ reason }) => {
  if (!active) return;
  setIsConnected(false);
  setStatus('Session ended');
  setError(reason || 'The speaker has ended the session.');
});

return () => {
  active = false;
  unsubscribe();
  if (unsubscribeClosed) unsubscribeClosed();
};


}, [roomId]);

const playTranslation = () => {
if (!translatedText) return;


if (!('speechSynthesis' in window)) {
  setError('Audio playback is not supported by this browser.');
  return;
}

window.speechSynthesis.cancel();

const speech = new SpeechSynthesisUtterance(translatedText);
speech.lang = 'en-IN';
speech.rate = 0.9;

window.speechSynthesis.speak(speech);


};

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
<p style={{ color: '#64748b', margin: 0 }}>Live Tour Translation</p> </header>


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
      ENGLISH TRANSLATION
    </h2>
    <p style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1.5 }}>
      {translatedText || 'Your English translation will appear here.'}
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

  <button
    onClick={playTranslation}
    disabled={!translatedText}
    style={{
      width: '100%',
      padding: '16px',
      fontSize: '18px',
      fontWeight: 'bold',
      backgroundColor: translatedText ? '#2563eb' : '#94a3b8',
      color: '#ffffff',
      border: 'none',
      borderRadius: '12px',
      cursor: translatedText ? 'pointer' : 'not-allowed',
      marginBottom: '16px',
    }}
  >
    🔊 Play English Audio
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
