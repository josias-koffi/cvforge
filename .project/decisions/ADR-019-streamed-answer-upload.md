# ADR-019: The answer goes up while it is being spoken, and the API holds it in memory

Date: 2026-09-21
Status: accepted

## Context

ADR-018 removed the chopping and took around a second off every turn. What it
also did was produce the number nobody had: the server's own per-turn log
starts its clock when the request reaches Nest, so encoding the answer and
uploading a megabyte of base64 had never been measured anywhere.

Both sat in the same place — after the candidate's last word, inside the
silence before the recruiter answers — because `MediaRecorder` only hands over
its recording at `onstop`. The obvious fix, a `timeslice`, does not work: the
blobs are WebM fragments and only the first carries a header, so none of them
can be decoded alone and the whole thing has to be reassembled anyway.

## Decision

**Capture raw samples.** An `AudioWorklet` posts the microphone back to the
page as it is spoken. Raw PCM can be cut anywhere and joined back in order,
which is the property WebM and WAV both lack. The worklet groups quanta before
posting — 128 samples is under 3 ms — and transfers its buffer rather than
copying it. It connects to the destination only so the graph pulls it, and
writes nothing, so the candidate does not hear themselves.

**Encode as it goes.** Each quarter-second is downsampled to 16 kHz and
encoded to PCM16 on arrival. What is left when the answer ends is a 44-byte
header and one base64 pass.

**Send as it goes.** `POST sessions/:id/turn/chunk` takes each piece. The turn
request that follows arrives with an empty body, and the server assembles what
it buffered and writes the header. A body with audio still wins and discards
whatever was buffered under the same id, so a retry cannot be joined to half
of the attempt it replaced.

**Keep the answer in the browser too.** Pieces are kept as well as sent. If any
upload fails, the turn carries the whole answer as before. This is what makes
streaming an optimisation rather than a new way to lose an answer, and it costs
the memory the old recorder spent anyway.

**Hold the pieces in memory, not in Redis.** Keyed by candidate, session and
turn; expiring after two minutes, swept on access; bounded on both how long one
answer may be and how many may be held at once.

## Consequences

- The API is now stateful between two requests of the same turn. It runs as a
  single instance with no sticky sessions, so this is correct today and would
  be wrong the moment a second replica exists.
- The key carries the candidate's own email. The turn id comes from the
  browser, so without that, guessing another session's id would feed audio into
  an interview that is not yours.
- A restart mid-answer loses the buffer. The candidate repeats the answer; the
  session survives, because the turn has not been recorded yet.
- An abandoned answer — a cough, a mute — leaves its pieces to expire. The next
  answer gets a new id, so nothing is ever joined to it.
- `MediaRecorder` is gone from the studio, and with it the WebM/Opus path and
  `decodeAudioData`. `AudioWorklet` needs Chrome 66, Firefox 76 or Safari 14.1,
  which is below what `AudioContext` and `getUserMedia` already required.
- `encodeSegment` and `encodeWav` are deleted: post-hoc encoding of a whole
  answer is exactly what this removes.
- The WAV header is now written in two places, `apps/web/lib/interview/wav.ts`
  and `apps/api/src/interview/wav.ts`. Duplicated on purpose rather than shared
  through a package: it is a fixed format from 1991, not a decision either side
  gets to change.

## Alternatives considered

- **`MediaRecorder` with a `timeslice`.** Does not work, as above.
- **Redis for the buffer.** It is already deployed beside the API in both
  stacks, and `REDIS_URL` is already in the production environment, but nothing
  in `apps/api` speaks to it today. It would buy nothing now and would put a
  new dependency on the critical path of every single answer: if Redis is
  unavailable, every interview stops, where today a lost buffer costs one
  repeat.

  It becomes the right answer the day any of these is true, and the change is
  small — replace the `Map` in `InterviewAnswerBuffer`, keep the interface:
  - the API runs on more than one replica, or sits behind anything that does
    not pin a session to an instance;
  - deploys become frequent enough that answers are regularly lost mid-turn;
  - the memory ceiling starts being hit in normal use rather than by abuse.
- **Uploading a growing WAV each time.** Simple, and quadratic: a 90-second
  answer would send about 160 MB in total.
- **A WebSocket for the microphone.** Fewer requests, but a connection to keep
  alive, reconnect and authenticate, for an upload that is four requests a
  second and already fits in plain JSON.
