import React, { useState } from 'react';
import { REPLAY_RECORDINGS } from './replayRecordings.js';

/**
 * Known language metadata mapping code to label and flag.
 */
const LANGUAGE_META = {
  en: { label: 'English', flag: '🇬🇧' },
  hi: { label: 'Hindi', flag: '🇮🇳' },
  mr: { label: 'Marathi', flag: '🇮🇳' },
};

/**
 * ReplayControls panel:
 * - Clear "REPLAY MODE" visual indicator / banner.
 * - Filters pre-recorded phrases by the room's current source language.
 * - Shows multi-language translation previews for English, Hindi, and Marathi.
 * - Dispatches the utterance event with `replayId` per docs/contracts.md.
 *
 * @param {Object} props
 * @param {string} props.srcLang - Current source language ('hi' | 'mr').
 * @param {boolean} props.isReplayMode - Whether replay mode is toggled on.
 * @param {Function} props.onToggleReplay - Toggles replay mode.
 * @param {Function} props.onSendReplayUtterance - Callback ({ replayId, srcLang, phraseText, audio, translations }) to emit utterance.
 * @param {number} props.seq - Last sequence number emitted.
 */
export function ReplayControls({
  srcLang,
  isReplayMode,
  onToggleReplay,
  onSendReplayUtterance,
  seq = 0,
}) {
  const [selectedReplayId, setSelectedReplayId] = useState(
    () => REPLAY_RECORDINGS.find((r) => r.lang === srcLang)?.replayId || REPLAY_RECORDINGS[0].replayId
  );
  const [isSending, setIsSending] = useState(false);

  // Filter recordings by current language
  const availablePhrases = REPLAY_RECORDINGS.filter((r) => r.lang === srcLang);
  const currentPhrase =
    availablePhrases.find((r) => r.replayId === selectedReplayId) || availablePhrases[0] || REPLAY_RECORDINGS[0];

  const handleSend = async () => {
    if (!currentPhrase || isSending) return;
    setIsSending(true);

    try {
      // Per contracts.md: If replayId is set, server returns cached output and skips NLP.
      const minimalAudioBuffer = new ArrayBuffer(0);

      await onSendReplayUtterance({
        replayId: currentPhrase.replayId,
        srcLang: currentPhrase.lang,
        phraseText: currentPhrase.text,
        audio: minimalAudioBuffer,
        translations: currentPhrase.translations || {},
      });
    } finally {
      setTimeout(() => setIsSending(false), 300);
    }
  };

  const translations = currentPhrase?.translations || {};
  const translationEntries = Object.entries(translations);

  return (
    <div style={panelStyle(isReplayMode)}>
      {/* Header and Toggle */}
      <div style={headerRowStyle}>
        <div style={titleAreaStyle}>
          <span style={modeTitleStyle}>Replay Mode</span>
          {isReplayMode && (
            <span style={juryBadgeStyle} aria-label="Replay Mode Active">
              ● REPLAY (DEMO FALLBACK)
            </span>
          )}
        </div>

        <label style={switchLabelStyle}>
          <input
            type="checkbox"
            checked={isReplayMode}
            onChange={(e) => onToggleReplay(e.target.checked)}
            style={checkboxStyle}
          />
          <span style={switchTextStyle}>
            {isReplayMode ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {isReplayMode && (
        <div style={bodyContentStyle}>
          <div style={noticeBoxStyle}>
            <strong>Jury & Evaluator Notice:</strong> Replay Mode sends pre-recorded test phrases to demonstrate the app pipeline and multi-language translations without live microphone dependency.
          </div>

          <div style={selectorGroupStyle}>
            <label htmlFor="replay-phrase-select" style={labelStyle}>
              Select Pre-recorded Phrase ({srcLang === 'hi' ? 'Hindi' : 'Marathi'}):
            </label>
            <select
              id="replay-phrase-select"
              value={currentPhrase?.replayId}
              onChange={(e) => setSelectedReplayId(e.target.value)}
              style={selectStyle}
            >
              {availablePhrases.map((phrase) => (
                <option key={phrase.replayId} value={phrase.replayId}>
                  [{phrase.replayId}] {phrase.tag} - "{phrase.text}"
                </option>
              ))}
            </select>
          </div>

          {currentPhrase && (
            <div style={phrasePreviewCardStyle}>
              <div style={previewRowStyle}>
                <span style={previewLabelStyle}>Source text ({srcLang === 'hi' ? 'Hindi' : 'Marathi'}):</span>
                <span style={srcTextPreviewStyle}>{currentPhrase.text}</span>
              </div>

              {/* Multi-language Captions Preview */}
              <div style={multiLangSectionStyle}>
                <span style={previewLabelStyle}>Multi-Language Mock Captions:</span>
                <div style={translationsListStyle}>
                  {translationEntries.map(([langCode, transText]) => {
                    const meta = LANGUAGE_META[langCode] || { label: langCode.toUpperCase(), flag: '🌐' };
                    return (
                      <div key={langCode} style={transItemStyle}>
                        <div style={transLangHeaderStyle}>
                          <span style={transFlagStyle}>{meta.flag}</span>
                          <span style={transLangNameStyle}>{meta.label}</span>
                        </div>
                        <span style={transTextStyle}>
                          {transText || <em style={{ color: '#78716c' }}>[Empty / Unclear]</em>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={actionsRowStyle}>
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              style={{
                ...sendButtonStyle,
                opacity: isSending ? 0.7 : 1,
              }}
            >
              {isSending ? 'Sending Replay...' : `▶ Send Replay Utterance (${currentPhrase?.replayId})`}
            </button>
            {seq > 0 && <span style={seqInfoStyle}>Last seq: #{seq}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const panelStyle = (isActive) => ({
  backgroundColor: isActive ? '#1c1917' : '#0f172a',
  color: '#f8fafc',
  padding: '1.25rem',
  borderRadius: '12px',
  border: `1px solid ${isActive ? '#f59e0b88' : '#1e293b'}`,
  boxShadow: isActive ? '0 0 15px rgba(245, 158, 11, 0.15)' : 'none',
  transition: 'all 0.2s ease',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  boxSizing: 'border-box',
});

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const titleAreaStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
};

const modeTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#e2e8f0',
};

const juryBadgeStyle = {
  fontSize: '0.75rem',
  fontWeight: 800,
  letterSpacing: '0.06em',
  color: '#f59e0b',
  background: '#78350f44',
  border: '1px solid #f59e0b',
  padding: '0.2rem 0.55rem',
  borderRadius: '6px',
};

const switchLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  userSelect: 'none',
};

const checkboxStyle = {
  width: '18px',
  height: '18px',
  accentColor: '#f59e0b',
  cursor: 'pointer',
};

const switchTextStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#cbd5e1',
};

const bodyContentStyle = {
  marginTop: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  animation: 'fadeIn 0.2s ease',
};

const noticeBoxStyle = {
  background: '#451a03',
  border: '1px solid #d9770666',
  color: '#fde68a',
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  fontSize: '0.8rem',
  lineHeight: 1.4,
};

const selectorGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#cbd5e1',
};

const selectStyle = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  background: '#0c0a09',
  border: '1px solid #44403c',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '0.85rem',
  outline: 'none',
  cursor: 'pointer',
};

const phrasePreviewCardStyle = {
  background: '#0c0a09',
  border: '1px solid #292524',
  padding: '0.85rem 1rem',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const previewRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
};

const previewLabelStyle = {
  fontSize: '0.7rem',
  color: '#a8a29e',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.04em',
};

const srcTextPreviewStyle = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#f8fafc',
};

const multiLangSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  paddingTop: '8px',
  borderTop: '1px solid #292524',
};

const translationsListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const transItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  background: '#1c1917',
  padding: '0.45rem 0.65rem',
  borderRadius: '6px',
  border: '1px solid #292524',
};

const transLangHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const transFlagStyle = {
  fontSize: '0.85rem',
};

const transLangNameStyle = {
  fontSize: '0.75rem',
  fontWeight: 700,
  color: '#f59e0b',
  textTransform: 'uppercase',
};

const transTextStyle = {
  fontSize: '0.85rem',
  color: '#d6d3d1',
  lineHeight: 1.4,
};

const actionsRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: '4px',
};

const sendButtonStyle = {
  padding: '0.65rem 1.25rem',
  background: '#d97706',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '0.9rem',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
};

const seqInfoStyle = {
  fontSize: '0.8rem',
  fontFamily: 'monospace',
  color: '#fbbf24',
};
