/* ==== AUTH CONFIG — edit these ==== */
window.AUTH_CONFIG = {
  // 1. Go to https://console.cloud.google.com/apis/credentials
  // 2. Create OAuth client ID → Web application
  // 3. Authorized JavaScript origins:
  //      https://mydomshurt.github.io
  //      http://localhost  (optional, for local testing)
  clientId: 'REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',

  // Only these emails can view the dashboard (case-insensitive)
  allowedEmails: [
    'jeff@breathe-easy.hk',
    // add more:
    // 'josh@breathe-easy.hk',
  ]
};

(function () {
  const cfg = window.AUTH_CONFIG;
  const gate = document.getElementById('auth-gate');
  const app = document.getElementById('app-root');
  const errEl = document.getElementById('auth-error');

  function showApp() {
    if (gate) gate.style.display = 'none';
    if (app) app.style.display = 'block';
    window.dispatchEvent(new Event('auth-ready'));
  }

  function showGate(msg) {
    if (gate) gate.style.display = 'flex';
    if (app) app.style.display = 'none';
    if (errEl && msg) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }

  function parseJwt(token) {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(base64));
    } catch (e) {
      return null;
    }
  }

  function isAllowed(email) {
    if (!email) return false;
    const list = (cfg.allowedEmails || []).map(e => e.toLowerCase().trim());
    return list.includes(email.toLowerCase().trim());
  }

  function handleCredential(response) {
    const payload = parseJwt(response.credential);
    if (!payload || !payload.email) {
      showGate('Could not read your Google account. Try again.');
      return;
    }
    if (!isAllowed(payload.email)) {
      showGate('Access denied for ' + payload.email + '. This dashboard is limited to selected team emails.');
      if (window.google && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
      }
      return;
    }
    sessionStorage.setItem('be_auth_email', payload.email);
    sessionStorage.setItem('be_auth_name', payload.name || '');
    showApp();
    const badge = document.getElementById('auth-user');
    if (badge) badge.textContent = payload.email;
  }

  const existing = sessionStorage.getItem('be_auth_email');
  if (existing && isAllowed(existing)) {
    showApp();
    const badge = document.getElementById('auth-user');
    if (badge) badge.textContent = existing;
    return;
  }

  if (!cfg.clientId || cfg.clientId.indexOf('REPLACE_WITH') === 0) {
    showGate('Google login is not configured yet. Add your OAuth Client ID in auth.js.');
    return;
  }

  window.handleGoogleCredential = handleCredential;

  function initGis() {
    if (!window.google || !google.accounts || !google.accounts.id) {
      setTimeout(initGis, 100);
      return;
    }
    google.accounts.id.initialize({
      client_id: cfg.clientId,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    const btn = document.getElementById('google-btn');
    if (btn) {
      google.accounts.id.renderButton(btn, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 280
      });
    }
  }

  window.beSignOut = function () {
    sessionStorage.removeItem('be_auth_email');
    sessionStorage.removeItem('be_auth_name');
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.disableAutoSelect();
    }
    location.reload();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGis);
  } else {
    initGis();
  }
})();
