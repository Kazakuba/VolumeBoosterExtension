# 🔊 Volume Booster (Native Fullscreen Support)

A Chrome extension designed to solve a long-standing UX issue: boosting audio **without breaking true fullscreen video playback**.

---

## 🌟 Why This Extension Is Different

Most volume booster extensions interfere with the browser's fullscreen trust chain — wrapping the `<video>` element, modifying the DOM, or simulating clicks. As a result, **double‑click fullscreen fails**, forcing users into windowed-fullscreen and requiring additional F11 click to get to actual fullscreen.

This extension avoids all of that.

### ✅ Native Fullscreen Architecture
- The `<video>` element is **never wrapped, replaced, or modified**.
- All user interactions (double-click, fullscreen button) remain trusted.
- Videos enter **True Fullscreen** every time.

### 🎧 Non-Invasive Audio Boosting
Uses the Web Audio API's `captureStream()` to process audio **without touching visuals**.

- **Visuals:** The native video element stays untouched.
- **Audio:** The stream is routed through an `AudioContext` and boosted via a `GainNode`.
- **Result:** Up to **600% volume boost** while preserving flawless fullscreen behavior.

---

## 🚀 Features
- **True Fullscreen Support** — double‑click works exactly as expected.
- **Boost Volume up to 600%** using a clean audio pipeline.
- **Per‑Tab Audio** — each tab gets its own isolated boost.
- **Persistent Settings** via `chrome.storage.local`.
- **Popup UI** listing audible tabs and their gain levels.

---

## 🛠️ Technical Overview
Below is the core logic injected into the active tab:

```js
(async () => {
    const vid = document.querySelector("video");
    if (!vid) return;

    // 1. Capture the stream from the native video element
    const stream = vid.captureStream();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // 2. Create the source and gain node
    const src = ctx.createMediaStreamSource(stream);
    const gain = ctx.createGain();

    // Set the gain value (up to 6.0)
    gain.gain.value = gainValue;

    // 3. Connect the nodes: source -> gain -> speakers
    src.connect(gain).connect(ctx.destination);

    // Store references for subsequent updates and cleanup
    vid._audioBoosted = true;
    vid._gainNode = gain;
})();
```

### Why This Works
- No DOM wrapping.
- No synthetic click events.
- No interference with fullscreen request trust.
- Audio pipeline remains independent from video UI interactions.

---

## 📦 Installation
1. Clone this repository.
2. Open **Chrome** and go to `chrome://extensions`.
3. Enable **Developer Mode**.
4. Click **Load Unpacked**.
5. Select the folder containing `manifest.json`.
6. Open any video site and activate the extension.
