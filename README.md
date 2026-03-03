# Lita Light

Lita Light is an open-source desktop screen light app built with Tauri + TypeScript.
It turns your monitor into a controllable fill light for content creation, video calls, streaming, photography, and recording setups.

Keywords: monitor light app, white screen app, desktop softbox, virtual fill light, color temperature light, fullscreen screen light.

## Features

- Full-screen monitor light with true flat color output
- Adjustable color temperature (`1800K` to `9000K`)
- Adjustable brightness (`10%` to `100%`)
- Always-on-top toggle for multi-app workflows
- Presets: Candle, Warm, Studio, Daylight
- Scroll-based quick controls on backdrop
- Drag-to-move floating controls panel
- Keyboard shortcuts for fast control

## Quick Start

```bash
npm install
npm run tauri dev
```

## Production Build

```bash
npm run tauri build
```

## GitHub Actions CI/CD Artifacts

This repository includes a cross-platform workflow at:
`/.github/workflows/build-artifacts.yml`

The workflow builds desktop bundles for:

- Linux x64 (`x86_64-unknown-linux-gnu`)
- Windows x64 (`x86_64-pc-windows-msvc`)
- macOS Intel (`x86_64-apple-darwin`)
- macOS Apple Silicon (`aarch64-apple-darwin`)

Each run uploads downloadable artifacts to the GitHub Actions run page.

### How to Download Artifacts

1. Open the **Actions** tab in GitHub.
2. Open a completed **Build Desktop Artifacts** run.
3. Download the artifact for your platform from the **Artifacts** section.

## Why This Project Exists

Most creators use random white browser tabs as a quick key light.
Lita Light provides a cleaner, purpose-built desktop light with control over intensity and warmth, while keeping the experience minimal and distraction-free.

## Tech Stack

- Tauri 2
- TypeScript
- Vite
- Rust
# lita
