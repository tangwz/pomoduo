import { useEffect, useState } from 'react';
import { normalizeLocale, useI18n, type LocaleCode } from '../../i18n';
import type { Settings } from '../timer/types';

interface SettingsViewProps {
  settings: Settings;
  isBusy: boolean;
  onSave: (settings: Settings) => Promise<void>;
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

export default function SettingsView({
  settings,
  isBusy,
  onSave,
}: SettingsViewProps) {
  const { messages } = useI18n();
  const [form, setForm] = useState<FormState>(settingsToFormState(settings));

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

  return (
    <section className="settings-panel">
      <div className="settings-grid">
        <label>
          {messages.settings.focusMinutes}
          <input
            type="number"
            min={1}
            step={1}
            disabled={isBusy}
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
            disabled={isBusy}
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
            disabled={isBusy}
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
            disabled={isBusy}
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
            disabled={isBusy}
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
          disabled={isBusy}
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
          disabled={isBusy}
          checked={form.soundEnabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, soundEnabled: event.target.checked }))
          }
        />
        {messages.settings.soundEnabled}
      </label>
      <button
        className="settings-save"
        disabled={isBusy}
        onClick={() => void onSave(formStateToSettings(form, settings))}
      >
        {messages.settings.save}
      </button>
    </section>
  );
}
