#!/usr/bin/env node
/**
 * Command-line tool for EchoBridge NLP module (Member 4)
 * Source of truth: docs/contracts.md and docs/TASKS.md Task 8
 *
 * Usage:
 *   node scripts/cli.js <path-to-audio-file> [--lang hi|mr] [--target en] [--mock]
 *
 * Example:
 *   node scripts/cli.js sample.pcm --lang hi
 */

import fs from 'fs';
import path from 'path';
import { process as processNlp } from '../src/index.js';

function parseArgs() {
  const args = process.argv.slice(2);
  let audioPath = null;
  let srcLang = 'hi';
  let tgtLangs = ['en'];
  let useMock = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--lang' || arg === '-l') {
      srcLang = args[++i] || 'hi';
    } else if (arg === '--target' || arg === '-t') {
      tgtLangs = [args[++i] || 'en'];
    } else if (arg === '--mock') {
      useMock = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!audioPath && !arg.startsWith('-')) {
      audioPath = arg;
    }
  }

  return { audioPath, srcLang, tgtLangs, useMock };
}

function printHelp() {
  console.log(`
EchoBridge NLP CLI Runner
Usage: node scripts/cli.js <path-to-audio-file> [options]

Arguments:
  <path-to-audio-file>    Path to 16-bit PCM mono 16000Hz audio file (e.g. .pcm, .raw, .wav)

Options:
  --lang, -l <hi|mr>      Source language: 'hi' (Hindi) or 'mr' (Marathi). Default: hi
  --target, -t <lang>     Target language. Default: en
  --mock                  Run with mock provider to test pipeline offline
  --help, -h              Show this help message
`);
}

async function main() {
  const { audioPath, srcLang, tgtLangs, useMock } = parseArgs();

  let audioBuffer;

  if (!audioPath) {
    if (useMock) {
      console.log('ℹ️  No audio file specified; using dummy 1-second PCM buffer with --mock flag.');
      audioBuffer = Buffer.alloc(32000); // 1 sec of 16kHz 16-bit mono
    } else {
      console.error('Error: Please provide a path to an audio file.');
      printHelp();
      process.exit(1);
    }
  } else {
    const resolvedPath = path.resolve(process.cwd(), audioPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: File not found at ${resolvedPath}`);
      process.exit(1);
    }
    audioBuffer = fs.readFileSync(resolvedPath);
  }

  console.log(`\n========================================`);
  console.log(`EchoBridge NLP Utterance Processor`);
  console.log(`========================================`);
  console.log(`Source language : ${srcLang}`);
  console.log(`Target language : ${tgtLangs.join(', ')}`);
  console.log(`Audio size      : ${audioBuffer.length} bytes (~${(audioBuffer.length / 32000).toFixed(2)}s)`);
  console.log(`Mode            : ${useMock ? 'Mock Pipeline' : 'Live Google Provider'}`);
  console.log(`----------------------------------------`);

  const options = {};
  if (useMock) {
    options.sttClient = {
      recognize: async () => [
        {
          results: [
            {
              alternatives: [
                {
                  transcript: srcLang === 'mr'
                    ? 'चेक आउट ची वेळ सकाळी अकरा वाजता आहे'
                    : 'कमरा का किराया पाँच सौ रुपये है',
                  confidence: 0.95
                }
              ]
            }
          ]
        }
      ]
    };
    options.translateClient = {
      translate: async () => [
        srcLang === 'mr'
          ? 'The check-out time is eleven in the morning.'
          : 'The room rent is five hundred rupees.'
      ]
    };
  }

  try {
    const tStart = Date.now();
    const result = await processNlp({
      audio: audioBuffer,
      srcLang,
      tgtLangs,
      options
    });
    const totalMs = Date.now() - tStart;

    console.log('\nContract Result:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\nSummary Timings:');
    console.log(`  STT        : ${result.timings.sttMs} ms`);
    console.log(`  Translate  : ${result.timings.translateMs} ms`);
    console.log(`  Guard      : ${result.timings.guardMs} ms`);
    console.log(`  Total CLI  : ${totalMs} ms`);
    console.log(`  Status     : ${result.unclear ? '⚠️  UNCLEAR' : '✅ OK'}`);

    if (result.numbers.length > 0) {
      console.log('\nExtracted Numbers:');
      for (const num of result.numbers) {
        const mark = num.verified ? '✅ Verified' : '⚠️  Unverified Mismatch';
        console.log(`  - [${num.kind.toUpperCase()}] "${num.spoken}" -> ${num.value} (${mark})`);
      }
    }
  } catch (err) {
    console.error('Fatal CLI execution error:', err);
    process.exit(1);
  }
}

main();

