# Contracts

This file is the source of truth for every event and function shape. Change it only by pull request, announced to all four members. Mock examples live in docs/mocks/.

## Conventions

- Language codes: `hi` (Hindi), `mr` (Marathi), `en` (English). Speaker languages are `hi` and `mr`; the only listener language for now is `en`.
- Times are milliseconds since the Unix epoch (`Date.now()`).
- `seq` is an integer that starts at 1 for each room and goes up by one per sentence. Listeners use it to keep sentences in order.
- Audio: one sentence as an ArrayBuffer of 16-bit signed little-endian PCM, 16000 Hz, mono, at most 6 seconds (about 192 KB).

## NLP module (Member 4)

```js
process({ audio, srcLang, tgtLangs }) -> Promise<{
  srcText: string,                  // recognized speech in the source language
  translations: { en: string },     // one entry per requested language; "" when unclear
  numbers: Array<{
    value: number,                  // e.g. 500
    kind: "price" | "time" | "count",
    spoken: string,                 // the words or digits as heard, e.g. "paanch sau"
    verified: boolean               // true when the translation contains the same number
  }>,
  confidence: number,               // 0 to 1, from speech recognition
  unclear: boolean,                 // true: show "Unclear, please repeat", speak nothing
  timings: { sttMs: number, translateMs: number, guardMs: number }
}>
```

Rules:
- On a timeout or provider error after one retry, resolve with `unclear: true` instead of throwing.
- If any number has `verified: false`, the server still sends the caption, and listeners show the number card with a warning mark.

## Socket events

All events use Socket.IO. Events marked "ack" reply through the Socket.IO acknowledgment callback.

### Client to server

| Event | Sent by | Payload | Ack |
| --- | --- | --- | --- |
| `room:create` | speaker | `{ srcLang }` | `{ roomId }` |
| `room:join` | listener or speaker | `{ roomId, tgtLang }` | `{ ok: true, srcLang }` or `{ ok: false, error }` |
| `utterance` | speaker | `{ roomId, srcLang, seq, audio, tSent, replayId? }` | none |

- The speaker also calls `room:join` after creating the room, so it receives `transcript` and `caption` and can show what was heard.
- If `replayId` is set, the server returns the cached output for that id and skips the NLP module.

### Server to clients

| Event | Sent to | Payload |
| --- | --- | --- |
| `transcript` | everyone in the room | `{ seq, srcText, unclear, timings }` |
| `caption` | everyone listening in that `tgtLang` | `{ seq, srcText, tgtText, tgtLang, numbers, unclear, timings }` |
| `room:count` | speaker | `{ count }` listeners in the room |
| `utterance:error` | speaker | `{ seq, message }` |

- `transcript` goes out as soon as speech recognition finishes. `caption` follows once translation and the guard are done.
- When `unclear` is true, `tgtText` is an empty string and listeners speak nothing.

### Timings object (in `transcript` and `caption`)

```js
{
  tSent,            // speaker: when the sentence was sent
  tServerIn,        // server: when it arrived
  tSttDone,         // server: speech recognition finished
  tTranslateDone,   // server: translation and guard finished
  tEmit             // server: caption sent
}
```

## HTTP

- `GET /health` returns `{ ok: true }`. Used by the keep-awake ping and the venue check.
- Listener link: `/join/:roomId`. Speaker page: `/speak`.

## Example

Speaker says "kamra ka kiraya paanch sau rupaye hai":

```json
{
  "seq": 3,
  "srcText": "कमरा का किराया पाँच सौ रुपये है",
  "tgtText": "The room rent is five hundred rupees.",
  "tgtLang": "en",
  "numbers": [{ "value": 500, "kind": "price", "spoken": "पाँच सौ", "verified": true }],
  "unclear": false,
  "timings": { "tSent": 1766000000000, "tServerIn": 1766000000120, "tSttDone": 1766000001100, "tTranslateDone": 1766000001500, "tEmit": 1766000001510 }
}
```
