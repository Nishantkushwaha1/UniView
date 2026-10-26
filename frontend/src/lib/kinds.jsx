import { File, FileCode2, FileSpreadsheet, FileText, Film, Image as ImageIcon, Music, Presentation } from 'lucide-react';
import { cx } from './utils';

const CODE = new Set('html htm css scss js jsx ts tsx json xml sql py java c cpp h hpp cs go rs rb php sh bat yml yaml toml ini'.split(' '));

// One place that defines how every file type looks
export const KINDS = {
  text:  { label: 'Text & code',   Icon: FileText,        tile: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',             bar: 'bg-sky-500' },
  image: { label: 'Images',        Icon: ImageIcon,       tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400', bar: 'bg-violet-500' },
  audio: { label: 'Audio',         Icon: Music,           tile: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400',         bar: 'bg-pink-500' },
  video: { label: 'Video',         Icon: Film,            tile: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',         bar: 'bg-rose-500' },
  pdf:   { label: 'PDF',           Icon: FileText,        tile: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',             bar: 'bg-red-500' },
  docx:  { label: 'Word',          Icon: FileText,        tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',         bar: 'bg-blue-500' },
  xlsx:  { label: 'Excel',         Icon: FileSpreadsheet, tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', bar: 'bg-emerald-500' },
  pptx:  { label: 'PowerPoint',    Icon: Presentation,    tile: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400', bar: 'bg-orange-500' },
  other: { label: 'Other',         Icon: File,            tile: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',       bar: 'bg-slate-400' },
};

export const kindMeta = doc => {
  const m = KINDS[doc.kind] || KINDS.other;
  return doc.kind === 'text' && CODE.has(doc.ext) ? { ...m, Icon: FileCode2 } : m;
};

export function KindIcon({ doc, size = 'md', className }) {
  const { Icon, tile } = kindMeta(doc);
  const s = { sm: 'h-8 w-8 rounded-lg', md: 'h-10 w-10 rounded-xl', lg: 'h-14 w-14 rounded-2xl' }[size];
  const i = { sm: 16, md: 20, lg: 28 }[size];
  return <span className={cx('inline-flex shrink-0 items-center justify-center', s, tile, className)}><Icon size={i} strokeWidth={1.75} /></span>;
}
