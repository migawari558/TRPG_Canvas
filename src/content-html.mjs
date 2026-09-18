const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contentHtml(node) {
  const body = () => (node.content || []).map(contentHtml).join('');
  if (node.type === 'text') {
    let text = esc(node.text);
    for (const mark of node.marks || []) { const tag = {bold:'strong',italic:'em',strike:'s',underline:'u',code:'code'}[mark.type]; if (tag) text = `<${tag}>${text}</${tag}>`; else if (mark.type === 'link' && /^(https?:|mailto:|#)/i.test(mark.attrs?.href || '')) text = `<a href="${esc(mark.attrs.href)}">${text}</a>`; }
    return text;
  }
  const tags = {paragraph:'p',blockquote:'blockquote',bulletList:'ul',orderedList:'ol',listItem:'li'};
  if (node.type === 'paragraph' && !node.content?.length) return '<p class="blank-line"></p>';
  if (tags[node.type]) { const tag=tags[node.type]; return `<${tag}${node.type==='orderedList'?` start="${Number(node.attrs?.start)||1}"`:''}>${body()}</${tag}>`; }
  if (node.type === 'heading') { const level=Math.min(6,Math.max(0,node.attrs?.level??1));return `<h${level||1}${level===0?' data-chapter="" class="chapter-heading"':''}>${body()}</h${level||1}>`; }
  if (node.type === 'gmNote') return `<aside data-gm-note="true" class="gm-note">${body()}</aside>`;
  if (node.type === 'hardBreak') return '<br>';
  if (node.type === 'horizontalRule') return '<hr>';
  if (node.type === 'codeBlock') return `<pre><code>${body()}</code></pre>`;
  if (node.type === 'taskList') return `<ul data-type="taskList">${body()}</ul>`;
  if (node.type === 'taskItem') return `<li data-type="taskItem" data-checked="${!!node.attrs?.checked}"><label><input type="checkbox" ${node.attrs?.checked?'checked':''}></label><div>${body()}</div></li>`;
  if (node.type === 'image') return /^data:image\/(png|jpeg|gif|webp);base64,/i.test(node.attrs?.src||'') ? `<img src="${esc(node.attrs.src)}" alt="${esc(node.attrs.alt)}">` : '';
  return body();
}
