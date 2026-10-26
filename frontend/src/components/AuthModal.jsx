import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User as UserIcon } from 'lucide-react';
import { api, auth } from '../api';
import { useApp } from '../lib/AppContext';
import { Modal, Spinner } from './ui';

const TITLES = {
  login: ['Welcome back', 'Sign in to keep your files saved and reach them from any device.'],
  register: ['Create your account', 'Your files are saved to your account only when you are signed in.'],
  forgot: ['Forgot your password?', 'Enter your email and we will send you a link to choose a new one.'],
};

export default function AuthModal({ onClose }) {
  const { onAuthed } = useApp();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);                       // result of "forgot password"
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const login = mode === 'login', forgot = mode === 'forgot';
  const go = m => { setMode(m); setErr(''); setSent(null); };

  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      if (forgot) { setSent(await api.post('/auth/forgot', { email: f.email })); return; }
      const r = await api.post('/auth/' + mode, { ...f, guestId: auth.guest() });
      auth.set(r.token);
      onAuthed(r.user);
    } catch (x) { setErr(x.message); }
    finally { setBusy(false); }
  };

  const [title, sub] = TITLES[mode];
  return (
    <Modal open onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="text-center">
          <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-600 text-white shadow-lift"><Lock size={22} /></span>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sub}</p>
        </div>

        {sent ? (
          <div className="space-y-3">
            <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{sent.message}</p>
            {sent.devLink && (
              <p className="break-all rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                Email is not configured on this server, so here is your reset link (development only):{' '}
                <a className="font-medium underline" href={sent.devLink} onClick={onClose}>Open reset link</a></p>)}
            <button type="button" className="btn btn-ghost w-full" onClick={() => go('login')}><ArrowLeft size={16} /> Back to sign in</button>
          </div>
        ) : <>
          {mode === 'register' && (
            <div><label className="label" htmlFor="a-name">Name</label>
              <div className="relative"><UserIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="a-name" className="inp pl-9" required maxLength={60} value={f.name} onChange={set('name')} autoComplete="name" data-autofocus /></div></div>
          )}
          <div><label className="label" htmlFor="a-email">Email</label>
            <div className="relative"><Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input id="a-email" className="inp pl-9" type="email" required value={f.email} onChange={set('email')} autoComplete="email" data-autofocus={mode !== 'register' || undefined} /></div></div>
          {!forgot && (
            <div>
              <div className="flex items-center justify-between"><label className="label" htmlFor="a-pass">Password</label>
                {login && <button type="button" className="mb-1.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400" onClick={() => go('forgot')}>Forgot password?</button>}</div>
              <div className="relative"><Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input id="a-pass" className="inp px-9" type={show ? 'text' : 'password'} required minLength={6} maxLength={72} value={f.password} onChange={set('password')} autoComplete={login ? 'current-password' : 'new-password'} />
                <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              {mode === 'register' && <p className="mt-1 text-xs text-slate-500">At least 6 characters.</p>}</div>
          )}

          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}

          <button className="btn btn-primary w-full py-2.5" disabled={busy}>{busy ? <Spinner className="text-white" size={16} /> : null}{login ? 'Sign in' : forgot ? 'Send reset link' : 'Create account'}</button>
          {forgot
            ? <button type="button" className="flex w-full items-center justify-center gap-1.5 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400" onClick={() => go('login')}><ArrowLeft size={14} /> Back to sign in</button>
            : <button type="button" className="w-full text-sm font-medium text-brand-700 hover:underline dark:text-brand-400" onClick={() => go(login ? 'register' : 'login')}>
              {login ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>}
        </>}

        {!sent && (
          <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" className="btn btn-ghost w-full" onClick={onClose}>Continue as guest</button>
            <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Guest files are not saved. They are removed when you close this tab.</p>
          </div>)}
      </form>
    </Modal>
  );
}
