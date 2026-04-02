// main.js – Shared utilities for all pages

// ─── Hamburger Menu ──────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    mobileNav.classList.toggle('open');
  });
}

// ─── Toast Notification ──────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
      toast.classList.add('hidden');
      toast.style.animation = '';
    }, 300);
  }, duration);
}

// ─── Status Badge Helper ─────────────────────────────────────────
function statusBadgeClass(status) {
  if (status === 'Taken')   return 'status-taken';
  if (status === 'Missed')  return 'status-missed';
  return 'status-pending';
}

// ─── Format time to 12h ─────────────────────────────────────────
function formatTime(t) {
  if (!t) return '–';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
}
