import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioLevelMeter } from './AudioLevelMeter.jsx';
import { resampleTo16kHz, floatTo16BitPCM, pcmToWavBlob } from './audioEncoder.js';

/**
 * Parses simple CSV content without external dependencies, handling quoted cells.
 *
 * @param {string} text
 * @returns {Array<{ text: string, language: string, expectedNumbers: string }>}
 */
function parsePhrasesCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const rows = [];
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple quote-aware CSV cell splitter
    const cells = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    cells.push(cur.trim());

    if (cells.length >= 2) {
      rows.push({
        text: cells[0].replace(/^"|"$/g, '').trim(),
        language: cells[1].trim(),
        expectedNumbers: cells[2] ? cells[2].replace(/^"|"$/g, '').trim() : '',
      });
    }
  }

  // Number the phrases sequentially by language in CSV order:
  // Hindi rows -> phrase-hi-01, phrase-hi-02...
  // Marathi rows -> phrase-mr-01, phrase-mr-02...
  let hiCount = 0;
  let mrCount = 0;

  return rows.map((row) => {
    let id = '';
    const lang = row.language.toLowerCase();
    if (lang === 'hi') {
      hiCount++;
      id = `phrase-hi-${String(hiCount).padStart(2, '0')}`;
    } else if (lang === 'mr') {
      mrCount++;
      id = `phrase-mr-${String(mrCount).padStart(2, '0')}`;
    } else {
      id = `phrase-${lang}-${String(rows.indexOf(row) + 1).padStart(2, '0')}`;
    }

    return {
      ...row,
      id,
    };
  });
}

/**
 * PhraseRecorder component for Step 8:
 * Records the 40 test phrases quickly and saves 16 kHz mono 16-bit PCM WAV clips.
 */
