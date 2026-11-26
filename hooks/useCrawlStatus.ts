"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, api } from "@/lib/api";
import type { CrawlStatusResponse } from "@/types";

const POLL_INTERVAL_MS = 2500;

/**
 * Polls real crawl progress from the backend until the job reaches a
 * terminal state.
 *
 * Every value shown comes from the server; nothing is interpolated or
 * animated to look like progress. Polling stops as soon as the job is done,
 * and transient network errors do not tear the view down — they surface as a
 * warning while polling continues.
 */
export function useCrawlStatus(chatbotId: string, enabled = true) {
  const [status, setStatus] = useState<CrawlStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const stoppedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const response = await api.getCrawlStatus(chatbotId);
      setStatus(response);
      setError(null);
      if (response.is_terminal) {
        stoppedRef.current = true;
      }
      return response;
    } catch (err) {
      // A 401/404 is terminal; anything else is likely transient.
      if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
        stoppedRef.current = true;
      }
      setError(
        err instanceof ApiError ? err.message : "Could not read scraping progress.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  useEffect(() => {
    if (!enabled) return;

    stoppedRef.current = false;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      await refresh();
      if (cancelled || stoppedRef.current) return;
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, refresh]);

  return { status, error, loading, refresh };
}
