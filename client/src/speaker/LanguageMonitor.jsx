import React from 'react';

/**
 * Known language metadata mapping code to label and flag.
 */
const LANGUAGE_META = {
  en: { label: 'English', flag: '🇬🇧' },
  hi: { label: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
  mr: { label: 'Marathi', flag: '🇮🇳', native: 'मराठी' },
  es: { label: 'Spanish', flag: '🇪🇸' },
  fr: { label: 'French', flag: '🇫🇷' },
  de: { label: 'German', flag: '🇩🇪' },
  ja: { label: 'Japanese', flag: '🇯🇵' },
};

/**
 * Target Language Monitor component for EchoBridge Speaker.
 * Displays active listener languages in the room with clear counts:
 * e.g. "English: 3 listeners | Hindi: 1 listener"
 *
 * @param {Object} props
 * @param {Record<string, number>} props.languages - Breakdown of language code to listener count
 * @param {number} props.totalListeners - Total listener count
 */
export function LanguageMonitor({ languages = {}, totalListeners = 0 }) {
  const entries = Object.entries(languages || {}).filter(([, count]) => count > 0);

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <div style={titleWrapStyle}>
          <span style={indicatorDotStyle(entries.length > 0)} />
          <span style={titleStyle}>Target Language Monitor</span>
        </div>
        <span style={summaryCountStyle}>
          {totalListeners} {totalListeners === 1 ? 'listener' : 'listeners'} total
        </span>
      </div>

      {entries.length === 0 ? (
        <div style={emptyBoxStyle}>
          <span style={emptyIconStyle}>🎧</span>
          <span style={emptyTextStyle}>
            No listeners joined yet. Share the QR code or link to see active languages.
          </span>
        </div>
      ) : (
        <div style={pillsGridStyle}>
          {entries.map(([code, count]) => {
            const meta = LANGUAGE_META[code.toLowerCase()] || {
              label: code.toUpperCase(),
              flag: '🌐',
            };

            return (
              <div key={code} style={langCardStyle}>
                <div style={langInfoLeftStyle}>
                  <span style={flagStyle}>{meta.flag}</span>
                  <div>
                    <strong style={langNameStyle}>{meta.label}</strong>
                    {meta.native && <span style={nativeStyle}>({meta.native})</span>}
                  </div>
                </div>
                <div style={countBadgeStyle}>
                  <strong style={countNumberStyle}>{count}</strong>
                  <span style={countLabelStyle}>{count === 1 ? 'listener' : 'listeners'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  background: '#0b1120',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleWrapStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const indicatorDotStyle = (hasActive) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: hasActive ? '#10b981' : '#64748b',
  boxShadow: hasActive ? '0 0 8px #10b981' : 'none',
});

const titleStyle = {
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#cbd5e1',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const summaryCountStyle = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  fontFamily: 'monospace',
};

const emptyBoxStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '0.75rem 1rem',
  background: '#0f172a',
  border: '1px dashed #334155',
  borderRadius: '8px',
  color: '#64748b',
  fontSize: '0.85rem',
};

const emptyIconStyle = {
  fontSize: '1.1rem',
};

const emptyTextStyle = {
  lineHeight: 1.4,
};

const pillsGridStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
};

const langCardStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  background: '#0f172a',
  border: '1px solid #334155',
  padding: '0.5rem 0.85rem',
  borderRadius: '8px',
  flex: '1 1 calc(50% - 8px)',
  minWidth: '180px',
};

const langInfoLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const flagStyle = {
  fontSize: '1.2rem',
};

const langNameStyle = {
  fontSize: '0.9rem',
  color: '#f8fafc',
};

const nativeStyle = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  marginLeft: '4px',
};

const countBadgeStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
  background: '#0369a122',
  border: '1px solid #0284c744',
  padding: '0.2rem 0.5rem',
  borderRadius: '6px',
};

const countNumberStyle = {
  fontSize: '0.95rem',
  color: '#38bdf8',
  fontFamily: 'monospace',
};

const countLabelStyle = {
  fontSize: '0.7rem',
  color: '#94a3b8',
};