export function PhraseRecorder() {
  const [phrases, setPhrases] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recordedMap, setRecordedMap] = useState({}); // { [phraseId]: { wavBlob, audioUrl, durationSec } }
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micError, setMicError] = useState(null);

  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const animFrameRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioElementRef = useRef(null);

  const currentPhrase = phrases[currentIndex] || null;
  const currentRecord = currentPhrase ? recordedMap[currentPhrase.id] : null;

  // File upload reader for phrases.csv
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const parsed = parsePhrasesCSV(content);
        setPhrases(parsed);
        setCurrentIndex(0);
      }
    };
    reader.readAsText(file);
  };

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startRecording = async () => {
    setMicError(null);
    try {
      cleanupAudio();
      recordedChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false },
      });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordedChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);
      scriptProcessorRef.current = scriptProcessor;

      // Meter loop
      const dataArray = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const norm = (dataArray[i] - 128) / 128;
          sumSquares += norm * norm;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        setAudioLevel(Math.min(1, rms * 3.5));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);

      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
      setMicError(err.message || 'Could not access microphone');
      cleanupAudio();
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    const inputSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
    const rawChunks = [...recordedChunksRef.current];
    cleanupAudio();

    if (rawChunks.length === 0 || !currentPhrase) return;

    // 1. Flatten captured audio
    let totalLen = 0;
    for (const c of rawChunks) totalLen += c.length;
    const flattened = new Float32Array(totalLen);
    let offset = 0;
    for (const c of rawChunks) {
      flattened.set(c, offset);
      offset += c.length;
    }

    // 2. Resample to 16 kHz mono
    const resampled16k = resampleTo16kHz(flattened, inputSampleRate);

    // 3. Add ~0.5s silence margin before and after clip (8000 zero-samples each at 16 kHz)
    const marginSamples = 8000;
    const paddedLength = resampled16k.length + marginSamples * 2;
    const padded = new Float32Array(paddedLength);
    // Middle section contains audio; beginning and end remain 0.0 (silence)
    padded.set(resampled16k, marginSamples);

    // 4. Quantize to 16-bit PCM (allow up to 10s for full sentences with margins)
    const pcmBuffer = floatTo16BitPCM(padded, TARGET_SAMPLE_RATE * 10);

    // 5. Build WAV file
    const wavBlob = pcmToWavBlob(pcmBuffer);
    const audioUrl = URL.createObjectURL(wavBlob);
    const durationSec = Number((pcmBuffer.byteLength / (TARGET_SAMPLE_RATE * 2)).toFixed(2));

    setRecordedMap((prev) => ({
      ...prev,
      [currentPhrase.id]: {
        wavBlob,
        audioUrl,
        durationSec,
      },
    }));
  };

  const playRecordedAudio = () => {
    if (!currentRecord?.audioUrl) return;
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    const audio = new Audio(currentRecord.audioUrl);
    audioElementRef.current = audio;
    setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
    audio.play().catch(() => setIsPlaying(false));
  };

  const saveCurrentWav = () => {
    if (!currentRecord?.wavBlob || !currentPhrase) return;
    const filename = `${currentPhrase.id}.wav`;
    const link = document.createElement('a');
    link.href = currentRecord.audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const recordedCount = Object.keys(recordedMap).length;
  const TARGET_SAMPLE_RATE = 16000;

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [cleanupAudio]);

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div style={badgeStyle}>EchoBridge Tool</div>
        <h1 style={titleStyle}>Phrase Recorder (Step 8)</h1>
        <p style={subtitleStyle}>
          Record the 40 test phrases with 0.5s silence margins, 16 kHz mono 16-bit PCM WAV export.
        </p>
      </header>

      {micError && <div style={errorStyle}>{micError}</div>}

      {/* CSV File Picker */}
      {phrases.length === 0 ? (
        <div style={cardStyle}>
          <h2 style={sectionTitleStyle}>Load Test Phrases</h2>
          <p style={descStyle}>
            Select <code>docs/testdata/phrases.csv</code> from the project to begin recording:
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={fileInputStyle}
          />
        </div>
      ) : (
        <div style={activeLayout}>
          {/* Progress Banner */}
          <div style={progressBannerStyle}>
            <div style={progressTextStyle}>
              <strong>{recordedCount} / {phrases.length} recorded</strong>
              <span style={progressPctStyle}>
                ({Math.round((recordedCount / phrases.length) * 100)}%)
              </span>
            </div>
            <div style={progressBarContainerStyle}>
              <div
                style={{
                  ...progressBarFillStyle,
                  width: `${(recordedCount / phrases.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Main Phrase Card */}
          <div style={cardStyle}>
            <div style={phraseHeaderStyle}>
              <div style={idBadgeStyle}>{currentPhrase.id}</div>
              <div style={langBadgeStyle(currentPhrase.language)}>
                {currentPhrase.language.toUpperCase() === 'HI' ? '🇮🇳 Hindi (हिन्दी)' : '🇮🇳 Marathi (मराठी)'}
              </div>
              <div style={indexTagStyle}>
                Phrase {currentIndex + 1} of {phrases.length}
              </div>
            </div>

            {/* Target text displayed large */}
            <div style={phraseTextContainerStyle}>
              <h2 style={phraseTextStyle}>"{currentPhrase.text}"</h2>
            </div>

            {/* Expected Numbers */}
            <div style={metaRowStyle}>
              <span style={metaLabelStyle}>Expected Numbers:</span>
              <span style={metaValueStyle}>
                {currentPhrase.expectedNumbers ? (
                  <strong style={numberTagStyle}>{currentPhrase.expectedNumbers}</strong>
                ) : (
                  <em style={{ color: '#64748b' }}>None</em>
                )}
              </span>
            </div>

            {/* Mic Level Meter while recording */}
            <div style={meterWrapStyle}>
              <AudioLevelMeter level={audioLevel} isActive={isRecording} />
            </div>

            {/* Status of current phrase clip */}
            {currentRecord && (
              <div style={clipStatusStyle}>
                <span>✅ Recorded: {currentRecord.durationSec}s WAV (16 kHz mono)</span>
                <span>Ready to download as <code>{currentPhrase.id}.wav</code></span>
              </div>
            )}

            {/* Recording Controls */}
            <div style={buttonGridStyle}>
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  style={recordBtnStyle}
                >
                  🎤 {currentRecord ? 'Re-record' : 'Record'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  style={stopBtnStyle}
                >
                  ■ Stop Recording
                </button>
              )}

              <button
                type="button"
                onClick={playRecordedAudio}
                disabled={!currentRecord || isRecording || isPlaying}
                style={{
                  ...controlBtnStyle,
                  opacity: currentRecord && !isRecording ? 1 : 0.5,
                }}
              >
                {isPlaying ? '🔊 Playing...' : '▶ Play back'}
              </button>

              <button
                type="button"
                onClick={saveCurrentWav}
                disabled={!currentRecord || isRecording}
                style={{
                  ...saveBtnStyle,
                  opacity: currentRecord && !isRecording ? 1 : 0.5,
                }}
              >
                💾 Save {currentPhrase.id}.wav
              </button>
            </div>

            {/* Navigation buttons */}
            <div style={navRowStyle}>
              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0 || isRecording}
                style={navBtnStyle}
              >
                ← Previous
              </button>

              <div style={quickJumpWrapStyle}>
                <select
                  value={currentIndex}
                  onChange={(e) => setCurrentIndex(Number(e.target.value))}
                  style={selectJumpStyle}
                >
                  {phrases.map((p, idx) => (
                    <option key={p.id} value={idx}>
                      {recordedMap[p.id] ? '✓ ' : '○ '}
                      {p.id}: {p.text.slice(0, 24)}...
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setCurrentIndex((prev) => Math.min(phrases.length - 1, prev + 1))}
                disabled={currentIndex === phrases.length - 1 || isRecording}
                style={navBtnStyle}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  maxWidth: '820px',
  margin: '0 auto',
  padding: '2rem 1.5rem',
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: '#f8fafc',
  boxSizing: 'border-box',
};

const headerStyle = {
  marginBottom: '1.5rem',
};

const badgeStyle = {
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

const sectionTitleStyle = {
  fontSize: '1.25rem',
  fontWeight: 700,
  margin: '0 0 0.75rem 0',
  color: '#f1f5f9',
};

const descStyle = {
  fontSize: '0.95rem',
  color: '#94a3b8',
  lineHeight: 1.5,
  marginBottom: '1.25rem',
};

const fileInputStyle = {
  padding: '0.75rem',
  background: '#020617',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#cbd5e1',
  cursor: 'pointer',
  width: '100%',
  boxSizing: 'border-box',
};

const activeLayout = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.5rem',
};

const progressBannerStyle = {
  background: '#0b1120',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const progressTextStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.95rem',
  color: '#e2e8f0',
};

const progressPctStyle = {
  color: '#38bdf8',
  fontFamily: 'monospace',
};

const progressBarContainerStyle = {
  width: '100%',
  height: '8px',
  background: '#1e293b',
  borderRadius: '9999px',
  overflow: 'hidden',
};

const progressBarFillStyle = {
  height: '100%',
  background: '#38bdf8',
  transition: 'width 0.2s ease',
};

const phraseHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap',
  marginBottom: '1.25rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid #1e293b',
};

const idBadgeStyle = {
  fontSize: '0.9rem',
  fontWeight: 800,
  fontFamily: 'monospace',
  color: '#38bdf8',
  background: '#0369a122',
  border: '1px solid #0284c744',
  padding: '0.2rem 0.6rem',
  borderRadius: '6px',
};

const langBadgeStyle = (lang) => ({
  fontSize: '0.8rem',
  fontWeight: 700,
  color: lang.toLowerCase() === 'hi' ? '#fbbf24' : '#34d399',
  background: lang.toLowerCase() === 'hi' ? '#78350f33' : '#064e3b33',
  border: `1px solid ${lang.toLowerCase() === 'hi' ? '#b4530966' : '#05966966'}`,
  padding: '0.2rem 0.6rem',
  borderRadius: '6px',
});

const indexTagStyle = {
  marginLeft: 'auto',
  fontSize: '0.85rem',
  color: '#94a3b8',
};

const phraseTextContainerStyle = {
  background: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '12px',
  padding: '1.5rem',
  marginBottom: '1.25rem',
  textAlign: 'center',
};

const phraseTextStyle = {
  margin: 0,
  fontSize: '1.75rem',
  fontWeight: 700,
  lineHeight: 1.5,
  color: '#f8fafc',
};

const metaRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '0.9rem',
  marginBottom: '1rem',
};

const metaLabelStyle = {
  color: '#94a3b8',
};

const metaValueStyle = {
  color: '#f1f5f9',
};

const numberTagStyle = {
  fontFamily: 'monospace',
  color: '#fbbf24',
  background: '#78350f44',
  padding: '0.15rem 0.5rem',
  borderRadius: '4px',
};

const meterWrapStyle = {
  marginBottom: '1.25rem',
};

const clipStatusStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.85rem',
  color: '#4ade80',
  background: '#052e16',
  border: '1px solid #166534',
  padding: '0.6rem 0.85rem',
  borderRadius: '8px',
  marginBottom: '1.25rem',
};

const buttonGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '10px',
  marginBottom: '1.5rem',
};

const recordBtnStyle = {
  padding: '0.75rem 1rem',
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const stopBtnStyle = {
  padding: '0.75rem 1rem',
  background: '#dc2626',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const controlBtnStyle = {
  padding: '0.75rem 1rem',
  background: '#334155',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const saveBtnStyle = {
  padding: '0.75rem 1rem',
  background: '#16a34a',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: 'pointer',
};

const navRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingTop: '1rem',
  borderTop: '1px solid #1e293b',
  gap: '10px',
};

const navBtnStyle = {
  padding: '0.55rem 1rem',
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.85rem',
  fontWeight: 600,
};

const quickJumpWrapStyle = {
  flex: 1,
  maxWidth: '280px',
};

const selectJumpStyle = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  background: '#020617',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontSize: '0.85rem',
};

const errorStyle = {
  background: '#7f1d1d',
  color: '#fecaca',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  marginBottom: '1rem',
  fontSize: '0.9rem',
};

