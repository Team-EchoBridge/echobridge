/**
 * Google Cloud Speech-to-Text Integration (Member 4)
 * Source of truth: docs/contracts.md
 *
 * Rules:
 * - 6-second timeout and exactly one retry on the same provider.
 * - On a timeout or provider error after one retry, resolve with unclear: true instead of throwing.
 * - Audio: 16-bit signed little-endian PCM, 16000 Hz, mono.
 * - Language codes: 'hi' -> 'hi-IN', 'mr' -> 'mr-IN'.
 */

import 'dotenv/config';
import speech from '@google-cloud/speech';
import { getSpeechHints } from './glossary.js';

let defaultClient = null;

/**
 * Returns a cached SpeechClient instance or creates a new one.
 * Uses GOOGLE_APPLICATION_CREDENTIALS from environment.
 */
export function getSpeechClient(customClient = null) {
  if (customClient) return customClient;
  if (!defaultClient) {
    try {
      defaultClient = new speech.SpeechClient();
    } catch (err) {
      // Client creation failed (e.g. missing credentials in test environment)
      return null;
    }
  }
  return defaultClient;
}

/**
 * Runs an asynchronous operation with a timeout and exactly 1 retry.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} timeoutMs
 * @param {number} maxRetries
 * @returns {Promise<T>}
 */
export async function withTimeoutAndRetry(fn, timeoutMs = 6000, maxRetries = 1) {
  let attempt = 0;
  let lastError = null;

  while (attempt <= maxRetries) {
    let timer;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Speech recognition timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      attempt++;
      if (attempt > maxRetries) {
        throw lastError;
      }
    }
  }

  throw lastError;
}

/**
 * Recognizes speech from PCM audio buffer.
 *
 * @param {Object} params
 * @param {Buffer|ArrayBuffer|Uint8Array} params.audio - 16-bit PCM 16000Hz mono
 * @param {"hi"|"mr"} [params.srcLang="hi"] - Source language
 * @param {number} [params.timeoutMs=6000] - Timeout per attempt
 * @param {object} [params.client=null] - Optional injected SpeechClient (for testing)
 * @returns {Promise<{
 *   srcText: string,
 *   confidence: number,
 *   unclear: boolean,
 *   sttMs: number
 * }>}
 */
export async function recognizeSpeech({
  audio,
  srcLang = 'hi',
  timeoutMs = 6000,
  client = null
}) {
  const t0 = Date.now();

  if (!audio || (audio.length === 0 && audio.byteLength === 0)) {
    return {
      srcText: '',
      confidence: 0,
      unclear: true,
      sttMs: Date.now() - t0
    };
  }

  // Convert ArrayBuffer / TypedArray to Node Buffer if needed
  const audioBuffer = Buffer.isBuffer(audio)
    ? audio
    : Buffer.from(audio.buffer || audio);

  const speechClient = getSpeechClient(client);

  if (!speechClient) {
    // Graceful resolution when provider is unavailable/not yet configured
    return {
      srcText: '',
      confidence: 0,
      unclear: true,
      sttMs: Date.now() - t0
    };
  }

  const languageCode = srcLang === 'mr' ? 'mr-IN' : 'hi-IN';
  const phrases = getSpeechHints(srcLang);

  const request = {
    audio: {
      content: audioBuffer.toString('base64')
    },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode,
      speechContexts: phrases.length > 0 ? [{ phrases }] : [],
      enableAutomaticPunctuation: true
    }
  };

  try {
    const [response] = await withTimeoutAndRetry(
      () => speechClient.recognize(request),
      timeoutMs,
      1 // exactly 1 retry
    );

    const sttMs = Date.now() - t0;

    const results = response?.results || [];
    if (results.length === 0) {
      return {
        srcText: '',
        confidence: 0,
        unclear: true,
        sttMs
      };
    }

    const transcription = results
      .map(r => r.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join(' ')
      .trim();

    const confidence = results[0]?.alternatives?.[0]?.confidence ?? 0;
    const unclear = !transcription || confidence < 0.5;

    return {
      srcText: transcription,
      confidence: Number(confidence.toFixed(2)),
      unclear,
      sttMs
    };
  } catch (err) {
    // Contract requirement: on timeout or error after 1 retry, resolve with unclear: true instead of throwing
    return {
      srcText: '',
      confidence: 0,
      unclear: true,
      sttMs: Date.now() - t0
    };
  }
}

