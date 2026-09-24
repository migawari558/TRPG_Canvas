import { contentHtml } from './content-html.mjs';
import { exportStyle } from './export-style.mjs';
import { getTheme } from './themes.mjs';
import MarkdownIt from 'markdown-it';
import { absolutePosition } from './flow-model.mjs';
import { outline } from './model.mjs';
import { gmNotePlugin } from './gm-markdown.mjs';
import { taskListPlugin } from './task-markdown.mjs';
import { underlinePlugin } from './underline-markdown.mjs';
import { chapterPlugin } from './chapter-markdown.mjs';
import { blankLinePlugin } from './blank-markdown.mjs';
import { imageSizePlugin } from './image-size.mjs';
export const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false }).use(gmNotePlugin).use(taskListPlugin).use(underlinePlugin).use(chapterPlugin).use(blankLinePlugin).use(imageSizePlugin);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function flowSvg(flow, headings = [], theme = 'forest') {
  const c = getTheme(theme).colors;
  if (!flow.nodes.length) return '';
  const byHeading = new Map(headings.map((heading, index) => [heading.id, { ...heading, anchor: `section-${index}` }]));
  const wrap = text => Array.from(String(text)).reduce((lines, character, index) => { if (index % 16 === 0) lines.push(''); lines[lines.length - 1] += character; return lines; }, []);
  const nodes = flow.nodes.map(node => {
    const heading = byHeading.get(node.data.headingId);
    const group = node.type === 'sceneGroup';
    const lines = wrap(group && heading ? heading.text : node.data.label);
    return { ...node, position: absolutePosition(node, flow.nodes), group, heading, lines,
      boxWidth: group && Number.isFinite(node.style?.width) ? node.style.width : 260,
      boxHeight: group && Number.isFinite(node.style?.height) ? node.style.height : Math.max(110, lines.length * 21 + 50)
    };
  });
  const map = new Map(nodes.map(node => [node.id, node]));
  const minX = Math.min(...nodes.map(node => node.position.x)) - 30, minY = Math.min(...nodes.map(node => node.position.y)) - 30;
  const width = Math.max(...nodes.map(node => node.position.x + node.boxWidth)) - minX + 30;
  const height = Math.max(...nodes.map(node => node.position.y + node.boxHeight)) - minY + 30;
  const paths = flow.edges.map(edge => {
    const a = map.get(edge.source), b = map.get(edge.target); if (!a || !b) return '';
    const x1 = a.position.x + a.boxWidth / 2, y1 = a.position.y + a.boxHeight, x2 = b.position.x + b.boxWidth / 2, y2 = b.position.y;
    return `<path d="M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}" fill="none" stroke="${c.muted}" stroke-width="2" marker-end="url(#arrow)"/><text x="${(x1 + x2) / 2 + 9}" y="${(y1 + y2) / 2}" font-size="14" fill="${c.text}">${escapeHtml(edge.label || '')}</text>`;
  }).join('');
  function box(node) {
    const color = node.group ? c.panel : c.soft;
    const text = `<text x="${node.boxWidth / 2}" y="${node.group ? 28 : 38}" text-anchor="middle" font-size="16" fill="${c.text}">${node.lines.map((line, index) => `<tspan x="${node.boxWidth / 2}" dy="${index ? 21 : 0}">${escapeHtml(line)}</tspan>`).join('')}</text>`;
    const label = node.heading ? `<a href="#${node.heading.anchor}">${text}<title>本文へ: ${escapeHtml(node.heading.text)}</title></a>` : text;
    return `<g transform="translate(${node.position.x},${node.position.y})"><rect width="${node.boxWidth}" height="${node.boxHeight}" rx="10" fill="${color}" stroke="${c.border}"/>${label}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="シナリオのフローチャート" viewBox="${minX} ${minY} ${width} ${height}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${c.muted}"/></marker></defs>${nodes.filter(node => node.group).map(box).join('')}${paths}${nodes.filter(node => !node.group).map(box).join('')}</svg>`;
}

export function exportHtml(doc, options = {}) {
  const { copyButtons = true, includeFlow = true, interactive = true, theme = 'forest' } = options;
  let html = (doc.content ? contentHtml(doc.content) : markdown.render(doc.markdown)), index = 0;
  const toc = [];
  const headings = outline(doc.content);
  html = html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, title) => { const id = `section-${index++}`, chapter = attrs.includes('data-chapter'); if (Number(level) <= 2) toc.push(`<a href="#${id}" class="level-${chapter ? 0 : level}"><span>${title}</span></a>`); return `<h${level}${attrs} id="${id}">${title}</h${level}>`; });
  if (copyButtons) html = html.replace(/<(blockquote|pre)>([\s\S]*?)<\/\1>/g, (_, tag, content) => `<div class="copy-block"><button type="button" class="copy-button">コピー</button><${tag}>${content}</${tag}></div>`);
  const script = copyButtons && interactive ? `<script>document.querySelectorAll('.copy-button').forEach(button=>button.addEventListener('click',async()=>{const text=button.nextElementSibling.innerText;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('copy');}button.textContent='コピーしました';}catch{button.textContent='選択してコピーしてください';const range=document.createRange();range.selectNodeContents(button.nextElementSibling);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}setTimeout(()=>button.textContent='コピー',2000);}));</script>` : '';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:"><title>${escapeHtml(doc.title)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f6f1;color:#293b34;font:15px/1.95 'Yu Gothic','Meiryo',sans-serif}main{max-width:850px;margin:48px auto;padding:55px 65px;background:white;border:1px solid #e3e6df;border-radius:12px}header{border-bottom:1px solid #dce3dc;padding-bottom:28px;margin-bottom:30px}header small{letter-spacing:3px;color:#61806f}h1{font-size:32px;line-height:1.5}h2{margin-top:42px;border-bottom:1px solid #e3e8e2;padding-bottom:10px;font-size:23px}h3{margin-top:28px;font-size:18px}nav{background:#f3f6f2;padding:20px 25px;border-radius:8px}nav a{display:block;color:#436654;text-decoration:none}nav .level-3{padding-left:18px;font-size:13px}blockquote{margin:20px 0;padding:18px 24px;border-left:3px solid #69937e;background:#f0f5ef}blockquote p:first-child{margin-top:0}blockquote p:last-child{margin-bottom:0}pre{padding:22px;background:#edf1ec;white-space:pre-wrap;overflow-wrap:anywhere}code{font-family:Consolas,monospace;background:#eef1eb;padding:2px 4px}.copy-block{position:relative}.copy-block blockquote,.copy-block pre{padding-top:42px}.copy-button{position:absolute;right:10px;top:10px;background:white;border:1px solid #ced9cd;border-radius:5px;color:#52715c;padding:5px 10px;cursor:pointer}svg{width:100%;height:auto;max-height:900px}a{color:#426e58}hr{border:0;border-top:1px solid #ddd}footer{margin-top:40px;color:#849184;font-size:11px;text-align:center}@media(max-width:650px){main{margin:0;padding:28px 22px;border:0}}@media print{body{background:white;font-size:10pt}main{margin:0;padding:0;border:0;max-width:none}nav,.copy-button{display:none}h1,h2,h3{break-after:avoid}blockquote,pre,svg{break-inside:avoid}.copy-block blockquote,.copy-block pre{padding-top:18px}a{color:inherit;text-decoration:none}.flow-section{break-before:page}}
  .gm-note{position:relative;margin:24px 0;padding:38px 24px 20px;border:1px solid #d5d8ca;border-radius:12px;background-color:#eef0e8;background-image:repeating-linear-gradient(135deg,transparent,transparent 5px,rgba(104,121,83,.035) 5px,rgba(104,121,83,.035) 6px);color:#56604c}.gm-note:before{content:'GM MEMO';position:absolute;top:12px;left:24px;font:10px sans-serif;letter-spacing:1.6px;color:#8a9579}.gm-note>p:first-child{margin-top:0}.gm-note>p:last-child{margin-bottom:0}@media print{.gm-note{break-inside:avoid;print-color-adjust:exact;-webkit-print-color-adjust:exact}}${exportStyle(options)}</style></head><body><main><header><small>TRPG CANVAS / SCENARIO</small><h1>${escapeHtml(doc.title)}</h1><p>${escapeHtml(doc.subtitle || '')}</p></header><nav class="export-toc" aria-label="目次"><div class="toc-heading"><span>CONTENTS</span><strong>物語の目次</strong></div><div class="toc-links">${toc.join('')}</div></nav><div class="scenario-body">${html}</div>${includeFlow && doc.flow.nodes.length ? `<section class="flow-section"><h2>シナリオフロー</h2>${flowSvg(doc.flow, headings, theme)}</section>` : ''}<footer>Created with TRPG Canvas</footer></main>${script}</body></html>`;
}
