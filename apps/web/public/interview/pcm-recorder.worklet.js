/**
 * Hands the microphone back to the page as raw samples, while it is being
 * spoken.
 *
 * `MediaRecorder` cannot do this job. Its `timeslice` blobs are WebM
 * fragments and only the first one carries a header, so none of them can be
 * decoded on its own — the whole recording has to be reassembled before
 * anything can read it, which is what put decoding, resampling and encoding a
 * megabyte *after* the candidate's last word.
 *
 * Runs on the audio thread, so it does as little as possible: it fills a
 * buffer and posts it. A quantum is 128 samples — under 3 ms — and posting
 * each one would be several hundred messages a second for no benefit, so they
 * are grouped first. The buffer is transferred rather than copied, and a new
 * one allocated, because a transferred buffer is detached on this side.
 */

/** About 43 ms at 48 kHz: frequent enough to feel live, rare enough to be cheap. */
const FRAME_SAMPLES = 2048

class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(FRAME_SAMPLES);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    // No input attached yet, or the track ended. Staying alive is the point:
    // returning false would tear the node down for the rest of the session.
    if (!channel) return true;

    let read = 0;
    while (read < channel.length) {
      const take = Math.min(FRAME_SAMPLES - this.offset, channel.length - read);

      this.buffer.set(channel.subarray(read, read + take), this.offset);
      this.offset += take;
      read += take;

      if (this.offset === FRAME_SAMPLES) {
        const full = this.buffer;
        this.port.postMessage(full.buffer, [full.buffer]);
        this.buffer = new Float32Array(FRAME_SAMPLES);
        this.offset = 0;
      }
    }

    // Nothing is written to `outputs`, so the node emits silence. That matters:
    // it is connected to the destination only so the graph pulls it, and
    // passing the microphone through would be the candidate hearing themselves.
    return true;
  }
}

registerProcessor("pcm-recorder", PcmRecorderProcessor);
