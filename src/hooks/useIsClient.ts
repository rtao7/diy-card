import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

/** True only after hydration, so dates use the viewer's calendar. */
export function useIsClient() {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
