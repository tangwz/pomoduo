import { useEffect, useState } from 'react';
import { normalizeLocale, useI18n, type LocaleCode } from '../../i18n';
import type { GoalSettings } from '../insights/types';
import type { Settings } from '../timer/types';

interface SettingsViewProps {
  settings: Settings;
  goals: GoalSettings | null;
  isBusy: boolean;
  isGoalBusy: boolean;
  onSave: (settings: Settings) => Promise<void>;
  onSaveGoals: (goals: GoalSettings) => Promise<void>;
}

interface FormState {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  notifyEnabled: boolean;
  soundEnabled: boolean;
  locale: LocaleCode;
}

const MS_PER_MINUTE = 60_000;

function settingsToFormState(settings: Settings): FormState {
  return {
    focusMinutes: Math.max(1, Math.round(settings.focusMs / MS_PER_MINUTE)),
    shortBreakMinutes: Math.max(
      1,
      Math.round(settings.shortBreakMs / MS_PER_MINUTE),
    ),
    longBreakMinutes: Math.max(1, Math.round(settings.longBreakMs / MS_PER_MINUTE)),
    longBreakEvery: Math.max(1, settings.longBreakEvery),
    notifyEnabled: settings.notifyEnabled,
    soundEnabled: settings.soundEnabled,
    locale: normalizeLocale(settings.locale),
  };
}

function sanitizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.round(value));
}

function formStateToSettings(form: FormState, fallback: Settings): Settings {
  const fallbackFocusMinutes = Math.max(
    1,
    Math.round(fallback.focusMs / MS_PER_MINUTE),
  );
  const fallbackShortBreakMinutes = Math.max(
    1,
    Math.round(fallback.shortBreakMs / MS_PER_MINUTE),
  );
  const fallbackLongBreakMinutes = Math.max(
    1,
    Math.round(fallback.longBreakMs / MS_PER_MINUTE),
  );
  return {
    focusMs:
      sanitizePositiveInteger(form.focusMinutes, fallbackFocusMinutes) *
      MS_PER_MINUTE,
    shortBreakMs:
      sanitizePositiveInteger(form.shortBreakMinutes, fallbackShortBreakMinutes) *
      MS_PER_MINUTE,
    longBreakMs:
      sanitizePositiveInteger(form.longBreakMinutes, fallbackLongBreakMinutes) *
      MS_PER_MINUTE,
    longBreakEvery: sanitizePositiveInteger(
      form.longBreakEvery,
      Math.max(1, fallback.longBreakEvery),
    ),
    notifyEnabled: form.notifyEnabled,
    soundEnabled: form.soundEnabled,
    locale: form.locale,
  };
}

function mergeDailyGoalSettings(
  dailyFocusTarget: number,
  fallback: GoalSettings,
): GoalSettings {
  return {
    daily: {
      focusTarget: sanitizePositiveInteger(
        dailyFocusTarget,
        fallback.daily.focusTarget,
      ),
      longCycleTarget: fallback.daily.longCycleTarget,
    },
    weekly: { ...fallback.weekly },
    monthly: { ...fallback.monthly },
  };
}

export default function SettingsView({
  settings,
  goals,
  isBusy,
  isGoalBusy,
  onSave,
  onSaveGoals,
}: SettingsViewProps) {
  const { messages } = useI18n();
  const [form, setForm] = useState<FormState>(settingsToFormState(settings));
  const [dailyGoalTarget, setDailyGoalTarget] = useState<number | null>(
    goals ? goals.daily.focusTarget : null,
  );

  useEffect(() => {
    setForm(settingsToFormState(settings));
  }, [
    settings.focusMs,
    settings.shortBreakMs,
    settings.longBreakMs,
    settings.longBreakEvery,
    settings.notifyEnabled,
    settings.soundEnabled,
    settings.locale,
  ]);

  useEffect(() => {
    setDailyGoalTarget(goals ? goals.daily.focusTarget : null);
  }, [goals]);

  const isSaving = isBusy || isGoalBusy;

  const handleSaveAll = async () => {
    await onSave(formStateToSettings(form, settings));

    if (dailyGoalTarget === null || !goals) {
      return;
    }

    await onSaveGoals(mergeDailyGoalSettings(dailyGoalTarget, goals));
  };

  return (
    <section className="settings-panel">
      <section className="settings-card">
        <section className="settings-section">
          <h3>{messages.settings.generalTitle}</h3>
          <div className="settings-grid">
            <label>
              {messages.settings.focusMinutes}
              <input
                type="number"
                min={1}
                step={1}
                disabled={isSaving}
                value={form.focusMinutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    focusMinutes: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label>
              {messages.settings.shortBreakMinutes}
              <input
                type="number"
                min={1}
                step={1}
                disabled={isSaving}
                value={form.shortBreakMinutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    shortBreakMinutes: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label>
              {messages.settings.longBreakMinutes}
              <input
                type="number"
                min={1}
                step={1}
                disabled={isSaving}
                value={form.longBreakMinutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    longBreakMinutes: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label>
              {messages.settings.longBreakEvery}
              <input
                type="number"
                min={1}
                step={1}
                disabled={isSaving}
                value={form.longBreakEvery}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    longBreakEvery: event.target.valueAsNumber,
                  }))
                }
              />
            </label>
            <label>
              {messages.settings.language}
              <select
                disabled={isSaving}
                value={form.locale}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    locale: normalizeLocale(event.target.value),
                  }))
                }
              >
                <option value="en-US">
                  {messages.settings.languageOptions['en-US']}
                </option>
                <option value="zh-CN">
                  {messages.settings.languageOptions['zh-CN']}
                </option>
              </select>
            </label>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              disabled={isSaving}
              checked={form.notifyEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notifyEnabled: event.target.checked }))
              }
            />
            {messages.settings.notifyEnabled}
          </label>
          <label className="settings-toggle">
            <input
              type="checkbox"
              disabled={isSaving}
              checked={form.soundEnabled}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, soundEnabled: event.target.checked }))
              }
            />
            {messages.settings.soundEnabled}
          </label>
        </section>

        <section className="settings-section">
          <h3>{messages.settings.goalsTitle}</h3>
          {dailyGoalTarget !== null ? (
            <label className="settings-goal-single">
              {messages.settings.dailyPomodoroTarget}
              <input
                type="number"
                min={1}
                step={1}
                disabled={isSaving}
                value={dailyGoalTarget}
                onChange={(event) => setDailyGoalTarget(event.target.valueAsNumber)}
              />
            </label>
          ) : (
            <p className="settings-goals-loading">{messages.settings.goalsLoading}</p>
          )}
        </section>

        <button
          className="settings-save settings-save--primary"
          disabled={isSaving}
          onClick={() => void handleSaveAll()}
        >
          {messages.settings.saveAll}
        </button>
      </section>
    </section>
  );
}
