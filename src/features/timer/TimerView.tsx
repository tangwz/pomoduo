import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import type { TimerSnapshot } from './types';

interface TimerViewProps {
  snapshot: TimerSnapshot;
  onStart: () => Promise<void>;
  onResume: () => Promise<void>;
  onReset: () => Promise<void>;
}

function phaseDurationMs(snapshot: TimerSnapshot): number {
  switch (snapshot.phase) {
    case 'focus':
      return snapshot.settings.focusMs;
    case 'shortBreak':
      return snapshot.settings.shortBreakMs;
    case 'longBreak':
      return snapshot.settings.longBreakMs;
    default:
      return snapshot.settings.focusMs;
  }
}

function formatMs(ms: number): string {
  const totalSeconds = Math.ceil(Math.max(ms, 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function TimerView({
  snapshot,
  onStart,
  onResume,
  onReset,
}: TimerViewProps) {
  const { messages } = useI18n();
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const phaseDuration = Math.max(phaseDurationMs(snapshot), 1);
  const liveRemainingMs =
    snapshot.isRunning && snapshot.endAtMs !== null
      ? Math.max(snapshot.endAtMs - nowMs, 0)
      : snapshot.remainingMs;
  const isFreshPhase = snapshot.remainingMs >= phaseDuration;
  const remainingRatio = Math.min(
    1,
    Math.max(liveRemainingMs / phaseDuration, 0),
  );
  const elapsedRatio = 1 - remainingRatio;
  const ringRadius = 46;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringVisibleLength = ringCircumference * elapsedRatio;
  const actionLabel = snapshot.isRunning
    ? messages.timer.actions.abandon
    : isFreshPhase
      ? messages.timer.actions.start
      : messages.timer.actions.resume;

  useEffect(() => {
    setNowMs(Date.now());
    if (!snapshot.isRunning || snapshot.endAtMs === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 200);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [snapshot.isRunning, snapshot.endAtMs]);

  const handlePrimaryAction = async (): Promise<void> => {
    if (snapshot.isRunning) {
      await onReset();
      return;
    }

    if (isFreshPhase) {
      await onStart();
      return;
    }

    await onResume();
  };

  return (
    <section className="timer-panel">
      <div className="timer-phase">{messages.timer.phaseLabels[snapshot.phase]}</div>
      <div className="tomato-timer">
        <svg
          className="timer-ring"
          viewBox="0 0 100 100"
          role="presentation"
          aria-hidden="true"
        >
          <circle className="timer-ring-track" cx="50" cy="50" r="46" />
          <circle
            className="timer-ring-value"
            cx="50"
            cy="50"
            r={ringRadius}
            strokeDasharray={`${ringVisibleLength} ${ringCircumference}`}
          />
        </svg>
        <div className="tomato-leaf" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="tomato-core">
          <div className="timer-countdown">{formatMs(liveRemainingMs)}</div>
        </div>
      </div>
      <div className="timer-actions timer-actions--single">
        <button
          className={`timer-primary ${
            snapshot.isRunning ? 'timer-primary--danger' : 'timer-primary--start'
          }`}
          onClick={() => void handlePrimaryAction()}
        >
          {actionLabel}
        </button>
      </div>
    </section>
  );
}
