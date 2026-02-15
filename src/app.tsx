import { useCallback, useEffect, useRef, useState } from 'react';
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

async function ensureNotificationPermission(): Promise<boolean> {
  try {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }
    if (!granted) {
      console.warn('Notification permission not granted');
    }
    return granted;
  } catch (error) {
    console.error('Failed to check notification permission', error);
    return false;
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
  isBusy: boolean;
  errorMessage: string | null;
  onSwitchTab: (tab: ActiveTab) => void;
  onStart: () => Promise<void>;
  onResume: () => Promise<void>;
  onReset: () => Promise<void>;
  onSaveSettings: (settings: Settings) => Promise<void>;
}

interface TimerInfoPopoverProps {
  snapshot: TimerSnapshot;
}

function TimerInfoPopover({ snapshot }: TimerInfoPopoverProps) {
  const { messages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }
      if (!popoverRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div
      className={`info-popover ${isOpen ? 'is-open' : ''}`}
      ref={popoverRef}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className="info-popover-button"
        aria-label={messages.timer.infoButtonLabel}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        i
      </button>
      <div className="info-popover-panel" role="tooltip">
        <strong>
          {messages.timer.progress(
            snapshot.cycleCount,
            snapshot.settings.longBreakEvery,
          )}
        </strong>
        <span>{messages.timer.completedFocus(snapshot.cycleCount)}</span>
        <span>{messages.timer.longBreakEvery(snapshot.settings.longBreakEvery)}</span>
      </div>
    </div>
  );
}

function AppContent({
  tab,
  snapshot,
  isBusy,
  errorMessage,
  onSwitchTab,
  onStart,
  onResume,
  onReset,
  onSaveSettings,
}: AppContentProps) {
  const { messages } = useI18n();

  if (!snapshot) {
    return (
      <main className="app-shell">
        {errorMessage ? <p className="app-error">{errorMessage}</p> : messages.loading}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand-block">
          <h1>Pomoduo</h1>
          <TimerInfoPopover snapshot={snapshot} />
        </div>
        <nav className="tabs">
          <button
            className={tab === 'timer' ? 'active' : ''}
            disabled={isBusy}
            onClick={() => onSwitchTab('timer')}
          >
            {messages.tabs.timer}
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            disabled={isBusy}
            onClick={() => onSwitchTab('settings')}
          >
            {messages.tabs.settings}
          </button>
        </nav>
      </header>
      {errorMessage ? (
        <p className="app-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {tab === 'timer' ? (
        <TimerView
          snapshot={snapshot}
          isBusy={isBusy}
          onStart={onStart}
          onResume={onResume}
          onReset={onReset}
        />
      ) : (
        <SettingsView settings={snapshot.settings} isBusy={isBusy} onSave={onSaveSettings} />
      )}
    </main>
  );
}

interface SnapshotActionResult {
  snapshot: TimerSnapshot;
  warningMessage?: string | null;
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error) {
    return error;
  }
  return 'Operation failed';
}

export default function App() {
  const [tab, setTab] = useState<ActiveTab>('timer');
  const [snapshot, setSnapshot] = useState<TimerSnapshot | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const cleanups: Array<() => void> = [];

    const init = async () => {
      try {
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
      } catch (error) {
        if (mounted) {
          setErrorMessage(formatErrorMessage(error));
        }
      }
    };

    void init();

    return () => {
      mounted = false;
      cleanups.forEach((dispose) => dispose());
    };
  }, []);

  const executeSnapshotAction = useCallback(
    async (operation: () => Promise<SnapshotActionResult>) => {
      if (isBusy) {
        return;
      }

      setIsBusy(true);
      setErrorMessage(null);
      try {
        const result = await operation();
        setSnapshot(result.snapshot);
        if (result.warningMessage) {
          setErrorMessage(result.warningMessage);
        }
      } catch (error) {
        setErrorMessage(formatErrorMessage(error));
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy],
  );

  const handleStart = useCallback(async () => {
    await executeSnapshotAction(async () => {
      const warningMessage =
        snapshot?.settings.notifyEnabled && !(await ensureNotificationPermission())
          ? 'Notification permission not granted. System notifications might not appear.'
          : null;
      const nextSnapshot = await timerStart();
      return { snapshot: nextSnapshot, warningMessage };
    });
  }, [executeSnapshotAction, snapshot?.settings.notifyEnabled]);

  const handleResume = useCallback(async () => {
    await executeSnapshotAction(async () => {
      const warningMessage =
        snapshot?.settings.notifyEnabled && !(await ensureNotificationPermission())
          ? 'Notification permission not granted. System notifications might not appear.'
          : null;
      const nextSnapshot = await timerResume();
      return { snapshot: nextSnapshot, warningMessage };
    });
  }, [executeSnapshotAction, snapshot?.settings.notifyEnabled]);

  const handleReset = useCallback(async () => {
    await executeSnapshotAction(async () => ({
      snapshot: await timerReset(),
    }));
  }, [executeSnapshotAction]);

  const handleSaveSettings = useCallback(
    async (settings: Settings) => {
      await executeSnapshotAction(async () => {
        let settingsToSave = settings;
        let warningMessage: string | null = null;
        const shouldRequestPermission =
          !snapshot?.settings.notifyEnabled && settings.notifyEnabled;

        if (shouldRequestPermission && !(await ensureNotificationPermission())) {
          settingsToSave = { ...settings, notifyEnabled: false };
          warningMessage =
            'Notification permission not granted. Notifications remain disabled.';
        }

        const nextSnapshot = await timerUpdateSettings(settingsToSave);
        return { snapshot: nextSnapshot, warningMessage };
      });
    },
    [executeSnapshotAction, snapshot?.settings.notifyEnabled],
  );

  const locale = snapshot?.settings.locale ?? detectPreferredLocale();

  return (
    <I18nProvider locale={locale}>
      <AppContent
        tab={tab}
        snapshot={snapshot}
        isBusy={isBusy}
        errorMessage={errorMessage}
        onSwitchTab={setTab}
        onStart={handleStart}
        onResume={handleResume}
        onReset={handleReset}
        onSaveSettings={handleSaveSettings}
      />
    </I18nProvider>
  );
}
