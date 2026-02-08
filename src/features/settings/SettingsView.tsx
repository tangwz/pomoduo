import { useEffect, useState } from 'react';
import type { Settings } from '../timer/types';

interface SettingsViewProps {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
}

interface FormState {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  notifyEnabled: boolean;
  soundEnabled: boolean;
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
  };
}

function formStateToSettings(form: FormState): Settings {
  return {
    focusMs: Math.max(1, form.focusMinutes) * MS_PER_MINUTE,
    shortBreakMs: Math.max(1, form.shortBreakMinutes) * MS_PER_MINUTE,
    longBreakMs: Math.max(1, form.longBreakMinutes) * MS_PER_MINUTE,
    longBreakEvery: Math.max(1, form.longBreakEvery),
    notifyEnabled: form.notifyEnabled,
    soundEnabled: form.soundEnabled,
  };
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [form, setForm] = useState<FormState>(settingsToFormState(settings));

  useEffect(() => {
    setForm(settingsToFormState(settings));
  }, [settings]);

  return (
    <section className="settings-panel">
      <div className="settings-grid">
        <label>
          Focus (minutes)
          <input
            type="number"
            min={1}
            value={form.focusMinutes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                focusMinutes: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          Short Break (minutes)
          <input
            type="number"
            min={1}
            value={form.shortBreakMinutes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                shortBreakMinutes: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          Long Break (minutes)
          <input
            type="number"
            min={1}
            value={form.longBreakMinutes}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                longBreakMinutes: Number(event.target.value),
              }))
            }
          />
        </label>
        <label>
          Long Break Every
          <input
            type="number"
            min={1}
            value={form.longBreakEvery}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                longBreakEvery: Number(event.target.value),
              }))
            }
          />
        </label>
      </div>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={form.notifyEnabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, notifyEnabled: event.target.checked }))
          }
        />
        Enable Notifications
      </label>
      <label className="settings-toggle">
        <input
          type="checkbox"
          checked={form.soundEnabled}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, soundEnabled: event.target.checked }))
          }
        />
        Enable Sound
      </label>
      <button
        className="settings-save"
        onClick={() => void onSave(formStateToSettings(form))}
      >
        Save Settings
      </button>
    </section>
  );
}
