import { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { AlertTriangle } from 'lucide-react';
import { cx } from '../lib/utils';
import { Spinner } from '../components/ui';
import { renderSheet } from '../lib/sheetRender';

// .xlsx keeps its formatting (ExcelJS); old .xls files fall back to a plain table (SheetJS)
async function readWorkbook(buf) {
  try {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    return { t: 'book', sheets: wb.worksheets.filter(w => w.state !== 'hidden').map(w => ({ n: w.name, ws: w })) };
  } catch {
    const X = await import('xlsx'), wb = X.read(buf);
    return { t: 'sheets', s: wb.SheetNames.map(n => {
      const ws = wb.Sheets[n]; let cut = false;
      if (ws['!ref']) {
        const rg = X.utils.decode_range(ws['!ref']);
        if (rg.e.r - rg.s.r + 1 > MAX_ROWS) { rg.e.r = rg.s.r + MAX_ROWS - 1; ws['!ref'] = X.utils.encode_range(rg); cut = true; }
      }
      return { n, cut, h: safe(X.utils.sheet_to_html(ws)) };
    }) };
  }
}

function SheetView({ ws, box, zoom }) {
  const host = useRef(), [info, setInfo] = useState({});
  useEffect(() => {
    let live = true;
    import('xlsx').then(X => {
      if (!live) return;
      host.current.replaceChildren();
      const { table, cut } = renderSheet(ws, X.SSF);
      host.current.appendChild(table); setInfo({ cut });
    });
    return () => { live = false; };
  }, [ws]);
  return (
    <>
      <div className={cx(box, 'xl-wrap !p-0')}><div ref={host} style={{ zoom }} /></div>
      {info.cut && <p className="mt-2 text-xs text-slate-500">Showing the first {MAX_ROWS.toLocaleString()} rows of this sheet.</p>}
    </>
  );
}

function SlideView({ buf, zoom }) {
  const host = useRef(), [err, setErr] = useState(''), [busy, setBusy] = useState(true);
  useEffect(() => {
    let live = true, p;
    (async () => {
      try {
        const { init } = await import('pptx-preview');
        const w = host.current.clientWidth - 8;
        host.current.replaceChildren();
        p = init(host.current, { width: Math.max(280, Math.round(w * zoom)), height: Math.round(Math.max(280, w * zoom) * 9 / 16), mode: 'list' });
        await p.preview(buf.slice(0));
        if (live) setBusy(false);
      } catch { if (live) { setErr('Could not render these slides.'); setBusy(false); } }
    })();
    return () => { live = false; try { p?.destroy(); } catch { /* ignore */ } };
  }, [buf, zoom]);
  return (
    <div className="h-[68vh] overflow-auto rounded-lg bg-slate-200/70 p-2 dark:bg-slate-900">
      {busy && <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Spinner /> Drawing slides…</div>}
      {err && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{err}</p>}
      <div ref={host} className="pptx-host mx-auto" />
    </div>
  );
}

const MAX_ROWS = 2000;
const safe = html => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
const decode = t => new DOMParser().parseFromString(t, 'text/html').body.textContent;

// Renders DOCX / XLSX / PPTX in the browser. `src` is a blob URL of the file.
export default function OfficePreview({ kind, src, zoom }) {
  const [out, setOut] = useState(null), [err, setErr] = useState(''), [tab, setTab] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const buf = await (await fetch(src)).arrayBuffer();
        let r;
        if (kind === 'docx') {
          const m = await import('mammoth');
          r = { t: 'html', h: safe((await m.convertToHtml({ arrayBuffer: buf })).value) };
        } else if (kind === 'xlsx') {
          r = await readWorkbook(buf);
        } else {
          r = { t: 'pptx', buf };
        }
        if (live) setOut(r);
      } catch { if (live) setErr('Could not read this file. It may be corrupted, in an old format, or password-protected.'); }
    })();
    return () => { live = false; };
  }, [src, kind]);

  if (err) return <p role="alert" className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400"><AlertTriangle size={16} />{err}</p>;
  if (!out) return <div className="flex items-center gap-2 py-10 text-sm text-slate-500"><Spinner /> Preparing preview…</div>;
  const box = 'h-[68vh] overflow-auto rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950';
  const style = { fontSize: 14 * zoom };

  if (out.t === 'html') return <div className={cx(box, 'prose-doc')} style={style} dangerouslySetInnerHTML={{ __html: out.h }} />;
  if (out.t === 'book') return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">{out.sheets.map((x, i) => <button key={x.n} className={cx('chip', tab === i && 'chip-active')} onClick={() => setTab(i)}>{x.n}</button>)}</div>
      {out.sheets[tab] ? <SheetView ws={out.sheets[tab].ws} box={box} zoom={zoom} /> : <p className="text-sm text-slate-500">This workbook has no visible sheets.</p>}
    </>
  );
  if (out.t === 'sheets') return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">{out.s.map((x, i) => <button key={x.n} className={cx('chip', tab === i && 'chip-active')} onClick={() => setTab(i)}>{x.n}</button>)}</div>
      <div className={cx(box, 'sheet !p-0')} style={style} dangerouslySetInnerHTML={{ __html: out.s[tab].h }} />
      {out.s[tab].cut && <p className="mt-2 text-xs text-slate-500">Showing the first {MAX_ROWS.toLocaleString()} rows of this sheet.</p>}
    </>
  );
  return <SlideView buf={out.buf} zoom={zoom} />;
}
