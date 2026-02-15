import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import type { GoalSettings } from '../insights/types';
import SettingsView from './SettingsView';

const sampleSettings = {
  focusMs: 25 * 60_000,
  shortBreakMs: 5 * 60_000,
  longBreakMs: 15 * 60_000,
  longBreakEvery: 4,
  notifyEnabled: true,
  soundEnabled: true,
  locale: 'en-US' as const,
};

const sampleGoals: GoalSettings = {
  daily: { focusTarget: 8, longCycleTarget: 2 },
  weekly: { focusTarget: 40, longCycleTarget: 10 },
  monthly: { focusTarget: 160, longCycleTarget: 40 },
};

describe('SettingsView', () => {
  it('renders merged settings and saves timer and goals with one button', async () => {
    const onSave = vi.fn(async () => {});
    const onSaveGoals = vi.fn(async () => {});

    const { container } = render(
      <I18nProvider locale="en-US">
        <SettingsView
          settings={sampleSettings}
          goals={sampleGoals}
          isBusy={false}
          isGoalBusy={false}
          onSave={onSave}
          onSaveGoals={onSaveGoals}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Goals' })).toBeInTheDocument();

    const goalInputs = container.querySelectorAll('.settings-goals-grid input');
    expect(goalInputs.length).toBe(6);

    fireEvent.change(goalInputs[0] as HTMLInputElement, {
      target: { value: '9' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSaveGoals).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByRole('button', { name: 'Save Goals' })).toBeNull();

    expect(onSaveGoals).toHaveBeenCalledWith(
      expect.objectContaining({
        daily: expect.objectContaining({ focusTarget: 9 }),
      }),
    );
  });
});
