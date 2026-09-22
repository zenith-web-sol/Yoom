# Video Call Feature — ZegoCloud Integration

A real-time video calling module built as part of an internship task, using **ZegoCloud's Prebuilt Video Conference UIKit** as the calling engine, with **Firebase Firestore** layered on top to add host/co-host roles, meeting locks, password protection, and scheduling — features the UIKit doesn't provide out of the box.

This is currently a standalone Vite + React + TypeScript project, built separately for testing before integration into the main platform.

---

## Tech Stack

- **React + TypeScript + Vite**
- **[@zegocloud/zego-uikit-prebuilt](https://www.zegocloud.com/)** — handles the actual audio/video call: mic/camera controls, screen sharing, chat, participant tiles, connection quality, reconnection on network drops, low-bandwidth adaptation
- **Firebase Firestore** — stores room state (host, co-hosts, lock status, password, schedule) and syncs it live across all participants
- **lucide-react** — icons

---

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your own keys:
   ```bash
   cp .env.example .env
   ```
   You'll need:
   - A ZegoCloud **App ID** and **Server Secret** ([console.zegocloud.com](https://console.zegocloud.com))
   - A Firebase project with **Firestore Database** enabled, in **Native/Standard mode** (not "MongoDB compatibility" mode) — grab the config from Project Settings → Your apps

3. In Firebase Console, set Firestore **Rules** to allow read/write for testing:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   ⚠️ This is open access for development only — tighten before any real deployment.

4. Run locally:
   ```bash
   npm run dev
   ```

---

## Features Implemented

| Feature | Status | Notes |
|---|---|---|
| One-to-one & group calls via room ID | ✅ | Handled natively by ZegoCloud UIKit |
| Mic/camera toggle, front/rear camera switch | ✅ | Native UIKit controls |
| Screen sharing | ✅ | Native UIKit control |
| In-call chat (text, emoji, files) | ✅ | Native UIKit panel |
| Leave / end call | ✅ | Custom handling added so host ending the call closes it for everyone |
| Participant list, speaking indicators, mic/cam status, connection quality, call duration | ✅ | Native UIKit |
| Host role | ✅ | Custom — first person to create the room is stored as host in Firestore |
| Co-host role | ✅ | Custom — host can promote/demote from the participants panel |
| Mute/remove participants | ✅ | UIKit buttons, gated to host/co-host only via custom logic |
| Lock meeting | ✅ | Custom — Firestore flag checked before allowing new joins |
| Password-protected rooms | ✅ | Custom — checked against Firestore at join time |
| Named join flow (enter name before joining) | ✅ | Custom lobby screen replaces random usernames |
| Kicked/locked/ended screens with clear messaging | ✅ | Custom |
| Real-time toast notifications (lock, unlock, co-host changes) | ✅ | Custom, via Firestore's live listener |
| Reconnect after refresh / network drop / power loss | ✅ | Custom — session persisted via `sessionStorage`, host identity preserved on rejoin |
| Meeting scheduling | ✅ | Custom — stored in Firestore, listed with a "join when live" gate (opens 5 min early) |
| Background noise suppression, low-bandwidth adaptation | ✅ | Handled natively by ZegoCloud's underlying engine |

## Features Not Implemented

| Feature | Why |
|---|---|
| Call recording | Requires ZegoCloud's separate server-side Cloud Recording REST API (`StartRecord`/`StopRecord`), called from a backend using the App Sign — out of scope for this test build, which has no backend server yet. |
| End-to-end encryption | Not exposed as a configurable option in the Video Conference UIKit at this tier; would require ZegoCloud's dedicated E2EE-enabled plan/SDK. |
| Scheduled meeting reminders (email/push) | The scheduling feature stores and lists meetings, but proactive reminders need a server-side scheduled job (e.g. a Cloud Function on a timer) — no backend infra set up for this yet. |

---

## Known Limitations

- **Password check happens client-side** (compared against a value read from Firestore) — sufficient to stop casual link-sharing/guessing, but not real security. A production version should verify the password in a Cloud Function instead of the browser.
- **Tab-close detection is best-effort.** Browsers give a page very little time to run cleanup code when a tab is closed, so a participant may briefly still appear connected after closing their tab. ZegoCloud's own server-side timeout eventually cleans this up regardless.
- **No true "host transfer"** — if the host leaves without ending the call... they currently *do* end it for everyone (by design, for this version). A future version could instead auto-promote a co-host to host if one exists.

---

## Project Structure

```
src/
  App.tsx           — main app: lobby, call screen, all UI state
  roomService.ts     — Firestore read/write helpers for room state
  ScheduleList.tsx   — scheduled meetings list + create form
  theme.ts           — color palette used across the UI
  firebase.ts        — Firebase app initialization
```
