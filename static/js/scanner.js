// scanner.js – AI Medicine Scanner logic

let currentImageB64 = null;
let cameraStream = null;

// ─── Tab Switching ───────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('tab-camera').classList.toggle('active', tab === 'camera');
  document.getElementById('tab-upload').classList.toggle('active', tab === 'upload');
  document.getElementById('panel-camera').classList.toggle('hidden', tab !== 'camera');
  document.getElementById('panel-upload').classList.toggle('hidden', tab !== 'upload');

  if (tab !== 'camera') stopCamera();
  currentImageB64 = null;
  updateScanBtn();
}

// ─── Camera ──────────────────────────────────────────────────────
async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('cameraFeed');
    video.srcObject = cameraStream;
    document.getElementById('btn-start-camera').style.display = 'none';
    document.getElementById('btn-capture').style.display = 'inline-flex';
    document.getElementById('btn-stop-camera').style.display = 'inline-flex';
    document.getElementById('cameraOverlay').style.display = 'flex';
  } catch (err) {
    showToast('Camera access denied. Please use image upload instead.', 'error');
  }
}

function capturePhoto() {
  const video  = document.getElementById('cameraFeed');
  const canvas = document.getElementById('captureCanvas');

  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 480;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const maxW = 800;
  if (canvas.width > maxW) {
    const ratio = maxW / canvas.width;
    const small = document.createElement('canvas');
    small.width  = maxW;
    small.height = Math.round(canvas.height * ratio);
    small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
    currentImageB64 = small.toDataURL('image/jpeg', 0.8);
  } else {
    currentImageB64 = canvas.toDataURL('image/jpeg', 0.8);
  }

  const preview = document.getElementById('capturedImg');
  preview.src = currentImageB64;
  document.getElementById('capturedPreview').classList.remove('hidden');

  stopCamera();
  document.getElementById('cameraOverlay').style.display = 'none';
  updateScanBtn();
  showToast('Photo captured! Click "Analyse with AI" to scan.', 'info');
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  document.getElementById('btn-start-camera').style.display = 'inline-flex';
  document.getElementById('btn-capture').style.display = 'none';
  document.getElementById('btn-stop-camera').style.display = 'none';
}

function retakePhoto() {
  currentImageB64 = null;
  document.getElementById('capturedPreview').classList.add('hidden');
  document.getElementById('capturedImg').src = '';
  updateScanBtn();
}

// ─── File Upload ─────────────────────────────────────────────────
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please select an image file.', 'error'); return; }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const canvas = document.createElement('canvas');
      if (img.width > maxW) {
        canvas.width  = maxW;
        canvas.height = Math.round(img.height * maxW / img.width);
      } else {
        canvas.width  = img.width;
        canvas.height = img.height;
      }
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      currentImageB64 = canvas.toDataURL('image/jpeg', 0.82);
      document.getElementById('previewImg').src = currentImageB64;
      document.getElementById('previewContainer').classList.remove('hidden');
      document.getElementById('uploadZone').classList.add('hidden');
      updateScanBtn();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Drag-and-drop
const uploadZone = document.getElementById('uploadZone');
if (uploadZone) {
  uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--teal)'; });
  uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('fileInput').files = dt.files;
      handleFileSelect({ target: { files: dt.files } });
    }
  });
}

function clearUpload() {
  currentImageB64 = null;
  document.getElementById('previewImg').src = '';
  document.getElementById('previewContainer').classList.add('hidden');
  document.getElementById('uploadZone').classList.remove('hidden');
  document.getElementById('fileInput').value = '';
  updateScanBtn();
}

// ─── Scan Button State ───────────────────────────────────────────
function updateScanBtn() {
  const btn = document.getElementById('btn-scan');
  if (btn) btn.disabled = !currentImageB64;
}

// ─── Core scan call ───────────────────────────────────────────────
async function callScanAPI() {
  const resp = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: currentImageB64 })
  });
  const data = await resp.json();
  return { resp, data };
}

// ─── Display result ───────────────────────────────────────────────
function displayResult(data) {
  let outputText = `Medicine Name: ${data.medicine_name}\n`;
  outputText += `Confidence: ${data.confidence_score}\n`;
  outputText += `Use: ${data.use}`;
  
  document.getElementById('aiResponseText').textContent = outputText;

  const statusBlock = document.getElementById('reminderStatusBlock');
  const statusIcon  = document.getElementById('reminderStatusIcon');
  const statusText  = document.getElementById('reminderStatusText');

  if (data.reminder_status) {
    statusBlock.classList.remove('hidden');
    statusText.textContent = data.reminder_status;
    if (data.reminder_status.includes('MISSED')) {
      statusIcon.textContent = '🚨';
      statusBlock.style.borderColor = 'rgba(239,68,68,0.4)';
      statusBlock.style.background  = 'rgba(239,68,68,0.08)';
    } else if (data.reminder_status.includes('already taken')) {
      statusIcon.textContent = '✅';
      statusBlock.style.borderColor = 'rgba(16,185,129,0.3)';
      statusBlock.style.background  = 'rgba(16,185,129,0.08)';
    } else {
      statusIcon.textContent = '⏰';
      statusBlock.style.borderColor = '';
      statusBlock.style.background  = '';
    }
  } else {
    statusBlock.classList.add('hidden');
  }

  const badge = document.getElementById('resultBadge');
  if (badge) badge.textContent = 'Analysed';

  const counter = document.getElementById('scanCounter');
  if (counter) counter.textContent = `Scans today: ${data.scan_count}`;

  const result = document.getElementById('resultSection');
  result.classList.remove('hidden');
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Scan Medicine (main entry) ──────────────────────────────────
async function scanMedicine() {
  if (!currentImageB64) { showToast('No image selected.', 'error'); return; }

  const loading = document.getElementById('scanLoading');
  const result  = document.getElementById('resultSection');
  loading.classList.remove('hidden');
  result.classList.add('hidden');

  const loadingP = loading.querySelector('p');
  if (loadingP) loadingP.textContent = 'Extracting text and identifying medicine…';

  try {
    const { resp, data } = await callScanAPI();
    loading.classList.add('hidden');

    if (!resp.ok || data.error) {
      showToast(data.error || 'Scan failed.', 'error', 6000);
      return;
    }

    displayResult(data);

  } catch (err) {
    loading.classList.add('hidden');
    showToast('Network error. Is the Flask server running?', 'error');
  }
}

function newScan() {
  document.getElementById('resultSection').classList.add('hidden');
  document.getElementById('capturedPreview').classList.add('hidden');
  document.getElementById('previewContainer').classList.add('hidden');
  document.getElementById('uploadZone').classList.remove('hidden');
  document.getElementById('previewImg').src = '';
  document.getElementById('capturedImg').src = '';
  document.getElementById('fileInput').value = '';
  currentImageB64 = null;
  updateScanBtn();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Load Plan badge ─────────────────────────────────────────────
async function loadPlanBadge() {
  try {
    const resp = await fetch('/api/subscription');
    const sub  = await resp.json();
    const label = document.getElementById('planBadgeLabel');
    const counter = document.getElementById('scanCounter');
    if (label) label.innerHTML = `Plan: <strong style="color:var(--teal)">${sub.plan}</strong>`;
    if (counter && sub.plan === 'Free') {
      counter.textContent = `Scans today: ${sub.scan_count}`;
    } else if (counter) {
      counter.textContent = 'Unlimited scans';
    }
  } catch {}
}

loadPlanBadge();
