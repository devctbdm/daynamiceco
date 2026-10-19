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
 */

let status: MaintenanceStatus | null = null;
let hasLoaded = false;
let lastFetchAt = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let intervalMs = 0;
let stopTimer: ReturnType<typeof setTimeout> | null = null;
let refCount = 0;
const listeners = new Set<() => void>();

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

async function refresh(force: boolean) {
  if (!force && Date.now() - lastFetchAt < 2000) return;
  lastFetchAt = Date.now();
  try {
    const { data } = await maintenanceApi.getStatus();
    status = data.maintenance;
  } catch {
    // keep the last known status; the maintenance page shows defaults on failure
  } finally {
    hasLoaded = true;
    emit();
  }
}

function onFocus() {
  refresh(true);
}

function ensurePolling(ms: number) {
  if (typeof window === 'undefined' || ms <= 0) return;
  // Already polling at least this frequently — keep the existing timer so it
  // isn't reset on every remount.
  if (timer && intervalMs <= ms) return;
  if (timer) clearInterval(timer);
  intervalMs = ms;
  timer = setInterval(() => refresh(true), ms);
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
  if (!timer) {
    // No poller running: fetch immediately if we've never loaded or the cached
    // status is stale, then (re)start polling.
    if (!hasLoaded || Date.now() - lastFetchAt > maxAge) {
      refresh(true);
    }
    addFocusListener();
  }

  ensurePolling(pollMs);

  return () => {
    listeners.delete(cb);
    refCount -= 1;
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
