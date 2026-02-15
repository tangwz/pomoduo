import type { LocaleCode } from '../../i18n';
import type { ChartDimension, HeatmapDay, TrendPoint } from './types';

const DAILY_WINDOW = 30;
const WEEKLY_WINDOW = 12;
const MONTHLY_WINDOW = 12;

interface DayParts {
  year: number;
  month: number;
  day: number;
}

interface TrendBucket {
  key: string;
  focusCompleted: number;
  longCycleCompleted: number;
}

export function buildTrendSeries(
  heatmap: HeatmapDay[],
  dimension: ChartDimension,
  locale: LocaleCode,
): TrendPoint[] {
  switch (dimension) {
    case 'daily':
      return aggregateDaily(heatmap, DAILY_WINDOW);
    case 'weekly':
      return aggregateWeekly(heatmap, locale, WEEKLY_WINDOW);
    case 'monthly':
      return aggregateMonthly(heatmap, MONTHLY_WINDOW);
    default:
      return [];
  }
}

export function aggregateDaily(
  heatmap: HeatmapDay[],
  window = DAILY_WINDOW,
): TrendPoint[] {
  return sortedHeatmap(heatmap)
    .slice(-window)
    .map((item) => ({
      key: item.date,
      label: formatLabel(item.date, 'daily'),
      focusCompleted: item.focusCompleted,
      longCycleCompleted: item.longCycleCompleted,
    }));
}

export function aggregateWeekly(
  heatmap: HeatmapDay[],
  locale: LocaleCode,
  window = WEEKLY_WINDOW,
): TrendPoint[] {
  const weekBuckets = new Map<string, TrendBucket>();
  const isMondayStart = locale === 'zh-CN';

  for (const item of sortedHeatmap(heatmap)) {
    const weekKey = weekStartKey(item.date, isMondayStart);
    const bucket = weekBuckets.get(weekKey) ?? {
      key: weekKey,
      focusCompleted: 0,
      longCycleCompleted: 0,
    };
    bucket.focusCompleted += item.focusCompleted;
    bucket.longCycleCompleted += item.longCycleCompleted;
    weekBuckets.set(weekKey, bucket);
  }

  return Array.from(weekBuckets.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-window)
    .map((item) => ({
      key: item.key,
      label: formatLabel(item.key, 'weekly'),
      focusCompleted: item.focusCompleted,
      longCycleCompleted: item.longCycleCompleted,
    }));
}

export function aggregateMonthly(
  heatmap: HeatmapDay[],
  window = MONTHLY_WINDOW,
): TrendPoint[] {
  const monthBuckets = new Map<string, TrendBucket>();

  for (const item of sortedHeatmap(heatmap)) {
    const monthKey = item.date.slice(0, 7);
    const bucket = monthBuckets.get(monthKey) ?? {
      key: monthKey,
      focusCompleted: 0,
      longCycleCompleted: 0,
    };
    bucket.focusCompleted += item.focusCompleted;
    bucket.longCycleCompleted += item.longCycleCompleted;
    monthBuckets.set(monthKey, bucket);
  }

  return Array.from(monthBuckets.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-window)
    .map((item) => ({
      key: item.key,
      label: formatLabel(item.key, 'monthly'),
      focusCompleted: item.focusCompleted,
      longCycleCompleted: item.longCycleCompleted,
    }));
}

export function formatLabel(key: string, dimension: ChartDimension): string {
  switch (dimension) {
    case 'daily':
      return key.slice(5);
    case 'weekly':
      return `W ${key.slice(5)}`;
    case 'monthly':
      return key;
    default:
      return key;
  }
}

function sortedHeatmap(heatmap: HeatmapDay[]): HeatmapDay[] {
  return [...heatmap].sort((a, b) => a.date.localeCompare(b.date));
}

function weekStartKey(dayKey: string, mondayStart: boolean): string {
  const day = parseDayKey(dayKey);
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day));
  const weekday = date.getUTCDay();
  const offset = mondayStart ? (weekday + 6) % 7 : weekday;
  date.setUTCDate(date.getUTCDate() - offset);
  return toDayKey({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

function parseDayKey(value: string): DayParts {
  const [year, month, day] = value.split('-').map((part) => Number.parseInt(part, 10));
  return { year, month, day };
}

function toDayKey(parts: DayParts): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}
