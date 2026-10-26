import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check, Download, FileQuestion, Minus, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { KindIcon, KINDS } from '../lib/kinds';
import { cx, fmtSize, saveBlob, timeAgo } from '../lib/utils';
import { EmptyState, Skeleton, Spinner } from '../components/ui';

const OfficePreview = lazy(() => import('./OfficePreview'));
const STATE = { saved: 'All changes saved', saving: 'Saving…', unsaved: 'Unsaved changes', error: 'Could not save' };

export default function Viewer() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null), [src, setSrc] = useState(null), [err, setErr] = useState('');

  useEffect(() => {
    let live = true, url = null;
    setDoc(null); setSrc(null); setErr('');
    (async () => {
      try {
        const d = await api.get('/docs/' + id);
        let s = null;
        if (d.kind !== 'text') {
          if (d.gridId && (d.kind === 'audio' || d.kind === 'video')) s = api.url((await api.post(`/docs/${id}/link`)).path);   // streamed, seekable
          else if (d.gridId) s = url = URL.createObjectURL(await api.blob(`/docs/${id}/file`));
          else s = url = URL.createObjectURL(await (await fetch(d.content)).blob());
          delete d.content;                          // free the (large) data URL
        }
        if (live) { setDoc(d); setSrc(s); } else if (url) URL.revokeObjectURL(url);
      } catch (e) { if (live) setErr(e.status === 404 ? 'This file does not exist or was deleted.' : e.message); }
    })();
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [id]);

  if (err) return <EmptyState icon={FileQuestion} title="Can't open this file" text={err} action={<Link to="/files" className="btn btn-primary">Back to files</Link>} />;
  if (!doc) return <div className="space-y-4"><Skeleton className="h-14" /><Skeleton className="h-[60vh]" /></div>;
  return <ViewerBody key={doc._id} doc={doc} setDoc={setDoc} src={src} />;
}

