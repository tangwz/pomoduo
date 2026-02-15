use super::model::{
    AnalyticsState, DailyMetrics, GoalPair, GoalSettings, HeatmapDay, InsightsSnapshot,
    PeriodSummaries, PeriodSummary, HEATMAP_DAYS, HISTORY_RETENTION_DAYS,
};
use chrono::{Datelike, Duration, Local, NaiveDate, Weekday};

const DAY_KEY_FORMAT: &str = "%Y-%m-%d";

pub fn build_insights_snapshot(
    state: &AnalyticsState,
    locale: &str,
    today: NaiveDate,
) -> InsightsSnapshot {
    let summaries = PeriodSummaries {
        daily: period_summary_for_day(state, today),
        weekly: period_summary_for_week(state, locale, today),
        monthly: period_summary_for_month(state, today),
    };

    InsightsSnapshot {
        heatmap: build_heatmap(state, today),
        summaries,
        goals: state.goals.clone(),
    }
}

pub fn current_local_date() -> NaiveDate {
    Local::now().date_naive()
}

pub fn day_key(date: NaiveDate) -> String {
    date.format(DAY_KEY_FORMAT).to_string()
}

pub fn record_focus_completion(
    state: &mut AnalyticsState,
    today: NaiveDate,
    completed_long_cycle: bool,
) {
    let key = day_key(today);
    let entry = state.daily.entry(key).or_default();
    entry.focus_completed = entry.focus_completed.saturating_add(1);
    if completed_long_cycle {
        entry.long_cycle_completed = entry.long_cycle_completed.saturating_add(1);
    }

    prune_history(state, today, HISTORY_RETENTION_DAYS);
}

pub fn update_goals(state: &mut AnalyticsState, goals: GoalSettings) {
    state.goals = goals.sanitized();
}

pub fn prune_history(state: &mut AnalyticsState, today: NaiveDate, retention_days: i64) {
    if retention_days < 1 {
        return;
    }

    let cutoff = today - Duration::days(retention_days - 1);
    state
        .daily
        .retain(|key, _| parse_day_key(key).is_some_and(|date| date >= cutoff));
}

fn build_heatmap(state: &AnalyticsState, today: NaiveDate) -> Vec<HeatmapDay> {
    let mut heatmap = Vec::with_capacity(HEATMAP_DAYS);

    for offset in (0..HEATMAP_DAYS).rev() {
        let date = today - Duration::days(offset as i64);
        let key = day_key(date);
        let metrics = state.daily.get(&key).copied().unwrap_or_default();

        heatmap.push(HeatmapDay {
            date: key,
            focus_completed: metrics.focus_completed,
            long_cycle_completed: metrics.long_cycle_completed,
        });
    }

    heatmap
}

fn period_summary_for_day(state: &AnalyticsState, today: NaiveDate) -> PeriodSummary {
    let key = day_key(today);
    let metrics = state.daily.get(&key).copied().unwrap_or_default();
    build_period_summary(metrics, state.goals.daily)
}

fn period_summary_for_week(
    state: &AnalyticsState,
    locale: &str,
    today: NaiveDate,
) -> PeriodSummary {
    let start = week_start(today, locale);
    let end = start + Duration::days(6);
    let metrics = range_metrics(state, start, end);
    build_period_summary(metrics, state.goals.weekly)
}

fn period_summary_for_month(state: &AnalyticsState, today: NaiveDate) -> PeriodSummary {
    let start = NaiveDate::from_ymd_opt(today.year(), today.month(), 1)
        .expect("month start should always be valid");
    let end = if today.month() == 12 {
        NaiveDate::from_ymd_opt(today.year() + 1, 1, 1)
            .expect("next month start should always be valid")
            - Duration::days(1)
    } else {
        NaiveDate::from_ymd_opt(today.year(), today.month() + 1, 1)
            .expect("next month start should always be valid")
            - Duration::days(1)
    };

    let metrics = range_metrics(state, start, end);
    build_period_summary(metrics, state.goals.monthly)
}

fn range_metrics(state: &AnalyticsState, start: NaiveDate, end: NaiveDate) -> DailyMetrics {
    let mut total = DailyMetrics::default();

    for (key, metrics) in &state.daily {
        if let Some(date) = parse_day_key(key) {
            if date >= start && date <= end {
                total.focus_completed = total
                    .focus_completed
                    .saturating_add(metrics.focus_completed);
                total.long_cycle_completed = total
                    .long_cycle_completed
                    .saturating_add(metrics.long_cycle_completed);
            }
        }
    }

    total
}

fn build_period_summary(metrics: DailyMetrics, goals: GoalPair) -> PeriodSummary {
    let focus_target = goals.focus_target.max(1);
    let long_cycle_target = goals.long_cycle_target.max(1);

    let focus_rate = (metrics.focus_completed as f64 / focus_target as f64).min(1.0);
    let long_cycle_rate = (metrics.long_cycle_completed as f64 / long_cycle_target as f64).min(1.0);

    PeriodSummary {
        focus_completed: metrics.focus_completed,
        long_cycle_completed: metrics.long_cycle_completed,
        focus_target,
        long_cycle_target,
        focus_rate,
        long_cycle_rate,
        completed: metrics.focus_completed >= focus_target
            && metrics.long_cycle_completed >= long_cycle_target,
    }
}

