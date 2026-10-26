import { Component, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { cx, initials } from '../lib/utils';

export const Spinner = ({ className, size = 18 }) => <Loader2 size={size} className={cx('animate-spin text-brand-600', className)} aria-label="Loading" />;
export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} aria-hidden />;

export function Avatar({ name, size = 36, className }) {
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-cyan-600 font-semibold text-white', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>{initials(name)}</span>
  );
}

export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cx('mb-6 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center border-dashed px-6 py-14 text-center shadow-none">
      {Icon && <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"><Icon size={26} strokeWidth={1.6} /></span>}
      <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const t = setTimeout(() => ref.current?.querySelector('[data-autofocus],input,textarea,button')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; clearTimeout(t); };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onMouseDown={e => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title}
        className={cx('card max-h-[92vh] max-h-[92dvh] w-full overflow-auto rounded-b-none shadow-pop animate-slide-up sm:rounded-b-xl sm:animate-pop-in', w)}>
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">{title}</h2>
            <button className="btn-icon -mr-2 h-8 w-8" onClick={onClose} aria-label="Close"><X size={18} /></button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ dialog, onClose }) {
  if (!dialog) return null;
  return (
    <Modal open onClose={() => onClose(false)} size="sm" title={dialog.title || 'Are you sure?'}
      footer={<>
        <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
        <button className={cx('btn', dialog.danger === false ? 'btn-primary' : 'btn-danger')} data-autofocus onClick={() => onClose(true)}>{dialog.confirmText || 'Confirm'}</button>
      </>}>
      <div className="flex gap-3">
        {dialog.danger !== false && <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10"><AlertTriangle size={18} /></span>}
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{dialog.message}</p>
      </div>
    </Modal>
  );
}

const TOAST = {
  success: { Icon: CheckCircle2, c: 'text-emerald-500' },
  error: { Icon: XCircle, c: 'text-red-500' },
  info: { Icon: Info, c: 'text-sky-500' },
};
export function Toasts({ toasts, dismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
      {toasts.map(t => {
        const { Icon, c } = TOAST[t.type] || TOAST.info;
        return (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lift animate-slide-up dark:border-slate-700 dark:bg-slate-800">
            <Icon size={20} className={cx('mt-0.5 shrink-0', c)} />
            <p className="flex-1 text-sm text-slate-700 dark:text-slate-200">{t.msg}</p>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}

export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState icon={AlertTriangle} title="Something went wrong"
        text="This page hit an unexpected problem. Reloading usually fixes it."
        action={<button className="btn btn-primary" onClick={() => location.reload()}>Reload page</button>} />
    );
  }
}
