'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MatchDay, Match } from '@/lib/match-utils';

interface MatchContextType {
  currentMatchDay: Partial<MatchDay> | null;
  setCurrentMatchDay: (data: Partial<MatchDay> | null) => void;
  resetSession: () => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [currentMatchDay, setCurrentMatchDay] = useState<Partial<MatchDay> | null>(null);

  const resetSession = () => {
    setCurrentMatchDay(null);
  };

  return (
    <MatchContext.Provider value={{ currentMatchDay, setCurrentMatchDay, resetSession }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatchSession() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatchSession must be used within a MatchProvider');
  }
  return context;
}
