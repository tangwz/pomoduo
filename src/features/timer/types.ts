import type { LocaleCode } from '../../i18n/locale';

export type Phase = 'focus' | 'shortBreak' | 'longBreak';

export interface Settings {
  focusMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  longBreakEvery: number;
  notifyEnabled: boolean;
  soundEnabled: boolean;
  locale: LocaleCode;
}

export interface TimerSnapshot {
  phase: Phase;
  isRunning: boolean;
  cycleCount: number;
  endAtMs: number | null;
  remainingMs: number;
  settings: Settings;
}

export interface PhaseCompletedPayload {
  finishedPhase: Phase;
  nextPhase: Phase;
  soundEnabled: boolean;
}
