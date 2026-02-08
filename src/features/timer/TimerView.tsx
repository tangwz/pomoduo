import type { TimerSnapshot } from './types';

interface TimerViewProps {
  snapshot: TimerSnapshot;
  onStart: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onSkip: () => Promise<void>;
  onReset: () => Promise<void>;
}

const PHASE_LABELS: Record<TimerSnapshot['phase'], string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

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
  onPause,
  onResume,
  onSkip,
  onReset,
}: TimerViewProps) {
  const isFreshPhase = snapshot.remainingMs >= phaseDurationMs(snapshot);

  return (
    <section className="timer-panel">
      <div className="timer-phase">{PHASE_LABELS[snapshot.phase]}</div>
      <div className="timer-countdown">{formatMs(snapshot.remainingMs)}</div>
      <div className="timer-meta">
        <span>Completed Focus: {snapshot.cycleCount}</span>
        <span>Long Break Every: {snapshot.settings.longBreakEvery}</span>
      </div>
      <div className="timer-actions">
        {snapshot.isRunning ? (
          <button onClick={() => void onPause()}>Pause</button>
        ) : isFreshPhase ? (
          <button onClick={() => void onStart()}>Start</button>
        ) : (
          <button onClick={() => void onResume()}>Resume</button>
        )}
        <button onClick={() => void onSkip()}>Skip</button>
        <button onClick={() => void onReset()}>Reset</button>
      </div>
    </section>
  );
}
