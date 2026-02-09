import { useState, useEffect, useCallback } from "react";
import { AppSettings, SettingsSetter } from "../settings/types";
import { DEFAULT_SETTINGS } from "../settings/defaults";

const STORAGE_KEY = "keplerian-settings-v1";

export function useSettings() {
  const [settings, setSettingsRaw] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults so new keys added in future versions get their defaults
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // Corrupt data — fall through to defaults
    }
    return DEFAULT_SETTINGS;
  });

  // Debounced persist to localStorage
  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, 300);
    return () => clearTimeout(id);
  }, [settings]);

  const set: SettingsSetter = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettingsRaw((prev) => {
        if (prev[key] === value) return prev;
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettingsRaw(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { settings, set, resetSettings } as const;
}
