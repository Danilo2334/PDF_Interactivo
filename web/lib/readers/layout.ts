"use client";
import { useSyncExternalStore } from "react";

const query = "(min-width: 64rem)";
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export function useWideReader() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
