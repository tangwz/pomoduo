import { useEffect, useState } from 'react';
import { normalizeLocale, useI18n, type LocaleCode } from '../../i18n';
import type { GoalSettings, PeriodKey } from '../insights/types';
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

const PERIOD_ORDER: PeriodKey[] = ['daily', 'weekly', 'monthly'];
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

function sanitizeGoalSettings(form: GoalSettings, fallback: GoalSettings): GoalSettings {
  return {
    daily: {
      focusTarget: sanitizePositiveInteger(
        form.daily.focusTarget,
        fallback.daily.focusTarget,
      ),
      longCycleTarget: sanitizePositiveInteger(
        form.daily.longCycleTarget,
        fallback.daily.longCycleTarget,
      ),
    },
    weekly: {
      focusTarget: sanitizePositiveInteger(
        form.weekly.focusTarget,
        fallback.weekly.focusTarget,
      ),
      longCycleTarget: sanitizePositiveInteger(
        form.weekly.longCycleTarget,
        fallback.weekly.longCycleTarget,
      ),
    },
    monthly: {
      focusTarget: sanitizePositiveInteger(
        form.monthly.focusTarget,
        fallback.monthly.focusTarget,
      ),
      longCycleTarget: sanitizePositiveInteger(
        form.monthly.longCycleTarget,
        fallback.monthly.longCycleTarget,
      ),
    },
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
  const [goalForm, setGoalForm] = useState<GoalSettings | null>(goals);

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
    setGoalForm(goals);
  }, [goals]);

  const isSaving = isBusy || isGoalBusy;

  const handleSaveAll = async () => {
    await onSave(formStateToSettings(form, settings));

    if (!goalForm || !goals) {
      return;
    }

    await onSaveGoals(sanitizeGoalSettings(goalForm, goals));
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
          {goalForm ? (
            <div className="settings-goals-grid">
              <div className="settings-goals-head" />
              <div className="settings-goals-head">{messages.settings.focusTarget}</div>
              <div className="settings-goals-head">{messages.settings.longCycleTarget}</div>

              {PERIOD_ORDER.map((period) => (
                <div key={period} className="settings-goals-row">
                  <label className="settings-goals-label">
                    {messages.settings.goalPeriods[period]}
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    disabled={isSaving}
                    value={goalForm[period].focusTarget}
                    onChange={(event) =>
                      setGoalForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              [period]: {
                                ...prev[period],
                                focusTarget: event.target.valueAsNumber,
                              },
                            }
                          : prev,
                      )
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    disabled={isSaving}
                    value={goalForm[period].longCycleTarget}
                    onChange={(event) =>
                      setGoalForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              [period]: {
                                ...prev[period],
                                longCycleTarget: event.target.valueAsNumber,
                              },
                            }
                          : prev,
                      )
                    }
                  />
                </div>
              ))}
            </div>
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
