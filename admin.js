// Admin Panel JavaScript
const socket = io();

let patients = [];

// Load patients on page load
async function loadPatients() {
  try {
    const response = await fetch('/api/patients');
    patients = await response.json();
    renderPatientsTable();
  } catch (error) {
    console.error('Error loading patients:', error);
  }
}

// Render patients table
function renderPatientsTable() {
  const tbody = document.getElementById('patientsTable');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  patients.forEach(patient => {
    const row = tbody.insertRow();
    row.className = `priority-${patient.priority === 1 ? 'high' : patient.priority === 2 ? 'medium' : 'low'}`;
    
    row.insertCell(0).textContent = patient.id;
    row.insertCell(1).textContent = patient.name;
    row.insertCell(2).textContent = patient.location;
    row.insertCell(3).textContent = patient.doctor;
    row.insertCell(4).textContent = patient.surgery || '-';
    row.insertCell(5).innerHTML = getStatusBadge(patient.status);
    row.insertCell(6).innerHTML = `<div class="condition-text">${patient.condition_update || '-'}</div>`;
    row.insertCell(7).innerHTML = getPriorityBadge(patient.priority);
    row.insertCell(8).innerHTML = patient.is_published ? '<span class="published-badge">✓ Published</span>' : '<span style="color:#999;">Draft</span>';
    
    const actionsCell = row.insertCell(9);
    actionsCell.innerHTML = `
      <button class="btn-mini-blue" onclick="editPatient(${patient.id})">✏️ Edit</button>
      <button class="delete-btn" onclick="deletePatient(${patient.id})">🗑️ Delete</button>
    `;
  });
}

function getStatusBadge(status) {
  const classes = {
    'In OT': 'status-ot',
    'Under Surgery': 'status-surgery',
    'Shifted to Ward': 'status-ward'
  };
  return `<span class="status-badge ${classes[status] || 'status-ot'}">${status}</span>`;
}

function getPriorityBadge(priority) {
  if (priority === 1) return '<span style="color:#ff4444;">🔴 High</span>';
  if (priority === 2) return '<span style="color:#ffbb33;">🟡 Medium</span>';
  return '<span style="color:#00C851;">🟢 Low</span>';
}

// Add patient
async function addPatient() {
  const name = document.getElementById('patientName')?.value.trim();
  const location = document.getElementById('patientLocation')?.value.trim();
  const doctor = document.getElementById('doctorName')?.value.trim();
  const surgery = document.getElementById('surgeryName')?.value.trim();
  const status = document.getElementById('patientStatus')?.value;
  const condition_update = document.getElementById('conditionUpdate')?.value.trim();
  const priority = document.getElementById('priority')?.value;
  
  if (!name || !location || !doctor) {
    alert('Please fill all required fields');
    return;
  }
  
  try {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, doctor, surgery, status, condition_update, priority })
    });
    
    if (response.ok) {
      alert('Patient added successfully!');
      clearForm();
      loadPatients();
    }
  } catch (error) {
    console.error('Error adding patient:', error);
  }
}

// Edit patient
async function editPatient(id) {
  const patient = patients.find(p => p.id === id);
  if (!patient) return;
  
  const newName = prompt('Enter new name:', patient.name);
  const newLocation = prompt('Enter new location:', patient.location);
  const newDoctor = prompt('Enter new doctor:', patient.doctor);
  
  if (newName && newLocation && newDoctor) {
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patient,
          name: newName,
          location: newLocation,
          doctor: newDoctor
        })
      });
      
      if (response.ok) {
        alert('Patient updated successfully!');
        loadPatients();
        updateLiveIndicator();
      }
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  }
}

// Delete patient
async function deletePatient(id) {
  if (confirm('Are you sure you want to delete this patient?')) {
    try {
      const response = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (response.ok) {
        alert('Patient deleted successfully!');
        loadPatients();
        updateLiveIndicator();
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  }
}

// Publish to live TV
async function publishToLive() {
  try {
    const response = await fetch('/api/patients');
    const allPatients = await response.json();
    
    // Only publish patients that are marked for publishing (all in this case)
    socket.emit('publish-update', { patients: allPatients });
    
    const indicator = document.getElementById('liveIndicator');
    if (indicator) {
      indicator.innerHTML = '📡 Publishing...';
      indicator.style.background = '#ff9800';
    }
  } catch (error) {
    console.error('Error publishing:', error);
  }
}

// Socket events
socket.on('publish-success', (data) => {
  const indicator = document.getElementById('liveIndicator');
  if (indicator) {
    indicator.innerHTML = '✅ Published to TV!';
    indicator.style.background = '#4caf50';
    setTimeout(() => {
      indicator.innerHTML = '📡 Live Status: Published';
    }, 3000);
  }
  alert(data.message);
  loadPatients();
});

// Update live indicator
function updateLiveIndicator() {
  const hasPublished = patients.some(p => p.is_published);
  const indicator = document.getElementById('liveIndicator');
  if (indicator) {
    if (hasPublished) {
      indicator.innerHTML = '✅ Live: Published content available';
      indicator.style.background = '#4caf50';
    } else {
      indicator.innerHTML = '📡 Live Status: No published content';
      indicator.style.background = '#ff9800';
    }
  }
}

// Clear form
function clearForm() {
  document.getElementById('patientName').value = '';
  document.getElementById('patientLocation').value = '';
  document.getElementById('doctorName').value = '';
  document.getElementById('surgeryName').value = '';
  document.getElementById('conditionUpdate').value = '';
  document.getElementById('priority').value = '2';
}

// Clock
function startClock() {
  const clockEl = document.getElementById('clock');
  if (clockEl) {
    setInterval(() => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString() + ' | ' + now.toLocaleDateString();
    }, 1000);
  }
}

// Initialize
document.getElementById('publishLiveBtn')?.addEventListener('click', publishToLive);
startClock();
loadPatients();