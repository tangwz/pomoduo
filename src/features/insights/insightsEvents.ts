import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { GoalSettings, InsightsSnapshot } from './types';

export const timerGetInsights = (): Promise<InsightsSnapshot> =>
  invoke('timer_get_insights');

export const timerUpdateGoals = (
  goals: GoalSettings,
): Promise<InsightsSnapshot> => invoke('timer_update_goals', { goals });

export const listenProductivityUpdated = (
  handler: (snapshot: InsightsSnapshot) => void,
): Promise<() => void> =>
  listen<InsightsSnapshot>('productivity_updated', (event) => {
    handler(event.payload);
  });
