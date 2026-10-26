import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FolderClosed, FolderPlus, LayoutGrid, List, Pencil, Star, Trash2, Upload, Clock, FolderOpen } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { KINDS } from '../lib/kinds';
import { cx, fmtSize, useLocalState } from '../lib/utils';
import DocsBrowser from '../components/DocsBrowser';
import { EmptyState, Modal, PageHeader } from '../components/ui';

const COPY = {
  all: { title: 'All files', sub: 'Everything you have opened or uploaded.' },
  recent: { title: 'Recent files', sub: 'The last 20 files you opened.' },
  favorites: { title: 'Favorites', sub: 'Files you starred for quick access.' },
};

function NameDialog({ title, initial = '', cta, onClose, onSubmit }) {
  const [v, setV] = useState(initial), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const go = async e => {
    e.preventDefault(); if (!v.trim()) return; setBusy(true); setErr('');
    try { await onSubmit(v.trim()); onClose(); } catch (x) { setErr(x.message); setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <form onSubmit={go} className="space-y-3">
        <div><label className="label" htmlFor="fname">Folder name</label><input id="fname" className="inp" value={v} onChange={e => setV(e.target.value)} maxLength={60} data-autofocus /></div>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy || !v.trim()}>{cta}</button></div>
      </form>
    </Modal>
  );
}

export default function Files({ mode = 'all' }) {
  const { version, bump, toast, confirm, openPicker } = useApp();
  const [sp, setSp] = useSearchParams();
  const [view, setView] = useLocalState('uv_view', 'grid');
  const [folders, setFolders] = useState([]);
  const [dialog, setDialog] = useState(null);
  const folder = mode === 'all' ? sp.get('folder') || '' : '';
  const kind = sp.get('kind') || '', sort = sp.get('sort') || 'newest';
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };

  useEffect(() => { if (mode === 'all') api.get('/folders').then(setFolders).catch(() => {}); }, [mode, version]);

  const params = mode === 'recent' ? { recent: '1', kind } : mode === 'favorites' ? { favorite: '1', kind, sort } : { folder, kind, sort };
  const { title, sub } = COPY[mode];
  const protectedFolder = folder === '' || folder === 'General';

  const createFolder = async name => { await api.post('/folders', { name }); bump(); set('folder', name); toast(`Folder "${name}" created.`); };
  const renameFolder = async name => { await api.patch('/folders/' + encodeURIComponent(folder), { name }); bump(); set('folder', name); toast('Folder renamed.'); };
  const deleteFolder = async () => {
    if (!(await confirm({ title: 'Delete folder', message: `Delete "${folder}"? Its files are not deleted; they move to General.`, confirmText: 'Delete folder' }))) return;
    try { await api.del('/folders/' + encodeURIComponent(folder)); bump(); set('folder', ''); toast('Folder deleted.'); } catch (e) { toast(e.message, 'error'); }
  };

  const emptyIcon = mode === 'recent' ? Clock : mode === 'favorites' ? Star : FolderOpen;
  const empty = (
    <EmptyState icon={emptyIcon} title={mode === 'favorites' ? 'No favorites yet' : mode === 'recent' ? 'Nothing opened yet' : kind || folder ? 'No files match' : 'No files yet'}
      text={mode === 'favorites' ? 'Tap the star on any file to pin it here.' : mode === 'recent' ? 'Files you open will appear here.' : 'Open or drop a file to add it to this view.'}
      action={mode === 'all' && <button className="btn btn-primary" onClick={() => openPicker(folder || undefined)}><Upload size={16} /> Upload a file</button>} />
  );

  return (
    <>
      <PageHeader title={folder || title} subtitle={folder ? `Files in the "${folder}" folder.` : sub}
        actions={mode === 'all' && <>
          <button className="btn btn-ghost" onClick={() => setDialog('new')}><FolderPlus size={16} /> New folder</button>
          <button className="btn btn-primary" onClick={() => openPicker(folder || undefined)}><Upload size={16} /> Upload</button></>} />

      {mode === 'all' && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button className={cx('chip', !folder && 'chip-active')} onClick={() => set('folder', '')}>All folders</button>
          {folders.map(f => (
            <button key={f.name} className={cx('chip', folder === f.name && 'chip-active')} onClick={() => set('folder', f.name)}>
              <FolderClosed size={13} />{f.name}<span className="opacity-60">{f.count}</span></button>))}
          {!protectedFolder && <span className="ml-auto flex gap-1">
            <button className="btn btn-subtle btn-sm" onClick={() => setDialog('rename')}><Pencil size={13} /> Rename</button>
            <button className="btn btn-subtle btn-sm text-red-600 dark:text-red-400" onClick={deleteFolder}><Trash2 size={13} /> Delete</button></span>}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select className="inp w-auto py-1.5" value={kind} onChange={e => set('kind', e.target.value)} aria-label="Filter by type">
          <option value="">All types</option>{Object.entries(KINDS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>
        {mode !== 'recent' && (
          <select className="inp w-auto py-1.5" value={sort} onChange={e => set('sort', e.target.value)} aria-label="Sort files">
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A-Z</option><option value="size">Largest first</option><option value="opened">Recently opened</option></select>)}
        <div className="ml-auto inline-flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Layout">
          {[['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']].map(([v, Icon, l]) => (
            <button key={v} onClick={() => setView(v)} aria-label={l} aria-pressed={view === v} className={cx('rounded-md p-1.5 transition', view === v ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white')}><Icon size={16} /></button>))}
        </div>
      </div>

      <DocsBrowser params={params} view={view} empty={empty} />
      {mode === 'all' && !folder && folders.length > 0 && <p className="mt-6 text-center text-xs text-slate-400">{folders.reduce((a, f) => a + f.size, 0) > 0 && `${fmtSize(folders.reduce((a, f) => a + f.size, 0))} across ${folders.length} folders`}</p>}

      {dialog === 'new' && <NameDialog title="New folder" cta="Create" onClose={() => setDialog(null)} onSubmit={createFolder} />}
      {dialog === 'rename' && <NameDialog title="Rename folder" initial={folder} cta="Rename" onClose={() => setDialog(null)} onSubmit={renameFolder} />}
    </>
  );
}
