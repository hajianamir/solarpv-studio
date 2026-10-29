import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdvancedFeatureFlags, DEFAULT_FEATURE_FLAGS } from './featureFlags';

const STORAGE_KEY = 'solarpv_advanced_feature_flags_v3';

interface FeatureFlagContextValue {
  flags: AdvancedFeatureFlags;
  setFlag: (key: keyof AdvancedFeatureFlags, value: boolean) => void;
  setAllFlags: (newFlags: AdvancedFeatureFlags) => void;
  resetFlags: () => void;
  activeCount: number;
  isFlagActive: (key: keyof AdvancedFeatureFlags) => boolean;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [flags, setFlagsState] = useState<AdvancedFeatureFlags>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_FEATURE_FLAGS, ...parsed };
      }
    } catch {
      // Fallback on parse failure
    }
    return DEFAULT_FEATURE_FLAGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (e) {
      console.warn('Failed to persist feature flags to localStorage', e);
    }
  }, [flags]);

  const setFlag = (key: keyof AdvancedFeatureFlags, value: boolean) => {
    setFlagsState(prev => ({ ...prev, [key]: value }));
  };

  const setAllFlags = (newFlags: AdvancedFeatureFlags) => {
    setFlagsState({ ...newFlags });
  };

  const resetFlags = () => {
    setFlagsState({ ...DEFAULT_FEATURE_FLAGS });
  };

  const activeCount = Object.values(flags).filter(Boolean).length;
  const isFlagActive = (key: keyof AdvancedFeatureFlags) => Boolean(flags[key]);

  return (
    <FeatureFlagContext.Provider
      value={{
        flags,
        setFlag,
        setAllFlags,
        resetFlags,
        activeCount,
        isFlagActive,
      }}
    >
      {children}
    </FeatureFlagContext.Provider>
  );
};

export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    // Graceful fallback for non-wrapped tests
    return {
      flags: DEFAULT_FEATURE_FLAGS,
      setFlag: () => {},
      setAllFlags: () => {},
      resetFlags: () => {},
      activeCount: 0,
      isFlagActive: (key: keyof AdvancedFeatureFlags) => Boolean(DEFAULT_FEATURE_FLAGS[key]),
    };
  }
  return context;
}
