/**
 * Timings utility for EchoBridge
 * Strictly adheres to docs/contracts.md:
 * 
 * {
 *   tSent,          // speaker: when the sentence was sent
 *   tServerIn,      // server: when it arrived
 *   tSttDone,       // server: speech recognition finished
 *   tTranslateDone, // server: translation and guard finished
 *   tEmit           // server: caption sent
 * }
 */

export class TimingTracker {
  /**
   * @param {number} tSent - Timestamp from speaker when sentence was sent
   */
  constructor(tSent) {
    this.tSent = typeof tSent === 'number' && tSent > 0 ? tSent : Date.now();
    this.tServerIn = Date.now();
    this.tSttDone = 0;
    this.tTranslateDone = 0;
    this.tEmit = 0;
  }

  markSttDone() {
    this.tSttDone = Date.now();
    return this.tSttDone;
  }

  markTranslateDone() {
    this.tTranslateDone = Date.now();
    return this.tTranslateDone;
  }

  markEmit() {
    this.tEmit = Date.now();
    return this.tEmit;
  }

  toObject() {
    return {
      tSent: this.tSent,
      tServerIn: this.tServerIn,
      tSttDone: this.tSttDone,
      tTranslateDone: this.tTranslateDone,
      tEmit: this.tEmit
    };
  }
}

