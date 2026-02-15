export type PeriodKey = 'daily' | 'weekly' | 'monthly';
export type ChartDimension = PeriodKey;

export interface GoalPair {
  focusTarget: number;
  longCycleTarget: number;
}

export interface GoalSettings {
  daily: GoalPair;
  weekly: GoalPair;
  monthly: GoalPair;
}

export interface HeatmapDay {
  date: string;
  focusCompleted: number;
  longCycleCompleted: number;
}

export interface PeriodSummary {
  focusCompleted: number;
  longCycleCompleted: number;
  focusTarget: number;
  longCycleTarget: number;
  focusRate: number;
  longCycleRate: number;
  completed: boolean;
}

export interface PeriodSummaries {
  daily: PeriodSummary;
  weekly: PeriodSummary;
  monthly: PeriodSummary;
}

export interface InsightsSnapshot {
  heatmap: HeatmapDay[];
  summaries: PeriodSummaries;
  goals: GoalSettings;
}

export interface TrendPoint {
  key: string;
  label: string;
  focusCompleted: number;
  longCycleCompleted: number;
}
