import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  PhaseCompletedPayload,
  Settings,
  TimerSnapshot,
} from './types';

export const timerGetState = (): Promise<TimerSnapshot> =>
  invoke('timer_get_state');

export const timerStart = (): Promise<TimerSnapshot> => invoke('timer_start');

export const timerResume = (): Promise<TimerSnapshot> => invoke('timer_resume');

export const timerReset = (): Promise<TimerSnapshot> => invoke('timer_reset');

export const timerUpdateSettings = (
  settings: Settings,
): Promise<TimerSnapshot> => invoke('timer_update_settings', { settings });

export const listenTimerTick = (
  handler: (snapshot: TimerSnapshot) => void,
): Promise<() => void> =>
  listen<TimerSnapshot>('timer_tick', (event) => {
    handler(event.payload);
  });

export const listenPhaseCompleted = (
  handler: (payload: PhaseCompletedPayload) => void,
): Promise<() => void> =>
  listen<PhaseCompletedPayload>('timer_phase_completed', (event) => {
    handler(event.payload);
  });
