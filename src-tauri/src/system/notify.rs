use crate::timer::engine::{normalize_locale, Phase, ZH_CN_LOCALE};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

#[derive(Clone, Default)]
pub struct Notifier;

impl Notifier {
    pub fn notify_phase_transition(
        &self,
        app: &AppHandle,
        finished: Phase,
        next: Phase,
        locale: &str,
    ) {
        let normalized_locale = normalize_locale(locale);
        let body = if normalized_locale == ZH_CN_LOCALE {
            format!(
                "{}\u{5DF2}\u{7ED3}\u{675F}\u{FF0C}\u{4E0B}\u{4E00}\u{9636}\u{6BB5}\u{FF1A}{}\u{3002}",
                phase_label_zh_cn(finished),
                phase_label_zh_cn(next)
            )
        } else {
            format!(
                "{} ended. Next: {}.",
                phase_label_en_us(finished),
                phase_label_en_us(next)
            )
        };

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

fn phase_label_en_us(phase: Phase) -> &'static str {
    match phase {
        Phase::Focus => "Focus",
        Phase::ShortBreak => "Short Break",
        Phase::LongBreak => "Long Break",
    }
}

fn phase_label_zh_cn(phase: Phase) -> &'static str {
    match phase {
        Phase::Focus => "\u{4E13}\u{6CE8}",
        Phase::ShortBreak => "\u{77ED}\u{4F11}\u{606F}",
        Phase::LongBreak => "\u{957F}\u{4F11}\u{606F}",
    }
}
