mod commands;
mod storage;
mod system;
mod timer;

use commands::{timer_get_state, timer_reset, timer_resume, timer_start, timer_update_settings};
use storage::state_file::StateFileStore;
use system::notify::Notifier;
use tauri::Manager;
use timer::engine::TimerEngine;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let storage = StateFileStore::new(&app_handle);
            let notifier = Notifier;
            let timer_engine = TimerEngine::new(storage, notifier);
            timer_engine.start_worker(app_handle);
            app.manage(timer_engine);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            timer_get_state,
            timer_start,
            timer_resume,
            timer_reset,
            timer_update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
