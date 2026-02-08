import { useEffect, useMemo, useState } from 'react';
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';
import SettingsView from './features/settings/SettingsView';
import TimerView from './features/timer/TimerView';
import {
  listenPhaseCompleted,
  listenTimerTick,
  timerGetState,
  timerPause,
  timerReset,
  timerResume,
  timerSkip,
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
      pause: async () => setSnapshot(await timerPause()),
      resume: async () => setSnapshot(await timerResume()),
      skip: async () => setSnapshot(await timerSkip()),
      reset: async () => setSnapshot(await timerReset()),
      saveSettings: async (settings: Settings) =>
        setSnapshot(await timerUpdateSettings(settings)),
    }),
    [],
  );

  if (!snapshot) {
    return <main className="app-shell">Loading...</main>;
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <h1>Pomoduo</h1>
        <nav className="tabs">
          <button
            className={tab === 'timer' ? 'active' : ''}
            onClick={() => setTab('timer')}
          >
            Timer
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      {tab === 'timer' ? (
        <TimerView
          snapshot={snapshot}
          onStart={actions.start}
          onPause={actions.pause}
          onResume={actions.resume}
          onSkip={actions.skip}
          onReset={actions.reset}
        />
      ) : (
        <SettingsView
          settings={snapshot.settings}
          onSave={actions.saveSettings}
        />
      )}
    </main>
  );
}
