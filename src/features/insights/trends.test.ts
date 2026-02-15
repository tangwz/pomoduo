import { describe, expect, it } from 'vitest';
import type { HeatmapDay } from './types';
import { buildTrendSeries } from './trends';

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

function buildSequentialHeatmap(length: number): HeatmapDay[] {
  const start = new Date(Date.UTC(2025, 0, 1));
  return Array.from({ length }, (_, index) => ({
    date: dayKeyFromDate(addDays(start, index)),
    focusCompleted: index % 5,
    longCycleCompleted: index % 2,
  }));
}

describe('buildTrendSeries', () => {
  it('returns daily series with 30 points in chronological order', () => {
    const heatmap = buildSequentialHeatmap(40);

    const series = buildTrendSeries(heatmap, 'daily', 'en-US');

    expect(series).toHaveLength(30);
    expect(series[0]?.key).toBe(heatmap[10]?.date);
    expect(series[29]?.key).toBe(heatmap[39]?.date);
  });

  it('aggregates weekly with locale-aware week start', () => {
    const heatmap: HeatmapDay[] = [
      { date: '2026-02-08', focusCompleted: 2, longCycleCompleted: 0 },
      { date: '2026-02-09', focusCompleted: 3, longCycleCompleted: 1 },
    ];

    const enSeries = buildTrendSeries(heatmap, 'weekly', 'en-US');
    const zhSeries = buildTrendSeries(heatmap, 'weekly', 'zh-CN');

    expect(enSeries).toHaveLength(1);
    expect(enSeries[0]?.focusCompleted).toBe(5);
    expect(enSeries[0]?.longCycleCompleted).toBe(1);

    expect(zhSeries).toHaveLength(2);
    expect(zhSeries[0]?.focusCompleted).toBe(2);
    expect(zhSeries[1]?.focusCompleted).toBe(3);
  });

  it('aggregates monthly across year boundary', () => {
    const heatmap: HeatmapDay[] = [
      { date: '2026-12-30', focusCompleted: 2, longCycleCompleted: 1 },
      { date: '2026-12-31', focusCompleted: 1, longCycleCompleted: 0 },
      { date: '2027-01-01', focusCompleted: 4, longCycleCompleted: 1 },
    ];

    const series = buildTrendSeries(heatmap, 'monthly', 'en-US');

    expect(series).toHaveLength(2);
    expect(series[0]?.key).toBe('2026-12');
    expect(series[0]?.focusCompleted).toBe(3);
    expect(series[1]?.key).toBe('2027-01');
    expect(series[1]?.focusCompleted).toBe(4);
    expect(series[1]?.longCycleCompleted).toBe(1);
  });

  it('aggregates both focus and long-cycle in the same bucket', () => {
    const heatmap: HeatmapDay[] = [
      { date: '2026-01-05', focusCompleted: 1, longCycleCompleted: 1 },
      { date: '2026-01-06', focusCompleted: 3, longCycleCompleted: 0 },
      { date: '2026-01-07', focusCompleted: 2, longCycleCompleted: 1 },
    ];

    const series = buildTrendSeries(heatmap, 'weekly', 'en-US');

    expect(series).toHaveLength(1);
    expect(series[0]?.focusCompleted).toBe(6);
    expect(series[0]?.longCycleCompleted).toBe(2);
  });
});
