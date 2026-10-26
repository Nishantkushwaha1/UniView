import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { api, auth } from '../api';
import { useApp } from '../lib/AppContext';
import { Spinner } from '../components/ui';

export default function ResetPassword() {
  const { onAuthed } = useApp();
  const token = useSearchParams()[0].get('token') || '';
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');

  const submit = async e => {
    e.preventDefault(); setErr('');
    if (pw !== pw2) return setErr('The two passwords do not match.');
    setBusy(true);
    try {
      const r = await api.post('/auth/reset', { token, password: pw });
      auth.set(r.token);
      onAuthed(r.user);
    } catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-md py-6 sm:py-12">
      <form onSubmit={submit} className="card space-y-4 p-5 sm:p-7">
        <div className="text-center">
          <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-600 text-white shadow-lift"><KeyRound size={22} /></span>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Choose a new password</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">You will be signed in right after.</p>
        </div>
        {!token ? <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">This reset link is incomplete. Request a new one from the sign in screen.</p> : <>
          <div><label className="label" htmlFor="rp1">New password</label>
            <div className="relative"><input id="rp1" className="inp pr-10" type={show ? 'text' : 'password'} required minLength={6} maxLength={72} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          <div><label className="label" htmlFor="rp2">Confirm new password</label>
            <input id="rp2" className="inp" type={show ? 'text' : 'password'} required minLength={6} maxLength={72} autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></div>
          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{err}</p>}
          <button className="btn btn-primary w-full py-2.5" disabled={busy}>{busy && <Spinner className="text-white" size={16} />} Update password</button>
        </>}
        <Link to="/" className="block text-center text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">Back to home</Link>
      </form>
    </div>
  );
}
