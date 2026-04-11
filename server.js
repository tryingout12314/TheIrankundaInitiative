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

const officeHoursStaff = [
  {
    id: 'tf-1',
    name: 'Jordan Lee',
    role: 'TF',
    focus: 'Algorithms, exam prep',
    availability: 'Mon/Wed 2:00 PM - 4:00 PM',
    mode: 'Zoom + in-person'
  },
  {
    id: 'ca-1',
    name: 'Maya Patel',
    role: 'CA',
    focus: 'Projects, debugging',
    availability: 'Tue/Thu 11:00 AM - 1:00 PM',
    mode: 'In-person lab'
  },
  {
    id: 'peer-1',
    name: 'Sam Rivera',
    role: 'Peer Mentor',
    focus: 'Study planning, onboarding',
    availability: 'Fri 12:00 PM - 3:00 PM',
    mode: 'Zoom'
  }
];

let savedTokens = null;
let meetingRequests = [];

function hasGoogleConfig() {
  return missingGoogle.length === 0;
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getCanvasCourseUrl() {
  const baseUrl = process.env.CANVAS_BASE_URL;
  const courseId = process.env.CANVAS_COURSE_ID;

  if (!baseUrl || !courseId) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, '')}/courses/${courseId}`;
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    googleConfigured: hasGoogleConfig(),
    googleMissing: missingGoogle,
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
    connectedToGoogle: Boolean(savedTokens),
    canvasConnected: Boolean(getCanvasCourseUrl())
  });
});

app.get('/api/canvas/config', (_req, res) => {
  const courseUrl = getCanvasCourseUrl();

  return res.json({
    connected: Boolean(courseUrl),
    courseUrl
  });
});

app.get('/api/office-hours', (_req, res) => {
  res.json({ staff: officeHoursStaff });
});

app.get('/api/meetings', (_req, res) => {
  res.json({ meetings: meetingRequests });
});

app.post('/api/meetings/request', (req, res) => {
  const { studentName, studentEmail, supportPersonId, topic, preferredTime, details } = req.body;

  if (!studentName || !studentEmail || !supportPersonId || !topic || !preferredTime) {
    return res.status(400).json({
      error: 'Please include studentName, studentEmail, supportPersonId, topic, and preferredTime.'
    });
  }

  const supportPerson = officeHoursStaff.find((person) => person.id === supportPersonId);

  if (!supportPerson) {
    return res.status(404).json({ error: 'Selected support person was not found.' });
  }

  const requestRecord = {
    id: `mtg-${Date.now()}`,
    studentName,
    studentEmail,
    supportPersonId,
    supportPersonName: supportPerson.name,
    supportRole: supportPerson.role,
    topic,
    preferredTime,
    details: details || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    suggestedNextStep: `Check ${supportPerson.name}'s listed availability (${supportPerson.availability}) and send a calendar invite.`
  };

  meetingRequests = [requestRecord, ...meetingRequests].slice(0, 50);

  return res.status(201).json({
    message: 'Meeting request submitted.',
    meeting: requestRecord
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
    state: req.query.state || 'office-hours-hub'
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

  const prompt = `You are a student support coach.

Student goal:\n${goal}\n
Today's calendar entries:\n${formattedEvents || 'No events found.'}\n
Student notes:\n${notes || 'No notes.'}\n
Give:
1. A short readiness check for office hours.
2. 3 focused questions the student should ask a TF/CA.
3. 3 concrete next steps for the next 24 hours.
4. A brief suggested meeting agenda.
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
  console.log(`Office Hours Hub is running at http://localhost:${port}`);
});
