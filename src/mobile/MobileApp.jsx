import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, FileText, List, Network, StickyNote, FolderOpen, Plus, Save, X } from 'lucide-react';
import ScenarioEditor, { serializeEditorMarkdown } from '../Editor.jsx';
import WritingNotes from '../WritingNotes.jsx';
import { newDocument, outline } from '../model.mjs';
import { flowSvg } from '../export.mjs';
import { themeVariables } from '../themes.mjs';
import { ScenarioFiles, draftStore, parseScenario } from './files.mjs';

export default function MobileApp() {
  const [entries, setEntries] = useState([]), [entry, setEntry] = useState(null), [tab, setTab] = useState('editor');
  const [drawer, setDrawer] = useState(null);
  const [reading, setReading] = useState(false);
  const lastScroll = useRef(0);
  function trackScroll(event) {
    if (!event.target.classList.contains('editor-scroll')) return;
    const top = event.target.scrollTop, delta = top - lastScroll.current;
    if (top < 16) setReading(false);
    else if (delta > 12 && top > 70) setReading(true);
    else if (delta < -12) setReading(false);
    lastScroll.current = top;
  }
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [headings, setHeadings] = useState([]);
  const current = useRef(null), editor = useRef(null), version = useRef(0), saved = useRef(0), timer = useRef(null), input = useRef(null), saving = useRef(Promise.resolve());
  const native = Capacitor.getPlatform() === 'android';
  const [viewportHeight, setViewportHeight] = useState(() => window.visualViewport?.height || window.innerHeight);
  useEffect(() => {
    const resize = () => setViewportHeight(window.visualViewport?.height || window.innerHeight);
    window.visualViewport?.addEventListener('resize', resize);
    window.addEventListener('resize', resize);
    return () => { window.visualViewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize); };
  }, []);
  const refresh = async () => setEntries((await draftStore('list')).sort((a,b) => b.doc.updatedAt.localeCompare(a.doc.updatedAt)));
  useEffect(() => { refresh().catch(error => setMessage(error.message)); }, []);
  function snapshot() {
    const value = current.current;
    if (!value) return null;
    return { ...value, doc: { ...value.doc, ...(editor.current && !editor.current.isDestroyed ? { content: editor.current.getJSON(), markdown: serializeEditorMarkdown(editor.current) } : {}) } };
  }
  async function localSave() {
    clearTimeout(timer.current);
    const value = snapshot(), revision = version.current;
    if (!value) return;
    saving.current = saving.current.catch(() => {}).then(() => draftStore('put', value));
    await saving.current;
    if (current.current?.key === value.key) { saved.current = revision; setDirty(version.current !== revision); }
    return value;
  }
  function changed(patch) {
    if (!current.current) return;
    const next = { ...current.current, doc: { ...current.current.doc, ...patch, updatedAt: new Date().toISOString() } };
    current.current = next; version.current++; setDirty(true);
    if (patch) setEntry(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => localSave().catch(error => setMessage(`端末への保存に失敗: ${error.message}`)), 650);
  }
  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') localSave().catch(() => {}); };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); clearTimeout(timer.current); };
  }, []);
  async function run(action) { setBusy(true); setMessage(''); try { await action(); } catch(error) { setMessage(error.message); } finally { setBusy(false); } }
  async function open(value) {
    await localSave(); current.current = value; version.current = saved.current = 0; editor.current = null;
    setEntry(value); setDirty(false); setTab('editor'); setDrawer(null); setReading(false); lastScroll.current=0; setHeadings(outline(value.doc.content));
  }
  async function pick() {
    await localSave();
    if (!native) { input.current.click(); return; }
    const file = await ScenarioFiles.open();
    if (file.cancelled) return;
    const doc = parseScenario(file.text), key = file.uri;
    const existing = (await draftStore('list')).find(item => item.key === key);
    if (existing && existing.baseText !== JSON.stringify(existing.doc) && !window.confirm('端末の下書きがあります。元ファイルを読み直しますか？キャンセルすると下書きを開きます。')) { await open(existing); return; }
    const value = { key, doc, uri: file.uri, hash: file.hash, baseText: JSON.stringify(doc) };
    await draftStore('put', value); await open(value);
  }
  async function saveFile() {
    const value = await localSave();
    if (!value) return;
    if (!native) { const url = URL.createObjectURL(new Blob([JSON.stringify(value.doc, null, 2)], { type:'application/json' })); const link=document.createElement('a'); link.href=url; link.download=`${value.doc.title}.trpg.json`; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); setMessage('確認用ファイルを書き出しました'); return; }
    const result = value.uri ? await ScenarioFiles.write({ uri:value.uri, hash:value.hash, text:JSON.stringify(value.doc,null,2) }) : await ScenarioFiles.create({ name:`${value.doc.title}.trpg.json`, text:JSON.stringify(value.doc,null,2) });
    if (result.cancelled) return;
    const next = { ...current.current, uri:result.uri, hash:result.hash, baseText:JSON.stringify(value.doc) };
    current.current=next; setEntry(next); await localSave(); setMessage('元ファイルへ保存しました。Drive側の同期完了を確認してください。');
  }
  function navigate(item) {
    setTab('editor'); setDrawer(null); setReading(false);
    requestAnimationFrame(() => { const instance=editor.current; if(!instance || instance.isDestroyed)return; const target=outline(instance.getJSON()).find(h=>h.id===item.id); if(!target)return; instance.commands.setTextSelection(target.pos+1); instance.view.dom.children[target.index]?.scrollIntoView({block:'start'}); });
  }
  const doc=entry?.doc;
  return <div className={`mobile-app ${reading && entry && tab==='editor' ? 'mobile-reading' : ''}`} style={{...themeVariables('mono'),height:viewportHeight}} onScrollCapture={trackScroll} onMouseDown={event=>{if(event.target.closest('.editor-toolbar button'))event.preventDefault();}}>
    <header className="mobile-header">{entry ? <button aria-label="シナリオ一覧へ戻る" disabled={busy} onClick={()=>run(async()=>{await localSave(); current.current=null; editor.current=null; setEntry(null); await refresh();})}><ArrowLeft size={21}/></button> : <FileText size={23}/>}<strong>{doc?.title || 'マイシナリオ'}</strong>{entry && <button disabled={busy} aria-label="元ファイルに保存" onClick={()=>run(saveFile)}><Save size={20}/></button>}</header>
    {entry && <div className="mobile-switchbar"><button className="mobile-pill" aria-label="目次を開く" aria-expanded={drawer==='outline'} onClick={()=>{if(editor.current)setHeadings(outline(editor.current.getJSON()));setDrawer(drawer==='outline'?null:'outline');}}><List size={18}/></button><nav aria-label="スマホ編集モード">{[['editor','本文'],['flow','フロー']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setDrawer(null);}}>{label}</button>)}</nav><button className="mobile-pill" aria-label="執筆メモを開く" aria-expanded={drawer==='notes'} onClick={()=>setDrawer(drawer==='notes'?null:'notes')}><StickyNote size={18}/></button></div>}
    {message && <div className="mobile-message" role="status">{message}<button aria-label="通知を閉じる" onClick={()=>setMessage('')}><X size={16}/></button></div>}
    {!entry ? <main className="mobile-library"><p className="mobile-eyebrow">TRPG CANVAS · ANDROID PREVIEW</p><h1>物語を、どこからでも。</h1><p>本文を書き、目次でたどる。フローは閲覧専用です。</p><button className="mobile-primary" disabled={busy} onClick={()=>run(pick)}><FolderOpen size={19}/>Drive・端末から開く</button><button disabled={busy} onClick={()=>run(async()=>{const doc=newDocument(); const value={key:crypto.randomUUID(),doc};await draftStore('put',value);await open(value);})}><Plus size={18}/>新しいシナリオ</button><h2>端末の下書き</h2>{entries.map(value=><button className="mobile-document" key={value.key} onClick={()=>run(()=>open(value))}><FileText size={20}/><span><strong>{value.doc.title}</strong><small>{value.uri ? '元ファイルと連携 · 保存は右上から' : 'この端末の下書き'}</small></span></button>)}{!entries.length&&<p>開いたシナリオは端末にも自動保存されます。</p>}<small>DriveはAndroidのファイル選択画面から選べます。元ファイルへの保存は右上の保存ボタンから行います。</small></main> : <>
      <div className="mobile-save-state">{dirty ? '端末に保存中…' : '端末に保存済み'}<span>元ファイルへの反映は右上の保存ボタン</span></div>
      <section className={`mobile-body ${tab==='editor'?'':'hidden'}`}><input className="mobile-title" aria-label="シナリオタイトル" value={doc.title} onChange={event=>changed({title:event.target.value})}/><ScenarioEditor key={entry.key} doc={doc} onChange={changed} onEdit={()=>changed()} onReady={instance=>{editor.current=instance;if(instance)setHeadings(outline(instance.getJSON()));}}/></section>
      {drawer && <div className="mobile-drawer-shade" onClick={()=>setDrawer(null)}><aside className={`mobile-drawer ${drawer}`} role="dialog" aria-modal="true" aria-label={drawer==='outline'?'目次':'執筆メモ'} onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape')setDrawer(null);}}><button className="mobile-drawer-close" aria-label="パネルを閉じる" onClick={()=>setDrawer(null)}><X size={20}/></button>{drawer==='outline'?<section className="mobile-panel"><h1>目次</h1>{headings.map(item=><button className="mobile-heading" key={item.id||item.index} style={{paddingLeft:16+item.depth*14}} onClick={()=>navigate(item)}>{item.text}</button>)}</section>:<WritingNotes value={doc.writingNotes||''} onChange={writingNotes=>changed({writingNotes})} width={320} onWidth={()=>{}}/>}</aside></div>}
      {tab==='flow'&&<section className="mobile-panel"><h1>フローチャート</h1><p>閲覧専用 · 横にスクロールして確認できます</p><div className="mobile-flow" dangerouslySetInnerHTML={{__html:flowSvg(doc.flow,headings,'mono')}}/>{doc.flow.nodes.filter(node=>node.data.headingId).map(node=><button className="mobile-heading" key={node.id} onClick={()=>navigate({id:node.data.headingId})}>{node.data.label} → 本文</button>)}</section>}
    </>}
    <input hidden type="file" accept=".json,.trpg.json" ref={input} onChange={event=>{const file=event.target.files[0];event.target.value='';if(file)run(async()=>{const doc=parseScenario(await file.text());const value={key:crypto.randomUUID(),doc};await draftStore('put',value);await open(value);});}}/>
  </div>;
}
