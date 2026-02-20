#!/usr/bin/env node
/**
 * Writes version to tauri.conf.json, package.json, and src-tauri/Cargo.toml.
 * Usage: node scripts/sync-version.mjs [version]
 *   If version is omitted, reads from src-tauri/tauri.conf.json and syncs to the others.
 *   If version is given (e.g. 3.0.0), writes to all three.
 */
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tauriConfPath = join(root, "src-tauri", "tauri.conf.json");
const packagePath = join(root, "package.json");
const cargoPath = join(root, "src-tauri", "Cargo.toml");

let version = process.argv[2];
if (!version) {
  const tauri = JSON.parse(readFileSync(tauriConfPath, "utf8"));
  version = tauri.version;
  if (!version) {
    console.error("No version in tauri.conf.json and none passed as argument.");
    process.exit(1);
  }
}
version = version.replace(/^v/, "");

// tauri.conf.json
const tauri = JSON.parse(readFileSync(tauriConfPath, "utf8"));
tauri.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauri, null, "\t") + "\n");

// package.json
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
pkg.version = version;
writeFileSync(packagePath, JSON.stringify(pkg, null, "\t") + "\n");

// Cargo.toml: replace first version = "..." in [package]
const cargo = readFileSync(cargoPath, "utf8");
const cargoUpdated = cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`);
writeFileSync(cargoPath, cargoUpdated);

console.log("Synced version to", version);
