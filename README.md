# gpt-image-2 Studio

A cross-platform desktop GUI and CLI tool for generating, editing, and fusing images using the **gpt-image-2** model via the OpenAI-compatible API from [QCode.cc](https://api.qcode.cc).

Supports Windows, macOS, and Linux. Download the ready-to-run executable below.

---

## Features

- **Text-to-Image** — Generate images from natural language prompts (including Chinese)
- **Image Editing** — Upload a source image with optional mask for partial inpainting
- **Multi-Image Fusion** — Upload 2-8 images and fuse them into a new composition
- **Desktop GUI** — Drag-and-drop interface, real-time progress, preview & save (Electron + React)
- **CLI Tool** — `gpt_image2.py` for scripting and automation
- **OpenAI SDK Compatible** — Works with any OpenAI-compatible client, zero code changes
- **Text Rendering** — Best-in-class Chinese and English text rendering in generated images

---

## Quick Start

### Desktop App

Download the latest release for your platform from the [Releases page](https://github.com/YOUR_REPO/releases/latest).

- **Windows**: Run `gpt-image-2-studio-1.1.0-win.exe`
- **macOS**: Mount the `.dmg` and drag the app to Applications

Or run from source:

```bash
cd studio
bun install
bun run dev
```

### CLI Tool

```bash
# Configure API key
export QCODE_API_KEY=cr_YOUR_QCODE_API_KEY

# Text-to-image
python gpt_image2.py generate "A cyberpunk Tokyo street at night, neon reflections in rain puddles" --output result.png

# Image editing (single image + mask)
python gpt_image2.py edit cat.png --mask mask.png --prompt "put a tiny crown on the cat" --output edited.png

# Multi-image fusion
python gpt_image2.py fuse scene.png product.png --prompt "Place the product naturally" --output fused.png
```

> Get your API key from [QCode.cc Dashboard](https://api.qcode.cc). The key starts with `cr_`.

---

## API Configuration

The desktop app stores settings in your OS config directory (encrypted via `safeStorage`).

For CLI usage, edit `config.json` in the project root:

```json
{
  "api_key": "cr_YOUR_QCODE_API_KEY",
  "base_url": "https://api.qcode.cc/qcode-img/v1"
}
```

| Field | Description | Default |
|-------|-------------|---------|
| `api_key` | Your QCode.cc API Key (starts with `cr_`) | — |
| `base_url` | API endpoint | `https://api.qcode.cc/qcode-img/v1` |

Regional endpoints:

| Region | Endpoint |
|--------|----------|
| China (HTTPS) | `https://api.qcode.cc/qcode-img/v1` |
| Asia / HK | `https://asia.qcode.cc/qcode-img/v1` |
| Europe | `https://eu.qcode.cc/qcode-img/v1` |
| US | `https://us.qcode.cc/qcode-img/v1` |

---

## Parameters

### Text-to-Image (`generate`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `prompt` | string | **required** | Image description (Chinese & English supported) |
| `--size` | string | `1024x1024` | `1024x1024` / `1024x1536` / `1536x1024` |
| `--quality` | string | `medium` | `low` / `medium` / `high` |
| `-n` | int | `1` | Number of images (1–4) |

### Image Editing (`edit`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image` | file | **required** | Source image (PNG/JPEG/WebP, <= 25MB) |
| `--mask` | file | — | PNG with alpha, transparent = area to redraw |
| `--prompt` | string | **required** | Editing instruction |
| `--size` | string | `auto` | `auto` / `1024x1024` / `1024x1536` / `1536x1024` |
| `--quality` | string | `auto` | `low` / `medium` / `high` |
| `-n` | int | `1` | Number of outputs (1–4) |
| `--fidelity` | string | `low` | `low` / `high` — high preserves original details |
| `--background` | string | `auto` | `auto` / `opaque` / `transparent` |
| `--format` | string | `png` | `png` / `jpeg` / `webp` |

---

## Pricing

Billing is per output image.

| Size | Low | Medium | High |
|------|-----|--------|------|
| 1024×1024 | $0.08 (floor) | $0.08 (floor) | $0.211 |
| 1024×1536 | $0.08 (floor) | $0.08 (floor) | $0.165 |
| 1536×1024 | $0.08 (floor) | $0.08 (floor) | $0.165 |

- **Minimum charge**: $0.08 per image
- **Daily limit**: 100 images / day / API Key
- **Concurrency**: 2 simultaneous requests per API Key

---

## Generation Time

| Quality | Typical Time | Max (complex prompts) |
|---------|-------------|----------------------|
| low | 20–35 s | ~50 s |
| medium | 50–90 s | ~120 s |
| high | 70–120 s | ~150 s |

Set `timeout >= 180s` in SDK calls.

---

## Tech Stack

- **Desktop App**: Electron 31 + React 18 + TypeScript + Tailwind CSS + Zustand
- **CLI Tool**: Python 3.10+ / OpenAI Python SDK
- **Build**: Vite + electron-builder

---

## License

MIT
