import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckSquare, Clock, FileText, FolderOpen, HardDrive, NotebookText, Star, Timer, Upload, Wrench } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { KINDS } from '../lib/kinds';
import { cx, fmtSize, greeting } from '../lib/utils';
import DocsBrowser from '../components/DocsBrowser';
import { EmptyState, Skeleton } from '../components/ui';

function Stat({ icon: Icon, label, value, hint, tone, to }) {
  return (
    <Link to={to} className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
      <span className={cx('inline-flex h-11 w-11 items-center justify-center rounded-xl', tone)}><Icon size={21} strokeWidth={1.8} /></span>
      <span className="min-w-0"><span className="block text-2xl font-semibold leading-none tracking-tight text-slate-900 dark:text-white">{value}</span>
        <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{label}{hint ? ` · ${hint}` : ''}</span></span>
    </Link>
  );
}

export default function Home() {
  const { user, version, openPicker } = useApp();
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/stats').then(setS).catch(() => setS({ totalDocs: 0, totalSize: 0, favorites: 0, notes: 0, todos: { open: 0, done: 0 }, byKind: [] })); }, [version, user]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-cyan-900 p-6 text-white shadow-lift sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-brand-100">{greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Every document, one place.</h1>
          <p className="mt-3 text-sm leading-relaxed text-brand-50/90 sm:text-base">Open PDFs, Word, Excel, PowerPoint, code, images, audio and video. Take notes, star favorites and pick up right where you left off.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn bg-white text-brand-800 shadow-sm hover:bg-brand-50" onClick={() => openPicker()}><Upload size={16} /> Open a file</button>
            <Link to="/files" className="btn border border-white/30 text-white hover:bg-white/10"><FolderOpen size={16} /> Browse files</Link>
          </div>
          <p className="mt-4 text-xs text-brand-100/80">Tip: drag files anywhere onto this window.</p>
        </div>
      </section>

      <section aria-label="Overview" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {s ? <>
          <Stat to="/files" icon={FileText} label="Files" value={s.totalDocs} tone="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400" />
          <Stat to="/files" icon={HardDrive} label="Storage used" value={fmtSize(s.totalSize)} tone="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" />
          <Stat to="/favorites" icon={Star} label="Favorites" value={s.favorites} tone="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
          <Stat to="/notes" icon={NotebookText} label="Notes" value={s.notes} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
        </> : Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[74px]" />)}
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_20rem]">
        <section aria-labelledby="continue">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="continue" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><Clock size={18} className="text-slate-400" /> Continue where you left off</h2>
            <Link to="/recent" className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">View all <ArrowRight size={14} /></Link>
          </div>
          <DocsBrowser params={{ recent: '1', limit: 8 }} hideMore
            empty={<EmptyState icon={FolderOpen} title="No files yet" text="Open or drop a file to get started. It will show up here." action={<button className="btn btn-primary" onClick={() => openPicker()}><Upload size={16} /> Open a file</button>} />} />
        </section>

        <aside className="space-y-6">
          <section className="card p-5" aria-labelledby="storage">
            <h2 id="storage" className="mb-4 font-semibold text-slate-900 dark:text-white">Storage by type</h2>
            {!s ? <Skeleton className="h-24" /> : s.byKind.length === 0 ? <p className="text-sm text-slate-500">Nothing stored yet.</p> : <>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label="Storage breakdown">
                {s.byKind.map(k => <div key={k.kind} className={(KINDS[k.kind] || KINDS.other).bar} style={{ width: `${Math.max(2, (k.size / Math.max(1, s.totalSize)) * 100)}%` }} />)}</div>
              <ul className="mt-4 space-y-2.5">{s.byKind.map(k => { const m = KINDS[k.kind] || KINDS.other; return (
                <li key={k.kind} className="flex items-center gap-2.5 text-sm"><span className={cx('h-2.5 w-2.5 rounded-full', m.bar)} />
                  <span className="flex-1 text-slate-700 dark:text-slate-300">{m.label}</span>
                  <span className="text-xs text-slate-400">{k.count} · {fmtSize(k.size)}</span></li>); })}</ul></>}
          </section>

          <section className="card p-5" aria-labelledby="quick">
            <h2 id="quick" className="mb-3 font-semibold text-slate-900 dark:text-white">Quick tools</h2>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/tools" className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:bg-slate-800"><CheckSquare size={16} className="text-brand-600" /> To-do{s?.todos.open ? <span className="ml-auto rounded-full bg-brand-100 px-1.5 text-xs font-semibold text-brand-700">{s.todos.open}</span> : null}</Link>
              <Link to="/tools" className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:bg-slate-800"><Timer size={16} className="text-brand-600" /> Pomodoro</Link>
              <Link to="/tools" className="col-span-2 flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:bg-slate-800"><Wrench size={16} className="text-brand-600" /> Calculator and more</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
