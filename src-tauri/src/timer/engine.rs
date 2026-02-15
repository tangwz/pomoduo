use crate::storage::state_file::StateFileStore;
use crate::system::notify::Notifier;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

const DEFAULT_FOCUS_MS: i64 = 25 * 60_000;
const DEFAULT_SHORT_BREAK_MS: i64 = 5 * 60_000;
const DEFAULT_LONG_BREAK_MS: i64 = 15 * 60_000;
const DEFAULT_LONG_BREAK_EVERY: u32 = 4;
pub const DEFAULT_LOCALE: &str = "en-US";
pub const ZH_CN_LOCALE: &str = "zh-CN";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Focus,
    ShortBreak,
    LongBreak,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub focus_ms: i64,
    pub short_break_ms: i64,
    pub long_break_ms: i64,
    pub long_break_every: u32,
    pub notify_enabled: bool,
    pub sound_enabled: bool,
    #[serde(default = "default_locale")]
    pub locale: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            focus_ms: DEFAULT_FOCUS_MS,
            short_break_ms: DEFAULT_SHORT_BREAK_MS,
            long_break_ms: DEFAULT_LONG_BREAK_MS,
            long_break_every: DEFAULT_LONG_BREAK_EVERY,
            notify_enabled: true,
            sound_enabled: true,
            locale: default_locale(),
        }
    }
}

impl Settings {
    fn sanitized(self) -> Self {
        Self {
            focus_ms: sanitize_ms(self.focus_ms, DEFAULT_FOCUS_MS),
            short_break_ms: sanitize_ms(self.short_break_ms, DEFAULT_SHORT_BREAK_MS),
            long_break_ms: sanitize_ms(self.long_break_ms, DEFAULT_LONG_BREAK_MS),
            long_break_every: if self.long_break_every == 0 {
                DEFAULT_LONG_BREAK_EVERY
            } else {
                self.long_break_every
            },
            notify_enabled: self.notify_enabled,
            sound_enabled: self.sound_enabled,
            locale: normalize_locale(&self.locale).to_string(),
        }
    }
}

pub fn normalize_locale(locale: &str) -> &'static str {
    let normalized = locale.trim().replace('_', "-").to_ascii_lowercase();
    match normalized.as_str() {
        "zh" | "zh-cn" => ZH_CN_LOCALE,
        _ => DEFAULT_LOCALE,
    }
}

