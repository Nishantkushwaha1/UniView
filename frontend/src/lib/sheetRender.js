// Renders an .xlsx workbook sheet as a real, styled table (fills, fonts, borders, merged cells, column widths).
// Everything is built with DOM APIs (no innerHTML), so file content can never inject markup.

const THEME = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'];
const INDEXED = { 8: '000000', 9: 'FFFFFF', 10: 'FF0000', 11: '00FF00', 12: '0000FF', 13: 'FFFF00', 64: '000000' };

function tint(hex, t = 0) {
  if (!t) return '#' + hex;
  const c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  const f = v => Math.round(t < 0 ? v * (1 + t) : v + (255 - v) * t);
  return '#' + c.map(v => f(v).toString(16).padStart(2, '0')).join('');
}
function color(c) {
  if (!c) return null;
  if (c.argb) return '#' + c.argb.slice(-6);
  if (c.theme !== undefined) return tint(THEME[c.theme] || '000000', c.tint);
  if (c.indexed !== undefined && INDEXED[c.indexed]) return '#' + INDEXED[c.indexed];
  return null;
}
const BORDER = { thin: '1px solid', medium: '2px solid', thick: '3px solid', dotted: '1px dotted', dashed: '1px dashed', hair: '1px solid', double: '3px double', mediumDashed: '2px dashed' };
const colLetter = n => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

export const MAX_ROWS = 2000, MAX_COLS = 100;

export function renderSheet(ws, SSF, doc = document) {
  const rows = Math.min(ws.rowCount || 0, MAX_ROWS), cols = Math.min(Math.max(ws.columnCount || 0, 1), MAX_COLS);
  const grid = ws.views?.[0]?.showGridLines !== false;
  const table = doc.createElement('table');
  table.className = 'xl';

  // merged ranges: master cell gets spans, the others are skipped
  const skip = new Set(), span = new Map();
  for (const m of Object.values(ws._merges || {})) {
    const { top, left, bottom, right } = m.model || m;
    span.set(`${top}:${left}`, [bottom - top + 1, right - left + 1]);
    for (let r = top; r <= bottom; r++) for (let c = left; c <= right; c++) if (r !== top || c !== left) skip.add(`${r}:${c}`);
  }

  const colgroup = doc.createElement('colgroup');
  colgroup.appendChild(doc.createElement('col')).style.width = '44px';
  for (let c = 1; c <= cols; c++) {
    const el = doc.createElement('col'), w = ws.getColumn(c);
    el.style.width = Math.round((w.hidden ? 0 : w.width || 8.43) * 7 + 5) + 'px';
    colgroup.appendChild(el);
  }
  table.appendChild(colgroup);

  const head = doc.createElement('thead'), hr = head.appendChild(doc.createElement('tr'));
  hr.appendChild(doc.createElement('th')).className = 'corner';
  for (let c = 1; c <= cols; c++) hr.appendChild(doc.createElement('th')).textContent = colLetter(c);
  table.appendChild(head);

  const body = doc.createElement('tbody');
  for (let r = 1; r <= rows; r++) {
    const row = ws.getRow(r);
    if (row.hidden) continue;
    const tr = body.appendChild(doc.createElement('tr'));
    if (row.height) tr.style.height = Math.round(row.height * 1.33) + 'px';
    const rh = tr.appendChild(doc.createElement('th')); rh.textContent = r;
    for (let c = 1; c <= cols; c++) {
      if (skip.has(`${r}:${c}`)) continue;
      const cell = row.getCell(c), td = tr.appendChild(doc.createElement('td')), st = td.style;
      const sp = span.get(`${r}:${c}`);
      if (sp) { if (sp[0] > 1) td.rowSpan = sp[0]; if (sp[1] > 1) td.colSpan = sp[1]; }
      let text = '';
      try { text = cell.text ?? ''; } catch { text = String(cell.value ?? ''); }
      // apply the cell's number format (1,200.50 / $1,500 / 12% / dates) the way Excel shows it
      const raw = cell.value && typeof cell.value === 'object' && 'result' in cell.value ? cell.value.result : cell.value;
      if (SSF && cell.numFmt && cell.numFmt !== 'General' && (typeof raw === 'number' || raw instanceof Date)) {
        try { text = SSF.format(cell.numFmt, raw instanceof Date ? raw.getTime() / 86400000 + 25569 : raw); } catch { /* keep plain text */ }
      }
      td.textContent = text;
      if (!grid) st.borderColor = 'transparent';

      const f = cell.font || {};
      if (f.bold) st.fontWeight = '700';
      if (f.italic) st.fontStyle = 'italic';
      if (f.underline || f.strike) st.textDecoration = [f.underline && 'underline', f.strike && 'line-through'].filter(Boolean).join(' ');
      if (f.size) st.fontSize = Math.round(f.size * 1.333) + 'px';
      if (f.name) st.fontFamily = `"${f.name.replace(/["\\]/g, '')}", Calibri, sans-serif`;
      const fc = color(f.color); if (fc) st.color = fc;

      const fill = cell.fill;
      if (fill?.type === 'pattern' && fill.pattern === 'solid') { const bg = color(fill.fgColor); if (bg) { st.backgroundColor = bg; if (!fc) st.color = '#000'; } }

      const a = cell.alignment || {};
      const num = typeof cell.value === 'number';
      st.textAlign = a.horizontal === 'centerContinuous' ? 'center' : a.horizontal && a.horizontal !== 'general' ? a.horizontal : num ? 'right' : 'left';
      st.verticalAlign = a.vertical === 'middle' ? 'middle' : a.vertical === 'top' ? 'top' : 'bottom';
      if (a.wrapText) st.whiteSpace = 'pre-wrap'; else st.whiteSpace = 'pre';
      if (a.indent) st.paddingLeft = 4 + a.indent * 9 + 'px';

      const b = cell.border || {};
      for (const [side, key] of [['Top', 'top'], ['Right', 'right'], ['Bottom', 'bottom'], ['Left', 'left']]) {
        const e = b[key];
        if (e?.style) st['border' + side] = `${BORDER[e.style] || '1px solid'} ${color(e.color) || '#000'}`;
      }
    }
  }
  table.appendChild(body);
  return { table, cut: (ws.rowCount || 0) > MAX_ROWS, hiddenCols: (ws.columnCount || 0) > MAX_COLS };
}
