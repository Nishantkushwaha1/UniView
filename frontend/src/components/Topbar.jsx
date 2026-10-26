import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Menu, Moon, Search, Settings, Sun, Upload, X } from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { useDebounced } from '../lib/utils';
import { Avatar } from './ui';

export default function Topbar({ onMenu }) {
  const { user, signOut, openAuth, openPicker, theme, toggleTheme } = useApp();
  const nav = useNavigate(), loc = useLocation();
  const [q, setQ] = useState(() => (loc.pathname === '/search' ? new URLSearchParams(loc.search).get('q') || '' : ''));
  const [menu, setMenu] = useState(false);
  const input = useRef(), menuRef = useRef();
  const dq = useDebounced(q, 250);

  // typing in the box opens the search page; clearing it goes back home
  useEffect(() => {
    const onSearch = loc.pathname === '/search';
    if (dq.trim()) nav('/search?q=' + encodeURIComponent(dq.trim()), { replace: onSearch });
    else if (onSearch) nav('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq]);

  // leaving the search page clears the box
  useEffect(() => { if (loc.pathname !== '/search') setQ(''); }, [loc.pathname]);

  // "/" focuses search
  useEffect(() => {
    const k = e => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName) && !document.activeElement?.isContentEditable) { e.preventDefault(); input.current?.focus(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const c = e => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener('mousedown', c); return () => document.removeEventListener('mousedown', c);
  }, [menu]);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200/80 bg-white/80 px-3 py-2.5 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <button className="btn-icon lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu size={20} /></button>

      <div className="relative min-w-0 flex-1 sm:max-w-xl">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input ref={input} className="inp bg-slate-100/80 pl-9 pr-16 shadow-none dark:bg-slate-900" placeholder="Search…" aria-label="Search files and notes"
          value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Escape' && (setQ(''), e.currentTarget.blur())} />
        {q ? <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" onClick={() => setQ('')} aria-label="Clear search"><X size={15} /></button>
          : <span className="kbd absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block">/</span>}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <button className="btn btn-primary" onClick={() => openPicker()}><Upload size={16} /><span className="hidden sm:inline">Open file</span></button>
        <button className="btn-icon" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>

        {user ? (
          <div className="relative" ref={menuRef}>
            <button className="rounded-full outline-none ring-brand-500 focus-visible:ring-2" onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu"><Avatar name={user.name} size={34} /></button>
            {menu && (
              <div role="menu" className="card absolute right-0 top-full mt-2 w-56 overflow-hidden p-1 shadow-pop animate-pop-in">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
                <Link role="menuitem" to="/settings" onClick={() => setMenu(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><Settings size={15} /> Settings</Link>
                <button role="menuitem" onClick={() => { setMenu(false); signOut(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"><LogOut size={15} /> Sign out</button>
              </div>
            )}
          </div>
        ) : <button className="btn btn-ghost px-2.5 sm:px-3.5" onClick={openAuth} aria-label="Sign in"><LogIn size={16} /><span className="hidden sm:inline">Sign in</span></button>}
      </div>
    </header>
  );
}
