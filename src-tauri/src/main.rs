// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::process::Command;
use std::str;
use serde::Serialize;
use std::sync::Mutex;
use std::collections::HashMap;
#[cfg(target_os = "windows")]
use windows::{
    core::*,
    Media::Control::*,
    Foundation::IAsyncOperation,
};

struct AppState {
    previous_positions: Mutex<HashMap<usize, f64>>,
}

fn command(command: &str) -> String {
  let mut parts = command.split_whitespace().collect::<Vec<&str>>();

  let stdout = Command::new(parts.remove(0))
      .args(parts)
      .output()
      .unwrap_or_else(|_| panic!("Failed to execute command '{}'", command))
      .stdout;

  String::from_utf8(stdout).expect("Stdout was not valid UTF-8")
}

#[derive(Serialize, Default)]
struct Metadata {
  artist: String,
  title: String,
  album: String,
}

#[tauri::command]
async fn get_current_playing_song() -> Result<Metadata, String> {
  #[cfg(target_os = "linux")]
  {
      get_current_playing_song_linux()
  }

  #[cfg(target_os = "windows")]
  {
      get_current_playing_song_windows().await
  }
}

#[cfg(target_os = "linux")]
fn get_current_playing_song_linux() -> Result<Metadata, String> {
  let artist = command(&format!("playerctl metadata artist"));
  let title = command(&format!("playerctl metadata title"));
  let album = command(&format!("playerctl metadata album"));

  Ok(Metadata {
      artist: artist.trim().to_string(),
      title: title.trim().to_string(),
      album: album.trim().to_string(),
  })
}

#[cfg(target_os = "windows")]
async fn get_current_playing_song_windows() -> Result<Metadata, String> {
  let gsmtcsm = get_system_media_transport_controls_session_manager().await.map_err(|e| e.to_string())?;
  if let Some(session) = gsmtcsm.GetCurrentSession().map_err(|e| e.to_string())? {
      let media_properties = get_media_properties(&session).await.map_err(|e| e.to_string())?;

      let artist = media_properties.Artist().map_err(|e| e.to_string())?;
      let title = media_properties.Title().map_err(|e| e.to_string())?;
      let album = media_properties.AlbumTitle().map_err(|e| e.to_string())?;

      Ok(Metadata {
          artist: artist.to_string(),
          title: title.to_string(),
          album: album.to_string(),
      })
  } else {
      Err("No current media session found.".to_string())
  }
}

#[cfg(target_os = "windows")]
async fn get_system_media_transport_controls_session_manager() -> Result<GlobalSystemMediaTransportControlsSessionManager> {
  GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.await
}

#[cfg(target_os = "windows")]
async fn get_media_properties(session: &GlobalSystemMediaTransportControlsSession) -> Result<GlobalSystemMediaTransportControlsSessionMediaProperties> {
  session.TryGetMediaPropertiesAsync()?.await
}

#[tauri::command]
fn get_current_audio_time(state: tauri::State<AppState>) -> f64 {
    let output = command("playerctl position -a");

    let trimmed_output = output.trim();

    if trimmed_output.is_empty() {
        return 0.00;
    }

    let mut current_positions: Vec<f64> = Vec::new();

    for line in trimmed_output.lines() {
        match line.parse::<f64>() {
            Ok(value) => current_positions.push(value),
            Err(_) => return 0.00,
        }
    }

    if current_positions.is_empty() {
        return 0.00;
    }

    let mut prev_positions = state.previous_positions.lock().unwrap();
    let mut changed_positions: Vec<f64> = Vec::new();

    for (index, &current_position) in current_positions.iter().enumerate() {
        if let Some(&prev_position) = prev_positions.get(&index) {
            if (current_position - prev_position).abs() > 0.000001 {
                changed_positions.push(current_position);
            }
        }
        prev_positions.insert(index, current_position);
    }

    // Return the first changing position found, or 0.0 if none are found
    if let Some(&changing_position) = changed_positions.first() {
        changing_position
    } else {
        0.00
    }
}

#[tauri::command]
fn next_song() {
  command(&format!("playerctl next"));
}

#[tauri::command]
fn previous_song() {
  command(&format!("playerctl previous"));
}

#[tauri::command]
fn toggle_play() {
  command(&format!("playerctl play-pause"));
}

#[tauri::command]
fn is_playing() -> bool {
  let status = command(&format!("playerctl status"));
  status.trim() == "Playing"
}

#[tauri::command]
fn go_to_time(time: f64) {
  command(&format!("playerctl position {}", time));
}

#[tauri::command]
fn check_if_playerctl_exists() -> bool {
     let output = Command::new("playerctl")
        .arg("--version")
        .output()
        .expect("Failed to execute process");

    output.status.success()
}

fn main() {
  tauri::Builder::default()
      .manage(AppState {
                previous_positions: Mutex::new(HashMap::new()),
            })
      .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![get_current_playing_song, get_current_audio_time, next_song, previous_song, toggle_play, is_playing, go_to_time, check_if_playerctl_exists])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
