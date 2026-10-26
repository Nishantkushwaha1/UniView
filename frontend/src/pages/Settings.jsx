import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, KeyRound, Moon, ShieldAlert, Sun, User as UserIcon } from 'lucide-react';
import { api, auth } from '../api';
import { useApp } from '../lib/AppContext';
import { Avatar, PageHeader, Spinner } from '../components/ui';

const Section = ({ icon: Icon, title, children, tone }) => (
  <section className="card p-5">
    <h2 className={`mb-4 flex items-center gap-2 font-semibold ${tone || ''}`}><Icon size={18} className="text-slate-400" />{title}</h2>{children}
  </section>
);

function Profile() {
  const { user, setUser, toast } = useApp();
  const [name, setName] = useState(user.name), [busy, setBusy] = useState(false);
  const save = async e => {
    e.preventDefault(); setBusy(true);
    try { setUser(await api.patch('/auth/me', { name })); toast('Profile updated.'); } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Section icon={UserIcon} title="Profile">
      <div className="mb-4 flex items-center gap-3"><Avatar name={user.name} size={48} /><div><p className="font-medium">{user.name}</p><p className="text-sm text-slate-500">{user.email}</p></div></div>
      <form onSubmit={save} className="flex gap-2"><input className="inp" value={name} onChange={e => setName(e.target.value)} maxLength={60} aria-label="Name" />
        <button className="btn btn-primary" disabled={busy || !name.trim() || name === user.name}>Save</button></form>
    </Section>
  );
}

function Password() {
  const { toast } = useApp();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' }), [busy, setBusy] = useState(false);
  const save = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.post('/auth/password', f); setF({ currentPassword: '', newPassword: '' }); toast('Password changed.'); } catch (x) { toast(x.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Section icon={KeyRound} title="Change password">
      <form onSubmit={save} className="space-y-3">
        <div><label className="label" htmlFor="cp">Current password</label><input id="cp" type="password" className="inp" required autoComplete="current-password" value={f.currentPassword} onChange={e => setF({ ...f, currentPassword: e.target.value })} /></div>
        <div><label className="label" htmlFor="np">New password</label><input id="np" type="password" className="inp" required minLength={6} maxLength={72} autoComplete="new-password" value={f.newPassword} onChange={e => setF({ ...f, newPassword: e.target.value })} /></div>
        <button className="btn btn-primary" disabled={busy}>Update password</button>
      </form>
    </Section>
  );
}

function Danger() {
  const { toast, confirm, signOut } = useApp();
  const [pw, setPw] = useState('');
  const del = async e => {
    e.preventDefault();
    if (!(await confirm({ title: 'Delete account', message: 'Your account and ALL your files, notes and tasks will be permanently deleted. This cannot be undone.', confirmText: 'Delete everything' }))) return;
    try { await api.del('/auth/me', { password: pw }); auth.set(null); signOut(); toast('Account deleted.', 'info'); } catch (x) { toast(x.message, 'error'); }
  };
  return (
    <Section icon={ShieldAlert} title="Delete account" tone="text-red-600 dark:text-red-400">
      <p className="mb-3 text-sm text-slate-500">Permanently removes your account and everything in it.</p>
      <form onSubmit={del} className="flex gap-2"><input type="password" className="inp" placeholder="Confirm with your password" required value={pw} onChange={e => setPw(e.target.value)} aria-label="Password" /><button className="btn btn-danger">Delete</button></form>
    </Section>
  );
}

function Status() {
  const [h, setH] = useState(null);
  const check = () => { setH(null); api.get('/health').then(setH).catch(e => setH({ status: 'down', error: e.message })); };
  useEffect(check, []);
  const ok = h?.status === 'ok';
  return (
    <Section icon={Activity} title="Server status">
      <div className="flex items-center gap-3 text-sm">
        {!h ? <Spinner size={16} /> : <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />}
        <span>{!h ? 'Checking…' : ok ? `API and database are running (up ${h.uptime}s)` : h.error || 'The API reports a problem with the database.'}</span>
        <button className="btn btn-ghost btn-sm ml-auto" onClick={check}>Re-check</button>
      </div>
    </Section>
  );
}

export default function Settings() {
  const { user, openAuth, theme, toggleTheme } = useApp();
  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and app preferences." />
      <div className="grid max-w-5xl gap-5 lg:grid-cols-2">
        {user ? <><Profile /><Password /></> : (
          <Section icon={UserIcon} title="Guest mode">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">You are using UniView as a guest. Guest files are not saved: they are removed as soon as you close this tab. Sign in or create a free account to keep your files and reach them from any device. Files you opened in this session are saved to your account when you sign in.</p>
            <button className="btn btn-primary mt-4" onClick={openAuth}>Sign in or create account</button>
          </Section>)}
        <Section icon={theme === 'dark' ? Moon : Sun} title="Appearance">
          <div className="flex items-center justify-between"><p className="text-sm text-slate-600 dark:text-slate-300">{theme === 'dark' ? 'Dark' : 'Light'} theme is on.</p>
            <button className="btn btn-ghost" onClick={toggleTheme}>Switch to {theme === 'dark' ? 'light' : 'dark'}</button></div>
        </Section>
        <Status />
        {user && <Danger />}
      </div>
      <p className="mt-6 text-xs text-slate-400">UniView 2.0 · <Link to="/" className="hover:underline">Back to home</Link></p>
    </>
  );
}
