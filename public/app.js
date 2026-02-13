const statusText = document.getElementById('status');
const connectGoogleBtn = document.getElementById('connectGoogle');
const loadEventsBtn = document.getElementById('loadEvents');
const analyzeBtn = document.getElementById('analyze');
const eventsList = document.getElementById('eventsList');
const analysis = document.getElementById('analysis');
const goalInput = document.getElementById('goal');
const notesInput = document.getElementById('notes');

let events = [];

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

analyzeBtn.addEventListener('click', async () => {
  const goal = goalInput.value.trim();

  if (!goal) {
    setStatus('Add your goal first.');
    return;
  }

  setStatus('Asking AI for coaching insight...');
  analysis.textContent = 'Working on your analysis...';

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
    setStatus(data.error || 'AI analysis failed.');
    analysis.textContent = 'No analysis available.';
    return;
  }

  analysis.textContent = data.analysis;
  setStatus('Analysis complete.');
});

if (window.location.search.includes('connected=google')) {
  setStatus('Google Calendar connected! Click "Load Today\'s Events".');
}

renderEvents();
