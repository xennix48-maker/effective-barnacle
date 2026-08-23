import { useEffect, useRef, useState } from 'react';
import { fetchBalanceSnapshot, type BalanceSnapshot } from '../lib/api';

type Display = {
  display: number;
  baseBalance: number;
  ratePerSec: number;
  fetchedAt: number;
  earliestStart: string | null;
};

/**
 * Server-anchored 1Hz interpolated balance.
 * - Fetches v_user_balance_snapshot on mount + every 30s
 * - Interpolates locally between fetches using rate * elapsed seconds
 * - Stays accurate within 1 server-clock-tick (well under 1s) without spamming requests
 */
export function useLiveBalance(userId: string | null): Display & { refresh: () => void } {
  const [snap, setSnap] = useState<{
    baseBalance: number;
    ratePerSec: number;
    earliestStart: string | null;
    fetchedAt: number;
  } | null>(null);
  const [display, setDisplay] = useState<number>(0);
  const tickRef = useRef<number | null>(null);
  const pullRef = useRef<number | null>(null);

  async function pull() {
    if (!userId) return;
    try {
      const s = await fetchBalanceSnapshot(userId);
      if (!s) return;
      setSnap({
        baseBalance: s.base_balance,
        ratePerSec: s.rate_per_sec_total,
        earliestStart: s.earliest_start,
        fetchedAt: Date.now(),
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[balance] pull failed', e);
    }
  }

  useEffect(() => {
    if (!userId) {
      setSnap(null);
      setDisplay(0);
      return;
    }

    void pull();

    // Re-sync every 30s to correct any client/server clock drift
    pullRef.current = window.setInterval(() => void pull(), 30_000);

    return () => {
      if (pullRef.current) clearInterval(pullRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!snap) {
      setDisplay(0);
      return;
    }
    const tick = () => {
      const elapsed = (Date.now() - snap.fetchedAt) / 1000;
      setDisplay(snap.baseBalance + snap.ratePerSec * elapsed);
    };
    tick();
    tickRef.current = window.setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [snap]);

  return {
    display,
    baseBalance: snap?.baseBalance ?? 0,
    ratePerSec: snap?.ratePerSec ?? 0,
    fetchedAt: snap?.fetchedAt ?? 0,
    earliestStart: snap?.earliestStart ?? null,
    refresh: pull,
  };
}

export type _Snapshot = BalanceSnapshot; // re-export for compatibility
