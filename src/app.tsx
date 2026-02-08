import { useEffect, useMemo, useState } from 'react';
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';
import SettingsView from './features/settings/SettingsView';
import TimerView from './features/timer/TimerView';
import { detectPreferredLocale, I18nProvider, useI18n } from './i18n';
import {
  listenPhaseCompleted,
  listenTimerTick,
  timerGetState,
  timerReset,
  timerResume,
  timerStart,
  timerUpdateSettings,
} from './features/timer/timerEvents';
import type { Settings, TimerSnapshot } from './features/timer/types';

type ActiveTab = 'timer' | 'settings';

async function ensureNotificationPermission(): Promise<void> {
  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === 'granted';
  }
  if (!granted) {
    console.warn('Notification permission not granted');
  }
}

function playBeep(): void {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'triangle';
  oscillator.frequency.value = 880;
  gain.gain.value = 0.08;

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);

  oscillator.onended = () => {
    void audioContext.close();
  };
}

interface AppContentProps {
  tab: ActiveTab;
  snapshot: TimerSnapshot | null;
  onSwitchTab: (tab: ActiveTab) => void;
  onStart: () => Promise<void>;
  onResume: () => Promise<void>;
  onReset: () => Promise<void>;
  onSaveSettings: (settings: Settings) => Promise<void>;
}

function AppContent({
  tab,
  snapshot,
  onSwitchTab,
  onStart,
  onResume,
  onReset,
  onSaveSettings,
}: AppContentProps) {
  const { messages } = useI18n();

  if (!snapshot) {
    return <main className="app-shell">{messages.loading}</main>;
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>Pomoduo</h1>
        <nav className="tabs">
          <button
            className={tab === 'timer' ? 'active' : ''}
            onClick={() => onSwitchTab('timer')}
          >
            {messages.tabs.timer}
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => onSwitchTab('settings')}
          >
            {messages.tabs.settings}
          </button>
        </nav>
      </header>

      {tab === 'timer' ? (
        <TimerView snapshot={snapshot} onStart={onStart} onResume={onResume} onReset={onReset} />
      ) : (
        <SettingsView settings={snapshot.settings} onSave={onSaveSettings} />
      )}
    </main>
  );
}

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('timer');
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    const cleanups: Array<() => void> = [];

    const init = async () => {
      await ensureNotificationPermission();
      const initialState = await timerGetState();
      if (mounted) {
        setSnapshot(initialState);
      }

      const unlistenTick = await listenTimerTick((nextSnapshot) => {
        if (mounted) {
          setSnapshot(nextSnapshot);
        }
      });
      cleanups.push(unlistenTick);

      const unlistenCompleted = await listenPhaseCompleted((payload) => {
        if (payload.soundEnabled) {
          playBeep();
        }
      });
      cleanups.push(unlistenCompleted);
    };

    void init();

    return () => {
      mounted = false;
      cleanups.forEach((dispose) => dispose());
    };
  }, []);

  const actions = useMemo(
    () => ({
      start: async () => setSnapshot(await timerStart()),
      resume: async () => setSnapshot(await timerResume()),
      reset: async () => setSnapshot(await timerReset()),
      saveSettings: async (settings: Settings) =>
        setSnapshot(await timerUpdateSettings(settings)),
    }),
    [],
  );

  const locale = snapshot?.settings.locale ?? detectPreferredLocale();

  return (
    <I18nProvider locale={locale}>
      <AppContent
        tab={tab}
        snapshot={snapshot}
        onSwitchTab={setTab}
        onStart={actions.start}
        onResume={actions.resume}
        onReset={actions.reset}
        onSaveSettings={actions.saveSettings}
      />
    </I18nProvider>
  );
}
