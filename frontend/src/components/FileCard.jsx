import { Link } from 'react-router-dom';
import { Star, Trash2 } from 'lucide-react';
import { KindIcon, kindMeta } from '../lib/kinds';
import { cx, fmtSize, timeAgo } from '../lib/utils';

const Actions = ({ doc, onFav, onDelete, className }) => (
  <div className={cx('flex items-center', className)}>
    <button className={cx('btn-icon h-8 w-8', doc.favorite && 'text-amber-500 hover:text-amber-500')} onClick={() => onFav(doc)}
      aria-label={doc.favorite ? 'Remove from favorites' : 'Add to favorites'} title={doc.favorite ? 'Remove from favorites' : 'Add to favorites'}>
      <Star size={16} fill={doc.favorite ? 'currentColor' : 'none'} /></button>
    <button className="btn-icon h-8 w-8 hover:text-red-600 dark:hover:text-red-400" onClick={() => onDelete(doc)} aria-label={`Delete ${doc.name}`} title="Delete"><Trash2 size={16} /></button>
  </div>
);

export function FileCard({ doc, onFav, onDelete }) {
  const m = kindMeta(doc);
  return (
    <div className="card group relative overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift dark:hover:border-brand-700">
      <Link to={'/doc/' + doc._id} className="block p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
        <div className="mb-4 flex items-start justify-between">
          <KindIcon doc={doc} size="lg" />
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">{doc.ext || m.label}</span>
        </div>
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100" title={doc.name}>{doc.name}</p>
        <p className="mt-1 truncate pr-16 text-xs text-slate-500 dark:text-slate-400">{fmtSize(doc.size)} · {doc.folder}</p>
        <p className="mt-0.5 pr-16 text-xs text-slate-400 dark:text-slate-500">{timeAgo(doc.lastOpened || doc.createdAt)}</p>
      </Link>
      <Actions doc={doc} onFav={onFav} onDelete={onDelete}
        className={cx('absolute bottom-2 right-2 rounded-lg bg-white/90 backdrop-blur transition dark:bg-slate-900/90 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100', doc.favorite && 'sm:opacity-100')} />
    </div>
  );
}

export function FileRow({ doc, onFav, onDelete }) {
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <Link to={'/doc/' + doc._id} className="flex min-w-0 flex-1 items-center gap-3 outline-none focus-visible:underline">
        <KindIcon doc={doc} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{doc.name}</span>
          <span className="block truncate text-xs text-slate-500 sm:hidden">{fmtSize(doc.size)} · {doc.folder}</span>
        </span>
        <span className="hidden w-32 truncate text-xs text-slate-500 sm:block">{doc.folder}</span>
        <span className="hidden w-20 text-right text-xs text-slate-500 sm:block">{fmtSize(doc.size)}</span>
        <span className="hidden w-28 text-right text-xs text-slate-400 md:block">{timeAgo(doc.lastOpened || doc.createdAt)}</span>
      </Link>
      <Actions doc={doc} onFav={onFav} onDelete={onDelete} className={cx('transition', !doc.favorite && 'sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100')} />
    </div>
  );
}
