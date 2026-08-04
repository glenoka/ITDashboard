export function toMarkdownTable({ title, subtitle, headers, rows }) {
  const lines = [];
  if (title) lines.push(`# ${title}`);
  if (subtitle) lines.push(subtitle);
  lines.push('');
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`|${headers.map(() => '---').join('|')}|`);
  rows.forEach(r => lines.push(`| ${r.join(' | ')} |`));
  lines.push('');
  return lines.join('\n');
}

export function fmtID(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function rupiah(n) {
  const v = parseFloat(n) || 0;
  return 'Rp ' + v.toLocaleString('id-ID');
}
