'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppMode } from '@/lib/types';

const APP_MODE_STORAGE_KEY = 'dropout-app-mode';
const SELECTED_PROJECT_STORAGE_KEY = 'dropout-selected-project';
const SELECTED_BUCKET_STORAGE_KEY = 'dropout-selected-bucket';

interface AppModeContextValue {
  mode: AppMode;
  hydrated: boolean;
  setMode: (mode: AppMode) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (projectId: string | null) => void;
  selectedBucketId: string | null;
  setSelectedBucketId: (bucketId: string | null) => void;
  isDeveloperMode: boolean;
  isSimplifiedMode: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

function getStoredValue(key: string) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

function setStoredValue(key: string, value: string | null) {
  if (typeof window === 'undefined') return;

  if (value === null) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, value);
}

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('easy');
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(null);
  const [selectedBucketId, setSelectedBucketIdState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedMode = getStoredValue(APP_MODE_STORAGE_KEY);
    const storedProjectId = getStoredValue(SELECTED_PROJECT_STORAGE_KEY);
    const storedBucketId = getStoredValue(SELECTED_BUCKET_STORAGE_KEY);

    if (storedMode === 'easy' || storedMode === 'developer' || storedMode === 'vibecoder') {
      setModeState(storedMode);
    }

    setSelectedProjectIdState(storedProjectId);
    setSelectedBucketIdState(storedBucketId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    document.documentElement.dataset.appMode = mode;
  }, [mode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    const syncFromBackend = async () => {
      try {
        const response = await fetch('/api/settings?raw=true');
        if (!response.ok) return;

        const settings = await response.json();
        if (cancelled) return;

        const nextMode = settings.appMode;
        if (nextMode === 'easy' || nextMode === 'developer' || nextMode === 'vibecoder') {
          setModeState(nextMode);
          setStoredValue(APP_MODE_STORAGE_KEY, nextMode);
        }
      } catch {
        // Keep local fallback when settings are unavailable.
      }
    };

    syncFromBackend();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const persistMode = useCallback(async (nextMode: AppMode) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appMode: nextMode }),
      });
    } catch {
      // Keep the optimistic local state even if persistence fails temporarily.
    }
  }, []);

  const setMode = useCallback(
    (nextMode: AppMode) => {
      setModeState(nextMode);
      setStoredValue(APP_MODE_STORAGE_KEY, nextMode);
      void persistMode(nextMode);
    },
    [persistMode],
  );

  const setSelectedProjectId = useCallback((projectId: string | null) => {
    setSelectedProjectIdState(projectId);
    setStoredValue(SELECTED_PROJECT_STORAGE_KEY, projectId);
  }, []);

  const setSelectedBucketId = useCallback((bucketId: string | null) => {
    setSelectedBucketIdState(bucketId);
    setStoredValue(SELECTED_BUCKET_STORAGE_KEY, bucketId);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      hydrated,
      setMode,
      selectedProjectId,
      setSelectedProjectId,
      selectedBucketId,
      setSelectedBucketId,
      isDeveloperMode: mode === 'developer',
      isSimplifiedMode: mode !== 'developer',
    }),
    [
      hydrated,
      mode,
      selectedBucketId,
      selectedProjectId,
      setMode,
      setSelectedBucketId,
      setSelectedProjectId,
    ],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const context = useContext(AppModeContext);

  if (!context) {
    throw new Error('useAppMode must be used within AppModeProvider');
  }

  return context;
}
