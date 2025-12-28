// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use serde::Serialize;
use std::collections::HashMap;
#[cfg(any(target_os = "linux", target_os = "macos"))]
use std::process::Command;
use std::sync::Mutex;
#[cfg(target_os = "linux")]
use tauri_plugin_shell::ShellExt;
#[cfg(target_os = "windows")]
use windows::{
    core::Result as WindowsResult,
    Media::Control::{
        GlobalSystemMediaTransportControlsSession,
        GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionMediaProperties,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
    },
};

struct AppState {
    previous_positions: Mutex<HashMap<usize, f64>>,
    selected_player: Mutex<Option<String>>,
}

#[cfg(target_os = "linux")]
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

    String::from_utf8(output).map_err(|e| format!("Invalid UTF-8 output: {}", e))
}

#[derive(Serialize, Default)]
struct Metadata {
    artist: String,
    title: String,
    album: String,
}

#[tauri::command]
async fn get_current_playing_song(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Metadata, String> {
    #[cfg(target_os = "linux")]
    {
        return get_current_playing_song_linux(&app_handle, state).await;
    }

    #[cfg(target_os = "windows")]
    {
        return get_current_playing_song_windows().await;
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        let output = Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\"
                    set t_artist to artist of current track
                    set t_title to name of current track
                    set t_album to album of current track
                    return t_artist & \"\\n\" & t_title & \"\\n\" & t_album
                end tell",
                active_player
            ))
            .output()
            .map_err(|e| e.to_string())?;

        let result = String::from_utf8_lossy(&output.stdout).to_string();
        let parts: Vec<&str> = result.trim().split('\n').collect();

        if parts.len() >= 3 {
            Ok(Metadata {
                artist: parts[0].to_string(),
                title: parts[1].to_string(),
                album: parts[2].to_string(),
            })
        } else {
            Err("Failed to fetch metadata".to_string())
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Media control not implemented for this platform".to_string())
    }
}

#[cfg(target_os = "linux")]
async fn get_current_playing_song_linux(
    app_handle: &tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Metadata, String> {
    // Get the active player first
    let active_player = get_active_player(app_handle.clone(), state).await?;

    // Use the active player for all metadata commands
    let artist = command(
        app_handle,
        &format!("playerctl -p {} metadata artist", active_player),
    )
    .await?;
    let title = command(
        app_handle,
        &format!("playerctl -p {} metadata title", active_player),
    )
    .await?;
    let album = command(
        app_handle,
        &format!("playerctl -p {} metadata album", active_player),
    )
    .await?;

    Ok(Metadata {
        artist: artist.trim().to_string(),
        title: title.trim().to_string(),
        album: album.trim().to_string(),
    })
}

#[cfg(target_os = "windows")]
async fn get_current_playing_song_windows() -> Result<Metadata, String> {
    let gsmtcsm = get_system_media_transport_controls_session_manager()
        .await
        .map_err(|_| "Play a song to see the lyrics".to_string())?;

    let session = gsmtcsm
        .GetCurrentSession()
        .map_err(|_| "Play a song to see the lyrics".to_string())?;

    let props = session
        .TryGetMediaPropertiesAsync()
        .map_err(|_| "Play a song to see the lyrics".to_string())?
        .await
        .map_err(|_| "Play a song to see the lyrics".to_string())?;

    let artist = props.Artist().map(|s| s.to_string()).unwrap_or_default();
    let title = props.Title().map(|s| s.to_string()).unwrap_or_default();
    let album = props
        .AlbumTitle()
        .map(|s| s.to_string())
        .unwrap_or_default();

    if artist.is_empty() && title.is_empty() {
        return Err("Play a song to see the lyrics".to_string());
    }

    Ok(Metadata {
        artist,
        title,
        album,
    })
}

#[cfg(target_os = "windows")]
async fn get_system_media_transport_controls_session_manager(
) -> WindowsResult<GlobalSystemMediaTransportControlsSessionManager> {
    GlobalSystemMediaTransportControlsSessionManager::RequestAsync()?.await
}

#[cfg(target_os = "windows")]
async fn get_media_properties(
    session: &GlobalSystemMediaTransportControlsSession,
) -> WindowsResult<GlobalSystemMediaTransportControlsSessionMediaProperties> {
    session.TryGetMediaPropertiesAsync()?.await
}

#[cfg(target_os = "windows")]
async fn toggle_play_windows(
    session: &GlobalSystemMediaTransportControlsSession,
) -> Result<(), String> {
    session
        .TryTogglePlayPauseAsync()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "windows")]
async fn next_song_windows(
    session: &GlobalSystemMediaTransportControlsSession,
) -> Result<(), String> {
    session.TrySkipNextAsync().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(target_os = "windows")]
