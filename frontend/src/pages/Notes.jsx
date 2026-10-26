import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NotebookText, Search, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { timeAgo } from '../lib/utils';
import { EmptyState, PageHeader, Skeleton } from '../components/ui';

export default function Notes() {
  const { version, bump, toast, confirm } = useApp();
  const [notes, setNotes] = useState(null), [q, setQ] = useState('');
  useEffect(() => { api.get('/notes').then(setNotes).catch(e => { toast(e.message, 'error'); setNotes([]); }); }, [version, toast]);

  const remove = async n => {
    if (!(await confirm({ title: 'Delete note', message: 'This note will be permanently deleted.', confirmText: 'Delete' }))) return;
    try { await api.del('/notes/' + n._id); setNotes(l => l.filter(x => x._id !== n._id)); bump(); } catch (e) { toast(e.message, 'error'); }
  };
  const shown = (notes || []).filter(n => !q || (n.text + n.docName).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Notes" subtitle="Everything you wrote about your files, in one place."
        actions={notes?.length > 0 && <div className="relative w-full sm:w-56"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="inp pl-9" placeholder="Filter notes" aria-label="Filter notes" value={q} onChange={e => setQ(e.target.value)} /></div>} />
      {!notes ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28" />)}</div>
        : !notes.length ? <EmptyState icon={NotebookText} title="No notes yet" text="Open any file and add a note from the side panel. It will be collected here." action={<Link to="/files" className="btn btn-primary">Browse files</Link>} />
        : !shown.length ? <p className="text-sm text-slate-500">No notes match "{q}".</p>
        : <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map(n => (
          <li key={n._id} className="card group flex flex-col p-4">
            <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{n.text}</p>
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link to={'/doc/' + n.docId} className="min-w-0 flex-1 truncate text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">{n.docName || 'Open file'}</Link>
              <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
              <button className="btn-icon h-7 w-7 hover:text-red-600" onClick={() => remove(n)} aria-label="Delete note"><Trash2 size={14} /></button>
            </div>
          </li>))}</ul>}
    </>
  );
}
