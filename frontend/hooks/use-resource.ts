"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
/** Identity and request-key isolation prevents old-account data flashing during navigation. */
export function useResource<T>(
  path: string | null,
  userId: number,
  revision: number,
) {
  const key = `${userId}:${path}:${revision}`;
  const [result, setResult] = useState<{
    key: string;
    data: T | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal }, userId)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data, error: "" });
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setResult({ key, data: null, error: error.message });
      });
    return () => controller.abort();
  }, [key, path, userId]);
  return {
    data: result?.key === key ? result.data : null,
    error: result?.key === key ? result.error : "",
    loading: Boolean(path && result?.key !== key),
  };
}