async fn previous_song_windows(
    session: &GlobalSystemMediaTransportControlsSession,
) -> Result<(), String> {
    session.TrySkipPreviousAsync().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_current_audio_time(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<f64, String> {
    #[cfg(target_os = "linux")]
    {
        // Get the active player
        let active_player = get_active_player(app_handle.clone(), state).await?;

        // Get position only for the active player
        let output = command(
            &app_handle,
            &format!("playerctl -p {} position", active_player),
        )
        .await?;
        let trimmed_output = output.trim();

        if trimmed_output.is_empty() {
            return Ok(0.00);
        }

        match trimmed_output.parse::<f64>() {
            Ok(position) => Ok(position),
            Err(_) => Ok(0.00),
        }
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager()
            .await
            .map_err(|e| e.to_string())?;
        let session = gsmtcsm.GetCurrentSession().map_err(|e| e.to_string())?;
        let timeline = session.GetTimelineProperties().map_err(|e| e.to_string())?;
        let position = timeline.Position().map_err(|e| e.to_string())?;

        // Convert Windows time (in 100-nanosecond units) to seconds
        Ok(position.Duration as f64 / 10_000_000.0)
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        let output = Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\" to player position as string",
                active_player
            ))
            .output()
            .map_err(|e| e.to_string())?;

        let s = String::from_utf8_lossy(&output.stdout)
            .trim()
            .replace(",", ".");
        s.parse::<f64>().map_err(|e| e.to_string())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Ok(0.0)
    }
}

#[tauri::command]
async fn next_song(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Get the active player
        let active_player = get_active_player(app_handle.clone(), state).await?;
        command(&app_handle, &format!("playerctl -p {} next", active_player)).await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager()
            .await
            .map_err(|e| e.to_string())?;
        let session = gsmtcsm.GetCurrentSession().map_err(|e| e.to_string())?;
        session
            .TrySkipNextAsync()
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\" to next track",
                active_player
            ))
            .output()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Media control not implemented for this platform".to_string())
    }
}

#[tauri::command]
async fn previous_song(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Get the active player
        let active_player = get_active_player(app_handle.clone(), state).await?;
        command(
            &app_handle,
            &format!("playerctl -p {} previous", active_player),
        )
        .await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager()
            .await
            .map_err(|e| e.to_string())?;
        let session = gsmtcsm.GetCurrentSession().map_err(|e| e.to_string())?;
        session
            .TrySkipPreviousAsync()
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\" to previous track",
                active_player
            ))
            .output()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Media control not implemented for this platform".to_string())
    }
}

#[tauri::command]
async fn toggle_play(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Get the active player
        let active_player = get_active_player(app_handle.clone(), state).await?;
        command(
            &app_handle,
            &format!("playerctl -p {} play-pause", active_player),
        )
        .await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager()
            .await
            .map_err(|e| e.to_string())?;
        let session = gsmtcsm.GetCurrentSession().map_err(|e| e.to_string())?;
        session
            .TryTogglePlayPauseAsync()
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\" to playpause",
                active_player
            ))
            .output()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Media control not implemented for this platform".to_string())
    }
}

#[tauri::command]
async fn is_playing(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    #[cfg(target_os = "linux")]
    {
        // Get the active player
        let active_player = get_active_player(app_handle.clone(), state).await?;
        let status = command(
            &app_handle,
            &format!("playerctl -p {} status", active_player),
        )
        .await?;
        Ok(status.trim() == "Playing")
    }

    #[cfg(target_os = "windows")]
    {
        let gsmtcsm = get_system_media_transport_controls_session_manager()
            .await
            .map_err(|e| e.to_string())?;
        let session = gsmtcsm.GetCurrentSession().map_err(|e| e.to_string())?;
        let playback_info = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
        let status = playback_info.PlaybackStatus().map_err(|e| e.to_string())?;
        Ok(status == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing)
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        let output = Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\" to player state as string",
                active_player
            ))
            .output()
            .map_err(|e| e.to_string())?;
        Ok(String::from_utf8_lossy(&output.stdout).trim() == "playing")
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Ok(false)
    }
}

#[tauri::command]
async fn go_to_time(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    time: f64,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        // Get the active player
        let active_player = get_active_player(app_handle.clone(), state).await?;
        command(
            &app_handle,
            &format!("playerctl -p {} position {}", active_player, time),
        )
        .await?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        // Windows implementation would go here
        Err("Not implemented for Windows yet".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        let active_player = get_active_player(app_handle.clone(), state).await?;
        Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"{}\" to set player position to {}",
                active_player, time
            ))
            .output()
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Media control not implemented for this platform".to_string())
    }
}

