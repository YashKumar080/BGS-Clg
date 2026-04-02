// reminders.js – Medicine CRUD + SOS contacts

let allMedicines = [];
let currentFilter = 'all';

// ─── Utilities ───────────────────────────────────────────────────
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── Load Medicines ──────────────────────────────────────────────
async function loadMedicines() {
  try {
    const resp = await fetch('/api/medicines');
    allMedicines = await resp.json();
    renderMedicines();
  } catch {
    showToast('Failed to load medicines.', 'error');
  }
}

function renderMedicines() {
  const container = document.getElementById('medicinesList');
  const list = currentFilter === 'all'
    ? allMedicines
    : allMedicines.filter(m => m.status === currentFilter);

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">💊</div>
        <h3>No medicines found</h3>
        <p>${currentFilter === 'all' ? 'Add your first medicine above.' : `No medicines with status "${currentFilter}".`}</p>
      </div>`;
    return;
  }

  container.innerHTML = list.map(med => `
    <div class="med-card ${statusBadgeClass(med.status)}" id="medcard-${med.id}">
      <div class="med-card-header">
        <span class="med-card-name">${escHtml(med.name)}</span>
        <span class="med-badge ${statusBadgeClass(med.status)}">${med.status}</span>
      </div>
      <div class="med-card-details">
        <div class="med-detail-row">⏰ <strong>${formatTime(med.time)}</strong></div>
        <div class="med-detail-row">📅 ${escHtml(med.days)}</div>
        ${med.last_taken_date ? `<div class="med-detail-row">✅ Last taken: ${med.last_taken_date}</div>` : ''}
      </div>
      <div class="med-card-actions">
        ${med.status !== 'Taken' ? `
          <button class="btn btn-success btn-sm" onclick="markTaken(${med.id})" id="btn-taken-${med.id}">✅ Mark Taken</button>
        ` : ''}
        <button class="btn btn-secondary btn-sm" onclick="editMedicine(${med.id})" id="btn-edit-${med.id}">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteMedicine(${med.id})" id="btn-delete-${med.id}">🗑️</button>
      </div>
    </div>
  `).join('');
}

// ─── Filter ──────────────────────────────────────────────────────
function filterMedicines(status) {
  currentFilter = status;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`filter-${status}`).classList.add('active');
  renderMedicines();
}

// ─── Add / Save Medicine ─────────────────────────────────────────
async function saveMedicine() {
  const name  = document.getElementById('medName').value.trim();
  const time  = document.getElementById('medTime').value.trim();
  const days  = document.getElementById('medDays').value;
  const editId = document.getElementById('editMedId').value;

  if (!name || !time) { showToast('Please fill in Medicine Name and Time.', 'error'); return; }

  try {
    let resp;
    if (editId) {
      resp = await fetch(`/api/medicines/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, time, days })
      });
    } else {
      resp = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, time, days })
      });
    }

    const data = await resp.json();
    if (!resp.ok) { showToast(data.error || 'Save failed', 'error'); return; }

    showToast(editId ? 'Medicine updated!' : 'Medicine added!', 'success');
    cancelEdit();
    loadMedicines();
  } catch {
    showToast('Network error.', 'error');
  }
}

// ─── Edit ────────────────────────────────────────────────────────
function editMedicine(id) {
  const med = allMedicines.find(m => m.id === id);
  if (!med) return;

  document.getElementById('editMedId').value = id;
  document.getElementById('medName').value  = med.name;
  document.getElementById('medTime').value  = med.time;
  document.getElementById('medDays').value  = med.days;
  document.getElementById('formTitle').textContent = '✏️ Edit Medicine';
  document.getElementById('btn-cancel-edit').classList.remove('hidden');
  document.getElementById('medicineFormCard').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
  document.getElementById('editMedId').value = '';
  document.getElementById('medName').value   = '';
  document.getElementById('medTime').value   = '';
  document.getElementById('medDays').value   = 'Daily';
  document.getElementById('formTitle').textContent = '➕ Add New Medicine';
  document.getElementById('btn-cancel-edit').classList.add('hidden');
}

// ─── Delete ──────────────────────────────────────────────────────
async function deleteMedicine(id) {
  if (!confirm('Delete this medicine?')) return;
  try {
    const resp = await fetch(`/api/medicines/${id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error();
    showToast('Medicine deleted.', 'info');
    loadMedicines();
  } catch {
    showToast('Delete failed.', 'error');
  }
}

// ─── Mark Taken ──────────────────────────────────────────────────
async function markTaken(id) {
  try {
    const resp = await fetch(`/api/medicines/${id}/taken`, { method: 'POST' });
    if (!resp.ok) throw new Error();
    showToast('Marked as taken! ✅', 'success');
    loadMedicines();
  } catch {
    showToast('Failed to mark as taken.', 'error');
  }
}

// ─── Check Missed & SOS ─────────────────────────────────────────
async function checkMissed() {
  try {
    showToast('Checking for missed medicines…', 'info');
    const resp = await fetch('/api/check-missed');
    const data = await resp.json();
    if (data.missed && data.missed.length > 0) {
      showToast(`🚨 SOS triggered for ${data.missed.length} missed medicine(s). Check console/email.`, 'error', 6000);
    } else {
      showToast('✅ No missed medicines detected.', 'success');
    }
    loadMedicines();
  } catch {
    showToast('Check failed.', 'error');
  }
}

// ─── SOS Contacts ────────────────────────────────────────────────
function toggleSOS() {
  const body = document.getElementById('sosBody');
  const icon = document.getElementById('sosToggleIcon');
  body.classList.toggle('collapsed');
  icon.textContent = body.classList.contains('collapsed') ? '▼' : '▲';
  if (!body.classList.contains('collapsed')) loadContacts();
}

async function loadContacts() {
  try {
    const resp = await fetch('/api/sos-contacts');
    const contacts = await resp.json();
    const list = document.getElementById('contactsList');

    if (!contacts.length) {
      list.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">No SOS contacts added yet.</p>';
      return;
    }
    list.innerHTML = contacts.map(c => `
      <div class="contact-item" id="contact-${c.id}">
        <div class="contact-info">
          <strong>${escHtml(c.name)}</strong>
          <small>${escHtml(c.email)}</small>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="deleteContact(${c.id})" id="btn-del-contact-${c.id}">🗑️</button>
      </div>
    `).join('');
  } catch {}
}

async function addContact() {
  const name  = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  if (!name || !email) { showToast('Name and email are required.', 'error'); return; }

  try {
    const resp = await fetch('/api/sos-contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    if (!resp.ok) throw new Error();
    document.getElementById('contactName').value  = '';
    document.getElementById('contactEmail').value = '';
    showToast('SOS contact added!', 'success');
    loadContacts();
  } catch {
    showToast('Failed to add contact.', 'error');
  }
}

async function deleteContact(id) {
  if (!confirm('Remove this SOS contact?')) return;
  try {
    await fetch(`/api/sos-contacts/${id}`, { method: 'DELETE' });
    showToast('Contact removed.', 'info');
    loadContacts();
  } catch {}
}

// ─── Init ────────────────────────────────────────────────────────
loadMedicines();
