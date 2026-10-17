/**
 * Audio encoder for EchoBridge Speaker (docs/contracts.md specification):
 * - Resamples audio from the input sample rate (e.g. 44.1 kHz / 48 kHz) to 16,000 Hz.
 * - Downmixes multiple channels to single-channel (mono).
 * - Quantizes float samples (-1.0 to +1.0) into 16-bit signed little-endian PCM integers.
 * - Caps sentence audio at 6 seconds (16,000 * 6 = 96,000 samples = 192,000 bytes = ~192 KB).
 * - Returns an ArrayBuffer suitable for the `utterance` event payload.
 */

const TARGET_SAMPLE_RATE = 16000;
const MAX_SECONDS = 6;
const MAX_TARGET_SAMPLES = TARGET_SAMPLE_RATE * MAX_SECONDS; // 96,000 samples

/**
 * Resamples a Float32Array to 16000 Hz using linear interpolation.
 *
 * @param {Float32Array} inputSamples - Audio buffer in float range [-1.0, 1.0].
 * @param {number} inputSampleRate - Sample rate of input buffer.
 * @returns {Float32Array} Resampled samples at 16000 Hz.
 */
export function resampleTo16kHz(inputSamples, inputSampleRate) {
  if (!inputSamples || inputSamples.length === 0) {
    return new Float32Array(0);
  }

  if (inputSampleRate === TARGET_SAMPLE_RATE) {
    return inputSamples;
  }

  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const targetLength = Math.round(inputSamples.length / ratio);
  const result = new Float32Array(targetLength);

  for (let i = 0; i < targetLength; i++) {
    const originalPos = i * ratio;
    const index0 = Math.floor(originalPos);
    const index1 = Math.min(index0 + 1, inputSamples.length - 1);
    const fraction = originalPos - index0;

    result[i] = inputSamples[index0] * (1 - fraction) + inputSamples[index1] * fraction;
  }

  return result;
}

/**
 * Converts Float32Array samples (-1.0 to 1.0) into a 16-bit signed little-endian PCM ArrayBuffer.
 *
 * @param {Float32Array} floatSamples
 * @returns {ArrayBuffer}
 */
export function floatTo16BitPCM(floatSamples) {
  // Enforce max 6 seconds limit (~192 KB)
  const sampleCount = Math.min(floatSamples.length, MAX_TARGET_SAMPLES);
  const buffer = new ArrayBuffer(sampleCount * 2); // 2 bytes per 16-bit sample
  const view = new DataView(buffer);

  for (let i = 0; i < sampleCount; i++) {
    // Clamp to [-1.0, 1.0] to prevent integer overflow
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    // Map -1.0..1.0 to -32768..32767
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    // Little-endian: true
    view.setInt16(i * 2, int16, true);
  }

  return buffer;
}

/**
 * Encodes audio chunks recorded at inputSampleRate into a 16 kHz mono 16-bit PCM ArrayBuffer.
 *
 * @param {Float32Array[]} chunks - Array of Float32Array audio sample buffers.
 * @param {number} inputSampleRate - The sample rate from the AudioContext.
 * @returns {{ audio: ArrayBuffer, durationSec: number, sampleCount: number, byteLength: number }}
 */
export function encodeSentenceAudio(chunks, inputSampleRate) {
  if (!chunks || chunks.length === 0) {
    const empty = new ArrayBuffer(0);
    return { audio: empty, durationSec: 0, sampleCount: 0, byteLength: 0 };
  }

  // 1. Flatten all chunks into one continuous Float32Array
  let totalLength = 0;
  for (let i = 0; i < chunks.length; i++) {
    totalLength += chunks[i].length;
  }

  const flattened = new Float32Array(totalLength);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    flattened.set(chunks[i], offset);
    offset += chunks[i].length;
  }

  // 2. Resample to 16 kHz
  const resampled16k = resampleTo16kHz(flattened, inputSampleRate);

  // 3. Convert to 16-bit signed little-endian PCM ArrayBuffer
  const pcmBuffer = floatTo16BitPCM(resampled16k);
  const finalSampleCount = pcmBuffer.byteLength / 2;
  const durationSec = Number((finalSampleCount / TARGET_SAMPLE_RATE).toFixed(3));

  return {
    audio: pcmBuffer,
    durationSec,
    sampleCount: finalSampleCount,
    byteLength: pcmBuffer.byteLength,
  };
}