function ViewerBody({ doc, setDoc, src }) {
  const { toast, confirm, bump, version } = useApp();
  const nav = useNavigate();
  const isText = doc.kind === 'text';
  const [zoom, setZoom] = useState(1), [text, setText] = useState(doc.content || ''), [state, setState] = useState('saved');
  const [q, setQ] = useState(''), [ln, setLn] = useState(''), [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]), [nt, setNt] = useState(''), [renaming, setRenaming] = useState(null);
  const ta = useRef(), gutter = useRef(), search = useRef(), saved = useRef(doc.content || ''), latest = useRef(text);
  latest.current = text;

  useEffect(() => { api.get('/notes?docId=' + doc._id).then(setNotes).catch(() => {}); }, [doc._id]);
  useEffect(() => { api.get('/folders').then(setFolders).catch(() => {}); }, [version]);

  // ----- autosave (also on Ctrl+S, and when leaving the page)
  const save = useCallback(async () => {
    const body = latest.current;
    if (body === saved.current) return setState('saved');
    setState('saving');
    try {
      const d = await api.patch('/docs/' + doc._id, { content: body });
      saved.current = body; setDoc(old => ({ ...old, size: d.size })); setState(latest.current === body ? 'saved' : 'unsaved');
    } catch (e) { setState('error'); toast(e.message, 'error'); }
  }, [doc._id, setDoc, toast]);

  useEffect(() => {
    if (!isText || text === saved.current) return;
    setState('unsaved');
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
  }, [text, isText, save]);

  useEffect(() => () => { if (isText && latest.current !== saved.current) api.patch('/docs/' + doc._id, { content: latest.current }).then(bump).catch(() => {}); }, []); // eslint-disable-line
  useEffect(() => {
    const warn = e => { if (isText && latest.current !== saved.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [isText]);

  // ----- text tools
  const lines = useMemo(() => text.split('\n').length, [text]);
  const nums = useMemo(() => Array.from({ length: lines }, (_, i) => i + 1).join('\n'), [lines]);
  const fs = 14 * zoom, lh = 22 * zoom;

  const find = () => {
    const e = ta.current, h = text.toLowerCase(), n = q.toLowerCase(); if (!n) return;
    let i = h.indexOf(n, e.selectionEnd); if (i < 0) i = h.indexOf(n);
    if (i < 0) return toast('No matches found.', 'info');
    e.focus(); e.setSelectionRange(i, i + n.length);
    e.scrollTop = Math.max(0, (text.slice(0, i).split('\n').length - 4) * lh);
  };
  const go = () => {
    const e = ta.current, L = text.split('\n'), n = Math.min(Math.max(+ln || 1, 1), L.length);
    const pos = L.slice(0, n - 1).reduce((a, l) => a + l.length + 1, 0);
    e.focus(); e.setSelectionRange(pos, pos + L[n - 1].length); e.scrollTop = Math.max(0, (n - 4) * lh);
  };
  const onKey = e => {
    const mod = e.ctrlKey || e.metaKey;
    if (!isText || !mod) return;
    if (e.key === 'f') { e.preventDefault(); search.current?.focus(); search.current?.select(); }
    if (e.key === 's') { e.preventDefault(); save(); }
  };

  // ----- actions
  const patch = async body => { const d = await api.patch('/docs/' + doc._id, body); setDoc(old => ({ ...old, ...d })); bump(); return d; };
  const fav = () => patch({ favorite: !doc.favorite }).catch(e => toast(e.message, 'error'));
  const move = e => patch({ folder: e.target.value }).then(() => toast('Moved.')).catch(x => toast(x.message, 'error'));
  const rename = async e => {
    e.preventDefault(); const n = renaming.trim(); setRenaming(null);
    if (n && n !== doc.name) try { await patch({ name: n }); toast('Renamed.'); } catch (x) { toast(x.message, 'error'); }
  };
  const download = async () => {
    try { saveBlob(await api.blob(`/docs/${doc._id}/download`), doc.name); } catch (e) { toast(e.message, 'error'); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete file', message: `"${doc.name}" and its notes will be permanently deleted.`, confirmText: 'Delete' }))) return;
    try { saved.current = latest.current; await api.del('/docs/' + doc._id); bump(); toast('File deleted.'); nav('/files', { replace: true }); } catch (e) { toast(e.message, 'error'); }
  };
  const addNote = async e => {
    e.preventDefault(); if (!nt.trim()) return;
    try { const n = await api.post('/notes', { docId: doc._id, text: nt }); setNotes(l => [n, ...l]); setNt(''); bump(); } catch (x) { toast(x.message, 'error'); }
  };
  const delNote = async n => { try { await api.del('/notes/' + n._id); setNotes(l => l.filter(x => x._id !== n._id)); bump(); } catch (x) { toast(x.message, 'error'); } };

  const folderList = folders.some(f => f.name === doc.folder) ? folders : [...folders, { name: doc.folder }];

  return (
    <div onKeyDown={onKey}>
      {/* header */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5 sm:gap-3">
        <button className="btn-icon" onClick={() => (history.length > 1 ? nav(-1) : nav('/files'))} aria-label="Go back"><ArrowLeft size={20} /></button>
        <KindIcon doc={doc} />
        <div className="min-w-0 flex-1">
          {renaming !== null ? (
            <form onSubmit={rename}><input className="inp py-1 text-base font-semibold" value={renaming} autoFocus maxLength={255} onChange={e => setRenaming(e.target.value)} onBlur={rename} onKeyDown={e => e.key === 'Escape' && setRenaming(null)} aria-label="File name" /></form>
          ) : (
            <h1 className="group flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <span className="truncate" title={doc.name}>{doc.name}</span>
              <button className="btn-icon h-7 w-7 transition focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => setRenaming(doc.name)} aria-label="Rename file"><Pencil size={14} /></button>
            </h1>)}
          <p className="text-xs text-slate-500 dark:text-slate-400">{(KINDS[doc.kind] || KINDS.other).label} · {fmtSize(doc.size)} · Added {timeAgo(doc.createdAt)}</p>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto sm:flex-nowrap">
          {doc.kind !== 'audio' && doc.kind !== 'video' && (
            <div className="mr-1 flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" role="group" aria-label="Zoom">
              <button className="btn-icon h-8 w-8" onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1)))} aria-label="Zoom out"><Minus size={15} /></button>
              <button className="w-12 text-center text-xs font-medium tabular-nums" onClick={() => setZoom(1)} title="Reset zoom">{Math.round(zoom * 100)}%</button>
              <button className="btn-icon h-8 w-8" onClick={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))} aria-label="Zoom in"><Plus size={15} /></button>
            </div>)}
          <button className={cx('btn-icon', doc.favorite && 'text-amber-500 hover:text-amber-500')} onClick={fav} aria-pressed={doc.favorite} aria-label={doc.favorite ? 'Remove from favorites' : 'Add to favorites'} title="Favorite"><Star size={18} fill={doc.favorite ? 'currentColor' : 'none'} /></button>
          <button className="btn-icon" onClick={download} aria-label="Download" title="Download"><Download size={18} /></button>
          <button className="btn-icon hover:text-red-600" onClick={remove} aria-label="Delete file" title="Delete"><Trash2 size={18} /></button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card min-w-0 p-3 sm:p-4">
          {isText && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input ref={search} className="inp w-full py-1.5 sm:w-44" placeholder="Search (Ctrl+F)" aria-label="Search in file" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && find()} />
              <button className="btn btn-ghost btn-sm" onClick={find}>Find next</button>
              <input className="inp w-full py-1.5 sm:w-28" type="number" min="1" max={lines} placeholder="Go to line" aria-label="Go to line" value={ln} onChange={e => setLn(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} />
              <button className="btn btn-ghost btn-sm" onClick={go}>Go</button>
              <span className={cx('ml-auto flex items-center gap-1.5 text-xs', state === 'error' ? 'text-red-600' : 'text-slate-500')} role="status">
                {state === 'saving' ? <Spinner size={12} /> : state === 'saved' ? <Check size={13} className="text-emerald-500" /> : <AlertTriangle size={13} className={state === 'error' ? '' : 'text-amber-500'} />}{STATE[state]}</span>
            </div>)}

          {isText && (
            <div className="flex h-[60vh] overflow-hidden sm:h-[66vh] rounded-lg border border-slate-200 bg-slate-50 font-mono dark:border-slate-800 dark:bg-slate-950">
              <div ref={gutter} aria-hidden className="shrink-0 select-none overflow-hidden border-r border-slate-200 bg-slate-100/70 px-3 text-right text-slate-400 dark:border-slate-800 dark:bg-slate-900/60"
                style={{ fontSize: fs, lineHeight: `${lh}px`, paddingTop: 12, paddingBottom: 12 }}><pre className="m-0 font-mono">{nums}</pre></div>
              <textarea ref={ta} spellCheck={false} wrap="off" value={text} aria-label={`Contents of ${doc.name}`}
                onChange={e => setText(e.target.value)} onScroll={e => { gutter.current.scrollTop = e.target.scrollTop; }}
                onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); setText(t.value); } }}
                className="h-full min-w-0 flex-1 resize-none whitespace-pre bg-transparent px-3 text-slate-800 outline-none dark:text-slate-200"
                style={{ fontSize: fs, lineHeight: `${lh}px`, paddingTop: 12, paddingBottom: 12, tabSize: 2 }} />
            </div>)}

          {doc.kind === 'image' && <div className="checker flex h-[60vh] sm:h-[68vh] items-start justify-center overflow-auto rounded-lg"><img src={src} alt={doc.name} className="m-auto" style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? '100%' : 'none', objectFit: 'contain' }} /></div>}
          {doc.kind === 'pdf' && <><div className="mb-2 flex justify-end sm:hidden"><a className="btn btn-ghost btn-sm" href={src} target="_blank" rel="noreferrer">Open PDF in a new tab</a></div><div className="h-[72vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800"><iframe title={doc.name} src={src} className="origin-top-left bg-white" style={{ width: `${100 / zoom}%`, height: `${72 / zoom}vh`, transform: `scale(${zoom})` }} /></div></>}
          {['docx', 'xlsx', 'pptx'].includes(doc.kind) && <Suspense fallback={<div className="py-10"><Spinner /></div>}><OfficePreview kind={doc.kind} src={src} zoom={zoom} /></Suspense>}
          {doc.kind === 'audio' && <div className="flex flex-col items-center gap-6 rounded-lg bg-gradient-to-br from-pink-50 to-rose-50 px-6 py-14 dark:from-pink-500/5 dark:to-rose-500/5"><KindIcon doc={doc} size="lg" /><audio controls src={src} className="w-full max-w-lg" /></div>}
          {doc.kind === 'video' && <video controls src={src} className="max-h-[70vh] w-full rounded-lg bg-black" />}
          {doc.kind === 'other' && <EmptyState icon={FileQuestion} title="No preview for this file type" text={`.${doc.ext || 'file'} files can't be shown in the browser yet, but you can download it.`} action={<button className="btn btn-primary" onClick={download}><Download size={16} /> Download</button>} />}
        </section>

        <aside className="space-y-5">
          <section className="card p-4 text-sm" aria-labelledby="info-h">
            <h2 id="info-h" className="mb-3 font-semibold">File info</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-slate-600 dark:text-slate-300">
              <dt className="text-slate-400">Type</dt><dd className="text-right uppercase">{doc.ext || '-'}</dd>
              <dt className="text-slate-400">Size</dt><dd className="text-right">{fmtSize(doc.size)}</dd>
              {isText && <><dt className="text-slate-400">Lines</dt><dd className="text-right">{lines.toLocaleString()}</dd></>}
              <dt className="text-slate-400">Modified</dt><dd className="text-right">{timeAgo(doc.updatedAt)}</dd>
            </dl>
            <label className="label mt-4" htmlFor="folder-sel">Folder</label>
            <select id="folder-sel" className="inp" value={doc.folder} onChange={move}>{folderList.map(f => <option key={f.name}>{f.name}</option>)}</select>
          </section>

          <section className="card p-4" aria-labelledby="notes-h">
            <h2 id="notes-h" className="mb-3 text-sm font-semibold">Notes for this file</h2>
            <form onSubmit={addNote}>
              <textarea className="inp" rows="3" value={nt} onChange={e => setNt(e.target.value)} placeholder="Write a note…" maxLength={5000} aria-label="New note"
                onKeyDown={e => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && addNote(e)} />
              <button className="btn btn-primary btn-sm mt-2" disabled={!nt.trim()}>Add note</button>
            </form>
            <ul className="mt-4 space-y-2">{notes.map(n => (
              <li key={n._id} className="group flex gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{n.text}<span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span></span>
                <button className="self-start text-slate-300 hover:text-red-600" onClick={() => delNote(n)} aria-label="Delete note"><Trash2 size={14} /></button></li>))}
              {!notes.length && <li className="text-xs text-slate-400">No notes yet.</li>}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
