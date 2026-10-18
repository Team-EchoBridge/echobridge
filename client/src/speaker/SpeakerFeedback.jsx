import React from 'react';

/**
 * Displays the live recognized speech feedback to the speaker:
 * - Shows the recognized source sentence (srcText).
 * - Shows an optional translation preview if available from the caption event.
 * - Shows a prominent "Unclear, please repeat" banner when unclear is true.
 * - Shows sequence number and recognition latency timings.
 *
 * @param {Object} props
 * @param {Object|null} props.recognition - { seq, srcText, tgtText, unclear, timings }
 */
export function SpeakerFeedback({ recognition = null }) {
  if (!recognition) {
    return (
      <div style={emptyContainerStyle}>
        <span style={emptyIconStyle}>🎙️</span>
        <span style={emptyTextStyle}>Speak into the microphone to see live recognized speech here.</span>
      </div>
    );
  }

  const { seq, srcText, tgtText, unclear, timings } = recognition;

  // Calculate STT latency if timing timestamps are available
  const latencyMs = timings?.tSttDone && timings?.tSent
    ? timings.tSttDone - timings.tSent
    : null;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleGroupStyle}>
          <span style={dotStyle(unclear)} />
          <span style={headerTitleStyle}>Last Recognized Speech</span>
          {seq && <span style={seqBadgeStyle}>#{seq}</span>}
        </div>
        {latencyMs !== null && (
          <span style={latencyBadgeStyle}>{latencyMs}ms delay</span>
        )}
      </div>

      {unclear ? (
        <div style={unclearBannerStyle} role="alert">
          <div style={unclearIconStyle}>⚠️</div>
          <div>
            <strong style={unclearTitleStyle}>Unclear, please repeat</strong>
            <p style={unclearSubStyle}>
              The audio was noisy, too short, or not clearly understood. Nothing was broadcast to listeners.
            </p>
          </div>
        </div>
      ) : (
        <div style={contentBoxStyle}>
          <div style={textLabelStyle}>Heard in source language:</div>
          <p style={srcTextDisplay}>
            {srcText || <em style={{ color: '#64748b' }}>[Empty recognition]</em>}
          </p>

          {tgtText && (
            <div style={translationRowStyle}>
              <span style={translationLabelStyle}>English caption:</span>
              <span style={translationTextStyle}>{tgtText}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const emptyContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '1.25rem',
  background: '#0b1120',
  borderRadius: '12px',
  border: '1px dashed #334155',
  color: '#64748b',
  fontSize: '0.85rem',
};

const emptyIconStyle = {
  fontSize: '1.2rem',
};

const emptyTextStyle = {
  lineHeight: 1.4,
};

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  background: '#0b1120',
  padding: '1.25rem',
  borderRadius: '12px',
  border: '1px solid #1e293b',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const dotStyle = (isUnclear) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: isUnclear ? '#f59e0b' : '#10b981',
  boxShadow: isUnclear ? '0 0 8px #f59e0b' : '0 0 8px #10b981',
});

const headerTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: 700,
  color: '#cbd5e1',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const seqBadgeStyle = {
  fontFamily: 'monospace',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#38bdf8',
  background: '#0369a122',
  padding: '0.1rem 0.45rem',
  borderRadius: '4px',
};

const latencyBadgeStyle = {
  fontFamily: 'monospace',
  fontSize: '0.75rem',
  color: '#94a3b8',
  background: '#1e293b',
  padding: '0.2rem 0.5rem',
  borderRadius: '4px',
};

const unclearBannerStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  background: '#451a03',
  border: '1px solid #f9731688',
  borderRadius: '10px',
  padding: '1rem',
  marginTop: '4px',
};

const unclearIconStyle = {
  fontSize: '1.4rem',
  lineHeight: 1,
};

const unclearTitleStyle = {
  display: 'block',
  fontSize: '1rem',
  fontWeight: 700,
  color: '#fdba74',
  marginBottom: '4px',
};

const unclearSubStyle = {
  margin: 0,
  fontSize: '0.85rem',
  color: '#fed7aa',
  lineHeight: 1.4,
};

const contentBoxStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const textLabelStyle = {
  fontSize: '0.75rem',
  color: '#64748b',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const srcTextDisplay = {
  margin: 0,
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#f8fafc',
  lineHeight: 1.5,
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const translationRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  marginTop: '8px',
  paddingTop: '8px',
  borderTop: '1px solid #1e293b',
};

const translationLabelStyle = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  fontWeight: 600,
};

const translationTextStyle = {
  fontSize: '0.95rem',
  color: '#a78bfa',
  fontStyle: 'italic',
};

