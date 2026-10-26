import { useEffect, useState } from 'react';

export const MB = 1048576;
export const INLINE_MAX = 8 * MB;   // bigger files are streamed to GridFS by the backend
export const UPLOAD_MAX = 200 * MB;

// Mirrors backend/src/utils/kinds.js
const TEXT = ('txt md markdown html htm css scss js jsx ts tsx json xml sql py java c cpp h hpp cs go rs rb php sh bat yml yaml toml ini log csv tsv').split(' ');
const IMAGE = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico', 'avif'];
const AUDIO = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
const VIDEO = ['mp4', 'webm', 'mov', 'm4v', 'ogv'];

export const extOf = name => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
export const kindOf = ext =>
  TEXT.includes(ext) ? 'text' : IMAGE.includes(ext) ? 'image' : AUDIO.includes(ext) ? 'audio' :
  VIDEO.includes(ext) ? 'video' : ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' :
  ['xlsx', 'xls'].includes(ext) ? 'xlsx' : ext === 'pptx' ? 'pptx' : 'other';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function fmtSize(n = 0) {
  if (n >= 1024 * MB) return (n / (1024 * MB)).toFixed(1) + ' GB';
  if (n >= MB) return (n / MB).toFixed(n >= 10 * MB ? 0 : 1) + ' MB';
  if (n >= 1024) return Math.round(n / 1024) + ' KB';
  return n + ' B';
}

export function timeAgo(d) {
  if (!d) return '';
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 45) return 'Just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 172800) return 'Yesterday';
  if (s < 7 * 86400) return Math.round(s / 86400) + ' days ago';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
};

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';

// Reads a file for the small-file API: text as text, everything else as a data URL
export const readFile = f => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve({ name: f.name, content: r.result });
  r.onerror = () => reject(new Error('Could not read this file.'));
  kindOf(extOf(f.name)) === 'text' ? r.readAsText(f) : r.readAsDataURL(f);
});

export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// useState that survives page reloads
export function useLocalState(key, initial) {
  const [v, setV] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) ?? initial; } catch { return initial; } });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }, [key, v]);
  return [v, setV];
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}
