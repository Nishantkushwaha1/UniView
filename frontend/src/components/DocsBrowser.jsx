import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { FileCard, FileRow } from './FileCard';
import { EmptyState, Skeleton, Spinner } from './ui';

// Fetches and shows a paginated list of files for the given query params.
export default function DocsBrowser({ params, view = 'grid', empty, onTotal, pageSize = 24, hideMore = false }) {
  const { version, bump, confirm, toast } = useApp();
  const [items, setItems] = useState(null), [total, setTotal] = useState(0), [page, setPage] = useState(1);
  const [err, setErr] = useState(''), [more, setMore] = useState(false);
  const key = JSON.stringify(params);
  const reqId = useRef(0);

  const load = useCallback(async (p, append) => {
    const id = ++reqId.current;
    try {
      const all = { ...params, page: p, limit: params.limit || pageSize };
      const qs = new URLSearchParams(Object.entries(all).filter(([, v]) => v !== undefined && v !== '')).toString();
      const r = await api.get('/docs?' + qs);
      if (id !== reqId.current) return;           // a newer request replaced this one
      setItems(old => (append && old ? [...old, ...r.items] : r.items));
      setTotal(r.total); setPage(p); setErr(''); onTotal?.(r.total);
    } catch (e) { if (id === reqId.current) { setErr(e.message); setItems(old => old || []); } }
    finally { setMore(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, pageSize]);

  useEffect(() => { load(1, false); }, [load, version]);

  const toggleFav = async d => {
    setItems(list => list.map(x => (x._id === d._id ? { ...x, favorite: !x.favorite } : x)));
    try { await api.patch('/docs/' + d._id, { favorite: !d.favorite }); bump(); }
    catch (e) { toast(e.message, 'error'); load(1, false); }
  };
  const remove = async d => {
    if (!(await confirm({ title: 'Delete file', message: `"${d.name}" and its notes will be permanently deleted.`, confirmText: 'Delete' }))) return;
    try { await api.del('/docs/' + d._id); setItems(list => list.filter(x => x._id !== d._id)); toast('File deleted.'); bump(); }
    catch (e) { toast(e.message, 'error'); }
  };

  if (!items) return view === 'grid'
    ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div>
    : <div className="card space-y-2 p-3">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  if (err && !items.length) return <EmptyState icon={AlertTriangle} title="Couldn't load files" text={err} action={<button className="btn btn-primary" onClick={() => load(1, false)}>Try again</button>} />;
  if (!items.length) return empty;

  return (
    <>
      {view === 'grid'
        ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map(d => <FileCard key={d._id} doc={d} onFav={toggleFav} onDelete={remove} />)}</div>
        : <div className="card divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">{items.map(d => <FileRow key={d._id} doc={d} onFav={toggleFav} onDelete={remove} />)}</div>}
      {!hideMore && items.length < total && (
        <div className="mt-6 flex justify-center">
          <button className="btn btn-ghost" disabled={more} onClick={() => { setMore(true); load(page + 1, true); }}>
            {more && <Spinner size={14} />} Load more ({total - items.length} left)</button>
        </div>
      )}
    </>
  );
}
