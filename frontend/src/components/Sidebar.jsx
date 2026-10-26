import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Clock, FolderClosed, FolderOpen, Home, Layers, LogIn, LogOut, NotebookText, Settings, Star, Wrench, X } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { cx, fmtSize } from '../lib/utils';
import { Avatar } from './ui';

const MAIN = [
  { to: '/', label: 'Home', Icon: Home, end: true },
  { to: '/files', label: 'All files', Icon: FolderOpen },
  { to: '/recent', label: 'Recent', Icon: Clock },
  { to: '/favorites', label: 'Favorites', Icon: Star },
];
const MORE = [
  { to: '/notes', label: 'Notes', Icon: NotebookText },
  { to: '/tools', label: 'Tools', Icon: Wrench },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

const link = ({ isActive }) => cx(
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
  isActive ? 'bg-white/10 text-white shadow-inner ring-1 ring-white/10' : 'text-slate-400 hover:bg-white/5 hover:text-white');

export default function Sidebar({ open, onClose }) {
  const { user, signOut, openAuth, version } = useApp();
  const [stats, setStats] = useState(null), [folders, setFolders] = useState([]);

  useEffect(() => {
    api.get('/stats').then(setStats).catch(() => {});
    api.get('/folders').then(setFolders).catch(() => {});
  }, [version, user]);

  const nav = (
    <div className="flex h-full flex-col bg-ink text-slate-300">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-cyan-600 text-white shadow-lg shadow-brand-900/40"><Layers size={19} /></span>
          <span><span className="block text-[15px] font-semibold leading-tight text-white">UniView</span><span className="block text-[11px] leading-tight text-slate-500">Document workspace</span></span>
        </Link>
        <button className="btn-icon text-slate-400 hover:bg-white/10 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu"><X size={18} /></button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main">
        <div className="space-y-1">{MAIN.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={link} onClick={onClose}><Icon size={18} strokeWidth={1.8} />{label}</NavLink>))}</div>

        {folders.length > 1 && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Folders</p>
            <div className="space-y-0.5">{folders.slice(0, 6).map(f => (
              <NavLink key={f.name} to={'/files?folder=' + encodeURIComponent(f.name)} onClick={onClose}
                className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition',
                  isActive && location.hash.includes('folder=' + encodeURIComponent(f.name)) ? 'text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
                <FolderClosed size={16} strokeWidth={1.8} className="shrink-0" /><span className="flex-1 truncate">{f.name}</span>
                <span className="text-xs text-slate-600">{f.count}</span></NavLink>))}</div>
          </div>
        )}

        <div className="space-y-1">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
          {MORE.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={link} onClick={onClose}><Icon size={18} strokeWidth={1.8} />{label}</NavLink>)}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        {stats && <p className="mb-3 px-2 text-xs text-slate-500">{stats.totalDocs} {stats.totalDocs === 1 ? 'file' : 'files'} · {fmtSize(stats.totalSize)} used</p>}
        {user ? (
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-2.5">
            <Avatar name={user.name} size={34} />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
            <button className="btn-icon h-8 w-8 text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => { onClose(); signOut(); }} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        ) : (
          <button className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left transition hover:bg-white/10" onClick={() => { onClose(); openAuth(); }}>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-slate-300"><LogIn size={16} /></span>
            <span><span className="block text-sm font-medium text-white">Sign in</span><span className="block text-xs text-slate-500">Sync files across devices</span></span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-900 lg:block">{nav}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-pop animate-slide-up" role="dialog" aria-label="Menu">{nav}</aside>
        </div>
      )}
    </>
  );
}
