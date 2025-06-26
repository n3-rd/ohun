// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::process::Command;
use std::str;
use std::sync::Mutex;
use tauri_plugin_shell::ShellExt;

// Global state to remember the last active player
static LAST_ACTIVE_PLAYER: Mutex<Option<String>> = Mutex::new(None);

#[cfg(target_os = "windows")]
use windows::{
    Media::Control::{
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    },
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

    let result = String::from_utf8(output).map_err(|e| format!("Invalid UTF-8 output: {}", e))?;
    
    // Check if the result looks like help text or error output
    if result.contains("Usage:") || result.contains("Help Options:") || result.contains("Available Commands:") {
        return Err("Command returned help text instead of expected output".to_string());
    }
    
    Ok(result)
}

#[tauri::command]
async fn get_current_playing_song(_app_handle: tauri::AppHandle) -> Result<Metadata, String> {
    #[cfg(target_os = "linux")]
    {
        get_current_playing_song_linux(&_app_handle).await
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
    let session = manager.GetCurrentSession()
        .map_err(|_| "Unable to get current session".to_string())?;
    
    if let Some(session) = session {
        Ok(session)
    } else {
        Err("No active media session found".to_string())
    }
}

#[tauri::command]
async fn get_current_audio_time(_app_handle: tauri::AppHandle) -> Result<f64, String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(_app_handle.clone()).await?;
        let output = command(&_app_handle, &format!("playerctl -p {} position", active_player)).await?.trim().to_string();

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
        session.TryTogglePlayPauseAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
        Ok(())
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
        session.TrySkipNextAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
        Ok(())
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
        session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
async fn is_playing(_app_handle: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        let active_player = get_active_player(_app_handle.clone()).await?;
        let status = command(&_app_handle, &format!("playerctl -p {} status", active_player)).await?.trim().to_string();
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
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[tauri::command]
async fn check_if_playerctl_exists() -> Result<bool, String> {
    Ok(Command::new("playerctl").arg("--version").output().map(|o| o.status.success()).unwrap_or(false))
}

#[tauri::command]
async fn get_player_status(_app_handle: tauri::AppHandle, _player: String) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let status = command(&_app_handle, &format!("playerctl -p {} status", _player)).await;
        match status {
            Ok(s) => {
                let trimmed = s.trim();
                // Check if the output looks like a valid status
                match trimmed {
                    "Playing" | "Paused" | "Stopped" => Ok(trimmed.to_string()),
                    _ => {
                        // If it's not a valid status (like help text or error), return Unknown
                        if trimmed.contains("Usage:") || trimmed.contains("Help Options:") || trimmed.len() > 50 {
                            Ok("Unknown".to_string())
                        } else {
                            Ok(trimmed.to_string())
                        }
                    }
                }
            },
            Err(_) => Ok("Unknown".to_string())
        }
    }

    #[cfg(target_os = "windows")]
    {
        // For Windows, we'll just return the status of the current session
        let gsmtcsm = get_system_media_transport_controls_session_manager().await?;
        let session = get_active_session(&gsmtcsm)?;
        let playback_info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
        let status = playback_info.PlaybackStatus().map_err(|e| e.to_string())?;
        
        let status_str = match status {
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing => "Playing",
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused => "Paused",
            GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped => "Stopped",
            _ => "Unknown"
        };
        
        Ok(status_str.to_string())
    }
}

#[tauri::command]
async fn get_available_players(_app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    #[cfg(target_os = "linux")]
    {
        let output = command(&_app_handle, "playerctl -l").await?.trim().to_string();
        let all_players: Vec<String> = output.lines().map(|s| s.to_string()).collect();
        
        // Filter out players that don't have valid status
        let mut valid_players = Vec::new();
        for player in all_players {
            // Skip extremely long or suspicious player names
            if player.len() > 100 || player.contains("Usage:") || player.contains("COMMAND") {
                continue;
            }
            
            // Test if the player responds with a valid status
            let status_result = command(&_app_handle, &format!("playerctl -p {} status", player)).await;
            if let Ok(status) = status_result {
                let trimmed_status = status.trim();
                // Only include players that return valid status or reasonable errors
                if !trimmed_status.contains("Usage:") && 
                   !trimmed_status.contains("Help Options:") &&
                   !trimmed_status.contains("Available Commands:") &&
                   trimmed_status.len() < 50 {
                    valid_players.push(player);
                }
            }
        }
        
        Ok(valid_players)
    }

    #[cfg(target_os = "windows")]
    {
        Ok(vec!["windows_media_player".to_string()])
    }
}

#[tauri::command]
async fn set_active_player(player: String) -> Result<(), String> {
    *LAST_ACTIVE_PLAYER.lock().unwrap() = Some(player);
    Ok(())
}

#[tauri::command]
async fn get_active_player(_app_handle: tauri::AppHandle) -> Result<String, String> {
    #[cfg(target_os = "linux")]
    {
        let output = command(&_app_handle, "playerctl -l").await?.trim().to_string();
        let players: Vec<&str> = output.lines().collect();

        if players.is_empty() {
            return Err("No media players detected".to_string());
        }

        let mut playing_players = Vec::new();
        let mut paused_players = Vec::new();
        let mut other_players = Vec::new();

        // Categorize players by their status
        for player in &players {
            let status = command(&_app_handle, &format!("playerctl -p {} status", player)).await;
            if let Ok(s) = status {
                match s.trim() {
                    "Playing" => playing_players.push(player.to_string()),
                    "Paused" => paused_players.push(player.to_string()),
                    _ => other_players.push(player.to_string()),
                }
            } else {
                other_players.push(player.to_string());
            }
        }

        // Check if the last active player is still available and has valid status
        let last_player = LAST_ACTIVE_PLAYER.lock().unwrap().clone();
        if let Some(ref last) = last_player {
            if playing_players.contains(last) || paused_players.contains(last) {
                return Ok(last.clone());
            }
        }

        // Priority: Playing > Paused > Others > First available
        let selected_player = if !playing_players.is_empty() {
            playing_players[0].clone()
        } else if !paused_players.is_empty() {
            paused_players[0].clone()
        } else if !other_players.is_empty() {
            other_players[0].clone()
        } else {
            players[0].to_string()
        };

        // Update the last active player
        *LAST_ACTIVE_PLAYER.lock().unwrap() = Some(selected_player.clone());
        
        Ok(selected_player)
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
            set_active_player,
            get_available_players,
            get_player_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
