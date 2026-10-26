import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { NotebookText, SearchX } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { KindIcon } from '../lib/kinds';
import { fmtSize, timeAgo } from '../lib/utils';
import { EmptyState, PageHeader, Skeleton } from '../components/ui';

export default function SearchPage() {
  const [sp] = useSearchParams(), q = sp.get('q') || '';
  const { version } = useApp();
  const [r, setR] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    if (!q) return;
    let live = true; setErr('');
    api.get('/search?q=' + encodeURIComponent(q)).then(x => live && setR(x)).catch(e => live && (setErr(e.message), setR({ docs: [], notes: [] })));
    return () => { live = false; };
  }, [q, version]);

  const none = r && !r.docs.length && !r.notes.length;
  return (
    <>
      <PageHeader title={`Results for "${q}"`} subtitle={r ? `${r.docs.length} files · ${r.notes.length} notes` : 'Searching…'} />
      {!r ? <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
        : none ? <EmptyState icon={SearchX} title="No matches" text={err || 'Try a different word or check the spelling. Search looks at file names and note text.'} />
        : <div className="space-y-8">
          {r.docs.length > 0 && <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Files</h2>
            <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">{r.docs.map(d => (
              <Link key={d._id} to={'/doc/' + d._id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <KindIcon doc={d} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{d.name}</span><span className="block text-xs text-slate-500">{d.folder} · {fmtSize(d.size)}</span></span>
                <span className="hidden text-xs text-slate-400 sm:block">{timeAgo(d.lastOpened || d.createdAt)}</span></Link>))}</div></section>}
          {r.notes.length > 0 && <section><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h2>
            <ul className="grid gap-3 sm:grid-cols-2">{r.notes.map(n => (
              <li key={n._id} className="card p-4"><p className="flex gap-2 text-sm"><NotebookText size={16} className="mt-0.5 shrink-0 text-brand-600" /><span className="break-words">{n.text}</span></p>
                <Link to={'/doc/' + n.docId} className="mt-2 block truncate text-xs font-medium text-brand-700 hover:underline dark:text-brand-400">{n.docName}</Link></li>))}</ul></section>}
        </div>}
    </>
  );
}
