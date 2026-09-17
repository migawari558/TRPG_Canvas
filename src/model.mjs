export const uid = () => globalThis.crypto.randomUUID();
export function outline(content) {
  let pos = 0;
  const ancestors = [];
  return (content?.content || []).flatMap((node, index) => {
    const item = { id: node.attrs?.headingId || null, index, level: node.attrs?.level || 1, text: textOf(node) || '無題の見出し', pos };
    pos += nodeSize(node);
    if (node.type !== 'heading') return [];
    while (ancestors.length && ancestors.at(-1).level >= item.level) ancestors.pop();
    item.parentId = ancestors.at(-1)?.id || null;
    item.ancestorIds = ancestors.map(parent => parent.id);
    item.depth = ancestors.length;
    ancestors.push(item);
    return [item];
  });
}
function nodeSize(node) { return node.type === 'text' ? node.text.length : node.content ? 2 + node.content.reduce((n, child) => n + nodeSize(child), 0) : ['paragraph', 'heading', 'blockquote', 'codeBlock'].includes(node.type) ? 2 : 1; }
export function textOf(node) { return node.text || (node.content || []).map(textOf).join(''); }
export function sectionRange(nodes, start) {
  const level = nodes[start]?.attrs?.level;
  if (nodes[start]?.type !== 'heading') return null;
  let end = start + 1;
  while (end < nodes.length && !(nodes[end].type === 'heading' && nodes[end].attrs.level <= level)) end++;
  return [start, end];
}
// A section includes all descendants. It moves only across siblings in its parent.
export function moveSection(content, index, direction) {
  const nodes = [...content.content], range = sectionRange(nodes, index);
  if (!range) return content;
  const [start, end] = range, level = nodes[start].attrs.level;
  if (direction < 0) {
    let previous = start - 1;
    while (previous >= 0) {
      if (nodes[previous].type === 'heading') {
        if (nodes[previous].attrs.level < level) return content;
        if (nodes[previous].attrs.level === level) break;
      }
      previous--;
    }
    if (previous < 0) return content;
    return { ...content, content: [...nodes.slice(0, previous), ...nodes.slice(start, end), ...nodes.slice(previous, start), ...nodes.slice(end)] };
  }
  if (end >= nodes.length || nodes[end].attrs.level !== level) return content;
  const nextEnd = sectionRange(nodes, end)[1];
  return { ...content, content: [...nodes.slice(0, start), ...nodes.slice(end, nextEnd), ...nodes.slice(start, end), ...nodes.slice(nextEnd)] };
}
export function newDocument(title = '新しいシナリオ', markdown = '## 導入\n\nここから、物語をはじめましょう。\n\n## 探索\n\n\n## 結末\n\n') {
  return { id: uid(), version: 1, title, subtitle: 'オリジナルシナリオ', markdown, updatedAt: new Date().toISOString(), flow: { nodes: [], edges: [] } };
}
export function sampleDocument() {
  const doc = newDocument('霧の向こうの灯台', `## シナリオ概要

海辺の町に、三十年ぶりの濃霧が訪れる。消えた灯台守と、夜ごと海から聞こえる鐘の音。探索者たちは、霧の向こうに隠された約束をたどる。

**舞台**　現代・海辺の小さな町　／　**人数**　2〜4人　／　**時間**　3〜4時間

## 導入：届かなかった手紙

探索者のもとに、一通の古びた手紙が届く。差出人は、しばらく連絡のなかった友人・水城 遥。消印は、なぜか三十年前の日付だった。

> あなたがこれを読んでいるなら、まだ間に合うはずです。
>
> 霧が晴れる前に、灯台へ来てください。どうか、あの灯りを消さないで。

### キーパーへのメモ

手紙の筆跡は確かに遥のもの。日付の矛盾に気づいた探索者には、海辺の町で起きた古い失踪事件の噂を伝えてもよい。

## 探索：霧に沈む町

町の時計は、すべて午前二時十七分で止まっている。港には誰もいない。ただ、喫茶店「凪」の窓から、温かな光が漏れている。

### 喫茶店「凪」

- 店主は三十年前の灯台事故を覚えている。
- カウンターに置かれた写真には、遥によく似た人物が写っている。
- **〈目星〉成功**：写真の裏に「灯りは、帰り道のしるべ」と書かれている。

> 「あの灯台にはね、帰ってこない人を待つ灯りがあるんです。今夜も、きっと。」

### 古い灯台

錆びた扉の向こうには、上へと続く螺旋階段がある。登るたびに、波音が遠くなっていく。

## クライマックス：最後の灯り

灯室に立つ遥は、探索者たちに選択を託す。灯りを守って町を過去に留めるか、灯りを消して、止まった時間を進めるか。

---

## エンディング

**灯りを消した場合**：霧が晴れ、町の時計が動き出す。手元には、白紙になった一通の手紙だけが残る。

**灯りを守った場合**：探索者たちは町を去る。振り返ると、霧の向こうに小さな灯りがまたたいていた。
`);
  doc.subtitle = 'モダンホラー / 海辺の町';
  doc.flow = { nodes: [
    { id: 'intro', position: { x: 250, y: 30 }, data: { label: '届かなかった手紙', kind: 'scene' } },
    { id: 'cafe', position: { x: 90, y: 180 }, data: { label: '喫茶店「凪」', kind: 'scene' } },
    { id: 'lighthouse', position: { x: 410, y: 180 }, data: { label: '古い灯台', kind: 'scene' } },
    { id: 'choice', position: { x: 250, y: 340 }, data: { label: '灯りを消す？', kind: 'branch' } },
    { id: 'end1', position: { x: 90, y: 510 }, data: { label: '動き出す時間', kind: 'ending' } },
    { id: 'end2', position: { x: 410, y: 510 }, data: { label: '霧の向こうの灯り', kind: 'ending' } }
  ], edges: [
    { id: 'e1', source: 'intro', target: 'cafe' }, { id: 'e2', source: 'intro', target: 'lighthouse' },
    { id: 'e3', source: 'cafe', target: 'choice' }, { id: 'e4', source: 'lighthouse', target: 'choice' },
    { id: 'e5', source: 'choice', target: 'end1', label: '消す' }, { id: 'e6', source: 'choice', target: 'end2', label: '守る' }
  ] };
  return doc;
}
