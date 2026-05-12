// TV Display JavaScript
const socket = io();

let lastUpdateTime = null;

// Request live data on connect
socket.on('connect', () => {
  console.log('Connected to server, requesting live data...');
  socket.emit('request-live-data');
  updateLastUpdated('Connected, waiting for data...');
});

// Receive live data updates
socket.on('live-data-update', (patients) => {
  console.log('Received live update:', patients.length, 'patients');
  renderTVDisplay(patients);
  updateLastUpdated(new Date().toLocaleTimeString());
});

// Render TV display
function renderTVDisplay(patients) {
  // Clear all tables
  const otTable = document.getElementById('tvOtTable');
  const surgeryTable = document.getElementById('tvSurgeryTable');
  const wardTable = document.getElementById('tvWardTable');
  
  if (otTable) otTable.innerHTML = '';
  if (surgeryTable) surgeryTable.innerHTML = '';
  if (wardTable) wardTable.innerHTML = '';
  
  if (!patients || patients.length === 0) {
    const noDataMsg = '<tr><td colspan="5" class="no-data">No published data available</td></tr>';
    if (otTable) otTable.innerHTML = noDataMsg;
    if (surgeryTable) surgeryTable.innerHTML = noDataMsg;
    if (wardTable) wardTable.innerHTML = noDataMsg;
    return;
  }
  
  // Filter patients by status
  const otPatients = patients.filter(p => p.status === 'In OT');
  const surgeryPatients = patients.filter(p => p.status === 'Under Surgery');
  const wardPatients = patients.filter(p => p.status === 'Shifted to Ward');
  
  // Render OT patients
  otPatients.forEach(patient => {
    const row = document.createElement('tr');
    row.className = getPriorityClass(patient.priority);
    row.innerHTML = `
      <td><strong>${escapeHtml(patient.name)}</strong></td>
      <td>${escapeHtml(patient.location)}</td>
      <td>${escapeHtml(patient.doctor)}</td>
      <td>${escapeHtml(patient.surgery || '-')}</td>
      <td class="tv-condition">${escapeHtml(patient.condition_update || 'Stable')}</td>
    `;
    otTable.appendChild(row);
  });
  
  if (otPatients.length === 0) {
    otTable.innerHTML = '<tr><td colspan="5" class="no-data">No patients in OT</td></tr>';
  }
  
  // Render Surgery patients
  surgeryPatients.forEach(patient => {
    const row = document.createElement('tr');
    row.className = getPriorityClass(patient.priority);
    row.innerHTML = `
      <td><strong>${escapeHtml(patient.name)}</strong></td>
      <td>${escapeHtml(patient.location)}</td>
      <td>${escapeHtml(patient.doctor)}</td>
      <td>${escapeHtml(patient.surgery || '-')}</td>
      <td class="tv-condition">${escapeHtml(patient.condition_update || 'In Surgery')}</td>
    `;
    surgeryTable.appendChild(row);
  });
  
  if (surgeryPatients.length === 0) {
    surgeryTable.innerHTML = '<tr><td colspan="5" class="no-data">No patients in Surgery</td></tr>';
  }
  
  // Render Ward patients
  wardPatients.forEach(patient => {
    const row = document.createElement('tr');
    row.className = getPriorityClass(patient.priority);
    row.innerHTML = `
      <td><strong>${escapeHtml(patient.name)}</strong></td>
      <td>${escapeHtml(patient.location)}</td>
      <td>${escapeHtml(patient.doctor)}</td>
      <td>${escapeHtml(patient.surgery || '-')}</td>
      <td class="tv-condition">${escapeHtml(patient.condition_update || 'Recovering')}</td>
    `;
    wardTable.appendChild(row);
  });
  
  if (wardPatients.length === 0) {
    wardTable.innerHTML = '<tr><td colspan="5" class="no-data">No patients in Ward</td></tr>';
  }
}

function getPriorityClass(priority) {
  if (priority === 1) return 'tv-priority-high';
  if (priority === 2) return 'tv-priority-medium';
  return 'tv-priority-low';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateLastUpdated(time) {
  const lastUpdatedEl = document.getElementById('lastUpdated');
  if (lastUpdatedEl) {
    lastUpdatedEl.innerHTML = `Last Updated: ${time} | Auto-refresh every 5 seconds`;
  }
}

// TV Clock
function startTVClock() {
  const clockEl = document.getElementById('tvClock');
  if (clockEl) {
    setInterval(() => {
      const now = new Date();
      clockEl.innerHTML = now.toLocaleTimeString() + ' | ' + now.toLocaleDateString();
    }, 1000);
  }
}

// Auto-refresh every 5 seconds
setInterval(() => {
  socket.emit('request-live-data');
}, 5000);

// Blinking live badge
function animateLiveBadge() {
  const badge = document.getElementById('liveBadge');
  if (badge) {
    setInterval(() => {
      badge.style.opacity = badge.style.opacity === '0.5' ? '1' : '0.5';
    }, 1000);
  }
}

// Initialize
startTVClock();
animateLiveBadge();

// Update particles theme for TV
if (document.documentElement) {
  document.documentElement.setAttribute('data-theme', 'dark');
}