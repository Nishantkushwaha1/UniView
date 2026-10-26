import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, UploadCloud, XCircle } from 'lucide-react';
import { api, auth } from '../api';
import { INLINE_MAX, UPLOAD_MAX, extOf, kindOf, readFile, cx, fmtSize } from './utils';
import { ConfirmDialog, Spinner, Toasts } from '../components/ui';
import AuthModal from '../components/AuthModal';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [version, setVersion] = useState(0);              // bump() makes lists and stats reload
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pickRef = useRef(), pickFolder = useRef();

  const bump = useCallback(() => setVersion(v => v + 1), []);

  // ----- theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('uv_theme', theme); } catch { /* ignore */ }
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);

  // ----- toasts
  const dismiss = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-3), { id, msg, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  // ----- confirm dialog (promise based, replaces window.confirm)
  const confirm = useCallback(opts => new Promise(resolve => setDialog({ ...opts, resolve })), []);
  const closeDialog = ok => { dialog?.resolve(ok); setDialog(null); };

  // ----- auth
  useEffect(() => {
    if (auth.token) api.get('/auth/me').then(setUser).catch(() => auth.set(null));
    const onLogout = () => { setUser(null); toast('Your session expired. Please sign in again.', 'info'); bump(); };
    window.addEventListener('uv:logout', onLogout);
    return () => window.removeEventListener('uv:logout', onLogout);
  }, [toast, bump]);

  // ----- guest sessions: keep the server informed, so guest data is removed after the tab closes
  useEffect(() => {
    auth.ping();
    const t = setInterval(() => auth.ping(), 30000);
    const visible = () => document.visibilityState === 'visible' && auth.ping();
    const leaving = e => { if (!e.persisted) auth.leave(); };
    const back = e => { if (e.persisted) auth.ping(); };
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('pagehide', leaving);
    window.addEventListener('pageshow', back);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', visible); window.removeEventListener('pagehide', leaving); window.removeEventListener('pageshow', back); };
  }, []);

  // first visit in this tab: offer sign in, but "Continue as guest" is always one tap away
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem('uv_welcomed') === '1'; sessionStorage.setItem('uv_welcomed', '1'); } catch { /* ignore */ }
    if (!seen && !auth.token && !/reset-password/.test(location.hash)) setShowAuth(true);
  }, []);

  const onAuthed = useCallback(u => { setUser(u); setShowAuth(false); bump(); nav('/'); toast(`Welcome, ${u.name}!`); }, [bump, nav, toast]);
  const signOut = useCallback(() => { auth.set(null); setUser(null); bump(); nav('/'); toast('Signed out.', 'info'); }, [bump, nav, toast]);

  // ----- uploads
  const upload = useCallback(async (fileList, folder) => {
    const files = [...fileList];
    if (!files.length) return;
    let ok = 0, last = null;
    for (const f of files) {
      const id = Math.random().toString(36).slice(2);
      const patch = p => setUploads(u => u.map(x => (x.id === id ? { ...x, ...p } : x)));
      setUploads(u => [...u, { id, name: f.name, size: f.size, progress: 0, status: 'uploading' }]);
      try {
        const ext = extOf(f.name), kind = kindOf(ext);
        if (f.size > UPLOAD_MAX) throw new Error('Larger than 200 MB');
        let saved;
        if (f.size > INLINE_MAX) {
          if (kind === 'text') throw new Error("Text and code files over 8 MB can't be opened here");
          const fd = new FormData(); fd.append('file', f); if (folder) fd.append('folder', folder);
          saved = await api.upload('/docs/upload', fd, p => patch({ progress: p }));
        } else {
          saved = await api.post('/docs', { ...(await readFile(f)), ...(folder && { folder }) });
        }
        patch({ progress: 1, status: 'done' }); ok++; last = saved._id;
        setTimeout(() => setUploads(u => u.filter(x => x.id !== id)), 3500);
      } catch (e) {
        patch({ status: 'error', error: e.message });
        setTimeout(() => setUploads(u => u.filter(x => x.id !== id)), 9000);
      }
    }
    bump();
    if (ok === 1 && files.length === 1 && last) nav('/doc/' + last);
    else if (ok > 1) toast(`${ok} files uploaded.`);
  }, [bump, nav, toast]);

  const openPicker = useCallback(folder => { pickFolder.current = folder; pickRef.current?.click(); }, []);

  // ----- drag & drop anywhere
  useEffect(() => {
    let depth = 0;
    const has = e => [...(e.dataTransfer?.types || [])].includes('Files');
    const enter = e => { if (has(e)) { depth++; setDragging(true); } };
    const leave = e => { if (has(e) && --depth <= 0) { depth = 0; setDragging(false); } };
    const over = e => has(e) && e.preventDefault();
    const drop = e => { if (!has(e)) return; e.preventDefault(); depth = 0; setDragging(false); upload(e.dataTransfer.files); };
    window.addEventListener('dragenter', enter); window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over); window.addEventListener('drop', drop);
    return () => { window.removeEventListener('dragenter', enter); window.removeEventListener('dragleave', leave); window.removeEventListener('dragover', over); window.removeEventListener('drop', drop); };
  }, [upload]);

  const value = useMemo(() => ({
    user, setUser, signOut, onAuthed, openAuth: () => setShowAuth(true),
    toast, confirm, upload, openPicker, version, bump, theme, toggleTheme,
  }), [user, signOut, onAuthed, toast, confirm, upload, openPicker, version, bump, theme, toggleTheme]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <input ref={pickRef} type="file" multiple hidden onChange={e => { const f = [...e.target.files]; e.target.value = ''; upload(f, pickFolder.current); pickFolder.current = undefined; }} />
      <Toasts toasts={toasts} dismiss={dismiss} />
      <ConfirmDialog dialog={dialog} onClose={closeDialog} />
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      <UploadTray uploads={uploads} />
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-brand-900/70 p-6 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-white/70 px-16 py-14 text-center text-white">
            <UploadCloud size={56} strokeWidth={1.4} />
            <p className="mt-4 text-xl font-semibold">Drop files to open them</p>
            <p className="mt-1 text-sm text-white/80">PDF, Word, Excel, PowerPoint, code, images, audio and video</p>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function UploadTray({ uploads }) {
  if (!uploads.length) return null;
  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-[55] sm:right-4 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop animate-slide-up dark:border-slate-700 dark:bg-slate-800" aria-live="polite">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Uploads</div>
      <ul className="max-h-60 divide-y divide-slate-100 overflow-auto dark:divide-slate-700">
        {uploads.map(u => (
          <li key={u.id} className="px-4 py-3">
            <div className="flex items-center gap-2.5">
              {u.status === 'uploading' && <Spinner size={16} />}
              {u.status === 'done' && <CheckCircle2 size={16} className="text-emerald-500" />}
              {u.status === 'error' && <XCircle size={16} className="text-red-500" />}
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{u.name}</span>
              <span className="text-xs text-slate-400">{fmtSize(u.size)}</span>
            </div>
            {u.status === 'error' ? <p className="mt-1 pl-6 text-xs text-red-600 dark:text-red-400">{u.error}</p> : (
              <div className="ml-6 mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <div className={cx('h-full rounded-full bg-brand-500 transition-all', u.status === 'uploading' && u.progress === 0 && 'w-1/3 animate-pulse')} style={u.progress > 0 ? { width: `${u.progress * 100}%` } : undefined} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
