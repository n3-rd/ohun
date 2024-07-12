// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use std::process::Command;
use std::str;
use serde::Serialize;

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
fn get_current_playing_song() -> Result<Metadata, String> {
  let artist = command(&format!("playerctl metadata artist"));
  let title = command(&format!("playerctl metadata title"));
  let album = command(&format!("playerctl metadata album"));

  Ok(Metadata {
      artist: artist.trim().to_string(),
      title: title.trim().to_string(),
      album: album.trim().to_string(),
  })


}

#[tauri::command]
fn get_current_audio_time() -> f64 {
  let time = command(&format!("playerctl position"));

  let trimmed_time = time.trim();

  if trimmed_time.is_empty() {
      return 0.00;
  }

  match trimmed_time.parse::<f64>() {
      Ok(value) => value,
      Err(_) => 0.00,
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
    let devtools = devtools::init(); // initialize the plugin as early as possible

  tauri::Builder::default()
       .plugin(devtools) // then register it with Tauri
    .invoke_handler(tauri::generate_handler![get_current_playing_song, get_current_audio_time, next_song, previous_song, toggle_play, is_playing, go_to_time, check_if_playerctl_exists])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