fn week_start(today: NaiveDate, locale: &str) -> NaiveDate {
    let weekday = today.weekday();
    let normalized = locale.trim().replace('_', "-").to_ascii_lowercase();
    let start_weekday = if normalized == "zh" || normalized == "zh-cn" {
        Weekday::Mon
    } else {
        Weekday::Sun
    };

    let offset = days_from_week_start(weekday, start_weekday);
    today - Duration::days(offset)
}

fn days_from_week_start(day: Weekday, week_start: Weekday) -> i64 {
    let day_num = day.num_days_from_monday() as i64;
    let start_num = week_start.num_days_from_monday() as i64;
    (day_num - start_num).rem_euclid(7)
}

fn parse_day_key(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, DAY_KEY_FORMAT).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analytics::model::{AnalyticsState, GoalPair, GoalSettings, HEATMAP_DAYS};
    use std::collections::BTreeMap;

    fn sample_state() -> AnalyticsState {
        AnalyticsState {
            version: 1,
            daily: BTreeMap::new(),
            goals: GoalSettings {
                daily: GoalPair {
                    focus_target: 8,
                    long_cycle_target: 2,
                },
                weekly: GoalPair {
                    focus_target: 40,
                    long_cycle_target: 10,
                },
                monthly: GoalPair {
                    focus_target: 160,
                    long_cycle_target: 40,
                },
            },
        }
    }

    #[test]
    fn heatmap_has_fixed_days_and_fills_missing_days_with_zero() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 15).unwrap();
        let mut state = sample_state();
        state.daily.insert(
            "2026-02-15".to_string(),
            DailyMetrics {
                focus_completed: 3,
                long_cycle_completed: 1,
            },
        );

        let snapshot = build_insights_snapshot(&state, "en-US", today);

        assert_eq!(snapshot.heatmap.len(), HEATMAP_DAYS);
        assert_eq!(snapshot.heatmap.last().unwrap().date, "2026-02-15");
        assert_eq!(snapshot.heatmap.last().unwrap().focus_completed, 3);
        assert_eq!(snapshot.heatmap.first().unwrap().focus_completed, 0);
    }

    #[test]
    fn weekly_summary_respects_locale_week_start() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 11).unwrap(); // Wednesday
        let mut state = sample_state();
        state.daily.insert(
            "2026-02-08".to_string(), // Sunday
            DailyMetrics {
                focus_completed: 2,
                long_cycle_completed: 0,
            },
        );
        state.daily.insert(
            "2026-02-09".to_string(), // Monday
            DailyMetrics {
                focus_completed: 3,
                long_cycle_completed: 1,
            },
        );

        let en = build_insights_snapshot(&state, "en-US", today);
        let zh = build_insights_snapshot(&state, "zh-CN", today);

        assert_eq!(en.summaries.weekly.focus_completed, 5);
        assert_eq!(zh.summaries.weekly.focus_completed, 3);
    }

    #[test]
    fn monthly_summary_handles_month_boundaries() {
        let today = NaiveDate::from_ymd_opt(2026, 3, 1).unwrap();
        let mut state = sample_state();
        state.daily.insert(
            "2026-02-28".to_string(),
            DailyMetrics {
                focus_completed: 7,
                long_cycle_completed: 2,
            },
        );
        state.daily.insert(
            "2026-03-01".to_string(),
            DailyMetrics {
                focus_completed: 4,
                long_cycle_completed: 1,
            },
        );

        let snapshot = build_insights_snapshot(&state, "en-US", today);

        assert_eq!(snapshot.summaries.monthly.focus_completed, 4);
        assert_eq!(snapshot.summaries.monthly.long_cycle_completed, 1);
    }

    #[test]
    fn prune_history_keeps_only_recent_days() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 15).unwrap();
        let mut state = sample_state();
        state.daily.insert(
            "2024-12-31".to_string(),
            DailyMetrics {
                focus_completed: 1,
                long_cycle_completed: 0,
            },
        );
        state.daily.insert(
            "2026-02-15".to_string(),
            DailyMetrics {
                focus_completed: 1,
                long_cycle_completed: 0,
            },
        );

        prune_history(&mut state, today, 400);

        assert_eq!(state.daily.len(), 1);
        assert!(state.daily.contains_key("2026-02-15"));
    }

    #[test]
    fn record_focus_completion_updates_both_metrics_when_long_cycle_completed() {
        let today = NaiveDate::from_ymd_opt(2026, 2, 15).unwrap();
        let mut state = sample_state();

        record_focus_completion(&mut state, today, true);

        let metrics = state.daily.get("2026-02-15").unwrap();
        assert_eq!(metrics.focus_completed, 1);
        assert_eq!(metrics.long_cycle_completed, 1);
    }
}
