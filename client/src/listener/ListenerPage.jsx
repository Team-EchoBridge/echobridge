import React, { useState } from 'react';

/**
 * ListenerPage component (Member 2)
 * Mountable at /join/:roomId
 */
export function ListenerPage({ roomId }) {
  const [originalText, setOriginalText] = useState('एका थाळीची किंमत २५० रुपये आहे.');
  const [translatedText, setTranslatedText] = useState('One thali costs ₹250.');
  const [price, setPrice] = useState('₹250');
  const [isUnclear, setIsUnclear] = useState(false);

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '700px',
        margin: '0 auto',
        padding: '24px',
        color: '#1f2937',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ marginBottom: '6px' }}>EchoBridge</h1>
        <p style={{ color: '#64748b', margin: 0 }}>Live Tour Translation</p>
      </header>

      {/* Room information */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid #e2e8f0',
        }}
      >
        <p style={{ margin: '0 0 8px' }}>
          <strong>Room:</strong> {roomId}
        </p>
        <p style={{ margin: 0, color: '#15803d' }}>● Demo Mode</p>
      </section>

      {/* Original speech */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h2 style={{ fontSize: '16px', color: '#64748b' }}>ORIGINAL SPEECH</h2>
        <p style={{ fontSize: '20px', lineHeight: 1.6 }}>{originalText}</p>
      </section>

      {/* English translation */}
      <section
        style={{
          backgroundColor: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <h2 style={{ fontSize: '16px', color: '#64748b' }}>ENGLISH TRANSLATION</h2>
        <p style={{ fontSize: '24px', fontWeight: 'bold', lineHeight: 1.5 }}>{translatedText}</p>
      </section>

      {/* Important price */}
      <section
        style={{
          backgroundColor: '#ecfdf5',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'center',
          border: '2px solid #86efac',
        }}
      >
        <p style={{ margin: '0 0 8px', color: '#166534' }}>IMPORTANT PRICE</p>
        <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>{price}</p>
      </section>

      {/* Audio button */}
      <button
        onClick={() => {
          window.speechSynthesis.cancel();
          const speech = new SpeechSynthesisUtterance(translatedText);
          speech.lang = 'en-IN';
          speech.rate = 0.9;
          window.speechSynthesis.speak(speech);
        }}
        style={{
          width: '100%',
          padding: '16px',
          fontSize: '18px',
          fontWeight: 'bold',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        🔊 Play English Audio
      </button>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => {
            setOriginalText('एका थाळीची किंमत २५० रुपये आहे.');
            setTranslatedText('One thali costs ₹250.');
            setPrice('₹250');
          }}
          style={{ flex: 1, padding: '12px', cursor: 'pointer' }}
        >
          Example 1
        </button>

        <button
          onClick={() => {
            setOriginalText('दोन तिकिटांची किंमत पाचशे रुपये आहे.');
            setTranslatedText('Two tickets cost ₹500.');
            setPrice('₹500');
          }}
          style={{ flex: 1, padding: '12px', cursor: 'pointer' }}
        >
          Example 2
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setIsUnclear(true)}
          style={{ flex: 1, padding: '12px', cursor: 'pointer' }}
        >
          Simulate Unclear Audio
        </button>

        <button
          onClick={() => setIsUnclear(false)}
          style={{ flex: 1, padding: '12px', cursor: 'pointer' }}
        >
          Clear Warning
        </button>
      </div>

      {/* Unclear-audio warning */}
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
          <p style={{ margin: 0, color: '#9a3412', fontWeight: 'bold' }}>⚠️ Unclear audio</p>
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
        EchoBridge · Listener Interface · Demo Data
      </p>
    </div>
  );
}

export default ListenerPage;

