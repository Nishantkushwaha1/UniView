// Thin client for the UniView API.
// Signing in is optional: without a token every browser tab works as its own private guest.
// A guest id lives in sessionStorage, so it disappears when the tab is closed (the server then deletes the guest's data).
const BASE = (import.meta.env.VITE_API || 'http://localhost:5000/api').replace(/\/$/, '');
let memGuest = '';
const TOKEN_KEY = 'uv_token', GUEST_KEY = 'uv_guest';

export const auth = {
  get token() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ } },
  guest() {
    try {
      let g = sessionStorage.getItem(GUEST_KEY);
      if (!g) { g = crypto.randomUUID(); sessionStorage.setItem(GUEST_KEY, g); }
      return g;
    } catch { return memGuest ||= 'session-' + Math.random().toString(36).slice(2).padEnd(20, '0'); }
  },
  // tells the server this guest tab is alive / is closing (best effort)
  ping() { if (!this.token) fetch(BASE + '/guest/ping', { method: 'POST', headers: { 'x-guest-id': this.guest() }, keepalive: true }).catch(() => {}); },
  leave() { if (!this.token) try { navigator.sendBeacon(BASE + '/guest/leave', this.guest()); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}

const headers = (json = true) => ({
  ...(json && { 'Content-Type': 'application/json' }),
  'x-guest-id': auth.guest(),
  ...(auth.token && { Authorization: 'Bearer ' + auth.token }),
});

// A 401 while holding a token means it expired: drop it and tell the app
function onUnauthorized(status) {
  if (status === 401 && auth.token) {
    auth.set(null);
    window.dispatchEvent(new Event('uv:logout'));
  }
}

async function request(path, { method = 'GET', body, as = 'json' } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: headers(body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the API running?');
  }
  if (!res.ok) {
    let msg = res.statusText || 'Request failed';
    try { msg = (await res.json()).error || msg; } catch { /* not JSON */ }
    onUnauthorized(res.status);
    throw new ApiError(msg, res.status);
  }
  return as === 'blob' ? res.blob() : res.json();
}

export const api = {
  get: p => request(p),
  post: (p, b = {}) => request(p, { method: 'POST', body: b }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b }),
  del: (p, b) => request(p, { method: 'DELETE', body: b }),
  blob: p => request(p, { as: 'blob' }),
  url: p => BASE + p,

  // multipart upload with progress (0..1)
  upload(path, formData, onProgress) {
    return new Promise((resolve, reject) => {
      const x = new XMLHttpRequest();
      x.open('POST', BASE + path);
      Object.entries(headers(false)).forEach(([k, v]) => x.setRequestHeader(k, v));
      x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
      x.onload = () => {
        let j = null; try { j = JSON.parse(x.responseText); } catch { /* ignore */ }
        if (x.status >= 200 && x.status < 300) return resolve(j);
        onUnauthorized(x.status);
        reject(new ApiError(j?.error || 'Upload failed', x.status));
      };
      x.onerror = () => reject(new ApiError('Cannot reach the server. Is the API running?'));
      x.send(formData);
    });
  },
};
