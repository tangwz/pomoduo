use crate::timer::engine::{Settings, TimerEngine, TimerSnapshot};
use tauri::State;

#[tauri::command]
pub fn timer_get_state(engine: State<'_, TimerEngine>) -> Result<TimerSnapshot, String> {
    Ok(engine.get_state())
}

#[tauri::command]
pub fn timer_start(engine: State<'_, TimerEngine>) -> Result<TimerSnapshot, String> {
    engine.start()
}

#[tauri::command]
pub fn timer_pause(engine: State<'_, TimerEngine>) -> Result<TimerSnapshot, String> {
    engine.pause()
}

#[tauri::command]
pub fn timer_resume(engine: State<'_, TimerEngine>) -> Result<TimerSnapshot, String> {
    engine.resume()
}

#[tauri::command]
pub fn timer_skip(engine: State<'_, TimerEngine>) -> Result<TimerSnapshot, String> {
    engine.skip()
}

#[tauri::command]
pub fn timer_reset(engine: State<'_, TimerEngine>) -> Result<TimerSnapshot, String> {
    engine.reset()
}

#[tauri::command]
pub fn timer_update_settings(
    settings: Settings,
    engine: State<'_, TimerEngine>,
) -> Result<TimerSnapshot, String> {
    engine.update_settings(settings)
}
