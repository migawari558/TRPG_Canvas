import { contentHtml } from './content-html.mjs';
import { exportStyle } from './export-style.mjs';
import { getTheme } from './themes.mjs';
import { documentTheme } from './desktop-themes.mjs';
import MarkdownIt from 'markdown-it';
import { absolutePosition } from './flow-model.mjs';
import { outline } from './model.mjs';
import { gmNotePlugin } from './gm-markdown.mjs';
import { taskListPlugin } from './task-markdown.mjs';
import { underlinePlugin } from './underline-markdown.mjs';
import { chapterPlugin } from './chapter-markdown.mjs';
import { blankLinePlugin } from './blank-markdown.mjs';
import { imageSizePlugin } from './image-size.mjs';
import { dialoguePlugin } from './dialogue-markdown.mjs';
export const markdown = new MarkdownIt({ html: false, linkify: true, typographer: false }).use(gmNotePlugin).use(dialoguePlugin).use(taskListPlugin).use(underlinePlugin).use(chapterPlugin).use(blankLinePlugin).use(imageSizePlugin);
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function flowSvg(flow, headings = [], theme = 'forest', colors = getTheme(theme).colors) {
  const c = colors;
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
  const systemName = String(doc.systemName || '').trim().slice(0, 80);
  let html = (doc.content ? contentHtml(doc.content) : markdown.render(doc.markdown)), index = 0;
  const toc = [];
  const headings = outline(doc.content);
  html = html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g, (_, level, attrs, title) => { const id = `section-${index++}`, chapter = attrs.includes('data-chapter'); if (Number(level) <= 2) toc.push(`<a href="#${id}" class="level-${chapter ? 0 : level}"><span>${title}</span></a>`); return `<h${level}${attrs} id="${id}">${title}</h${level}>`; });
  if (copyButtons) html = html.replace(/<(blockquote|pre)>([\s\S]*?)<\/\1>/g, (_, tag, content) => `<div class="copy-block"><button type="button" class="copy-button">コピー</button><${tag}>${content}</${tag}></div>`);
  const script = copyButtons && interactive ? `<script>document.querySelectorAll('.copy-button').forEach(button=>button.addEventListener('click',async()=>{const text=button.nextElementSibling.innerText;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);}else{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();if(!ok)throw new Error('copy');}button.textContent='コピーしました';}catch{button.textContent='選択してコピーしてください';const range=document.createRange();range.selectNodeContents(button.nextElementSibling);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}setTimeout(()=>button.textContent='コピー',2000);}));</script>` : '';
  const hasFlow = includeFlow && doc.flow.nodes.length > 0;
  const navigation = toc.length ? `<details class="export-navigation" open>
    <summary aria-controls="export-toc"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12M3 6h.01M3 12h.01M3 18h.01"/></svg><span class="toc-open-label">目次を開く</span><span class="toc-close-label">目次を閉じる</span><svg class="toc-close-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></summary>
    <nav id="export-toc" class="export-toc" aria-label="シナリオの目次"><div class="toc-links">${toc.join('')}${hasFlow ? '<a href="#scenario-flow" class="toc-flow">シナリオフロー</a>' : ''}</div></nav>
  </details>` : '';
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:"><title>${escapeHtml(doc.title)}</title><style>${exportStyle(options)}</style></head>
  <body><div class="export-shell${toc.length ? ' has-navigation' : ''}">${navigation}<main>
    <header>${systemName ? `<small>${escapeHtml(systemName)}</small>` : ''}<h1>${escapeHtml(doc.title)}</h1>${doc.subtitle ? `<p>${escapeHtml(doc.subtitle)}</p>` : ''}</header>
    <div class="scenario-body">${html}</div>
    ${hasFlow ? `<section class="flow-section" id="scenario-flow"><h2>シナリオフロー</h2>${flowSvg(doc.flow, headings, theme, documentTheme(theme).colors)}</section>` : ''}
  </main></div>${script}</body></html>`;
}
