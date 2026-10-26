import { useEffect, useRef, useState } from 'react';
import { Check, Delete, Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../lib/AppContext';
import { cx } from '../lib/utils';
import { PageHeader, Skeleton } from '../components/ui';

function Todos() {
  const { version, toast, bump } = useApp();
  const [items, setItems] = useState(null), [v, setV] = useState('');
  useEffect(() => { api.get('/todos').then(setItems).catch(e => { toast(e.message, 'error'); setItems([]); }); }, [version, toast]);
  const done = (items || []).filter(t => t.done).length;

  const add = async e => {
    e.preventDefault(); if (!v.trim()) return;
    try { const t = await api.post('/todos', { text: v }); setItems(l => [...l, t]); setV(''); bump(); } catch (x) { toast(x.message, 'error'); }
  };
  const toggle = async t => {
    setItems(l => l.map(x => (x._id === t._id ? { ...x, done: !x.done } : x)));
    try { await api.patch('/todos/' + t._id, { done: !t.done }); bump(); } catch (x) { toast(x.message, 'error'); }
  };
  const remove = async t => { setItems(l => l.filter(x => x._id !== t._id)); try { await api.del('/todos/' + t._id); bump(); } catch (x) { toast(x.message, 'error'); } };
  const clear = async () => { try { await api.del('/todos?completed=1'); setItems(l => l.filter(x => !x.done)); bump(); } catch (x) { toast(x.message, 'error'); } };

  return (
    <section className="card flex flex-col p-5 lg:row-span-2" aria-labelledby="todo-h">
      <div className="mb-1 flex items-center justify-between"><h2 id="todo-h" className="font-semibold">To-do list</h2>{items && items.length > 0 && <span className="text-xs text-slate-500">{done}/{items.length} done</span>}</div>
      {items?.length > 0 && <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(done / items.length) * 100}%` }} /></div>}
      <form onSubmit={add} className="flex gap-2"><input className="inp" value={v} onChange={e => setV(e.target.value)} placeholder="Add a task" maxLength={500} aria-label="New task" /><button className="btn btn-primary px-3" aria-label="Add task"><Plus size={18} /></button></form>
      <ul className="mt-4 flex-1 space-y-1">
        {!items ? [0, 1, 2].map(i => <Skeleton key={i} className="h-9" />) : items.length === 0 ? <li className="py-8 text-center text-sm text-slate-500">Nothing to do. Enjoy the calm.</li> :
          items.map(t => (
            <li key={t._id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <button onClick={() => toggle(t)} role="checkbox" aria-checked={t.done} aria-label={t.text}
                className={cx('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition', t.done ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 hover:border-brand-500 dark:border-slate-600')}>{t.done && <Check size={13} strokeWidth={3} />}</button>
              <span className={cx('flex-1 break-words text-sm', t.done && 'text-slate-400 line-through')}>{t.text}</span>
              <button className="p-1 text-slate-300 transition hover:text-red-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100" onClick={() => remove(t)} aria-label={`Delete ${t.text}`}><Trash2 size={15} /></button>
            </li>))}
      </ul>
      {done > 0 && <button className="btn btn-subtle btn-sm mt-3 self-start" onClick={clear}>Clear {done} completed</button>}
    </section>
  );
}

const KEYS = ['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='];
function evaluate(expr) {
  const e = expr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-').replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
  if (!/^[0-9+\-*/().\s]+$/.test(e)) return null;
  try {
    const r = Function('"use strict";return (' + e + ')')();
    return typeof r === 'number' && isFinite(r) ? String(+r.toFixed(10)) : null;
  } catch { return null; }
}
function Calc() {
  const [expr, setExpr] = useState(''), [res, setRes] = useState('');
  const press = k => {
    if (k === 'C') { setExpr(''); setRes(''); }
    else if (k === '⌫') setExpr(x => x.slice(0, -1));
    else if (k === '=') { if (!expr.trim()) return; const r = evaluate(expr); if (r === null) setRes('Error'); else { setRes(''); setExpr(r); } }
    else { setExpr(x => x + k); setRes(''); }
  };
  const preview = !res && expr && /[0-9)]$/.test(expr) && /[+\-×÷−*/%]/.test(expr.slice(1)) ? evaluate(expr) : null;
  return (
    <section className="card p-5" aria-labelledby="calc-h">
      <h2 id="calc-h" className="mb-3 font-semibold">Calculator</h2>
      <div className="mb-3 rounded-xl bg-slate-100 p-3 text-right dark:bg-slate-800">
        <input className="w-full bg-transparent text-right font-mono text-xl outline-none" aria-label="Expression" value={expr} inputMode="decimal" placeholder="0"
          onChange={e => { setExpr(e.target.value.replace(/\*/g, '×').replace(/\//g, '÷')); setRes(''); }} onKeyDown={e => e.key === 'Enter' && press('=')} />
        <p className={cx('h-5 font-mono text-sm', res === 'Error' ? 'text-red-500' : 'text-slate-500')} aria-live="polite">{res || (preview ? '= ' + preview : '')}</p>
      </div>
      <div className="grid grid-cols-4 gap-2">{KEYS.map(k => (
        <button key={k} onClick={() => press(k)} aria-label={k === '⌫' ? 'Backspace' : k}
          className={cx('rounded-lg py-3 text-base font-medium transition active:scale-95 sm:py-2.5 sm:text-sm', k === '0' && 'col-span-2',
            k === '=' ? 'bg-brand-600 text-white hover:bg-brand-700' : /[÷×−+%]/.test(k) ? 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300' : k === 'C' ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700')}>
          {k === '⌫' ? <Delete size={16} className="mx-auto" /> : k}</button>))}</div>
    </section>
  );
}

const MODES = { focus: ['Focus', 25 * 60], short: ['Short break', 5 * 60], long: ['Long break', 15 * 60] };
function Pomodoro() {
  const { toast } = useApp();
  const [mode, setMode] = useState('focus'), [left, setLeft] = useState(MODES.focus[1]), [on, setOn] = useState(false);
  const end = useRef(0), total = MODES[mode][1];

  useEffect(() => {
    if (!on) return;
    end.current = Date.now() + left * 1000;
    const i = setInterval(() => {
      const r = Math.max(0, Math.round((end.current - Date.now()) / 1000));
      setLeft(r);
      if (r === 0) { setOn(false); toast(`${MODES[mode][0]} session finished!`, 'info'); }
    }, 250);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  useEffect(() => { document.title = on ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')} - UniView` : 'UniView - Universal Document Workspace'; return () => { document.title = 'UniView - Universal Document Workspace'; }; }, [on, left]);

  const pick = m => { setMode(m); setOn(false); setLeft(MODES[m][1]); };
  const R = 52, C = 2 * Math.PI * R;
  return (
    <section className="card p-5" aria-labelledby="pomo-h">
      <h2 id="pomo-h" className="mb-3 font-semibold">Pomodoro timer</h2>
      <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">{Object.entries(MODES).map(([k, [l]]) => (
        <button key={k} onClick={() => pick(k)} className={cx('flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition', mode === k ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300' : 'text-slate-500')}>{l}</button>))}</div>
      <div className="relative mx-auto h-36 w-36">
        <svg viewBox="0 0 120 120" className="-rotate-90"><circle cx="60" cy="60" r={R} fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-slate-800" />
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-brand-500 transition-[stroke-dashoffset] duration-300" strokeDasharray={C} strokeDashoffset={C * (1 - left / total)} /></svg>
        <span className="absolute inset-0 flex items-center justify-center font-mono text-3xl font-semibold tabular-nums" role="timer">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        <button className="btn btn-primary min-w-24" onClick={() => setOn(!on)}>{on ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {left < total ? 'Resume' : 'Start'}</>}</button>
        <button className="btn btn-ghost" onClick={() => { setOn(false); setLeft(total); }}><RotateCcw size={15} /> Reset</button>
      </div>
    </section>
  );
}

export default function Tools() {
  return (
    <>
      <PageHeader title="Tools" subtitle="Small helpers for the work around your documents." />
      <div className="grid gap-5 lg:grid-cols-3"><Todos /><Calc /><Pomodoro /></div>
    </>
  );
}
