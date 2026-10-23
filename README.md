# 🌍 LinguaTrio PWA
### Trilingual Vocabulary Memorization for iPhone (iOS Safari)
*English (🇬🇧) • Romanian (🇷🇴) • Russian (🇷🇺)*

A modern, offline-capable Progressive Web Application designed mobile-first specifically for iPhone screens, Dynamic Island, and notch safe areas. Practice and memorize high-frequency vocabulary across three languages simultaneously.

---

## 📱 Key Features & iOS Optimizations

1. **Mobile-First UX/UI for iPhone**:
   - Dynamic Island / Notch safe area integration (`viewport-fit=cover`, `env(safe-area-inset-*)`).
   - Font size $\ge 16\text{px}$ across all input fields to **prevent iOS Safari auto-zooming**.
   - Elastic viewport bounce prevention (`overscroll-behavior-y: none`).
   - Full PWA configuration (`manifest.json`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-touch-icon`).

2. **Touch & Gesture Flashcard Mode**:
   - **3D Card Flip**: Tap anywhere on the card to reveal the reverse side with smooth 3D perspective transition.
   - **Swipe Gestures**:
     - **Swipe Right** $\rightarrow$ **Known / Good** (shows emerald "KNOWN" stamp badge).
     - **Swipe Left** $\rightarrow$ **Need Review / Again** (shows rose "REVIEW" stamp badge).
   - **Flexible Language Configuration**:
     - Choose which language is the question prompt (e.g., Russian 🇷🇺).
     - Automatically shows the remaining target languages on the back (e.g., English 🇬🇧 + Romanian 🇷🇴).
   - **Spaced-Repetition Controls**: Quick rating buttons (*Again*, *Hard*, *Good*, *Easy*).

3. **Active Recall Typing & Spelling Mode**:
   - Type in the target language to reinforce retention.
   - **On-Screen Romanian Diacritics Toolbar**: Instant touch buttons for `ă`, `â`, `î`, `ș`, `ț` (with shift toggle for `Ă`, `Â`, `Î`, `Ș`, `Ț`) — no need to change iOS system keyboard layout!
   - Diacritic-aware checking: warns if spelling is right but missing diacritics, allows "I was right" override or instant answer reveal.

4. **Web Speech API Audio Pronunciation**:
   - Native audio playback for English (`en-US`), Romanian (`ro-RO`), and Russian (`ru-RU`).
   - Speaker icons on prompt and answers with pulse feedback.
   - iOS speech audio pipeline unlock on first user gesture.
   - Playback speed control ($0.75\times$, $0.9\times$, $1.0\times$, $1.2\times$).

5. **Gamification & Daily Tracking**:
   - **Daily Streak Counter** with consecutive day tracker and best record.
   - **Today's Accuracy Breakdown**: reviewed count, correct count, accuracy progress bar.
   - **Mastery Distribution**: New, Learning, and Mastered cards tracking.
   - **Timer Modes**: Relaxed (off), 30s Sprint, 60s Blitz.

6. **Vocabulary Bank & Persistence**:
   - 42 pre-populated high-frequency starter words grouped into 4 categories:
     1. `Everyday & Greetings`
     2. `Food & Bakery / Kitchen`
     3. `Travel & Navigation`
     4. `Time & Numbers`
   - Full CRUD: Add custom word triplets, edit, or delete with confirmation.
   - Search filter across all three languages.
   - Category filtering pills.
   - **Backup & Restore**: Download/import JSON backups or copy/paste directly.
   - Reset to Starter Pack button.

---

## 🚀 How to Run Locally

### 1. Start the local server
Run this command from inside the project directory:

```bash
cd /Users/mac/.gemini/antigravity/scratch/lingua-trio-pwa
python3 -m http.server 8080
```

Open your browser to:
[http://localhost:8080](http://localhost:8080)

---

## 📲 How to Test & Install on iPhone (iOS Safari)

1. Make sure your Mac and iPhone are connected to the same Wi-Fi network.
2. Find your Mac's local IP address (e.g. `192.168.1.X` via Mac System Settings $\rightarrow$ Wi-Fi $\rightarrow$ Details).
3. On your iPhone, open **Safari** and visit:
   `http://192.168.1.X:8080`
4. Tap the **Share** button (box with an arrow pointing up ⎋) at the bottom of Safari.
5. Scroll down and tap **"Add to Home Screen"**.
6. Tap **"Add"**.
7. Launch **LinguaTrio** directly from your iPhone Home Screen — it runs in fullscreen standalone mode with native safe-area styling and full offline capability!
