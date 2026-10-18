import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createRoom,
  joinRoom,
  sendUtterance,
  onRoomCount,
  onTranscript,
  onCaption,
  onUtteranceError,
} from '../shared/socket.js';
import { QRCode } from './QRCode.jsx';
import { SpeakerMicControl } from './SpeakerMicControl.jsx';
import { SpeakerFeedback } from './SpeakerFeedback.jsx';

/**
 * Top-level SpeakerPage component mountable at /speak
 * Manages:
 * 1. Source language selection (Hindi 'hi', Marathi 'mr')
 * 2. Room creation ('room:create')
 * 3. Speaker room join ('room:join')
 * 4. Network address field (editable for LAN/Wi-Fi phone access)
 * 5. Display of Join Link, QR Code, and real-time Listener Count ('room:count')
 * 6. Microphone permission, start/stop speaking, audio level meter, and sentence cutting
 * 7. Utterance emission ({ roomId, srcLang, seq, audio, tSent }) with seq starting from 1
 * 8. Error handling for 'utterance:error' from server
 * 9. Live recognized speech feedback (transcript and caption events) with "Unclear, please repeat" banner
 * 10. Developer test buttons for simulating transcript events (normal and unclear)
 */
export function SpeakerPage() {
  const [srcLang, setSrcLang] = useState('hi');
  const [roomId, setRoomId] = useState('');
  const [listenerCount, setListenerCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [utteranceError, setUtteranceError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentSeq, setCurrentSeq] = useState(0);
  const [recognition, setRecognition] = useState(null); // { seq, srcText, tgtText, unclear, timings }
  const [networkAddress, setNetworkAddress] = useState(() => {
    return typeof window !== 'undefined' ? window.location.origin : '';
  });

  // Keep seq in a ref to avoid stale closure issues during async sentence cuts
  const seqRef = useRef(0);

  // Subscribe to room:count updates
  useEffect(() => {
    const unsubscribeCount = onRoomCount(({ count }) => {
      setListenerCount(count);
    });

    return () => {
      if (unsubscribeCount) unsubscribeCount();
    };
  }, []);

  // Subscribe to utterance:error events from the server
  useEffect(() => {
    const unsubscribeError = onUtteranceError(({ seq, message }) => {
      console.warn(`[Utterance Error] Seq #${seq}: ${message}`);
      setUtteranceError(`Utterance #${seq} error: ${message}`);
      // Clear error toast after 6 seconds
      setTimeout(() => {
        setUtteranceError((prev) => (prev?.includes(`Utterance #${seq}`) ? null : prev));
      }, 6000);
    });

    return () => {
      if (unsubscribeError) unsubscribeError();
    };
  }, []);

  // Step 6: Subscribe to transcript events (sent as soon as STT finishes)
  useEffect(() => {
    const unsubscribeTranscript = onTranscript((data) => {
      console.log('[Received transcript]', data);
      setRecognition((prev) => ({
        seq: data.seq,
        srcText: data.srcText,
        unclear: Boolean(data.unclear),
        timings: data.timings,
        tgtText: prev?.seq === data.seq ? prev.tgtText : '',
      }));
    });

    return () => {
      if (unsubscribeTranscript) unsubscribeTranscript();
    };
  }, []);

  // Step 6: Subscribe to caption events (sent after translation and number guard)
  useEffect(() => {
    const unsubscribeCaption = onCaption((data) => {
      console.log('[Received caption]', data);
      setRecognition({
        seq: data.seq,
        srcText: data.srcText,
        tgtText: data.tgtText,
        unclear: Boolean(data.unclear),
        timings: data.timings,
      });
    });

    return () => {
      if (unsubscribeCaption) unsubscribeCaption();
    };
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setError(null);
    setUtteranceError(null);
    setIsCreating(true);

    try {
      // 1. Emit room:create with { srcLang }
      const res = await createRoom(srcLang);
      if (res && res.roomId) {
        setRoomId(res.roomId);
        // Reset seq for the new room (starts at 1 per room per contracts.md)
        seqRef.current = 0;
        setCurrentSeq(0);
        setRecognition(null);

        // 2. Speaker calls room:join so it receives transcript/caption events (per contracts.md)
        await joinRoom(res.roomId, 'en');
      } else {
        setError('Server returned empty room ID.');
      }
    } catch (err) {
      console.error('Room creation failed:', err);
      setError(err.message || 'Failed to create room. Please check server connection.');
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Called by useAudioRecorder when a sentence is cut and encoded to 16 kHz PCM.
   * Emits the 'utterance' event strictly conforming to docs/contracts.md:
   * payload: { roomId, srcLang, seq, audio, tSent }
   */
  const handleSentenceAudio = useCallback(({ audio, byteLength, durationSec }) => {
    if (!roomId) {
      console.warn('Utterance ignored: No active room created.');
      return;
    }

    if (!audio || byteLength === 0) {
      console.warn('Utterance ignored: Empty audio buffer.');
      return;
    }

    // Increment seq starting at 1 for this room
    seqRef.current += 1;
    const nextSeq = seqRef.current;
    setCurrentSeq(nextSeq);

    const payload = {
      roomId,
      srcLang,
      seq: nextSeq,
      audio, // ArrayBuffer 16-bit signed LE PCM, 16000 Hz, mono
      tSent: Date.now(),
    };

    console.log(
      `[Emitting Utterance] Room: ${payload.roomId} | Seq: #${payload.seq} | Lang: ${payload.srcLang} | Size: ${byteLength} B (~${(byteLength / 1024).toFixed(1)} KB) | Duration: ${durationSec}s | tSent: ${payload.tSent}`
    );

    sendUtterance(payload);
  }, [roomId, srcLang]);

  // Developer simulation triggers (Step 6 testing without server)
  const handleSimulateTranscript = (isUnclear) => {
    const fakeSeq = (recognition?.seq || currentSeq || 0) + 1;
    const now = Date.now();
    if (isUnclear) {
      setRecognition({
        seq: fakeSeq,
        srcText: '',
        tgtText: '',
        unclear: true,
        timings: { tSent: now - 900, tSttDone: now, tServerIn: now - 850 },
      });
    } else {
      const phrase = srcLang === 'mr'
        ? 'खोलीचे भाडे पाचशे रुपये आहे'
        : 'कमरा का किराया पाँच सौ रुपये है';
      const translation = 'The room rent is five hundred rupees.';
      setRecognition({
        seq: fakeSeq,
        srcText: phrase,
        tgtText: translation,
        unclear: false,
        timings: { tSent: now - 650, tSttDone: now, tServerIn: now - 600 },
      });
    }
  };

  // Strip trailing slashes from networkAddress to keep URLs clean
  const cleanBaseUrl = (networkAddress || '').replace(/\/+$/, '');
  const joinUrl = roomId && cleanBaseUrl
    ? `${cleanBaseUrl}/join/${roomId}`
    : '';

  const handleCopyLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={brandBadgeStyle}>EchoBridge</div>
        <h1 style={titleStyle}>Speaker Console</h1>
        <p style={subtitleStyle}>Broadcast live speech in Hindi or Marathi with real-time English translation for listeners.</p>
      </header>

      {error && (
        <div style={errorBannerStyle} role="alert">
          {error}
        </div>
      )}

      {utteranceError && (
        <div style={utteranceErrorBannerStyle} role="alert">
          <strong>Notice:</strong> {utteranceError}
        </div>
      )}

      {!roomId ? (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>1. Session Setup</h2>
          <form onSubmit={handleCreateRoom} style={formStyle}>
            <label style={labelStyle}>
              <span>Speaking Language:</span>
              <div style={langSelectorGroupStyle}>
                <button
                  type="button"
                  onClick={() => setSrcLang('hi')}
                  style={langOptionStyle(srcLang === 'hi')}
                >
                  <span style={langFlagStyle}>🇮🇳</span>
                  <strong>Hindi</strong>
                  <span style={langSubStyle}>हिन्दी</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSrcLang('mr')}
                  style={langOptionStyle(srcLang === 'mr')}
                >
                  <span style={langFlagStyle}>🇮🇳</span>
                  <strong>Marathi</strong>
                  <span style={langSubStyle}>मराठी</span>
                </button>
              </div>
            </label>

            <button
              type="submit"
              disabled={isCreating}
              style={{
                ...primaryButtonStyle,
                opacity: isCreating ? 0.7 : 1,
                cursor: isCreating ? 'not-allowed' : 'pointer',
              }}
            >
              {isCreating ? 'Creating Room...' : 'Create Room & Start Broadcast'}
            </button>
          </form>
        </div>
      ) : (
        <div style={activeGridStyle}>
          {/* Left Column: Room info, Network Address & QR code */}
          <div style={cardStyle}>
            <div style={roomHeaderStyle}>
              <div>
                <span style={tagStyle}>Room ID</span>
                <h2 style={roomIdDisplay}>{roomId}</h2>
              </div>
              <div style={listenerBadgeStyle}>
                <span style={listenerIconStyle}>👥</span>
                <span><strong>{listenerCount}</strong> {listenerCount === 1 ? 'Listener' : 'Listeners'}</span>
              </div>
            </div>

            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Source Language:</span>
              <span style={infoValueStyle}>{srcLang === 'hi' ? 'Hindi (हिन्दी)' : 'Marathi (मराठी)'}</span>
            </div>

            {/* Editable Network Address Field */}
            <div style={networkFieldGroupStyle}>
              <label htmlFor="network-address-input" style={networkLabelStyle}>
                Network address
              </label>
              <input
                id="network-address-input"
                type="text"
                value={networkAddress}
                onChange={(e) => setNetworkAddress(e.target.value)}
                placeholder="http://192.168.1.5:5173"
                style={networkInputStyle}
              />
              <span style={networkHintStyle}>
                Change from localhost to your LAN IP (e.g. http://10.227.218.195:5173) so phones can connect.
              </span>
            </div>

            <div style={qrSectionStyle}>
              <div style={qrWrapperStyle}>
                <QRCode text={joinUrl} size={190} />
              </div>
              <p style={qrTipStyle}>Scan with a phone camera to join as a listener</p>
            </div>

            <div style={linkBoxStyle}>
              <input
                type="text"
                readOnly
                value={joinUrl}
                style={linkInputStyle}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopyLink}
                style={copyButtonStyle}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Right Column: Audio stream controls & live feedback */}
          <div style={rightColumnStyle}>
            <div style={cardStyle}>
              <h2 style={sectionTitleStyle}>2. Live Audio Stream</h2>
              <SpeakerMicControl
                onSentenceAudio={handleSentenceAudio}
                seq={currentSeq}
              />
            </div>

            {/* Step 6: Live Recognized Speech & Unclear Banner */}
            <div style={cardStyle}>
              <div style={feedbackHeaderRow}>
                <h2 style={sectionTitleStyle}>3. Live Heard Speech</h2>
                {/* Developer simulation controls */}
                <div style={devControlsStyle}>
                  <span style={devTagStyle}>Dev Test:</span>
                  <button
                    type="button"
                    onClick={() => handleSimulateTranscript(false)}
                    style={devBtnStyle}
                    title="Simulate normal recognized transcript event"
                  >
                    Simulate Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateTranscript(true)}
                    style={{ ...devBtnStyle, borderColor: '#f59e0b88', color: '#f59e0b' }}
                    title="Simulate unclear transcript event"
                  >
                    Simulate Unclear
                  </button>
                </div>
              </div>

              <SpeakerFeedback recognition={recognition} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling definitions adhering to clean modern dark layout
const containerStyle = {
  maxWidth: '960px',
  margin: '0 auto',
  padding: '2rem 1.5rem',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: '#f8fafc',
  boxSizing: 'border-box',
};

const headerStyle = {
  marginBottom: '2rem',
};

const brandBadgeStyle = {
  display: 'inline-block',
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#38bdf8',
  background: '#0369a122',
  border: '1px solid #0284c744',
  padding: '0.2rem 0.6rem',
  borderRadius: '4px',
  marginBottom: '0.5rem',
};

const titleStyle = {
  fontSize: '2rem',
  fontWeight: 800,
  margin: '0 0 0.5rem 0',
  letterSpacing: '-0.02em',
};

const subtitleStyle = {
  fontSize: '1rem',
  color: '#94a3b8',
  margin: 0,
  lineHeight: 1.5,
};

const cardStyle = {
  background: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  padding: '1.75rem',
  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
};

const activeGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
  gap: '1.5rem',
  alignItems: 'start',
};

const rightColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const sectionTitleStyle = {
  fontSize: '1.2rem',
  fontWeight: 700,
  margin: '0 0 1.25rem 0',
  color: '#e2e8f0',
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  fontSize: '0.95rem',
  fontWeight: 600,
  color: '#cbd5e1',
};

const langSelectorGroupStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const langOptionStyle = (isSelected) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
  borderRadius: '12px',
  border: `2px solid ${isSelected ? '#38bdf8' : '#334155'}`,
  background: isSelected ? '#0369a122' : '#1e293b55',
  color: isSelected ? '#ffffff' : '#94a3b8',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  gap: '4px',
});

const langFlagStyle = {
  fontSize: '1.5rem',
  marginBottom: '2px',
};

const langSubStyle = {
  fontSize: '0.8rem',
  opacity: 0.8,
};

const primaryButtonStyle = {
  padding: '0.85rem 1.5rem',
  fontSize: '1rem',
  fontWeight: 700,
  borderRadius: '10px',
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  transition: 'background 0.15s ease',
};

const roomHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '1rem',
  paddingBottom: '1rem',
  borderBottom: '1px solid #1e293b',
};

