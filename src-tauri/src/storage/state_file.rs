use crate::timer::engine::{RuntimeState, Settings};
use serde::de::DeserializeOwned;
use serde::Serialize;
use std::fs;
use std::io;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct StateFileStore {
    base_dir: PathBuf,
}

impl StateFileStore {
    pub fn new(app: &AppHandle) -> Self {
        let base_dir = app
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| default_base_dir())
            .join("pomoduo");

        Self { base_dir }
    }

    pub fn load_settings(&self) -> Option<Settings> {
        self.load_json::<Settings>(self.settings_file())
    }

    pub fn save_settings(&self, settings: &Settings) -> io::Result<()> {
        self.save_json(self.settings_file(), settings)
    }

    pub fn load_runtime_state(&self) -> Option<RuntimeState> {
        self.load_json::<RuntimeState>(self.runtime_state_file())
    }

    pub fn save_runtime_state(&self, runtime_state: &RuntimeState) -> io::Result<()> {
        self.save_json(self.runtime_state_file(), runtime_state)
    }

    fn load_json<T: DeserializeOwned>(&self, path: PathBuf) -> Option<T> {
        if !path.exists() {
            return None;
        }

        let text = fs::read_to_string(path).ok()?;
        serde_json::from_str::<T>(&text).ok()
    }

    fn save_json<T: Serialize>(&self, path: PathBuf, value: &T) -> io::Result<()> {
        fs::create_dir_all(&self.base_dir)?;
        let bytes = serde_json::to_vec_pretty(value)
            .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
        fs::write(path, bytes)
    }

    fn settings_file(&self) -> PathBuf {
        self.base_dir.join("settings.json")
    }

    fn runtime_state_file(&self) -> PathBuf {
        self.base_dir.join("runtime_state.json")
    }
}

fn default_base_dir() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join(".pomoduo")
}
