# gpt-image-2 Studio

A cross-platform desktop GUI and CLI tool for generating and editing images using the **gpt-image-2** model via the OpenAI-compatible API from [QCode.cc](https://api.qcode.cc).

Supports Windows, macOS, and Linux. Download the ready-to-run Windows executable below.

---

## Features

- **Text-to-Image** — Generate images from natural language prompts (including Chinese)
- **Image Editing** — Upload 1–8 images with optional mask for partial inpainting and multi-image fusion
- **Desktop GUI** — Drag-and-drop interface, real-time progress, preview & save (PySide6 + Fluent Design)
- **CLI Tool** — `gpt_image2.py` for scripting and automation
- **OpenAI SDK Compatible** — Works with any OpenAI-compatible client, zero code changes
- **Text Rendering** — Best-in-class Chinese and English text rendering in generated images

---

## Quick Start

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure API Key

Edit `config.json` in the project root:

```json
{
  "api_key": "cr_YOUR_QCODE_API_KEY",
  "base_url": "https://api.qcode.cc/qcode-img/v1"
}
```

> Get your API key from [QCode.cc Dashboard](https://api.qcode.cc). The key starts with `cr_`.

### CLI Usage

```bash
# Text-to-image
python gpt_image2.py generate "A cyberpunk Tokyo street at night, neon reflections in rain puddles" --output result.png

# Image editing (single image + mask)
python gpt_image2.py edit cat.png --mask mask.png --prompt "put a tiny crown on the cat" --output edited.png
```

### GUI Usage

Download the latest Windows release from the [Releases page](https://github.com/YOUR_REPO/releases/latest) and run `gpt-image-2-studio.exe`.

Or run from source:

```bash
python gpt_image2_qt.py
```

---

## API Key Configuration

| Field | Description | Default |
|-------|-------------|---------|
| `api_key` | Your QCode.cc API Key (starts with `cr_`) | — |
| `base_url` | API endpoint | `https://api.qcode.cc/qcode-img/v1` |

Regional endpoints (pick the one closest to you):

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
| `--model` | string | `gpt-image-2` | Model name |
| `--size` | string | `1024x1024` | `1024x1024` / `1024x1536` / `1536x1024` |
| `--quality` | string | `medium` | `low` / `medium` / `high` |
| `--n` | int | `1` | Number of images (1–4) |
| `--output` | string | `output.png` | Output file path |

### Image Editing (`edit`)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `image` | file | **required** | Source image(s), 1–8 files |
| `--mask` | file | — | PNG with alpha, transparent = area to redraw |
| `--prompt` | string | **required** | Editing instruction |
| `--size` | string | `auto` | `auto` / `1024x1024` / `1024x1536` / `1536x1024` |
| `--quality` | string | `auto` | `low` / `medium` / `high` |
| `--n` | int | `1` | Number of outputs (1–4) |
| `--fidelity` | string | `low` | `low` / `high` — high preserves original details |
| `--background` | string | `auto` | `auto` / `opaque` / `transparent` |
| `--output-format` | string | `png` | `png` / `jpeg` / `webp` |

---

## Pricing

Billing is per output image. Both `generations` and `edits` share the same pricing table.

| Size | Low | Medium | High |
|------|-----|--------|------|
| 1024×1024 | $0.08 (floor) | $0.08 (floor) | $0.211 |
| 1024×1536 | $0.08 (floor) | $0.08 (floor) | $0.165 |
| 1536×1024 | $0.08 (floor) | $0.08 (floor) | $0.165 |

- **Minimum charge**: $0.08 per image
- **Daily limit**: 100 images / day / API Key (generations + edits combined)
- **Concurrency**: 2 simultaneous requests per API Key

For full pricing details, see the [QCode.cc billing docs](https://api.qcode.cc/qcode-img/usage).

---

## Generation Time & Timeout

gpt-image-2 is an inference-based model. Set `timeout >= 180s` in your SDK calls:

| Quality | Typical Time | Max (complex prompts) |
|---------|-------------|----------------------|
| low | 20–35 s | ~50 s |
| medium | 50–90 s | ~120 s |
| high | 70–120 s | ~150 s |

---

## Tech Stack

- **Language**: Python 3.10+
- **GUI**: PySide6 + PySide6-Fluent-Widgets
- **API Client**: OpenAI Python SDK
- **Image Processing**: Pillow
- **Packaging**: PyInstaller

---

## License

MIT
