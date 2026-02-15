use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const ANALYTICS_VERSION: u32 = 1;
pub const HEATMAP_DAYS: usize = 53 * 7;
pub const HISTORY_RETENTION_DAYS: i64 = 400;

const DEFAULT_DAILY_FOCUS_TARGET: u32 = 8;
const DEFAULT_DAILY_LONG_CYCLE_TARGET: u32 = 2;
const DEFAULT_WEEKLY_FOCUS_TARGET: u32 = 40;
const DEFAULT_WEEKLY_LONG_CYCLE_TARGET: u32 = 10;
const DEFAULT_MONTHLY_FOCUS_TARGET: u32 = 160;
const DEFAULT_MONTHLY_LONG_CYCLE_TARGET: u32 = 40;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DailyMetrics {
    pub focus_completed: u32,
    pub long_cycle_completed: u32,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalPair {
    pub focus_target: u32,
    pub long_cycle_target: u32,
}

impl GoalPair {
    pub fn sanitized(self, fallback: GoalPair) -> Self {
        Self {
            focus_target: sanitize_target(self.focus_target, fallback.focus_target),
            long_cycle_target: sanitize_target(self.long_cycle_target, fallback.long_cycle_target),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoalSettings {
    pub daily: GoalPair,
    pub weekly: GoalPair,
    pub monthly: GoalPair,
}

impl Default for GoalSettings {
    fn default() -> Self {
        Self {
            daily: GoalPair {
                focus_target: DEFAULT_DAILY_FOCUS_TARGET,
                long_cycle_target: DEFAULT_DAILY_LONG_CYCLE_TARGET,
            },
            weekly: GoalPair {
                focus_target: DEFAULT_WEEKLY_FOCUS_TARGET,
                long_cycle_target: DEFAULT_WEEKLY_LONG_CYCLE_TARGET,
            },
            monthly: GoalPair {
                focus_target: DEFAULT_MONTHLY_FOCUS_TARGET,
                long_cycle_target: DEFAULT_MONTHLY_LONG_CYCLE_TARGET,
            },
        }
    }
}

impl GoalSettings {
    pub fn sanitized(self) -> Self {
        let fallback = Self::default();
        Self {
            daily: self.daily.sanitized(fallback.daily),
            weekly: self.weekly.sanitized(fallback.weekly),
            monthly: self.monthly.sanitized(fallback.monthly),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyticsState {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub daily: BTreeMap<String, DailyMetrics>,
    #[serde(default)]
    pub goals: GoalSettings,
}

impl Default for AnalyticsState {
    fn default() -> Self {
        Self {
            version: default_version(),
            daily: BTreeMap::new(),
            goals: GoalSettings::default(),
        }
    }
}

impl AnalyticsState {
    pub fn sanitized(self) -> Self {
        Self {
            version: if self.version == 0 {
                ANALYTICS_VERSION
            } else {
                self.version
            },
            daily: self.daily,
            goals: self.goals.sanitized(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeatmapDay {
    pub date: String,
    pub focus_completed: u32,
    pub long_cycle_completed: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodSummary {
    pub focus_completed: u32,
    pub long_cycle_completed: u32,
    pub focus_target: u32,
    pub long_cycle_target: u32,
    pub focus_rate: f64,
    pub long_cycle_rate: f64,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodSummaries {
    pub daily: PeriodSummary,
    pub weekly: PeriodSummary,
    pub monthly: PeriodSummary,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsSnapshot {
    pub heatmap: Vec<HeatmapDay>,
    pub summaries: PeriodSummaries,
    pub goals: GoalSettings,
}

fn default_version() -> u32 {
    ANALYTICS_VERSION
}

fn sanitize_target(value: u32, fallback: u32) -> u32 {
    if value == 0 {
        fallback
    } else {
        value
    }
}
