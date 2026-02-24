"use client";
import { useState, useEffect } from "react";

/**
 * Syncs state with localStorage.
 * SSR-safe: reads the stored value only on mount.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // quota exceeded – ignore
    }
  }, [key, value]);

  const remove = () => {
    window.localStorage.removeItem(key);
    setValue(initialValue);
  };

  return [value, setValue, remove] as const;
}
