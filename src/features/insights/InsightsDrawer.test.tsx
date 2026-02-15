import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../i18n';
import InsightsDrawer from './InsightsDrawer';
import type { HeatmapDay, InsightsSnapshot } from './types';

function dayKeyFromDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function buildHeatmap(length = 371): HeatmapDay[] {
  const start = new Date(Date.UTC(2025, 0, 1));
  return Array.from({ length }, (_, index) => ({
    date: dayKeyFromDate(addDays(start, index)),
    focusCompleted: index % 9,
    longCycleCompleted: index % 3,
  }));
}

function buildSnapshot(): InsightsSnapshot {
  return {
    heatmap: buildHeatmap(),
    summaries: {
      daily: {
        focusCompleted: 6,
        longCycleCompleted: 1,
        focusTarget: 8,
        longCycleTarget: 2,
        focusRate: 0.75,
        longCycleRate: 0.5,
        completed: false,
      },
      weekly: {
        focusCompleted: 38,
        longCycleCompleted: 8,
        focusTarget: 40,
        longCycleTarget: 10,
        focusRate: 0.95,
        longCycleRate: 0.8,
        completed: false,
      },
      monthly: {
        focusCompleted: 142,
        longCycleCompleted: 35,
        focusTarget: 160,
        longCycleTarget: 40,
        focusRate: 0.89,
        longCycleRate: 0.875,
        completed: false,
      },
    },
    goals: {
      daily: { focusTarget: 8, longCycleTarget: 2 },
      weekly: { focusTarget: 40, longCycleTarget: 10 },
      monthly: { focusTarget: 160, longCycleTarget: 40 },
    },
  };
}

function renderDrawer(snapshot = buildSnapshot()) {
  return render(
    <I18nProvider locale="en-US">
      <InsightsDrawer
        isOpen
        snapshot={snapshot}
        errorMessage={null}
        onClose={() => {}}
      />
    </I18nProvider>,
  );
}

describe('InsightsDrawer', () => {
  it('uses weekly dimension by default and switches to daily/monthly', async () => {
    const { container } = renderDrawer();

    const weeklyTab = screen.getByRole('tab', { name: 'Weekly' });
    expect(weeklyTab).toHaveAttribute('aria-selected', 'true');
    expect(container.querySelectorAll('circle[data-series="focus"]')).toHaveLength(12);

    fireEvent.click(screen.getByRole('tab', { name: 'Daily' }));
    await waitFor(() => {
      expect(container.querySelectorAll('circle[data-series="focus"]')).toHaveLength(30);
    });

    fireEvent.click(screen.getByRole('tab', { name: 'Monthly' }));
    await waitFor(() => {
      expect(container.querySelectorAll('circle[data-series="focus"]')).toHaveLength(12);
    });
  });

  it('keeps heatmap visible when switching dimensions', async () => {
    const { container } = renderDrawer();

    expect(
      container.querySelectorAll('.insights-heatmap-grid .insights-heatmap-cell'),
    ).toHaveLength(371);

    fireEvent.click(screen.getByRole('tab', { name: 'Daily' }));

    await waitFor(() => {
      expect(
        container.querySelectorAll('.insights-heatmap-grid .insights-heatmap-cell'),
      ).toHaveLength(371);
    });
  });
});
