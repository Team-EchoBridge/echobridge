/**
 * Latency Benchmark Script
 * Tests the utterance pipeline and prints a detailed latency timing table
 * Run with: node server/scripts/latency.js
 */

import { io } from 'socket.io-client';

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

const samplePhrases = [
  { seq: 1, text: 'कमरा का किराया पाँच सौ रुपये है', replayId: 'phrase-01' },
  { seq: 2, text: 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे', replayId: 'phrase-02' },
  { seq: 3, text: 'नाश्ता सुबह आठ बजे शुरू होता है', replayId: 'phrase-03' },
  { seq: 4, text: 'Unclear noise test', replayId: 'phrase-unclear' },
  { seq: 5, text: 'Discrepancy test', replayId: 'phrase-mismatch' }
];

async function runBenchmark() {
  console.log(`Connecting to ${SERVER_URL}...`);
  const speakerSocket = io(SERVER_URL);
  const listenerSocket = io(SERVER_URL);

  await new Promise((res) => speakerSocket.on('connect', res));
  await new Promise((res) => listenerSocket.on('connect', res));

  // 1. Create Room
  const { roomId } = await new Promise((res) => {
    speakerSocket.emit('room:create', { srcLang: 'hi' }, res);
  });
  console.log(`Created room: ${roomId}`);

  // 2. Speaker and Listener join
  await new Promise((res) => speakerSocket.emit('room:join', { roomId, tgtLang: 'hi' }, res));
  await new Promise((res) => listenerSocket.emit('room:join', { roomId, tgtLang: 'en' }, res));

  console.log(`Starting benchmark for ${samplePhrases.length} phrases...\n`);

  const results = [];

  for (const item of samplePhrases) {
    const tSent = Date.now();

    const resultPromise = new Promise((resolve) => {
      let gotTranscript = null;
      let gotCaption = null;

      const onTrans = (data) => {
        if (data.seq === item.seq) {
          gotTranscript = data;
          check();
        }
      };

      const onCap = (data) => {
        if (data.seq === item.seq) {
          gotCaption = data;
          check();
        }
      };

      function check() {
        if (gotTranscript && gotCaption) {
          listenerSocket.off('transcript', onTrans);
          listenerSocket.off('caption', onCap);
          const tClientReceived = Date.now();
          resolve({
            seq: item.seq,
            text: gotCaption.srcText || '(unclear)',
            tgtText: gotCaption.tgtText || '(none)',
            numbers: gotCaption.numbers.map((n) => `${n.value} (${n.verified ? '✓' : '✗'})`).join(', ') || 'none',
            tSent,
            tServerIn: gotCaption.timings.tServerIn,
            tSttDone: gotCaption.timings.tSttDone,
            tTranslateDone: gotCaption.timings.tTranslateDone,
            tEmit: gotCaption.timings.tEmit,
            tClientReceived,
            networkInMs: gotCaption.timings.tServerIn - tSent,
            serverProcessingMs: gotCaption.timings.tEmit - gotCaption.timings.tServerIn,
            totalEndToEndMs: tClientReceived - tSent
          });
        }
      }

      listenerSocket.on('transcript', onTrans);
      listenerSocket.on('caption', onCap);
    });

    speakerSocket.emit('utterance', {
      roomId,
      srcLang: 'hi',
      seq: item.seq,
      audio: null,
      tSent,
      replayId: item.replayId
    });

    const res = await resultPromise;
    results.push(res);
  }

  // Print results table
  console.log('\n================================== LATENCY RESULTS TABLE ==================================');
  console.table(
    results.map((r) => ({
      Seq: r.seq,
      'Source Text': r.text.length > 25 ? r.text.slice(0, 25) + '...' : r.text,
      'Translation': r.tgtText.length > 25 ? r.tgtText.slice(0, 25) + '...' : r.tgtText,
      Numbers: r.numbers,
      'Network In (ms)': r.networkInMs,
      'Server Proc (ms)': r.serverProcessingMs,
      'Total E2E (ms)': r.totalEndToEndMs
    }))
  );
  console.log('===========================================================================================\n');

  speakerSocket.disconnect();
  listenerSocket.disconnect();
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});

