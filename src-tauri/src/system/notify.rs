use crate::timer::engine::Phase;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

#[derive(Clone, Default)]
pub struct Notifier;

impl Notifier {
    pub fn notify_phase_transition(&self, app: &AppHandle, finished: Phase, next: Phase) {
        let body = format!(
            "{} ended. Next: {}.",
            finished.as_label(),
            next.as_label()
        );

        if let Err(error) = app
            .notification()
            .builder()
            .title("Pomoduo")
            .body(&body)
            .show()
        {
            eprintln!("failed to show notification: {error}");
        }
    }
}
