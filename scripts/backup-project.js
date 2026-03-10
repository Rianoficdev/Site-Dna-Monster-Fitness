#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const backupsRoot = path.join(projectRoot, "backups");
const snapshotsRoot = path.join(backupsRoot, "snapshots");

const excludedTopLevel = new Set([
  "node_modules",
  ".git",
  "backups"
]);

const excludedFileNames = new Set([
  "Thumbs.db",
  ".DS_Store"
]);

function getArgValue(name) {
  const key = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(key));
  if (!match) return "";
  return String(match.slice(key.length)).trim();
}

function sanitizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function nowStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function shouldCopy(sourcePath) {
  const relative = path.relative(projectRoot, sourcePath);
  if (!relative || relative === ".") return true;

  const normalized = relative.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const first = parts[0];
  const last = parts[parts.length - 1];

  if (excludedTopLevel.has(first)) return false;
  if (excludedFileNames.has(last)) return false;
  if (last.endsWith(".tmp")) return false;
  return true;
}

function writeManifest(destinationPath, label) {
  const manifestPath = path.join(destinationPath, "backup-manifest.json");
  const manifest = {
    createdAt: new Date().toISOString(),
    source: projectRoot,
    snapshot: destinationPath,
    label: label || "",
    excludedTopLevel: Array.from(excludedTopLevel)
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
}

function writeLatestPointer(snapshotFolderName) {
  const latestPath = path.join(backupsRoot, "LATEST.txt");
  const latestText = [
    "Backup mais recente:",
    snapshotFolderName,
    "",
    "Caminho:",
    `backups/snapshots/${snapshotFolderName}`,
    ""
  ].join("\n");
  fs.writeFileSync(latestPath, latestText, "utf8");
}

function run() {
  ensureDir(snapshotsRoot);

  const rawLabel = getArgValue("label");
  const label = sanitizeLabel(rawLabel);
  const timestamp = nowStamp();
  const folderName = label ? `${timestamp}__${label}` : timestamp;
  const destinationPath = path.join(snapshotsRoot, folderName);

  if (fs.existsSync(destinationPath)) {
    throw new Error(`Pasta de backup já existe: ${destinationPath}`);
  }

  ensureDir(destinationPath);
  const entries = fs.readdirSync(projectRoot, { withFileTypes: true });
  for (const entry of entries) {
    const entryName = String(entry.name || "").trim();
    if (!entryName || excludedTopLevel.has(entryName)) continue;

    const sourcePath = path.join(projectRoot, entryName);
    const targetPath = path.join(destinationPath, entryName);
    if (!shouldCopy(sourcePath)) continue;

    fs.cpSync(sourcePath, targetPath, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: shouldCopy
    });
  }

  writeManifest(destinationPath, label);
  writeLatestPointer(folderName);

  console.log(`[backup] ok: ${path.relative(projectRoot, destinationPath)}`);
}

try {
  run();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.error(`[backup] erro: ${message}`);
  process.exitCode = 1;
}
