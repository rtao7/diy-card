import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatTrackTime,
  INITIAL_PLAYBACK,
  nudgeElapsed,
  progressPercent,
  ratioFromClientX,
  scrubElapsed,
  stepTrack,
  tickPlayback,
  TRACKS,
  type Playback,
} from "./musicPlayer";

function playingAt(index: number, elapsed: number): Playback {
  return { index, elapsed, playing: true };
}

describe("mock tracks", () => {
  it("ships three focus tracks with titles, artists, and durations", () => {
    assert.equal(TRACKS.length, 3);
    const ids = new Set(TRACKS.map((track) => track.id));
    assert.equal(ids.size, 3);
    for (const track of TRACKS) {
      assert.ok(track.title.length > 0);
      assert.ok(track.artist.length > 0);
      assert.ok(track.duration > 0);
      assert.equal(formatTrackTime(track.duration).includes(":"), true);
    }
  });
});

describe("formatTrackTime", () => {
  it("renders whole seconds as m:ss", () => {
    assert.equal(formatTrackTime(0), "0:00");
    assert.equal(formatTrackTime(5), "0:05");
    assert.equal(formatTrackTime(65), "1:05");
    assert.equal(formatTrackTime(TRACKS[0].duration), "3:24");
    assert.equal(formatTrackTime(TRACKS[1].duration), "4:10");
    assert.equal(formatTrackTime(TRACKS[2].duration), "2:48");
  });

  it("floors fractional seconds and ignores non-finite input", () => {
    assert.equal(formatTrackTime(9.9), "0:09");
    assert.equal(formatTrackTime(-4), "0:00");
    assert.equal(formatTrackTime(Number.NaN), "0:00");
  });
});

describe("tickPlayback", () => {
  it("advances one second while playing", () => {
    const next = tickPlayback(playingAt(0, 10));
    assert.deepEqual(next, playingAt(0, 11));
  });

  it("holds the finished second, then wraps to the next track", () => {
    const duration = TRACKS[0].duration;
    const atEnd = tickPlayback(playingAt(0, duration - 1));
    assert.deepEqual(atEnd, playingAt(0, duration));
    const wrapped = tickPlayback(atEnd);
    assert.deepEqual(wrapped, playingAt(1, 0));
  });

  it("wraps from the last track back to the first", () => {
    const last = TRACKS.length - 1;
    const wrapped = tickPlayback(playingAt(last, TRACKS[last].duration));
    assert.deepEqual(wrapped, playingAt(0, 0));
  });

  it("does not move when paused", () => {
    const paused: Playback = { index: 1, elapsed: 20, playing: false };
    assert.deepEqual(tickPlayback(paused), paused);
    assert.deepEqual(tickPlayback(INITIAL_PLAYBACK), INITIAL_PLAYBACK);
  });
});

describe("stepTrack", () => {
  it("moves forward and backward, wrapping the ends", () => {
    const start = playingAt(0, 40);
    assert.deepEqual(stepTrack(start, 1), playingAt(1, 0));
    assert.deepEqual(stepTrack(start, -1), playingAt(TRACKS.length - 1, 0));
    assert.deepEqual(stepTrack(playingAt(2, 8), 1), playingAt(0, 0));
  });

  it("keeps the playing flag", () => {
    const paused: Playback = { index: 0, elapsed: 4, playing: false };
    assert.equal(stepTrack(paused, 1).playing, false);
  });
});

describe("scrubbing", () => {
  it("maps a pointer to a ratio and then to seconds", () => {
    assert.equal(ratioFromClientX(25, 0, 100), 0.25);
    assert.equal(ratioFromClientX(-10, 0, 100), 0);
    assert.equal(ratioFromClientX(180, 0, 100), 1);
    assert.equal(ratioFromClientX(10, 0, 0), 0);

    assert.equal(scrubElapsed(0, 204), 0);
    assert.equal(scrubElapsed(1, 204), 204);
    assert.equal(scrubElapsed(0.5, 10), 5);
    assert.equal(scrubElapsed(1.4, 10), 10);
    assert.equal(scrubElapsed(-0.2, 10), 0);
  });

  it("nudges elapsed and clamps to the track", () => {
    assert.equal(nudgeElapsed(10, 5, 204), 15);
    assert.equal(nudgeElapsed(2, -5, 204), 0);
    assert.equal(nudgeElapsed(200, 20, 204), 204);
  });

  it("reports the fill as a percent of the duration", () => {
    assert.equal(progressPercent(0, 200), 0);
    assert.equal(progressPercent(50, 200), 25);
    assert.equal(progressPercent(200, 200), 100);
    assert.equal(progressPercent(10, 0), 0);
  });
});
