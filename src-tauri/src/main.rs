// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::process::Command;
use std::str;
use serde::Serialize;
use std::sync::Mutex;
use std::collections::HashMap;
use tauri_plugin_shell::ShellExt;
#[cfg(target_os = "windows")]
use windows::{
    core::*,
    Media::Control::*,
    Foundation::IAsyncOperation,
};

struct AppState {
    previous_positions: Mutex<HashMap<usize, f64>>,
}

async fn command(app_handle: &tauri::AppHandle, command: &str) -> Result<String, String> {
    let mut parts = command.split_whitespace().collect::<Vec<&str>>();
    
    let output = if parts[0] == "playerctl" {
        app_handle
            .shell()
            .sidecar("playerctl")
            .map_err(|e| format!("Failed to create playerctl sidecar: {}", e))?
            .args(&parts[1..])
            .output()
            .await
            .map_err(|e| format!("Failed to execute command '{}': {}", command, e))?
            .stdout
    } else {
        Command::new(parts.remove(0))
            .args(parts)
            .output()
            .map_err(|e| format!("Failed to execute command '{}': {}", command, e))?
            .stdout
    };

    String::from_utf8(output)
        .map_err(|e| format!("Invalid UTF-8 output: {}", e))
}

#[derive(Serialize, Default)]
struct Metadata {
  artist: String,
  title: String,
  album: String,
}

#[tauri::command]
async fn get_current_playing_song(app_handle: tauri::AppHandle) -> Result<Metadata, String> {
    #[cfg(target_os = "linux")]
    {
        get_current_playing_song_linux(&app_handle).await
    }

    #[cfg(target_os = "windows")]
    {
        get_current_playing_song_windows().await
    }
}

#[cfg(target_os = "linux")]
async fn get_current_playing_song_linux(app_handle: &tauri::AppHandle) -> Result<Metadata, String> {
    let artist = command(app_handle, "playerctl metadata artist").await?;
    let title = command(app_handle, "playerctl metadata title").await?;
    let album = command(app_handle, "playerctl metadata album").await?;

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
async fn get_current_audio_time(app_handle: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<f64, String> {
    let output = command(&app_handle, "playerctl position -a").await?;
    let trimmed_output = output.trim();

    if trimmed_output.is_empty() {
        return Ok(0.00);
    }

    let mut current_positions: Vec<f64> = Vec::new();

    for line in trimmed_output.lines() {
        match line.parse::<f64>() {
            Ok(value) => current_positions.push(value),
            Err(_) => return Ok(0.00),
        }
    }

    if current_positions.is_empty() {
        return Ok(0.00);
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

    Ok(changed_positions.first().copied().unwrap_or(0.00))
}

#[tauri::command]
async fn next_song(app_handle: tauri::AppHandle) -> Result<(), String> {
    command(&app_handle, "playerctl next").await?;
    Ok(())
}

#[tauri::command]
async fn previous_song(app_handle: tauri::AppHandle) -> Result<(), String> {
    command(&app_handle, "playerctl previous").await?;
    Ok(())
}

#[tauri::command]
async fn toggle_play(app_handle: tauri::AppHandle) -> Result<(), String> {
    command(&app_handle, "playerctl play-pause").await?;
    Ok(())
}

#[tauri::command]
async fn is_playing(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let status = command(&app_handle, "playerctl status").await?;
    Ok(status.trim() == "Playing")
}

#[tauri::command]
async fn go_to_time(app_handle: tauri::AppHandle, time: f64) -> Result<(), String> {
    command(&app_handle, &format!("playerctl position {}", time)).await?;
    Ok(())
}

#[tauri::command]
async fn check_if_playerctl_exists() -> Result<bool, String> {
    let output = Command::new("playerctl")
        .arg("--version")
        .output()
        .map_err(|e| e.to_string())?;

    Ok(output.status.success())
}

fn main() {
  tauri::Builder::default()
      .manage(AppState {
                previous_positions: Mutex::new(HashMap::new()),
            })
      .plugin(tauri_plugin_shell::init())
      .plugin(tauri_plugin_notification::init())
    .invoke_handler(tauri::generate_handler![get_current_playing_song, get_current_audio_time, next_song, previous_song, toggle_play, is_playing, go_to_time, check_if_playerctl_exists])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
