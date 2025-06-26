// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::process::Command;
use std::str;
use tauri_plugin_shell::ShellExt;

#[cfg(target_os = "windows")]
use windows::{
    Media::Control::{
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    },
    core::Result as WindowsResult,
};

#[derive(Serialize, Default)]
struct Metadata {
    artist: String,
    title: String,
    album: String,
}

// Helper for running external commands (Linux)
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
            .map_err(|e| format!("Command failed '{}': {}", command, e))?
            .stdout
    } else {
        Command::new(parts.remove(0))
            .args(parts)
            .output()
            .map_err(|e| format!("Command failed '{}': {}", command, e))?
            .stdout
    };

    String::from_utf8(output).map_err(|e| format!("Invalid UTF-8 output: {}", e))
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
    let active_player = get_active_player(app_handle.clone()).await?;
    let artist = command(app_handle, &format!("playerctl -p {} metadata artist", active_player)).await?.trim().to_string();
    let title = command(app_handle, &format!("playerctl -p {} metadata title", active_player)).await?.trim().to_string();
    let album = command(app_handle, &format!("playerctl -p {} metadata album", active_player)).await?.trim().to_string();

    Ok(Metadata { artist, title, album })
}

#[cfg(target_os = "windows")]
async fn get_current_playing_song_windows() -> Result<Metadata, String> {
    let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
    let session = get_active_session(&gsmtcsm)?;

    let props = session.TryGetMediaPropertiesAsync().map_err(|_| "Unable to get media properties".to_string())?
        .await.map_err(|_| "Unable to load media properties".to_string())?;

    let artist = props.Artist().unwrap_or_default().to_string();
    let title = props.Title().unwrap_or_default().to_string();
    let album = props.AlbumTitle().unwrap_or_default().to_string();

    if artist.is_empty() && title.is_empty() {
        return Err("Play a song to see the lyrics".to_string());
    }

    Ok(Metadata { artist, title, album })
}

#[cfg(target_os = "windows")]
async fn get_system_media_transport_controls_session_manager() -> Result<GlobalSystemMediaTransportControlsSessionManager, String> {
    GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|_| "Unable to request session manager".to_string())?
        .await
        .map_err(|_| "Unable to initialize session manager".to_string())
}

#[cfg(target_os = "windows")]
fn get_active_session(manager: &GlobalSystemMediaTransportControlsSessionManager) -> Result<GlobalSystemMediaTransportControlsSession, String> {
    manager.GetCurrentSession()
        .map_err(|_| "Unable to get current session".to_string())?
        .ok_or_else(|| "No active media session found".to_string())
}

#[tauri::command]
async fn get_current_audio_time(app_handle: tauri::AppHandle) -> Result<f64, String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(app_handle.clone()).await?;
        let output = command(&app_handle, &format!("playerctl -p {} position", active_player)).await?.trim().to_string();

        output.parse::<f64>().map_err(|_| "Unable to parse position".to_string())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        let timeline = session.GetTimelineProperties().map_err(|e| e.to_string())?;
        let position = timeline.Position().map_err(|e| e.to_string())?;
        Ok(position.Duration as f64 / 10_000_000.0)
    }
}

#[tauri::command]
async fn toggle_play(app_handle: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(app_handle.clone()).await?;
        command(&app_handle, &format!("playerctl -p {} play-pause", active_player)).await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        session.TryTogglePlayPauseAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn next_song(app_handle: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(app_handle.clone()).await?;
        command(&app_handle, &format!("playerctl -p {} next", active_player)).await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        session.TrySkipNextAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn previous_song(app_handle: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(app_handle.clone()).await?;
        command(&app_handle, &format!("playerctl -p {} previous", active_player)).await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn is_playing(app_handle: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(app_handle.clone()).await?;
        let status = command(&app_handle, &format!("playerctl -p {} status", active_player)).await?.trim().to_string();
        Ok(status == "Playing")
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        let playback_info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
        Ok(playback_info.PlaybackStatus().map_err(|e| e.to_string())? == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
    }
}

#[tauri::command]
async fn go_to_time(app_handle: tauri::AppHandle, time: f64) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(app_handle.clone()).await?;
        command(&app_handle, &format!("playerctl -p {} position {}", active_player, time)).await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        let position_100ns = (time * 10_000_000.0) as i64;
        session.TryChangePlaybackPositionAsync(position_100ns)
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn check_if_playerctl_exists() -> Result<bool, String> {
    Ok(Command::new("playerctl").arg("--version").output().map(|o| o.status.success()).unwrap_or(false))
}

#[tauri::command]
async fn get_active_player(app_handle: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let output = command(&app_handle, "playerctl -l").await?.trim().to_string();
        let players: Vec<&str> = output.lines().collect();

        if players.is_empty() {
            return Err("No media players detected".to_string());
        }

        for player in &players {
            let status = command(&app_handle, &format!("playerctl -p {} status", player)).await;
            if let Ok(s) = status {
                if s.trim() == "Playing" {
                    return Ok(player.to_string());
                }
            }
        }

        Ok(players[0].to_string())
    }

    #[cfg(target_os = "windows")]
    {
        Ok("windows_media_player".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_current_playing_song,
            get_current_audio_time,
            toggle_play,
            next_song,
            previous_song,
            is_playing,
            go_to_time,
            check_if_playerctl_exists,
            get_active_player,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
