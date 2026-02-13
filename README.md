# Student Life AI Planner

A visually polished student dashboard that:

1. Connects to your Google Calendar.
2. Loads your events for today.
3. Captures key student-life metrics (sleep, energy, stress, academics, social, wellbeing, spending).
4. Uses AI to analyze your day against your goal and suggest practical improvements for tomorrow.

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

## Features

- Glassmorphism + gradient UI focused on student use.
- Calendar timeline for the current day.
- Student snapshot inputs (sleep, focus, stress, energy, spending, workout).
- Life area check-ins (academics, social, wellbeing).
- AI coaching report that includes strengths, improvements, and next-day schedule suggestions.

## Important limitations

- Tokens are stored in memory for demo simplicity. Restarting the server logs you out.
- This app uses read-only calendar access.
- AI analysis quality depends on your event detail and notes.
