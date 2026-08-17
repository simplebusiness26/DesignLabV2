import fs from 'node:fs';

export function writeFallbackHtml(file, { title, body, sourceText = '' }) {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;background:#f5f5f5;color:#111}.wrap{max-width:1100px;margin:auto;padding:40px}.card{background:white;border:1px solid #ddd;border-radius:16px;padding:28px;margin:20px 0}pre{white-space:pre-wrap;word-break:break-word;background:#111;color:#eee;padding:20px;border-radius:12px}h1{font-size:34px}</style></head><body><div class="wrap"><h1>${esc(title)}</h1><div class="card">${body}</div>${sourceText ? `<div class="card"><h2>Model output</h2><pre>${esc(sourceText)}</pre></div>` : ''}</div></body></html>`;
  fs.writeFileSync(file, html);
}
