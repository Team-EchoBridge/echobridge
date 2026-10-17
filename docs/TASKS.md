# EchoBridge: Task Division

## How to use this file

Each member starts their agent (Codex or Antigravity) with:

> I'm Member N. Read AGENTS.md, docs/contracts.md and docs/TASKS.md. Make me a step-by-step implementation plan for my section only, in small steps I can finish one at a time. Do not write code yet.

Then say "Do step 1", review the diff, run it, tick the box below, commit, and move to the next step. Only edit files inside your own folder.

## The project in five lines

- One speaker talks in Hindi or Marathi. Listeners join by QR code and read and hear the English translation live.
- Stack: Node 20, Express, Socket.IO, React + Vite. One AI provider: Google Speech-to-Text and Google Translation. Speech on the phone uses the browser's built-in voice.
- Our own work: a number and price guard that cross-checks the translation, an unclear-audio gate, a hospitality glossary, and a measured results table.
- Demo target: working within 90 seconds, on 3 phones, in Round 1 (23 Oct, 12:00 to 2:30 PM).
- Contracts (event and function shapes) live in docs/contracts.md. Never change them without telling all four.

## Dates and gates

| Gate | When | Passes when |
| --- | --- | --- |
| 1 | Mon 19 Oct, night | Every module passes its done-when check alone, against mocks |
| 2 | Tue 20 Oct | End-to-end: mic to translated captions on a phone |
| 3 | Wed 21 Oct | 3 phones, 40-phrase results table, noise and Bluetooth tests, backup video |
| 4 | Thu 22 Oct, noon | Feature freeze. Working build tagged v1.0 |

## Who unblocks whom

- Member 3 pushes the client scaffold and the mock events first (about 30 minutes), so Members 1 and 2 can start today.
- Member 4 pushes a process() that returns mock data in the contract shape, so Member 3 can integrate early.
- Member 1's recorded test phrases feed Member 3's latency script and Member 4's accuracy script.

---

## Member 1: Speaker-side frontend

Folder: `client/src/speaker`

- [ ] 1. Mic permission, mic button and a level meter.
- [ ] 2. Cut speech into sentences on silence (about 0.5 s of silence, forced cut after 6 s).
- [ ] 3. Encode each sentence as 16 kHz mono audio and send the `utterance` event (roomId, srcLang, audio) through src/shared.
- [ ] 4. Create a room with `room:create`, show the QR code, the join link and the listener count.
- [ ] 5. Source language selector (Hindi, Marathi).
- [ ] 6. Show the last recognized sentence and the "Unclear, please repeat" state so the speaker sees what was heard.
- [ ] 7. Replay mode toggle, clearly labelled, that plays pre-recorded audio through the same path.
- [ ] 8. Test phrase set: record 40 hospitality phrases (about 25 Hindi, 15 Marathi, half containing numbers). Save audio and docs/testdata/phrases.csv (text, language, expected numbers).
- [ ] 9. From 20 Oct: write the demo script and record the backup video.

**Done when:** speaking on the laptop sends sentences to the mock server and the QR page opens.

## Member 2: Listener-side frontend

Folder: `client/src/listener`

- [ ] 1. Join page for the QR link, with the language picker (English only for now).
- [ ] 2. "Tap to start listening" button (phones block audio until the user taps).
- [ ] 3. Live captions: show the `transcript` event first, then the `caption` event, original and translated text.
- [ ] 4. Large number card from the `numbers` field.
- [ ] 5. "Unclear, please repeat" banner when `unclear` is true. Nothing is spoken then.
- [ ] 6. Speak the translation with browser speech synthesis through a queue so sentences never overlap. Pick an English voice, and fall back to captions only if none works.
- [ ] 7. Connection status and automatic reconnect.
- [ ] 8. Developer overlay showing the stage timings.
- [ ] 9. Mobile-first layout with large text. Test on iOS and Android browsers.
- [ ] 10. From 20 Oct: build the slides in the rulebook order (Problem, Solution, Technology, Innovation, Implementation, Impact, Future Scope), using Member 4's results table.

**Done when:** the whole UI works against mock events on iOS and Android.

## Member 3: Backend

Folders: `server`, `client/src/shared`, repo setup

- [ ] 1. First, in about 30 minutes: scaffold /client (Vite, React, router, socket client in src/shared) and /server, then push so the others can start.
- [ ] 2. docs/mocks: mock events and a mock NLP result for Members 1 and 2. Push right after the scaffold.
- [ ] 3. Socket.IO rooms in memory: `room:create` and `room:join` (roomId, tgtLang).
- [ ] 4. `utterance` handler: call /nlp process() (mock first), then send `transcript` and `caption` to the room. Translate once per language and cache repeated phrases.
- [ ] 5. Add a timestamp at every stage and include `timings` in events.
- [ ] 6. Latency script: send the 40 recorded phrases and print a timing table.
- [ ] 7. Local mode: listen on all interfaces, show a join link with the laptop's local IP. The speaker uses the laptop at localhost.
- [ ] 8. Render deployment (Singapore region, HTTPS, health check, keep-awake ping).
- [ ] 9. Replay mode endpoint that serves cached outputs.
- [ ] 10. Repo owner: GitHub setup, branch protection, README, Projects board, AGENTS.md (see the GitHub setup guide).

**Done when:** fake events reach 3 phones through both local mode and Render.

## Member 4: NLP and language models

Folder: `nlp`

- [ ] 1. Google Cloud: project, billing, enable Speech-to-Text and Translation, create a key and save it as secrets/google-key.json. Confirm Hindi and Marathi work with sample clips by Sun 18 Oct.
- [ ] 2. `process(audio, srcLang, tgtLangs)` skeleton returning mock data in the contract shape. Push early.
- [ ] 3. Speech-to-text call with a language hint and a confidence score. 6-second timeout and one retry on the same provider.
- [ ] 4. Translation call, plus a hospitality glossary of 50 to 80 terms kept as a lookup table.
- [ ] 5. Number normalizer: Hindi and Marathi number words, Devanagari digits, rupee and time expressions.
- [ ] 6. Cross-check source numbers against the translation, set `numbers`, and flag any mismatch.
- [ ] 7. Unclear gate: low confidence, empty or very short text, wrong language.
- [ ] 8. Command-line tool: audio file in, process() result out, with timings.
- [ ] 9. Accuracy script on docs/testdata: number accuracy with and without the guard, printed as a results table.
- [ ] 10. Choose final settings from the measurements and hand the results table to Member 2 for the slides.

**Done when:** an audio clip goes in and the process() result comes out on the command line with timings, and the results table is ready.

---

## Integration and testing (from Tue 20 Oct)

| Who | Task |
| --- | --- |
| Members 3 and 4 | Plug /nlp into /server and run end to end with real audio. Run the latency and accuracy scripts. |
| Members 1 and 2 | Replace mock events with real ones. Test on real phones with Bluetooth and wired earbuds, and in a noisy room. |
| Member 1 | Demo script and backup video. |
| Member 2 | Slides using Member 4's results table. |

Everyone helps with bug fixing from 21 Oct. After Thu 22 Oct noon, merge bug fixes only.
