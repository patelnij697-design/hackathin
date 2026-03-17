# 🌱 MindBloom

**A daily wellness companion powered by Claude.** Single HTML file. No server, no install, no account. Just open it.

---

## What it does

MindBloom is a self-contained mental wellness app that lives in one `.html` file. It runs entirely in your browser — all data is stored locally in `localStorage` and never sent anywhere except to the Anthropic API when you chat with Bloom.

### Features

| Tab | What's there |
|-----|-------------|
| **Today** | Daily 5-question wellness check-in (mood, calm, energy, sleep, social). Scores 1–10. Submitting opens a chat with Bloom. |
| **Breathe** | Guided breathing — Box (4-4-4-4), 4-7-8, and Calm (4-6) patterns with animated circle or dot-on-square visuals. |
| **Journal** | Free-write journal entries linked to that day's wellness score. Edit or delete any entry. |
| **History** | Scrollable log of all past check-ins with scores, tags, and notes. |
| **Clay** | 3D clay head (Three.js). Name it, punch it until it breaks. Stress relief. |

---

## Bloom — the AI companion

Bloom is powered by `claude-sonnet-4-6` via the Anthropic API, called directly from the browser (no backend).

### Memory
After each conversation, Bloom silently extracts facts worth remembering (your name, recurring topics, things that help you, sensitive areas) and stores them in `localStorage`. These are injected into every new conversation so Bloom remembers you across sessions.

Memory is included in exports and restored on import.

### Crisis detection & lockdown
Bloom scans every message for concerning language across four categories:

- **Suicidal ideation** — phrases involving self-harm or ending one's life
- **Homicidal thoughts** — violent intent toward others  
- **Self-harm** — cutting, burning, restricting, relapse
- **Crisis state** — hopelessness, giving up, can't go on

On detection, the app enters **lockdown mode**:
- Navigation to other tabs is blocked
- A crisis resource banner appears (988 Lifeline, Crisis Text Line, 911)
- Bloom's entire persona shifts to crisis support — present, warm, non-lecturing
- Lockdown lifts only when Bloom issues a `[CLEAR]` signal after assessing the person is no longer in acute crisis

### [CLEAR] signal
Bloom decides when it's safe to lift the lock. It includes `[CLEAR]` at the end of a message — invisible to the user, stripped before display — which triggers `exitLockdown()` after a short delay. Bloom is instructed not to clear too quickly and to look for a genuine tonal shift, not just reassuring words.

---

## Setup

### Running as a standalone file
1. Download `mindbloom.html`
2. Open it in any modern browser
3. Hit **🔑 API Key**, paste your Anthropic key (`sk-ant-...`)
4. Done — start your first check-in

Get an API key at [console.anthropic.com](https://console.anthropic.com).

### Running inside Claude (claude.ai)
Upload `mindbloom.html` as an artifact or paste it into a project. The API calls route through Claude's built-in artifact access — no key needed.

---

## Data & privacy

Everything stays on your device. The only outbound traffic is:

- Chat messages → `api.anthropic.com/v1/messages` (Bloom responses)
- End-of-session transcript → `api.anthropic.com/v1/messages` (memory extraction, fire-and-forget)

No analytics. No telemetry. No ads. No accounts.

### Export format

```json
{
  "exported": "2025-03-17T12:00:00.000Z",
  "app": "MindBloom v4",
  "wellness_entries": [ ... ],
  "journal_entries": [ ... ],
  "bloom_memory": { ... }
}
```

Import merges entries by date (wellness) and ID (journal). Bloom memory is fully restored from the file.

---

## Developer panel

Access via the **🛠 Open Developer Panel** button at the bottom. Requires a PIN.

| Feature | What it does |
|---------|-------------|
| **Date override** | Makes the app behave as if it's a different day — useful for testing history and multi-day patterns |
| **Auto-Alert: ON/OFF** | Disables crisis detection entirely (Pure Mode) |
| **Test Mode** | Crisis detection still runs, but no real resources are shown. Bloom knows it's a test and responds with dev-facing transparency. Issues `[CLEAR]` when satisfied the test is complete. |
| **Exit Lockdown** | Manually clear lockdown state |
| **View Memory** | Inspect the raw JSON of what Bloom currently remembers |
| **Clear Memory** | Wipe Bloom's memory |
| **Lock panel** | Re-locks the dev panel |

---

## Tech stack

| Layer | What |
|-------|------|
| Runtime | Single HTML file, vanilla JS, no build step |
| 3D (Clay tab) | [Three.js r128](https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js) via CDN |
| Fonts | Playfair Display + DM Sans via Google Fonts |
| AI | Anthropic API — `claude-sonnet-4-6` |
| Storage | `localStorage` — all data on-device |
| Auth (dev panel) | PIN hashed with `crypto.subtle.digest('SHA-256', ...)` — plaintext never stored |

---

## File structure

```
mindbloom.html          ← the entire app
README.md               ← this file
```

That's it. One file.

---

## Wellness score formula

```
score = (mood + energy + sleep + social + (11 - stress)) / 5
```

Stress is inverted so that high calm = high score. All five dimensions weighted equally. Result clamped to 1–10.

---

## Known limitations

- **No multi-device sync** — data lives in the browser that opened the file. Use Export/Import to move between devices.
- **Artifact localStorage** — when running inside Claude's artifact sandbox, storage is scoped to that artifact session.
- **Clay tab** — requires Three.js CDN. Won't work fully offline.
- **API key required** — for the standalone file version, you need an Anthropic API key. The artifact version uses Claude's built-in access.

---

## License

MIT — do whatever you want with it.
