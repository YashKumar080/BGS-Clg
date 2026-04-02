// subscription.js – Plan selection and display

const PLAN_DESCRIPTIONS = {
  Free:   'Basic AI scanning (5/day) + 5 reminders',
  Pro:    'Unlimited scans, reminders & email SOS alerts',
  Family: 'Everything in Pro + up to 5 users & family alerts'
};

async function loadSubscription() {
  try {
    const resp = await fetch('/api/subscription');
    const sub  = await resp.json();
    updateUI(sub.plan || 'Free');
  } catch {
    showToast('Could not load subscription info.', 'error');
  }
}

function updateUI(plan) {
  // Update banner
  document.getElementById('activePlanLabel').textContent = `${plan} Plan`;
  document.getElementById('activePlanDesc').textContent  = PLAN_DESCRIPTIONS[plan] || '';

  // Highlight active plan card
  ['Free', 'Pro', 'Family'].forEach(p => {
    const card = document.getElementById(`plan-${p.toLowerCase()}`);
    if (!card) return;
    card.classList.toggle('active-plan', p === plan);

    const btn = document.getElementById(`btn-select-${p.toLowerCase()}`);
    if (!btn) return;
    if (p === plan) {
      btn.textContent = '✅ Current Plan';
      btn.disabled = true;
    } else {
      btn.disabled = false;
      btn.textContent =
        p === 'Free'   ? 'Select Free Plan' :
        p === 'Pro'    ? 'Activate Pro (Demo)' :
                         'Activate Family (Demo)';
    }
  });
}

async function selectPlan(plan) {
  try {
    const resp = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan })
    });
    const data = await resp.json();

    if (!resp.ok) { showToast(data.error || 'Plan update failed.', 'error'); return; }

    updateUI(plan);

    // Show success modal
    const modal = document.getElementById('successModal');
    const body  = document.getElementById('modalBody');
    body.innerHTML = `
      <strong>${plan} Plan</strong> has been activated.<br>
      <em>${PLAN_DESCRIPTIONS[plan]}</em><br><br>
      Subscription activated (Demo Mode) 🎉
    `;
    modal.classList.remove('hidden');

    showToast(`✅ ${plan} Plan activated (Demo Mode)`, 'success');
  } catch {
    showToast('Network error. Please try again.', 'error');
  }
}

function closeModal() {
  document.getElementById('successModal').classList.add('hidden');
}

// Close modal on overlay click
document.getElementById('successModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

loadSubscription();
