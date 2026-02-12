const path = require('path');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const requiredGoogle = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
const missingGoogle = requiredGoogle.filter((key) => !process.env[key]);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

let savedTokens = null;

function hasGoogleConfig() {
  return missingGoogle.length === 0;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    googleConfigured: hasGoogleConfig(),
    googleMissing: missingGoogle,
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
    connectedToGoogle: Boolean(savedTokens)
  });
});

app.get('/api/auth/google', (req, res) => {
  if (!hasGoogleConfig()) {
    return res.status(500).json({
      error: 'Google OAuth is not configured.',
      missing: missingGoogle
    });
  }

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent',
    state: req.query.state || 'daily-routine-ai'
  });

  return res.json({ authUrl });
});

app.get('/api/auth/google/callback', async (req, res) => {
  if (!hasGoogleConfig()) {
    return res.status(500).send('Google OAuth is not configured on the server.');
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing "code" query parameter.');
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    savedTokens = tokens;
    oauth2Client.setCredentials(tokens);

    return res.redirect('/?connected=google');
  } catch (error) {
    return res.status(500).send(`Failed to complete Google authentication: ${error.message}`);
  }
});

app.get('/api/calendar/today', async (_req, res) => {
  if (!savedTokens) {
    return res.status(401).json({
      error: 'Google Calendar is not connected. Click connect and authorize first.'
    });
  }

  try {
    oauth2Client.setCredentials(savedTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });

    const items = (response.data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || '(No title)',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || ''
    }));

    return res.json({ events: items });
  } catch (error) {
    return res.status(500).json({ error: `Unable to load calendar events: ${error.message}` });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { goal, events, notes } = req.body;

  if (!goal || typeof goal !== 'string') {
    return res.status(400).json({ error: 'Please include a goal string.' });
  }

  const openai = getOpenAIClient();
  if (!openai) {
    return res.status(500).json({ error: 'OpenAI API key is not configured on server.' });
  }

  const formattedEvents = (Array.isArray(events) ? events : [])
    .map((event, index) => `${index + 1}. ${event.title} (${event.start || 'unknown'} - ${event.end || 'unknown'})`)
    .join('\n');

  const prompt = `You are a productivity coach.

User goal:\n${goal}\n
Today's calendar entries:\n${formattedEvents || 'No events found.'}\n
Additional notes from user:\n${notes || 'No notes.'}\n
Give:
1. A short daily assessment.
2. 3 strengths from today.
3. 3 improvement suggestions for tomorrow tied to the user's goal.
4. A practical schedule tweak in bullet points.
Use concise language.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5
    });

    const analysis = completion.choices?.[0]?.message?.content || 'No analysis generated.';
    return res.json({ analysis });
  } catch (error) {
    return res.status(500).json({ error: `AI analysis failed: ${error.message}` });
  }
});

app.listen(port, () => {
  console.log(`Daily Routine AI Coach is running at http://localhost:${port}`);
});
