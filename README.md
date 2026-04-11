# Office Hours Hub

A lightweight app for helping students connect with TFs, CAs, and other course support staff.

## What this app does

1. Connects to Google Calendar to view today's events.
2. Shows an office-hours directory with support roles and availability.
3. Lets a student submit a meeting request (question topic + preferred time).
4. Optionally exposes a Canvas course link for quick navigation.
5. Generates AI-assisted guidance for how to prepare for office hours.

## Setup

```bash
npm install
cp .env.example .env
```

Configure these values in `.env`:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `OPENAI_API_KEY` (optional)
- `CANVAS_BASE_URL` (optional, for example `https://canvas.instructure.com`)
- `CANVAS_COURSE_ID` (optional)

## Google OAuth notes

- Enable **Google Calendar API** in Google Cloud.
- Create OAuth client credentials.
- Add this redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

## Run

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Important limitations

- Tokens and meeting requests are stored in memory for demo simplicity.
- This app uses read-only Google Calendar access.
- Canvas integration in this starter is link-based (not full OAuth/LMS sync).
