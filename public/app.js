const statusText = document.getElementById('status');
const connectGoogleBtn = document.getElementById('connectGoogle');
const loadEventsBtn = document.getElementById('loadEvents');
const analyzeBtn = document.getElementById('analyze');
const eventsList = document.getElementById('eventsList');
const analysis = document.getElementById('analysis');
const goalInput = document.getElementById('goal');
const notesInput = document.getElementById('notes');

const sleepHoursInput = document.getElementById('sleepHours');
const studyFocusInput = document.getElementById('studyFocus');
const energyLevelInput = document.getElementById('energyLevel');
const stressLevelInput = document.getElementById('stressLevel');
const spentTodayInput = document.getElementById('spentToday');
const workoutInput = document.getElementById('workout');

const academicsNotesInput = document.getElementById('academicsNotes');
const socialNotesInput = document.getElementById('socialNotes');
const wellbeingNotesInput = document.getElementById('wellbeingNotes');

let events = [];

const setStatus = (message) => {
  statusText.textContent = message;
};

const renderEvents = () => {
  eventsList.innerHTML = '';

  if (!events.length) {
    const li = document.createElement('li');
    li.textContent = 'No events loaded yet. Connect calendar and click "Load Today\'s Plan".';
    eventsList.appendChild(li);
    return;
  }

  for (const event of events) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${event.title}</strong><br><span>${event.start || 'unknown'} → ${event.end || 'unknown'}</span>`;
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
  setStatus('Loading today\'s schedule...');

  const response = await fetch('/api/calendar/today');
  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'Failed to load events.');
    return;
  }

  events = data.events || [];
  renderEvents();
  setStatus(`Loaded ${events.length} calendar event(s).`);
});

const buildStudentProfile = () => ({
  sleepHours: sleepHoursInput.value,
  studyFocus: studyFocusInput.value,
  energyLevel: energyLevelInput.value,
  stressLevel: stressLevelInput.value,
  spentToday: spentTodayInput.value,
  workout: workoutInput.value.trim(),
  academicsNotes: academicsNotesInput.value.trim(),
  socialNotes: socialNotesInput.value.trim(),
  wellbeingNotes: wellbeingNotesInput.value.trim()
});

analyzeBtn.addEventListener('click', async () => {
  const goal = goalInput.value.trim();

  if (!goal) {
    setStatus('Add your main goal first.');
    return;
  }

  setStatus('Asking AI for your student life coaching report...');
  analysis.textContent = 'Generating your report...';

  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal,
      events,
      notes: notesInput.value.trim(),
      studentProfile: buildStudentProfile()
    })
  });

  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || 'AI analysis failed.');
    analysis.textContent = 'No analysis available.';
    return;
  }

  analysis.textContent = data.analysis;
  setStatus('Report ready — review your strengths and tomorrow plan.');
});

if (window.location.search.includes('connected=google')) {
  setStatus('Google Calendar connected! Now click "Load Today\'s Plan".');
}

renderEvents();