const tagStyle = {
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: '#64748b',
  letterSpacing: '0.05em',
};

const roomIdDisplay = {
  fontSize: '1.5rem',
  fontWeight: 800,
  margin: '0.2rem 0 0 0',
  color: '#38bdf8',
  fontFamily: 'monospace',
};

const listenerBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  background: '#1e293b',
  border: '1px solid #334155',
  padding: '0.4rem 0.8rem',
  borderRadius: '9999px',
  fontSize: '0.85rem',
  color: '#e2e8f0',
};

const listenerIconStyle = {
  fontSize: '0.9rem',
};

const infoRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.9rem',
  marginBottom: '1.25rem',
};

const infoLabelStyle = {
  color: '#94a3b8',
};

const infoValueStyle = {
  fontWeight: 600,
  color: '#f1f5f9',
};

const networkFieldGroupStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  marginBottom: '1rem',
  background: '#0b1120',
  padding: '0.85rem',
  borderRadius: '10px',
  border: '1px solid #1e293b',
};

const networkLabelStyle = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#cbd5e1',
};

const networkInputStyle = {
  padding: '0.55rem 0.75rem',
  background: '#020617',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#38bdf8',
  fontSize: '0.9rem',
  fontFamily: 'monospace',
  outline: 'none',
};

const networkHintStyle = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  lineHeight: 1.3,
};

const qrSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0.75rem 0',
};

const qrWrapperStyle = {
  padding: '12px',
  background: '#ffffff',
  borderRadius: '12px',
  display: 'inline-block',
  boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
};

const qrTipStyle = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  marginTop: '0.75rem',
  textAlign: 'center',
};

const linkBoxStyle = {
  display: 'flex',
  gap: '8px',
  marginTop: '0.5rem',
};

const linkInputStyle = {
  flex: 1,
  padding: '0.6rem 0.8rem',
  background: '#020617',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontSize: '0.85rem',
  fontFamily: 'monospace',
  outline: 'none',
};

const copyButtonStyle = {
  padding: '0.6rem 1rem',
  background: '#334155',
  border: 'none',
  borderRadius: '8px',
  color: '#f8fafc',
  fontSize: '0.85rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const feedbackHeaderRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '8px',
  marginBottom: '1rem',
};

const devControlsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  marginBottom: '1.25rem',
};

const devTagStyle = {
  fontSize: '0.7rem',
  color: '#64748b',
  textTransform: 'uppercase',
  fontWeight: 700,
};

const devBtnStyle = {
  padding: '0.3rem 0.6rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  background: '#1e293b',
  color: '#38bdf8',
  border: '1px solid #0284c755',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
};

const errorBannerStyle = {
  backgroundColor: '#7f1d1d',
  color: '#fecaca',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  marginBottom: '1.5rem',
};

const utteranceErrorBannerStyle = {
  backgroundColor: '#451a03',
  color: '#fdba74',
  border: '1px solid #ea580c88',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  fontSize: '0.9rem',
  marginBottom: '1.5rem',
};