fn default_locale() -> String {
    DEFAULT_LOCALE.to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeState {
    pub phase: Phase,
    pub is_running: bool,
    pub cycle_count: u32,
    pub end_at_ms: Option<i64>,
    pub remaining_ms: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimerSnapshot {
    pub phase: Phase,
    pub is_running: bool,
    pub cycle_count: u32,
    pub end_at_ms: Option<i64>,
    pub remaining_ms: i64,
    pub settings: Settings,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PhaseCompletedPayload {
    finished_phase: Phase,
    next_phase: Phase,
    sound_enabled: bool,
}

#[derive(Debug, Clone)]
struct CompletionMeta {
    finished_phase: Phase,
    next_phase: Phase,
    notify_enabled: bool,
    sound_enabled: bool,
    locale: String,
}

#[derive(Debug, Clone)]
struct TimerState {
    phase: Phase,
    is_running: bool,
    cycle_count: u32,
    end_at_ms: Option<i64>,
    remaining_ms: i64,
    settings: Settings,
}

impl TimerState {
    fn from_storage(settings: Settings, runtime_state: Option<RuntimeState>) -> Self {
        Self::from_storage_at(settings, runtime_state, now_ms())
    }

    fn from_storage_at(settings: Settings, runtime_state: Option<RuntimeState>, now: i64) -> Self {
        let mut state = if let Some(runtime) = runtime_state {
            Self {
                phase: runtime.phase,
                is_running: runtime.is_running,
                cycle_count: runtime.cycle_count,
                end_at_ms: runtime.end_at_ms,
                remaining_ms: runtime.remaining_ms,
                settings,
            }
        } else {
            Self {
                phase: Phase::Focus,
                is_running: false,
                cycle_count: 0,
                end_at_ms: None,
                remaining_ms: settings.focus_ms,
                settings,
            }
        };

        state.remaining_ms = sanitize_ms(
            state.remaining_ms,
            phase_duration_ms(state.phase, &state.settings),
        );

        if state.is_running {
            if let Some(end_at) = state.end_at_ms {
                if end_at <= now {
                    state.complete_current_phase();
                } else {
                    state.remaining_ms = end_at - now;
                }
            } else {
                state.is_running = false;
                state.remaining_ms = phase_duration_ms(state.phase, &state.settings);
            }
        }

        if !state.is_running && state.remaining_ms <= 0 {
            state.remaining_ms = phase_duration_ms(state.phase, &state.settings);
        }

        state
    }

    fn current_remaining_ms(&self, now: i64) -> i64 {
        if self.is_running {
            self.end_at_ms
                .map(|end_at| (end_at - now).max(0))
                .unwrap_or_else(|| self.remaining_ms.max(0))
        } else {
            self.remaining_ms.max(0)
        }
    }

    fn snapshot(&self, now: i64) -> TimerSnapshot {
        TimerSnapshot {
            phase: self.phase,
            is_running: self.is_running,
            cycle_count: self.cycle_count,
            end_at_ms: self.end_at_ms,
            remaining_ms: self.current_remaining_ms(now),
            settings: self.settings.clone(),
        }
    }

    fn to_runtime_state(&self, now: i64) -> RuntimeState {
        RuntimeState {
            phase: self.phase,
            is_running: self.is_running,
            cycle_count: self.cycle_count,
            end_at_ms: self.end_at_ms,
            remaining_ms: self.current_remaining_ms(now),
        }
    }

    fn complete_current_phase(&mut self) -> CompletionMeta {
        let finished_phase = self.phase;

        if finished_phase == Phase::Focus {
            self.cycle_count += 1;
        }

        let next_phase = match finished_phase {
            Phase::Focus => {
                if self.cycle_count > 0
                    && self
                        .cycle_count
                        .is_multiple_of(self.settings.long_break_every)
                {
                    Phase::LongBreak
                } else {
                    Phase::ShortBreak
                }
            }
            Phase::ShortBreak | Phase::LongBreak => Phase::Focus,
        };

        self.phase = next_phase;
        self.is_running = false;
        self.end_at_ms = None;
        self.remaining_ms = phase_duration_ms(self.phase, &self.settings);

        CompletionMeta {
            finished_phase,
            next_phase,
            notify_enabled: self.settings.notify_enabled,
            sound_enabled: self.settings.sound_enabled,
            locale: self.settings.locale.clone(),
        }
    }
}

#[derive(Clone)]
pub struct TimerEngine {
    state: Arc<Mutex<TimerState>>,
    storage: StateFileStore,
    notifier: Notifier,
    worker_started: Arc<AtomicBool>,
}

impl TimerEngine {
    pub fn new(storage: StateFileStore, notifier: Notifier) -> Self {
        let settings = storage.load_settings().unwrap_or_default().sanitized();
        let runtime_state = storage.load_runtime_state();
        let timer_state = TimerState::from_storage(settings, runtime_state);

        let engine = Self {
            state: Arc::new(Mutex::new(timer_state)),
            storage,
            notifier,
            worker_started: Arc::new(AtomicBool::new(false)),
        };

        let snapshot = engine.get_state();
        let _ = engine.storage.save_settings(&snapshot.settings);
        let _ = engine.persist_runtime_state(&RuntimeState {
            phase: snapshot.phase,
            is_running: snapshot.is_running,
            cycle_count: snapshot.cycle_count,
            end_at_ms: snapshot.end_at_ms,
            remaining_ms: snapshot.remaining_ms,
        });

        engine
    }

    pub fn start_worker(&self, app_handle: AppHandle) {
        if self.worker_started.swap(true, Ordering::SeqCst) {
            return;
        }

        let engine = self.clone();
        thread::spawn(move || loop {
            thread::sleep(Duration::from_secs(1));
            engine.handle_tick(&app_handle);
        });
    }

    pub fn get_state(&self) -> TimerSnapshot {
        let now = now_ms();
        let state = self
            .state
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        state.snapshot(now)
    }

    pub fn start(&self) -> Result<TimerSnapshot, String> {
        self.run_or_resume()
    }

    pub fn resume(&self) -> Result<TimerSnapshot, String> {
        self.run_or_resume()
    }

    pub fn reset(&self) -> Result<TimerSnapshot, String> {
        let now = now_ms();
        let (snapshot, runtime_state) = {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());

            state.phase = Phase::Focus;
            state.is_running = false;
            state.cycle_count = 0;
            state.end_at_ms = None;
            state.remaining_ms = state.settings.focus_ms;

            (state.snapshot(now), state.to_runtime_state(now))
        };

        self.persist_runtime_state(&runtime_state)?;

        Ok(snapshot)
    }

    pub fn update_settings(&self, settings: Settings) -> Result<TimerSnapshot, String> {
        let now = now_ms();
        let (snapshot, runtime_state, settings_to_persist) = {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());

            let next_settings = settings.sanitized();
            state.settings = next_settings;

            if state.is_running {
                let remaining = state.current_remaining_ms(now);
                state.end_at_ms = Some(now + remaining);
                state.remaining_ms = remaining;
            } else {
                state.remaining_ms = phase_duration_ms(state.phase, &state.settings);
                state.end_at_ms = None;
            }

            (
                state.snapshot(now),
                state.to_runtime_state(now),
                state.settings.clone(),
            )
        };

        self.persist_settings(&settings_to_persist)?;
        self.persist_runtime_state(&runtime_state)?;

        Ok(snapshot)
    }

    fn run_or_resume(&self) -> Result<TimerSnapshot, String> {
        let now = now_ms();
        let (snapshot, runtime_state) = {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());

            if state.is_running {
                return Ok(state.snapshot(now));
            }

            let remaining = if state.remaining_ms > 0 {
                state.remaining_ms
            } else {
                phase_duration_ms(state.phase, &state.settings)
            };

            state.remaining_ms = remaining;
            state.end_at_ms = Some(now + remaining);
            state.is_running = true;

            (state.snapshot(now), state.to_runtime_state(now))
        };

        self.persist_runtime_state(&runtime_state)?;

        Ok(snapshot)
    }

    fn handle_tick(&self, app: &AppHandle) {
        let now = now_ms();
        let (tick_snapshot, completed, runtime_state) = {
            let mut state = self
                .state
                .lock()
                .unwrap_or_else(|poisoned| poisoned.into_inner());

            if !state.is_running {
                return;
            }

            let remaining = state.current_remaining_ms(now);

            if remaining > 0 {
                state.remaining_ms = remaining;
                (state.snapshot(now), None, None)
            } else {
                let completion = state.complete_current_phase();
                (
                    state.snapshot(now),
                    Some(completion),
                    Some(state.to_runtime_state(now)),
                )
            }
        };

        if let Some(runtime_state) = runtime_state.as_ref() {
            if self.persist_runtime_state(runtime_state).is_err() {
                return;
            }
        }

        let _ = app.emit("timer_tick", tick_snapshot);

        if let Some(completion) = completed {
            if completion.notify_enabled {
                self.notifier.notify_phase_transition(
                    app,
                    completion.finished_phase,
                    completion.next_phase,
                    &completion.locale,
                );
            }

            let _ = app.emit(
                "timer_phase_completed",
                PhaseCompletedPayload {
                    finished_phase: completion.finished_phase,
                    next_phase: completion.next_phase,
                    sound_enabled: completion.sound_enabled,
                },
            );
        }
    }

    fn persist_settings(&self, settings: &Settings) -> Result<(), String> {
        self.storage
            .save_settings(settings)
            .map_err(|err| format!("failed to save settings: {err}"))
    }

    fn persist_runtime_state(&self, runtime_state: &RuntimeState) -> Result<(), String> {
        self.storage
            .save_runtime_state(runtime_state)
            .map_err(|err| format!("failed to save runtime state: {err}"))
    }
}

