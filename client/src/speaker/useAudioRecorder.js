import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Hook to manage microphone access, recording state, and audio level metering.
 *
 * @param {Object} options
 * @param {number} [options.fftSize=256] - FFT size for AnalyserNode.
 * @param {number} [options.smoothingTimeConstant=0.8] - Smoothing constant (0 to 1).
 */
export function useAudioRecorder({ fftSize = 256, smoothingTimeConstant = 0.8 } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [micPermission, setMicPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [audioLevel, setAudioLevel] = useState(0); // 0.0 to 1.0 (normalized volume)
  const [error, setError] = useState(null);

  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const dataArrayRef = useRef(null);

  const cleanupAudio = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
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
    setAudioLevel(0);
  }, []);

  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = dataArrayRef.current;

    const updateMeter = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Compute Root Mean Square (RMS) of audio samples normalized to 0.0 - 1.0
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        // Sample value is 0-255, center is 128
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Scale and clamp level between 0 and 1 with a slight boost for readability
      const boostedLevel = Math.min(1, rms * 3.5);
      setAudioLevel(boostedLevel);

      animFrameRef.current = requestAnimationFrame(updateMeter);
    };

    animFrameRef.current = requestAnimationFrame(updateMeter);
  }, []);

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
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = smoothingTimeConstant;

      source.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.fftSize);

      startLevelMeter();
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
  }, [cleanupAudio, fftSize, smoothingTimeConstant, startLevelMeter]);

  const stopRecording = useCallback(() => {
    cleanupAudio();
    setIsRecording(false);
  }, [cleanupAudio]);

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
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    audioContextRef,
    streamRef,
    analyserRef,
  };
}

