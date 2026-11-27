"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Text } from "ray-ui";
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
  type Track,
} from "@/lib/musicPlayer";
import styles from "./MiniMusicPlayer.module.css";

/**
 * Mock focus player. Mounted from the root layout so a route change
 * does not unmount it or reset playback.
 */
export function MiniMusicPlayer() {
  const [playback, setPlayback] = useState(INITIAL_PLAYBACK);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const track = TRACKS[playback.index] ?? TRACKS[0];

  useEffect(() => {
    if (!playback.playing) return;
    const id = window.setInterval(() => {
      if (scrubbingRef.current) return;
      setPlayback((current) => tickPlayback(current));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playback.playing, playback.index]);

  function setScrub(next: boolean) {
    scrubbingRef.current = next;
    setScrubbing(next);
  }

  function toggle() {
    setPlayback((current) => ({ ...current, playing: !current.playing }));
  }

  function seek(clientX: number, element: HTMLDivElement) {
    const rect = element.getBoundingClientRect();
    const ratio = ratioFromClientX(clientX, rect.left, rect.width);
    setPlayback((current) => ({
      ...current,
      elapsed: scrubElapsed(ratio, TRACKS[current.index]?.duration ?? 0),
    }));
  }

  function onScrubPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setScrub(true);
    seek(event.clientX, event.currentTarget);
  }

  function onScrubPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    seek(event.clientX, event.currentTarget);
  }

  function onScrubKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    event.preventDefault();
    const key = event.key;
    const shiftKey = event.shiftKey;
    setPlayback((current) => {
      const duration = TRACKS[current.index]?.duration ?? 0;
      return {
        ...current,
        elapsed: nudgeElapsed(current.elapsed, seekDelta(key, shiftKey, duration), duration),
      };
    });
  }

  const elapsedLabel = formatTrackTime(playback.elapsed);
  const totalLabel = formatTrackTime(track.duration);
  const playing = playback.playing;

  return (
    <aside className={styles.player} aria-label="Music player">
      <div className={styles.cover} aria-hidden="true">
        <CoverArt track={track} />
      </div>
      <div className={styles.copy}>
        <Text as="p" variant="heading-sm" className={styles.title}>
          {track.title}
        </Text>
        <Text as="p" variant="caption" tone="muted" className={styles.artist}>
          {track.artist}
        </Text>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.skip}
          aria-label="Previous track"
          onClick={() => setPlayback((current) => stepTrack(current, -1))}
        >
          <SkipIcon direction="previous" />
        </button>
        <button
          type="button"
          className={styles.play}
          aria-label={playing ? "Pause" : "Play"}
          aria-pressed={playing}
          onClick={toggle}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          className={styles.skip}
          aria-label="Next track"
          onClick={() => setPlayback((current) => stepTrack(current, 1))}
        >
          <SkipIcon direction="next" />
        </button>
      </div>
      <div className={styles.times}>
        <Text as="span" variant="code" className={styles.time}>
          {elapsedLabel}
        </Text>
        <Text as="span" variant="code" className={styles.time}>
          {totalLabel}
        </Text>
      </div>
      <div
        className={scrubbing ? `${styles.scrub} ${styles.scrubbing}` : styles.scrub}
        role="slider"
        tabIndex={0}
        aria-label="Playback position"
        aria-valuemin={0}
        aria-valuemax={track.duration}
        aria-valuenow={playback.elapsed}
        aria-valuetext={`${elapsedLabel} of ${totalLabel}`}
        onPointerDown={onScrubPointerDown}
        onPointerMove={onScrubPointerMove}
        onPointerUp={() => setScrub(false)}
        onPointerCancel={() => setScrub(false)}
        onKeyDown={onScrubKeyDown}
      >
        <span className={styles.track}>
          <span
            key={track.id}
            className={styles.fill}
            style={{ width: `${progressPercent(playback.elapsed, track.duration)}%` }}
          />
        </span>
      </div>
    </aside>
  );
}

function seekDelta(key: string, shiftKey: boolean, duration: number): number {
  if (key === "Home") return -duration;
  if (key === "End") return duration;
  const step = shiftKey ? 15 : 5;
  return key === "ArrowLeft" ? -step : step;
}

function CoverArt({ track }: { track: Track }) {
  const { base, wash, ink } = track.palette;
  if (track.id === "glass-rain") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" fill={base} />
        <rect x="0" y="40" width="64" height="24" fill={ink} />
        <path
          d="M12 8v16M22 14v20M34 6v18M46 12v16M56 18v12"
          fill="none"
          stroke={wash}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M0 40h64" stroke={wash} strokeWidth="1" />
      </svg>
    );
  }
  if (track.id === "paper-grove") {
    return (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" fill={base} />
        <rect x="8" y="14" width="28" height="38" rx="3" fill={wash} />
        <rect x="26" y="8" width="30" height="44" rx="3" fill={ink} />
        <path
          d="M32 18h16M32 24h12M32 30h14"
          fill="none"
          stroke={wash}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" fill={base} />
      <circle cx="32" cy="28" r="16" fill={wash} />
      <circle cx="32" cy="28" r="6" fill={ink} />
      <path
        d="M32 44v10M24 54h16"
        fill="none"
        stroke={ink}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3.7v8.6L12.4 8Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4.4 3.4h2.2v9.2H4.4zm5 0h2.2v9.2H9.4z" fill="currentColor" />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: "previous" | "next" }) {
  const previous = direction === "previous";
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={previous ? "M3.4 3.2h1.5v9.6H3.4z" : "M11.1 3.2h1.5v9.6h-1.5z"}
        fill="currentColor"
      />
      <path
        d={previous ? "M13 3.5 6.6 8 13 12.5Z" : "M3 3.5 9.4 8 3 12.5Z"}
        fill="currentColor"
      />
    </svg>
  );
}
