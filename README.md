# 🎹 AI Music App

A React + Express web app that generates original music from a text description using the [Suno API](https://docs.sunoapi.org/).

Describe the song you want — pick a style, toggle vocals on/off, choose a model — and the app composes it and plays it back in the browser.

## How it works

The browser UI talks only to a small **Express proxy** on the same origin. The proxy holds the Suno API key server-side and forwards requests to the Suno API. This keeps the key out of the browser and avoids CORS issues.

```
React UI  ──/api/*──►  Express proxy  ──Bearer key──►  Suno API
```

- `POST /api/generate` — start a generation job, returns a `taskId`
- `GET  /api/status/:taskId` — poll job status and fetch finished audio

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file and add your Suno API key:
   ```bash
   cp .env.example .env
   # then edit .env and set SUNO_API_KEY
   ```
3. Run the app (starts the backend on :3001 and the frontend on :5173):
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173

## Features

- Plain-language song description with quick style chips
- Instrumental (no vocals) toggle
- Custom mode for setting your own style and title
- Model selection (V5, V4_5PLUS, V4_5, V4)
- Live progress polling, in-browser playback, and download links

## Tech stack

React • Vite • Express • Suno API

## Note

`.env` is gitignored and must never be committed — it contains your secret API key.
