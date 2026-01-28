// Hook for computing live match minute locally without API calls
import { useState, useEffect, useMemo } from 'react';

export type MatchPhase = 'scheduled' | 'live' | 'ht' | '2h' | 'et1' | 'et_ht' | 'et2' | 'pens' | 'finished';

interface LiveMinuteInput {
  phase: MatchPhase | string | null;
  phaseStartedAt: string | null;
  baseMinute: number | null;
  kickoffAt: string;
}

interface LiveMinuteResult {
  displayMinute: string;
  isLive: boolean;
  isHalfTime: boolean;
  isFinished: boolean;
  isPenalties: boolean;
  phase: MatchPhase;
}

// Stoppage time thresholds per phase
const PHASE_LIMITS: Record<string, number> = {
  live: 45,   // First half ends at 45
  '2h': 90,   // Second half ends at 90
  et1: 105,   // ET1 ends at 105
  et2: 120,   // ET2 ends at 120
};

export function useLiveMinute(input: LiveMinuteInput): LiveMinuteResult {
  const [now, setNow] = useState(() => Date.now());
  
  const phase = (input.phase as MatchPhase) || 'scheduled';
  const isLive = ['live', '2h', 'et1', 'et2'].includes(phase);
  const isHalfTime = ['ht', 'et_ht'].includes(phase);
  const isFinished = phase === 'finished';
  const isPenalties = phase === 'pens';

  // Update time every second when match is live
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  const displayMinute = useMemo(() => {
    if (phase === 'scheduled') {
      // Show kickoff time
      const kickoff = new Date(input.kickoffAt);
      return kickoff.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome',
      });
    }

    if (isFinished) {
      return 'FT';
    }

    if (isPenalties) {
      return 'PEN';
    }

    if (phase === 'ht') {
      return 'HT';
    }

    if (phase === 'et_ht') {
      return 'ET HT';
    }

    // Live phases - calculate minute
    if (isLive && input.phaseStartedAt && input.baseMinute !== null) {
      const phaseStart = new Date(input.phaseStartedAt).getTime();
      const elapsedMs = now - phaseStart;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const currentMinute = input.baseMinute + elapsedMinutes;

      // Check for stoppage time
      const phaseLimit = PHASE_LIMITS[phase];
      if (phaseLimit && currentMinute >= phaseLimit) {
        const stoppageMinutes = currentMinute - phaseLimit;
        return `${phaseLimit}+${stoppageMinutes}`;
      }

      return `${currentMinute}'`;
    }

    // Fallback for live without phase data
    if (isLive) {
      return "LIVE";
    }

    return '--';
  }, [phase, input.phaseStartedAt, input.baseMinute, input.kickoffAt, now, isLive, isFinished, isPenalties]);

  return {
    displayMinute,
    isLive,
    isHalfTime,
    isFinished,
    isPenalties,
    phase,
  };
}

// Utility to format score display
export function formatScore(homeScore: number | null, awayScore: number | null): string {
  const home = homeScore ?? 0;
  const away = awayScore ?? 0;
  return `${home} - ${away}`;
}
