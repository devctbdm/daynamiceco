'use client';

import { useEffect, useState } from 'react';
import { maintenanceApi, type MaintenanceStatus } from '@/lib/api';

/**
 * Shared maintenance / selling status.
 *
 * Previously every `useMaintenance()` call created its own polling interval,
 * and because layout components remount on navigation, each navigation started
 * a fresh poll (and an immediate request). Now there is a single module-level
 * poller shared by all consumers:
 *
 *   - the snapshot survives remounts, so components render instantly
 *   - the interval keeps running for a short grace period after the last
 *     consumer unmounts, so navigation remounts don't tear it down / refetch
 *   - a stale check means a remount only refetches when the data is actually
 *     older than the poll interval
 *   - background polling stops when maintenance and browse-only mode are off
 */

let status: MaintenanceStatus | null = null;
let hasLoaded = false;
let lastFetchAt = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let intervalMs = 0;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let refCount = 0;
const listeners = new Set<() => void>();
const pollIntervals = new Map<() => void, number>();
let inFlight: Promise<void> | null = null;

// Keep the poller alive briefly after the last subscriber leaves so route
// changes (which remount layout components) reuse it instead of restarting it.
const STOP_GRACE_MS = 20_000;
const DEFAULT_POLL_MS = 30_000;

function emit() {
  listeners.forEach((cb) => cb());
}

function getSnapshot() {
  return status;
}

function needsPolling() {
  return status === null || status.enabled || status.sellingEnabled === false;
}

function getPollInterval() {
  const intervals = [...pollIntervals.values()].filter((ms) => ms > 0);
  return intervals.length > 0 ? Math.min(...intervals) : DEFAULT_POLL_MS;
}

async function refresh(force: boolean) {
  if (inFlight) return inFlight;
  if (!force && Date.now() - lastFetchAt < getPollInterval()) return;
  lastFetchAt = Date.now();
  inFlight = (async () => {
    try {
      const { data } = await maintenanceApi.getStatus();
      status = data.maintenance;
    } catch {
      // keep the last known status; the maintenance page shows defaults on failure
    } finally {
      hasLoaded = true;
      ensurePolling();
      emit();
      inFlight = null;
    }
  })();
  return inFlight;
}

function onFocus() {
  if (needsPolling() || Date.now() - lastFetchAt >= getPollInterval()) {
    void refresh(false);
  }
}

function ensurePolling() {
  if (typeof window === 'undefined') return;
  if (!needsPolling()) {
    if (timer) clearInterval(timer);
    timer = null;
    intervalMs = 0;
    return;
  }

  const ms = getPollInterval();
  if (timer && intervalMs === ms) return;
  if (timer) clearInterval(timer);
  intervalMs = ms;
  timer = setInterval(() => void refresh(true), ms);
}

function addFocusListener() {
  if (typeof window !== 'undefined') window.addEventListener('focus', onFocus);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  intervalMs = 0;
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', onFocus);
  }
}

function subscribe(cb: () => void, pollMs: number) {
  listeners.add(cb);
  refCount += 1;

  // Cancel a pending stop (navigation remount).
  if (stopTimer) {
    clearTimeout(stopTimer);
    stopTimer = null;
  }

  const maxAge = pollMs > 0 ? pollMs : DEFAULT_POLL_MS;
  pollIntervals.set(cb, pollMs);
  if (!hasLoaded || (!needsPolling() && Date.now() - lastFetchAt > maxAge)) {
    void refresh(true);
  }

  addFocusListener();
  ensurePolling();

  return () => {
    listeners.delete(cb);
    pollIntervals.delete(cb);
    refCount -= 1;
    ensurePolling();
    if (refCount <= 0) {
      refCount = 0;
      stopTimer = setTimeout(() => {
        if (refCount === 0) stopPolling();
      }, STOP_GRACE_MS);
    }
  };
}

export function useMaintenance(pollMs = DEFAULT_POLL_MS) {
  const [snapshot, setSnapshot] = useState<MaintenanceStatus | null>(() =>
    typeof window === 'undefined' ? null : getSnapshot()
  );

  useEffect(() => {
    // Sync in case the shared snapshot changed between render and effect.
    setSnapshot(getSnapshot());
    return subscribe(() => setSnapshot(getSnapshot()), pollMs);
  }, [pollMs]);

  return {
    enabled: snapshot?.enabled ?? false,
    // Default to "selling" enabled until we hear otherwise, so a failed status
    // request never accidentally blocks purchases.
    sellingEnabled: snapshot ? snapshot.sellingEnabled !== false : true,
    sellingMessage: snapshot?.sellingMessage ?? '',
    status: snapshot,
    loading: !hasLoaded,
  };
}
