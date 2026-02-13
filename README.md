# Daily Routine AI Coach

A lightweight website that:

1. Connects to your Google Calendar.
2. Loads your events for today.
3. Uses AI to review your day against a goal you provide.
4. Suggests practical improvements for tomorrow.

## Setup

```bash
npm install
cp .env.example .env
```

Fill in your Google OAuth credentials and OpenAI API key in `.env`.

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

- Tokens are stored in memory for demo simplicity. Restarting the server logs you out.
- This app uses read-only calendar access.
- AI analysis quality depends on your event detail and notes.
