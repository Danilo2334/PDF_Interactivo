"use client";
import { useCallback, useEffect, useRef } from "react";
import { createReinforcementOpenReporter } from "@/lib/readers/reinforcement-open-reporter";
export function useReinforcementOpens(endpoint: string, privateTest: boolean) {
  const reporter = useRef<ReturnType<typeof createReinforcementOpenReporter> | null>(null);
  useEffect(() => {
    const current = createReinforcementOpenReporter(endpoint, privateTest); reporter.current = current;
    return () => { current.close(); reporter.current = null; };
  }, [endpoint, privateTest]);
  const opened = useCallback((items: { id: string; pageNumber: number }[]) => reporter.current?.opened(items), []);
  const acceptedVisit = useCallback((id: string | null) => reporter.current?.acceptedVisit(id), []);
  return { opened, acceptedVisit };
}
