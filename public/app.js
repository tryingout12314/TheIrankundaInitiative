const statusText = document.getElementById('status');
const connectGoogleBtn = document.getElementById('connectGoogle');
const loadEventsBtn = document.getElementById('loadEvents');
const loadOfficeHoursBtn = document.getElementById('loadOfficeHours');
const openCanvasBtn = document.getElementById('openCanvas');
const requestMeetingBtn = document.getElementById('requestMeeting');
const analyzeBtn = document.getElementById('analyze');

const eventsList = document.getElementById('eventsList');
const officeHoursList = document.getElementById('officeHoursList');
const supportPersonSelect = document.getElementById('supportPerson');
const analysis = document.getElementById('analysis');

const goalInput = document.getElementById('goal');
const notesInput = document.getElementById('notes');
const studentNameInput = document.getElementById('studentName');
const studentEmailInput = document.getElementById('studentEmail');
const preferredTimeInput = document.getElementById('preferredTime');
const meetingTopicInput = document.getElementById('meetingTopic');

let events = [];
let officeHoursStaff = [];
let canvasUrl = null;

const setStatus = (message) => {
  statusText.textContent = message;
};

const renderEvents = () => {
  eventsList.innerHTML = '';

  if (!events.length) {
    const li = document.createElement('li');
    li.textContent = 'No events loaded.';
    eventsList.appendChild(li);
    return;
  }

  for (const event of events) {
    const li = document.createElement('li');
    li.textContent = `${event.title} (${event.start || 'unknown'} → ${event.end || 'unknown'})`;
    eventsList.appendChild(li);
  }
};

const renderOfficeHours = () => {
  officeHoursList.innerHTML = '';
  supportPersonSelect.innerHTML = '';

  if (!officeHoursStaff.length) {
    const li = document.createElement('li');
    li.textContent = 'No office hours staff loaded.';
    officeHoursList.appendChild(li);
    return;
  }

  for (const person of officeHoursStaff) {
    const li = document.createElement('li');
    li.textContent = `${person.name} (${person.role}) • ${person.focus} • ${person.availability} • ${person.mode}`;
    officeHoursList.appendChild(li);

    const option = document.createElement('option');
    option.value = person.id;
    option.textContent = `${person.name} (${person.role})`;
    supportPersonSelect.appendChild(option);
  }
};

const loadCanvasConfig = async () => {
  const response = await fetch('/api/canvas/config');
  const data = await response.json();
  canvasUrl = data.courseUrl || null;
};

connectGoogleBtn.addEventListener('click', async () => {
  setStatus('Generating Google auth link...');

  const response = await fetch('/api/auth/google');
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Unable to connect Google Calendar.');
    return;
  }

  window.location.href = data.authUrl;
});

loadEventsBtn.addEventListener('click', async () => {
  setStatus('Loading today\'s events...');

  const response = await fetch('/api/calendar/today');
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Failed to load events.');
    return;
  }

  events = data.events || [];
  renderEvents();
  setStatus(`Loaded ${events.length} event(s).`);
});

loadOfficeHoursBtn.addEventListener('click', async () => {
  setStatus('Loading office hours...');

  const response = await fetch('/api/office-hours');
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Failed to load office hours.');
    return;
  }

  officeHoursStaff = data.staff || [];
  renderOfficeHours();
  setStatus(`Loaded ${officeHoursStaff.length} support staff profile(s).`);
});

openCanvasBtn.addEventListener('click', async () => {
  if (!canvasUrl) {
    await loadCanvasConfig();
  }

  if (!canvasUrl) {
    setStatus('Canvas is not configured. Add CANVAS_BASE_URL and CANVAS_COURSE_ID in .env.');
    return;
  }

  window.open(canvasUrl, '_blank', 'noopener,noreferrer');
  setStatus('Opened Canvas course in a new tab.');
});

requestMeetingBtn.addEventListener('click', async () => {
  const payload = {
    studentName: studentNameInput.value.trim(),
    studentEmail: studentEmailInput.value.trim(),
    supportPersonId: supportPersonSelect.value,
    topic: meetingTopicInput.value.trim(),
    preferredTime: preferredTimeInput.value.trim(),
    details: notesInput.value.trim()
  };

  setStatus('Submitting meeting request...');

  const response = await fetch('/api/meetings/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Meeting request failed.');
    return;
  }

  setStatus(`Request submitted for ${data.meeting.supportPersonName}.`);
  analysis.textContent = `${data.message}\n\nStatus: ${data.meeting.status}\nNext step: ${data.meeting.suggestedNextStep}`;
});

analyzeBtn.addEventListener('click', async () => {
  const goal = goalInput.value.trim();

  if (!goal) {
    setStatus('Add your question goal first.');
    return;
  }

  setStatus('Generating prep plan...');
  analysis.textContent = 'Working on your prep plan...';

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal,
      events,
      notes: notesInput.value.trim()
    })
  });

  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Prep plan failed.');
    analysis.textContent = 'No prep plan available.';
    return;
  }

  analysis.textContent = data.analysis;
  setStatus('Prep plan ready.');
});

if (window.location.search.includes('connected=google')) {
  setStatus('Google Calendar connected. Click "Load today".');
}

loadCanvasConfig();
renderEvents();
renderOfficeHours();
