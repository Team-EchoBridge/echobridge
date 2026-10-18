import React from 'react';
import { useAudioRecorder } from './useAudioRecorder.js';
import { AudioLevelMeter } from './AudioLevelMeter.jsx';

/**
 * Microphone control panel for the speaker:
 * - Start / Stop recording button
 * - Live permission status feedback
 * - Visual audio level meter
 * - Sentences cut counter, utterance sequence number, and encoded PCM stats
 *
 * @param {Object} props
 * @param {Function} [props.onSentenceAudio] - Callback ({ audio, byteLength, durationSec }) invoked when audio is cut and encoded.
 * @param {number} [props.seq] - Current sequence number sent or ready.
 */
export function SpeakerMicControl({ onSentenceAudio = null, seq = 0 }) {
  const {
    isRecording,
    micPermission,
    audioLevel,
    sentencesCutCount,
    lastEncodedInfo,
    error,
    toggleRecording,
  } = useAudioRecorder({
    onSentenceCut: onSentenceAudio,
  });

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>Speaker Microphone</h3>

      {error && (
        <div style={errorBannerStyle} role="alert">
          {error}
        </div>
      )}

      {micPermission === 'denied' && (
        <p style={warningTextStyle}>
          Mic access was denied. Please grant permission in your browser address bar and retry.
        </p>
      )}

      <div style={controlRowStyle}>
        <button
          onClick={toggleRecording}
          style={{
            ...buttonStyle,
            backgroundColor: isRecording ? '#dc2626' : '#2563eb',
          }}
          aria-pressed={isRecording}
        >
          {isRecording ? '■ Stop Speaking' : '🎤 Start Speaking'}
        </button>

        <span style={statusBadgeStyle(isRecording)}>
          {isRecording ? 'LIVE' : 'IDLE'}
        </span>
      </div>

      <div style={meterContainerStyle}>
        <AudioLevelMeter level={audioLevel} isActive={isRecording} />
      </div>

      {/* Sentences cut counter & encoded stats */}
      <div style={counterBoxStyle}>
        <div style={statRowStyle}>
          <span style={counterLabelStyle}>Sentences cut:</span>
          <span style={counterValueStyle}>{sentencesCutCount}</span>
        </div>

        {seq > 0 && (
          <div style={statRowStyle}>
            <span style={counterLabelStyle}>Last sent seq:</span>
            <span style={seqValueStyle}>#{seq}</span>
          </div>
        )}

        {lastEncodedInfo && (
          <div style={encodedStatsStyle}>
            <span>Last PCM: {lastEncodedInfo.durationSec}s</span>
            <span>{(lastEncodedInfo.byteLength / 1024).toFixed(1)} KB (16 kHz mono)</span>
          </div>
        )}
      </div>
    </div>
  );
}

const panelStyle = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  padding: '1.25rem',
  borderRadius: '12px',
  border: '1px solid #1e293b',
  maxWidth: '380px',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxSizing: 'border-box',
};

const titleStyle = {
  margin: '0 0 1rem 0',
  fontSize: '1.15rem',
  fontWeight: 600,
};

const controlRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  marginBottom: '1rem',
};

const buttonStyle = {
  flex: 1,
  padding: '0.65rem 1rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
};

const statusBadgeStyle = (isActive) => ({
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.05em',
  backgroundColor: isActive ? '#dc262622' : '#33415555',
  color: isActive ? '#ef4444' : '#94a3b8',
  border: `1px solid ${isActive ? '#ef4444' : '#475569'}`,
});

const meterContainerStyle = {
  marginTop: '0.5rem',
};

const counterBoxStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginTop: '1rem',
  paddingTop: '0.75rem',
  borderTop: '1px solid #1e293b',
};

const statRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '0.85rem',
};

const counterLabelStyle = {
  color: '#94a3b8',
  fontWeight: 500,
};

const counterValueStyle = {
  fontFamily: 'monospace',
  fontSize: '1rem',
  fontWeight: 700,
  color: '#38bdf8',
  background: '#0369a122',
  padding: '0.15rem 0.6rem',
  borderRadius: '4px',
  border: '1px solid #0284c744',
};

const seqValueStyle = {
  fontFamily: 'monospace',
  fontSize: '0.9rem',
  fontWeight: 700,
  color: '#a78bfa',
  background: '#7c3aed22',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
  border: '1px solid #7c3aed44',
};

const encodedStatsStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.75rem',
  color: '#64748b',
  fontFamily: 'monospace',
};

const errorBannerStyle = {
  backgroundColor: '#7f1d1d',
  color: '#fecaca',
  padding: '0.6rem 0.75rem',
  borderRadius: '6px',
  fontSize: '0.85rem',
  marginBottom: '0.75rem',
  lineHeight: 1.4,
};

const warningTextStyle = {
  color: '#f87171',
  fontSize: '0.85rem',
  margin: '0 0 0.75rem 0',
};