#[tauri::command]
#[cfg(target_os = "linux")]
async fn check_if_playerctl_exists() -> Result<bool, String> {
    let output = Command::new("playerctl")
        .arg("--version")
        .output()
        .map_err(|e| e.to_string())?;

    Ok(output.status.success())
}

#[tauri::command]
#[cfg(not(any(target_os = "linux", target_os = "macos")))]
async fn check_if_playerctl_exists() -> Result<bool, String> {
    // playerctl is Linux-only, but logic is handled natively on Windows and MacOS
    Ok(false)
}

#[tauri::command]
#[cfg(target_os = "macos")]
async fn check_if_playerctl_exists() -> Result<bool, String> {
    Ok(true)
}

#[tauri::command]
async fn get_active_player(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    // Check if a player is manually selected
    let selected = {
        let store = state
            .selected_player
            .lock()
            .map_err(|_| "Failed to lock state")?;
        store.clone()
    };

    if let Some(player) = selected {
        // Validate if the selected player is actually available
        let available = get_available_players(app_handle.clone()).await?;
        if available.contains(&player) {
            return Ok(player);
        }
    }

    #[cfg(target_os = "linux")]
    {
        // First try to get the player that's currently playing
        let status_output = command(&app_handle, "playerctl -l").await?;
        let players = status_output.trim().lines().collect::<Vec<&str>>();

        // If no players are available, return an error
        if players.is_empty() {
            return Err("No media players detected".to_string());
        }

        // Try to find a player that's currently playing
        for player in &players {
            let status = command(&app_handle, &format!("playerctl -p {} status", player)).await;

            if let Ok(status) = status {
                if status.trim() == "Playing" {
                    return Ok(player.to_string());
                }
            }
        }

        // If no player is playing, return the first available player
        Ok(players[0].to_string())
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, we don't need to specify a player as the system handles it
        Ok("windows_media_player".to_string())
    }

    #[cfg(target_os = "macos")]
    {
        let players = vec!["Spotify", "Music"];

        // check for playing first
        for player in &players {
            let running_output = Command::new("osascript")
                .arg("-e")
                .arg(format!("application \"{}\" is running", player))
                .output()
                .map_err(|e| e.to_string())?;

            if String::from_utf8_lossy(&running_output.stdout).trim() == "true" {
                let state_output = Command::new("osascript")
                    .arg("-e")
                    .arg(format!(
                        "tell application \"{}\" to player state as string",
                        player
                    ))
                    .output();

                if let Ok(out) = state_output {
                    if String::from_utf8_lossy(&out.stdout).trim() == "playing" {
                        return Ok(player.to_string());
                    }
                }
            }
        }

        // then running
        for player in &players {
            let running_output = Command::new("osascript")
                .arg("-e")
                .arg(format!("application \"{}\" is running", player))
                .output()
                .map_err(|e| e.to_string())?;

            if String::from_utf8_lossy(&running_output.stdout).trim() == "true" {
                return Ok(player.to_string());
            }
        }

        Err("No supported media player found (Spotify or Music)".to_string())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Media control not implemented for this platform".to_string())
    }
}

#[tauri::command]
async fn set_active_player(
    player: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let mut selected_player = state
        .selected_player
        .lock()
        .map_err(|_| "Failed to lock state")?;
    *selected_player = Some(player);
    Ok(())
}

#[tauri::command]
async fn get_available_players(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    #[cfg(target_os = "macos")]
    let _ = app_handle;

    #[cfg(target_os = "linux")]
    {
        let status_output = command(&app_handle, "playerctl -l").await?;
        let players: Vec<String> = status_output
            .trim()
            .lines()
            .map(|s| s.to_string())
            .collect();
        Ok(players)
    }

    #[cfg(target_os = "windows")]
    {
        Ok(vec!["Generic Player".to_string()])
    }

    #[cfg(target_os = "macos")]
    {
        let mut available = Vec::new();
        let players = vec!["Spotify", "Music", "Apple Music"];

        for player in &players {
            let running_output = Command::new("osascript")
                .arg("-e")
                .arg(format!("application \"{}\" is running", player))
                .output()
                .map_err(|e| e.to_string())?;

            if String::from_utf8_lossy(&running_output.stdout).trim() == "true" {
                available.push(player.to_string());
            }
        }
        Ok(available)
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Ok(vec![])
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .manage(AppState {
            previous_positions: Mutex::new(HashMap::new()),
            selected_player: Mutex::new(None),
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_liquid_glass::init())
        .invoke_handler(tauri::generate_handler![
            get_current_playing_song,
            get_current_audio_time,
            next_song,
            previous_song,
            toggle_play,
            is_playing,
            go_to_time,
            check_if_playerctl_exists,
            get_active_player,
            set_active_player,
            get_available_players
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
