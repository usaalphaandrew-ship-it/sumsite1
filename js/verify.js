// CodeHelpers Reviewer Onboarding & Verification Controller
const API_BASE = '/api';

const verifyForm  = document.getElementById('verify-form');
const startBtn    = document.getElementById('start-btn');
const statusAlert = document.getElementById('status-alert');
const sdkWrap     = document.getElementById('sumsub-container');

let applicantId = null;
let userId      = null;

async function apiFetch(path, opts = {}) {
  try {
    const r = await fetch(API_BASE + path, opts);
    if (!r.ok) {
      // Fallback with .php extension if direct rewriting isn't active
      const r2 = await fetch(API_BASE + path + '.php', opts);
      return r2.json();
    }
    return r.json();
  } catch (err) {
    return { error: 'Network request error' };
  }
}

function displayStatus(message, variant = 'info') {
  if (!statusAlert) return;
  statusAlert.textContent = message;
  statusAlert.className   = `status-alert show ${variant}`;
}

if (startBtn) {
  startBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const nameField  = document.getElementById('reviewer-name');
    const emailField = document.getElementById('reviewer-email');
    const stackField = document.getElementById('reviewer-stack');

    if (nameField && !nameField.value.trim()) {
      displayStatus('Please provide your full legal name.', 'error');
      nameField.focus();
      return;
    }

    if (emailField && !emailField.value.trim()) {
      displayStatus('Please provide a valid contact email.', 'error');
      emailField.focus();
      return;
    }

    startBtn.disabled    = true;
    startBtn.textContent = 'Initializing…';
    displayStatus('Initializing secure verification portal…', 'info');

    const result = await apiFetch('/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'admin3200' })
    });

    if (result.error || !result.token) {
      displayStatus('Unable to initialize verification. Please try again.', 'error');
      startBtn.disabled    = false;
      startBtn.textContent = 'Begin Verification';
      return;
    }

    applicantId = result.applicantId;
    userId      = result.userId;

    if (verifyForm) {
      verifyForm.style.display = 'none';
    }
    statusAlert.className = 'status-alert';

    launchVerificationFlow(result.token);
  });
}

function launchVerificationFlow(token) {
  const scriptTag = document.createElement('script');
  scriptTag.src   = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js';
  scriptTag.onload = () => initializeWebSdk(token);
  scriptTag.onerror = () => {
    displayStatus('Could not load the verification module. Please check your connection.', 'error');
  };
  document.head.appendChild(scriptTag);
}

function initializeWebSdk(token) {
  if (typeof snsWebSdk === 'undefined') {
    displayStatus('Verification module could not be initialized.', 'error');
    return;
  }

  const sdkInstance = snsWebSdk
    .init(token, () => requestTokenRefresh())
    .withConf({ lang: 'en' })
    .withOptions({ addViewportTag: false, adaptIframeHeight: true })
    .on('idCheck.onStepCompleted', () => {})
    .on('idCheck.onApplicantStatusChanged', (payload) => {
      const status = payload?.reviewStatus;
      if (status === 'completed') {
        checkReviewerStatus();
      }
    })
    .on('idCheck.onError', () => {
      displayStatus('Verification was interrupted. Please reload and retry.', 'error');
    })
    .build();

  sdkInstance.launch('#sumsub-container');
}

async function requestTokenRefresh() {
  const result = await apiFetch('/refresh-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  return result.token || '';
}

async function checkReviewerStatus() {
  if (!applicantId) return;
  const res = await apiFetch('/status/' + applicantId);
  const status = res.reviewStatus || '';
  const outcome = res.reviewResult?.reviewAnswer || '';

  if (status === 'completed' && outcome === 'GREEN') {
    displayStatus('Verification confirmed! Your reviewer profile is now approved.', 'success');
  } else if (status === 'completed' && outcome === 'RED') {
    displayStatus('Verification could not be confirmed. Please reach out to support@codehelper.us.', 'error');
  } else {
    setTimeout(checkReviewerStatus, 5000);
  }
}
