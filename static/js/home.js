// home.js – Dashboard logic

async function loadDashboard() {
  try {
    const [medsResp, subResp] = await Promise.all([
      fetch('/api/medicines'),
      fetch('/api/subscription')
    ]);
    const meds = await medsResp.json();
    const sub  = await subResp.json();

    // Counts
    const taken  = meds.filter(m => m.status === 'Taken').length;
    const missed = meds.filter(m => m.status === 'Missed').length;

    document.getElementById('totalCount').textContent  = meds.length;
    document.getElementById('takenCount').textContent  = taken;
    document.getElementById('missedCount').textContent = missed;
    document.getElementById('currentPlan').textContent = sub.plan || 'Free';

    // Today's medicines grid
    const grid = document.getElementById('todayMedicines');
    if (!meds.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💊</div>
          <h3>No medicines yet</h3>
          <p>Add your first medicine in the <a href="/reminders">Reminders</a> section.</p>
        </div>`;
      return;
    }

    grid.innerHTML = meds.map(med => `
      <div class="med-mini-card" id="home-med-${med.id}">
        <div class="med-mini-name">${escHtml(med.name)}</div>
        <div class="med-mini-time">⏰ ${formatTime(med.time)} &nbsp;|&nbsp; ${escHtml(med.days)}</div>
        <span class="med-mini-status ${statusBadgeClass(med.status)}">${med.status}</span>
      </div>
    `).join('');

  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

loadDashboard();