fn phase_duration_ms(phase: Phase, settings: &Settings) -> i64 {
    match phase {
        Phase::Focus => settings.focus_ms,
        Phase::ShortBreak => settings.short_break_ms,
        Phase::LongBreak => settings.long_break_ms,
    }
}

fn sanitize_ms(ms: i64, fallback: i64) -> i64 {
    if ms < 1_000 {
        fallback
    } else {
        ms
    }
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_NOW_MS: i64 = 1_700_000_000_000;

    fn sample_settings() -> Settings {
        Settings {
            focus_ms: 25 * 60_000,
            short_break_ms: 5 * 60_000,
            long_break_ms: 15 * 60_000,
            long_break_every: 4,
            notify_enabled: true,
            sound_enabled: true,
            locale: DEFAULT_LOCALE.to_string(),
        }
    }

    #[test]
    fn restore_running_timer_with_future_end_at_keeps_running() {
        let settings = sample_settings();
        let runtime = RuntimeState {
            phase: Phase::Focus,
            is_running: true,
            cycle_count: 1,
            end_at_ms: Some(TEST_NOW_MS + 90_000),
            remaining_ms: 12_345,
        };

        let state = TimerState::from_storage_at(settings, Some(runtime), TEST_NOW_MS);

        assert!(state.is_running);
        assert_eq!(state.phase, Phase::Focus);
        assert_eq!(state.end_at_ms, Some(TEST_NOW_MS + 90_000));
        assert_eq!(state.remaining_ms, 90_000);
        assert_eq!(state.cycle_count, 1);
    }

    #[test]
    fn restore_running_timer_without_end_at_falls_back_to_paused_phase_duration() {
        let settings = sample_settings();
        let runtime = RuntimeState {
            phase: Phase::ShortBreak,
            is_running: true,
            cycle_count: 2,
            end_at_ms: None,
            remaining_ms: 30_000,
        };

        let state = TimerState::from_storage_at(settings.clone(), Some(runtime), TEST_NOW_MS);

        assert!(!state.is_running);
        assert_eq!(state.phase, Phase::ShortBreak);
        assert_eq!(state.end_at_ms, None);
        assert_eq!(state.remaining_ms, settings.short_break_ms);
        assert_eq!(state.cycle_count, 2);
    }

    #[test]
    fn restore_expired_focus_advances_to_short_break_and_increments_cycle() {
        let settings = sample_settings();
        let runtime = RuntimeState {
            phase: Phase::Focus,
            is_running: true,
            cycle_count: 0,
            end_at_ms: Some(TEST_NOW_MS - 1),
            remaining_ms: 1_000,
        };

        let state = TimerState::from_storage_at(settings.clone(), Some(runtime), TEST_NOW_MS);

        assert!(!state.is_running);
        assert_eq!(state.phase, Phase::ShortBreak);
        assert_eq!(state.end_at_ms, None);
        assert_eq!(state.remaining_ms, settings.short_break_ms);
        assert_eq!(state.cycle_count, 1);
    }

    #[test]
    fn restore_expired_focus_on_boundary_enters_long_break() {
        let settings = sample_settings();
        let runtime = RuntimeState {
            phase: Phase::Focus,
            is_running: true,
            cycle_count: 3,
            end_at_ms: Some(TEST_NOW_MS - 5),
            remaining_ms: 1_000,
        };

        let state = TimerState::from_storage_at(settings.clone(), Some(runtime), TEST_NOW_MS);

        assert!(!state.is_running);
        assert_eq!(state.phase, Phase::LongBreak);
        assert_eq!(state.end_at_ms, None);
        assert_eq!(state.remaining_ms, settings.long_break_ms);
        assert_eq!(state.cycle_count, 4);
    }

    #[test]
    fn restore_expired_break_returns_to_focus_without_changing_cycle_count() {
        let settings = sample_settings();
        let runtime = RuntimeState {
            phase: Phase::ShortBreak,
            is_running: true,
            cycle_count: 2,
            end_at_ms: Some(TEST_NOW_MS - 10),
            remaining_ms: 2_000,
        };

        let state = TimerState::from_storage_at(settings.clone(), Some(runtime), TEST_NOW_MS);

        assert!(!state.is_running);
        assert_eq!(state.phase, Phase::Focus);
        assert_eq!(state.end_at_ms, None);
        assert_eq!(state.remaining_ms, settings.focus_ms);
        assert_eq!(state.cycle_count, 2);
    }

    #[test]
    fn restore_paused_state_with_non_positive_remaining_resets_to_phase_duration() {
        let settings = sample_settings();
        let runtime = RuntimeState {
            phase: Phase::LongBreak,
            is_running: false,
            cycle_count: 5,
            end_at_ms: None,
            remaining_ms: 0,
        };

        let state = TimerState::from_storage_at(settings.clone(), Some(runtime), TEST_NOW_MS);

        assert!(!state.is_running);
        assert_eq!(state.phase, Phase::LongBreak);
        assert_eq!(state.end_at_ms, None);
        assert_eq!(state.remaining_ms, settings.long_break_ms);
        assert_eq!(state.cycle_count, 5);
    }

    #[test]
    fn normalize_locale_supports_common_aliases() {
        assert_eq!(normalize_locale("zh-CN"), ZH_CN_LOCALE);
        assert_eq!(normalize_locale("zh_cn"), ZH_CN_LOCALE);
        assert_eq!(normalize_locale("zh"), ZH_CN_LOCALE);
        assert_eq!(normalize_locale("en"), DEFAULT_LOCALE);
        assert_eq!(normalize_locale(""), DEFAULT_LOCALE);
    }

    #[test]
    fn settings_deserialization_defaults_locale_for_legacy_payload() {
        let payload = r#"{
            "focusMs": 1500000,
            "shortBreakMs": 300000,
            "longBreakMs": 900000,
            "longBreakEvery": 4,
            "notifyEnabled": true,
            "soundEnabled": true
        }"#;

        let settings: Settings = serde_json::from_str(payload).unwrap();

        assert_eq!(settings.locale, DEFAULT_LOCALE);
    }
}
