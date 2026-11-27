/**
 * Mock focus tracks and the playback steps the mini player runs.
 * The player stays mounted in the root layout; this is the part tests can run
 * without a browser.
 */

export type CoverPalette = {
  base: string;
  wash: string;
  ink: string;
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Length in whole seconds. */
  duration: number;
  palette: CoverPalette;
};

export const TRACKS: readonly Track[] = [
  {
    id: "lamp-hour",
    title: "Lamp Hour",
    artist: "North Room",
    duration: 3 * 60 + 24,
    palette: {
      base: "oklch(0.78 0.06 75)",
      wash: "oklch(0.94 0.03 90)",
      ink: "oklch(0.34 0.03 55)",
    },
  },
  {
    id: "glass-rain",
    title: "Glass Rain",
    artist: "Low Field",
    duration: 4 * 60 + 10,
    palette: {
      base: "oklch(0.7 0.03 230)",
      wash: "oklch(0.93 0.015 230)",
      ink: "oklch(0.32 0.02 250)",
    },
  },
  {
    id: "paper-grove",
    title: "Paper Grove",
    artist: "Half Light",
    duration: 2 * 60 + 48,
    palette: {
      base: "oklch(0.74 0.05 145)",
      wash: "oklch(0.93 0.025 130)",
      ink: "oklch(0.33 0.04 155)",
    },
  },
];

export type Playback = {
  index: number;
  elapsed: number;
  playing: boolean;
};

export const INITIAL_PLAYBACK: Playback = {
  index: 0,
  elapsed: 0,
  playing: false,
};

/** `m:ss` for the elapsed and total labels. */
export function formatTrackTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds)
    ? Math.max(0, Math.floor(totalSeconds))
    : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function clampElapsed(elapsed: number, duration: number): number {
  if (!Number.isFinite(elapsed) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }
  return Math.min(duration, Math.max(0, Math.round(elapsed)));
}

/** Pointer position along the progress bar, as 0–1. */
export function ratioFromClientX(
  clientX: number,
  left: number,
  width: number,
): number {
  if (
    !Number.isFinite(clientX) ||
    !Number.isFinite(left) ||
    !Number.isFinite(width) ||
    width <= 0
  ) {
    return 0;
  }
  return Math.min(1, Math.max(0, (clientX - left) / width));
}

export function scrubElapsed(ratio: number, duration: number): number {
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return clampElapsed(clamped * duration, duration);
}

export function nudgeElapsed(
  elapsed: number,
  delta: number,
  duration: number,
): number {
  return clampElapsed(elapsed + delta, duration);
}

export function progressPercent(elapsed: number, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return (clampElapsed(elapsed, duration) / duration) * 100;
}

/**
 * Advance one second while playing.
 * The finished second is shown, then the next tick wraps to the following track.
 */
export function tickPlayback(
  state: Playback,
  tracks: readonly Track[] = TRACKS,
): Playback {
  if (!state.playing || tracks.length === 0) return state;
  const count = tracks.length;
  const index = ((state.index % count) + count) % count;
  const track = tracks[index];
  if (!track || track.duration <= 0 || state.elapsed >= track.duration) {
    return { ...state, index: (index + 1) % count, elapsed: 0 };
  }
  return { ...state, index, elapsed: state.elapsed + 1 };
}

/** Move to the previous or next track and start it from the beginning. */
export function stepTrack(
  state: Playback,
  delta: number,
  tracks: readonly Track[] = TRACKS,
): Playback {
  const count = tracks.length;
  if (count === 0) return { ...state, index: 0, elapsed: 0 };
  const index = (((state.index + delta) % count) + count) % count;
  return { ...state, index, elapsed: 0 };
}
