import { useState, useRef, useEffect, useCallback } from 'react';
import { encodeSentenceAudio } from './audioEncoder.js';

/**
 * Hook to manage microphone access, recording state, audio level metering,
 * sentence slicing based on silence detection, and 16 kHz 16-bit PCM encoding.
 *
 * Slicing Rules:
 * - Speech threshold: normalized RMS > silenceThreshold (default 0.05).
 * - Silence cut: triggers after ~0.5s of continuous silence following valid speech.
 * - Max speech duration: forced cut after 6.0s of continuous speech.
 * - Noise burst filter: speech shorter than minSpeechDuration (0.25s) is discarded.
 *
 * Encoding:
 * - Output format: 16 kHz, mono, 16-bit signed little-endian PCM ArrayBuffer.
 * - Calls onSentenceCut with { audio, byteLength, durationSec, cutReason } when a sentence is finalized.
 *
 * @param {Object} options
 * @param {number} [options.fftSize=256] - FFT size for AnalyserNode.
 * @param {number} [options.smoothingTimeConstant=0.8] - Smoothing constant (0 to 1).
 * @param {number} [options.silenceThreshold=0.05] - RMS threshold below which audio is considered silence.
 * @param {number} [options.silenceDurationMs=500] - Duration of silence (ms) to trigger a sentence cut (~0.5s).
 * @param {number} [options.maxDurationMs=6000] - Forced cut duration (ms) for continuous speech (6s).
 * @param {number} [options.minSpeechDurationMs=250] - Minimum speech duration (ms) to ignore short noise bursts.
 * @param {Function} [options.onSentenceCut] - Callback invoked on cut: ({ audio, byteLength, durationSec, cutReason }).
 */
export function useAudioRecorder({
  fftSize = 256,
  smoothingTimeConstant = 0.8,
  silenceThreshold = 0.05,
  silenceDurationMs = 500,
  maxDurationMs = 6000,
  minSpeechDurationMs = 250,
  onSentenceCut = null,
} = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 to 1.0 (normalized volume)
  const [sentencesCutCount, setSentencesCutCount] = useState(0);
  const [lastEncodedInfo, setLastEncodedInfo] = useState(null); // { byteLength, durationSec }
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const dataArrayRef = useRef(null);
  const scriptProcessorRef = useRef(null);

  // Audio sample buffer for current sentence
  const audioChunksRef = useRef([]);

  // VAD / sentence slicing tracking refs
  const speechStateRef = useRef({
    isSpeaking: false,
    speechStartTime: 0,
    silenceStartTime: 0,
  });

  const onSentenceCutRef = useRef(onSentenceCut);
  useEffect(() => {
    onSentenceCutRef.current = onSentenceCut;
  }, [onSentenceCut]);

  const triggerCut = useCallback((reason) => {
    const state = speechStateRef.current;
    const now = Date.now();
    const durationMs = state.speechStartTime ? now - state.speechStartTime : 0;

    // Grab accumulated audio chunks
    const chunksToEncode = [...audioChunksRef.current];
    audioChunksRef.current = [];

    const inputSampleRate = audioContextRef.current ? audioContextRef.current.sampleRate : 44100;
    const encoded = encodeSentenceAudio(chunksToEncode, inputSampleRate);

    console.log(
      `[Encoded Sentence Cut] Reason: ${reason} | Duration: ${encoded.durationSec}s | Bytes: ${encoded.byteLength} B (~${(encoded.byteLength / 1024).toFixed(1)} KB) | Format: 16kHz mono 16-bit PCM`
    );

    setSentencesCutCount((prev) => prev + 1);
    setLastEncodedInfo({
      byteLength: encoded.byteLength,
      durationSec: encoded.durationSec,
    });

    if (onSentenceCutRef.current) {
      onSentenceCutRef.current({
        audio: encoded.audio,
        byteLength: encoded.byteLength,
        durationSec: encoded.durationSec,
        durationMs,
        cutReason: reason,
      });
    }

    // Reset speech state for the next sentence
    state.isSpeaking = false;
    state.speechStartTime = 0;
    state.silenceStartTime = 0;
  }, []);

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
    dataArrayRef.current = null;
    audioChunksRef.current = [];

    speechStateRef.current = {
      isSpeaking: false,
      speechStartTime: 0,
      silenceStartTime: 0,
    };

    setAudioLevel(0);
  }, []);

  const processAudioLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = dataArrayRef.current;

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Compute Root Mean Square (RMS) of audio samples normalized to 0.0 - 1.0
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Boosted level for the visual UI level meter
      const boostedLevel = Math.min(1, rms * 3.5);
      setAudioLevel(boostedLevel);

      // VAD & Slicing logic
      const now = Date.now();
      const state = speechStateRef.current;
      const isAudible = rms >= silenceThreshold;

      if (isAudible) {
        if (!state.isSpeaking) {
          state.isSpeaking = true;
          state.speechStartTime = now;
          state.silenceStartTime = 0;
        } else {
          state.silenceStartTime = 0;

          // Forced cut after maxDurationMs (6 seconds) of continuous speech
          if (now - state.speechStartTime >= maxDurationMs) {
            triggerCut('max-duration-6s');
          }
        }
      } else {
        if (state.isSpeaking) {
          if (!state.silenceStartTime) {
            state.silenceStartTime = now;
          } else if (now - state.silenceStartTime >= silenceDurationMs) {
            const speechDuration = state.silenceStartTime - state.speechStartTime;
            if (speechDuration >= minSpeechDurationMs) {
              triggerCut('silence-0.5s');
            } else {
              console.log(`[Noise Burst Ignored] Duration: ${speechDuration}ms < ${minSpeechDurationMs}ms`);
              state.isSpeaking = false;
              state.speechStartTime = 0;
              state.silenceStartTime = 0;
              audioChunksRef.current = [];
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [maxDurationMs, minSpeechDurationMs, silenceDurationMs, silenceThreshold, triggerCut]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      cleanupAudio();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      setMicPermission('granted');

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);

      // 1. Analyser for volume metering and silence/VAD detection
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;
      source.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.fftSize);

      // 2. Buffer PCM audio samples for encoding
      const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        if (speechStateRef.current.isSpeaking) {
          audioChunksRef.current.push(new Float32Array(inputData));
        }
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(audioCtx.destination);
      scriptProcessorRef.current = scriptProcessor;

      speechStateRef.current = {
        isSpeaking: false,
        speechStartTime: 0,
        silenceStartTime: 0,
      };
      audioChunksRef.current = [];

      processAudioLoop();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermission('denied');
        setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setError(`Microphone error: ${err.message || 'Unable to access microphone'}`);
      }
      setIsRecording(false);
      cleanupAudio();
    }
  }, [cleanupAudio, fftSize, processAudioLoop, smoothingTimeConstant]);

  const stopRecording = useCallback(() => {
    const state = speechStateRef.current;
    if (state.isSpeaking && state.speechStartTime) {
      const speechDuration = Date.now() - state.speechStartTime;
      if (speechDuration >= minSpeechDurationMs) {
        triggerCut('manual-stop');
      }
    }
    cleanupAudio();
    setIsRecording(false);
  }, [cleanupAudio, minSpeechDurationMs, triggerCut]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isRecording,
    micPermission,
    audioLevel,
    sentencesCutCount,
    lastEncodedInfo,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    audioContextRef,
    streamRef,
    analyserRef,
  };
}
