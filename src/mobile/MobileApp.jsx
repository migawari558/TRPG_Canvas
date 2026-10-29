import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, FileText, List, StickyNote, FolderOpen, Plus, Save, Settings2, X } from 'lucide-react';
import ScenarioEditor, { serializeEditorMarkdown } from '../Editor.jsx';
import WritingNotes from '../WritingNotes.jsx';
import SwipeDraft from './SwipeDraft.jsx';
import { newDocument, outline } from '../model.mjs';
import { flowSvg } from '../export.mjs';
import { themeVariables, getThemes, getTheme, readPreference, isDarkTheme } from '../themes.mjs';
import { ScenarioFiles, draftStore, parseScenario, scenarioFileName } from './files.mjs';

export default function MobileApp() {
  const [entries, setEntries] = useState([]), [entry, setEntry] = useState(null), [tab, setTab] = useState('editor');
  const [drawer, setDrawer] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [update,setUpdate]=useState(null);
  const [filePending,setFilePending]=useState(false);
  const [design, setDesign] = useState(() => { const value=readPreference('trpg-mobile-design',{}); return {theme:getTheme(value?.theme||'mono').id,fontSize:Math.max(10,Math.min(24,value?.defaultsVersion===2?(Number(value?.fontSize)||14):14))}; });
  const [deleteTarget,setDeleteTarget]=useState(null);
  useEffect(()=>{try{localStorage.setItem('trpg-mobile-design',JSON.stringify({...design,defaultsVersion:2}));}catch{setMessage('表示設定を保存できませんでした');}},[design]);
  const [reading, setReading] = useState(false);
  const lastScroll = useRef(0);
  const scrollMotion=useRef({distance:0,until:0});
  function trackScroll(event) {
    if (!event.target.classList.contains('editor-scroll')) return;
    const top = event.target.scrollTop, delta = top - lastScroll.current;
    lastScroll.current = top;
    const motion=scrollMotion.current;
    if(performance.now()<motion.until)return;
    motion.distance=Math.sign(delta)===Math.sign(motion.distance)?motion.distance+delta:delta;
    if(top<16 || motion.distance < -35){setReading(false);motion.until=performance.now()+300;motion.distance=0;}
    else if(motion.distance>35 && top>70){setReading(true);motion.until=performance.now()+300;motion.distance=0;}
  }
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [dirty, setDirty] = useState(false), [headings, setHeadings] = useState([]);
  const current = useRef(null), editor = useRef(null), version = useRef(0), saved = useRef(0), timer = useRef(null), input = useRef(null), saving = useRef(Promise.resolve());
  const native = Capacitor.getPlatform() === 'android';
  useEffect(()=>{if(native)ScenarioFiles.setSystemBars({color:getTheme(design.theme).colors.paper,dark:isDarkTheme(design.theme)}).catch(()=>{});},[design.theme,native]);
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
    current.current = next; version.current++; setDirty(true);setFilePending(true);
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
    setFilePending(!value.uri || value.baseText!==JSON.stringify(value.doc));
  }
  async function pick() {
    await localSave();
    if (!native) { input.current.click(); return; }
    const file = await ScenarioFiles.open();
    if (file.cancelled) return;
    const doc = parseScenario(file.text), key = file.uri;
    const existing = (await draftStore('list')).find(item => item.key === key);
    if (existing && existing.baseText !== JSON.stringify(existing.doc) && !window.confirm('端末の下書きがあります。元ファイルを読み直しますか？キャンセルすると下書きを開きます。')) { await open(existing); return; }
    const value = { key, doc, uri: file.uri, hash: file.hash, name:file.name, provider:file.provider, baseText: JSON.stringify(doc) };
    await draftStore('put', value); await open(value);
  }
  async function saveFile() {
    const value = await localSave();
    const writingVersion=version.current;
    if (!value) return;
    if (!native) { const url = URL.createObjectURL(new Blob([JSON.stringify(value.doc, null, 2)], { type:'application/json' })); const link=document.createElement('a'); link.href=url; link.download=scenarioFileName(value.doc); link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); setMessage('確認用ファイルを書き出しました'); return; }
    const result = value.uri ? await ScenarioFiles.write({ uri:value.uri, hash:value.hash, text:JSON.stringify(value.doc,null,2) }) : await ScenarioFiles.create({ name:scenarioFileName(value.doc), text:JSON.stringify(value.doc,null,2) });
    if (result.cancelled) return;
    const next = { ...current.current, uri:result.uri, hash:result.hash, name:result.name, provider:result.provider, baseText:JSON.stringify(value.doc), fileSavedAt:new Date().toISOString() };
    current.current=next; setEntry(next);setFilePending(version.current!==writingVersion); await localSave(); setMessage('ファイルへの書き込みと再読込の一致を確認しました。Driveのクラウドへの反映完了は未確認です。PC側では同期後にシナリオを開き直してください。');
  }
  function navigate(item) {
    setTab('editor'); setDrawer(null); setReading(false);
    requestAnimationFrame(() => { const instance=editor.current; if(!instance || instance.isDestroyed)return; const target=outline(instance.getJSON()).find(h=>h.id===item.id); if(!target)return; instance.commands.setTextSelection(target.pos+1); instance.view.dom.children[target.index]?.scrollIntoView({block:'start'}); });
  }
  const doc=entry?.doc;
  return <div className={`mobile-app ${reading && entry && tab==='editor' ? 'mobile-reading' : ''}`} data-theme={design.theme} style={{...themeVariables(design.theme),height:viewportHeight,'--editor-font-size':`${design.fontSize}px`,colorScheme:isDarkTheme(design.theme)?'dark':'light'}} onScrollCapture={trackScroll} onMouseDown={event=>{if(event.target.closest('.editor-toolbar button'))event.preventDefault();}}>
    <header className="mobile-header">{entry ? <button aria-label="シナリオ一覧へ戻る" disabled={busy} onClick={()=>run(async()=>{await localSave(); current.current=null; editor.current=null; setEntry(null); await refresh();})}><ArrowLeft size={21}/></button> : <FileText size={23}/>}<strong>{doc?.title || 'マイシナリオ'}</strong>{entry && <button disabled={busy} aria-label="元ファイルに保存" onClick={()=>run(saveFile)}><Save size={20}/></button>}{!entry && <button className="mobile-settings-open" aria-label="スマホの設定" onClick={()=>setSettingsOpen(true)}><Settings2 size={18}/><span>設定</span></button>}</header>
    {deleteTarget && <div className="mobile-drawer-shade" onClick={()=>setDeleteTarget(null)}><aside className="mobile-delete-dialog" role="dialog" aria-modal="true" aria-label="端末の下書きを削除" onClick={event=>event.stopPropagation()}><h2>下書きを削除しますか？</h2><p>「{deleteTarget.doc.title}」の端末内の下書きを削除します。Driveなどの元ファイルは削除しません。未反映の変更は失われます。</p><button disabled={busy} onClick={()=>setDeleteTarget(null)}>キャンセル</button><button disabled={busy} onClick={()=>run(async()=>{await draftStore('delete',deleteTarget.key);setDeleteTarget(null);await refresh();})}>下書きを削除</button></aside></div>}
    {settingsOpen && <div className="mobile-drawer-shade" onClick={()=>setSettingsOpen(false)}><aside className="mobile-drawer notes mobile-settings" role="dialog" aria-modal="true" aria-label="スマホの設定" onClick={event=>event.stopPropagation()}><button className="mobile-drawer-close" aria-label="設定を閉じる" onClick={()=>setSettingsOpen(false)}><X size={20}/></button><section className="mobile-panel"><h1>設定</h1><h2>デザイン</h2><label className="mobile-setting">本文サイズ <output>{design.fontSize}px</output><input aria-label="スマホ本文サイズ" type="range" min="10" max="24" step="1" value={design.fontSize} onChange={event=>setDesign({...design,fontSize:Number(event.target.value)})}/></label><label className="mobile-setting">配色テーマ<select aria-label="スマホ配色テーマ" value={design.theme} onChange={event=>setDesign({...design,theme:event.target.value})}>{getThemes().map(theme=><option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label><div className="mobile-design-sample" style={{fontSize:design.fontSize}}>霧の向こうに、物語がある。<br/>探索者たちは灯台へ向かう。</div><h2>保存先</h2><p><strong>自動保存：この端末</strong><br/>本文・メモの下書きを端末内に保存します。</p><p><strong>ファイル保存：Drive・端末など</strong><br/>シナリオごとに選択した元ファイルへ、右上の保存ボタンで書き込みます。新規シナリオは初回保存時に場所を選びます。</p><button className="mobile-primary" disabled={busy} onClick={()=>run(async()=>{setSettingsOpen(false);await pick();})}><FolderOpen size={17}/>保存先のファイルを開く</button><p>Driveアプリへログインし、ファイル選択画面でDriveを選んでください。固定の同期フォルダは使用しません。</p><button onClick={()=>setDesign({theme:'mono',fontSize:14})}>表示設定を初期値に戻す</button><h2>アプリの更新</h2><button className="mobile-primary" disabled={busy} onClick={()=>run(async()=>{if(!native){setUpdate({unreleased:true});return;}setUpdate(await ScenarioFiles.checkUpdate());})}>更新を確認</button>{update && <p>{update.unreleased?'Android正式版はまだ公開されていません。試作APKはGitHub Actionsから取得してください。':update.available?`新しいAndroid版 ${update.latest} があります。`:`現在のAndroid版 ${update.installed} は最新版です。`}</p>}{update?.available && <button className="mobile-primary" onClick={()=>run(()=>ScenarioFiles.openReleases())}>更新APKの配布ページを開く</button>}<p>正式版はAPKをダウンロード後、Androidの案内に従って上書きインストールします。</p></section></aside></div>}
    {entry && <div className="mobile-switchbar"><button className="mobile-pill" aria-label="目次を開く" aria-expanded={drawer==='outline'} onClick={()=>{if(editor.current)setHeadings(outline(editor.current.getJSON()));setDrawer(drawer==='outline'?null:'outline');}}><List size={18}/></button><nav aria-label="スマホ編集モード">{[['editor','本文'],['flow','フロー']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>{setTab(id);setDrawer(null);}}>{label}</button>)}</nav><button className="mobile-pill" aria-label="執筆メモを開く" aria-expanded={drawer==='notes'} onClick={()=>setDrawer(drawer==='notes'?null:'notes')}><StickyNote size={18}/></button></div>}
    {message && <div className="mobile-message" role="status">{message}<button aria-label="通知を閉じる" onClick={()=>setMessage('')}><X size={16}/></button></div>}
    {!entry ? <main className="mobile-library"><button className="mobile-primary" disabled={busy} onClick={()=>run(pick)}><FolderOpen size={19}/>Drive・端末から開く</button><button disabled={busy} onClick={()=>run(async()=>{const doc=newDocument(); const value={key:crypto.randomUUID(),doc};await draftStore('put',value);await open(value);})}><Plus size={18}/>新しいシナリオ</button><h2>端末の下書き</h2>{entries.map(value=><SwipeDraft key={value.key} value={value} onOpen={()=>run(()=>open(value))} onDelete={()=>setDeleteTarget(value)}/>)}{!entries.length&&<p>開いたシナリオは端末にも自動保存されます。</p>}<small>DriveはAndroidのファイル選択画面から選べます。元ファイルへの保存は右上の保存ボタンから行います。</small></main> : <>
      <div className="mobile-save-state">{dirty ? '端末に保存中…' : '端末に保存済み'}<span>{filePending ? '元ファイルに未反映 · 右上で保存' : entry.fileSavedAt ? `書込確認済み・Drive同期待ち ${new Date(entry.fileSavedAt).toLocaleTimeString()}` : '元ファイル未保存 · 右上で保存'}</span></div>{entry.uri && <div className="mobile-file-source" title={entry.uri}>保存先: {entry.name||'連携ファイル'} · {entry.provider||'選択したプロバイダー'}</div>}
      <section className={`mobile-body ${tab==='editor'?'':'hidden'}`}><div className="mobile-title-row"><input className="mobile-title" aria-label="シナリオタイトル" value={doc.title} onChange={event=>changed({title:event.target.value})}/><button aria-label="シナリオ情報を編集" title="シナリオ情報" onClick={()=>setInfoOpen(true)}><Settings2 size={16}/></button></div><ScenarioEditor key={entry.key} doc={doc} onChange={changed} onEdit={()=>changed()} onReady={instance=>{editor.current=instance;if(instance)setHeadings(outline(instance.getJSON()));}}/></section>
      {infoOpen && <div className="mobile-drawer-shade" onClick={()=>setInfoOpen(false)}><aside className="mobile-drawer notes mobile-settings" role="dialog" aria-modal="true" aria-label="シナリオ情報" onClick={event=>event.stopPropagation()}><button className="mobile-drawer-close" aria-label="シナリオ情報を閉じる" onClick={()=>setInfoOpen(false)}><X size={20}/></button><section className="mobile-panel"><h1>シナリオ情報</h1>{[['title','シナリオ名'],['systemName','システム名'],['subtitle','シナリオの説明']].map(([key,label])=><label className="mobile-setting" key={key}>{label}<input type="text" aria-label={label} value={doc[key]||''} maxLength={key==='systemName'?80:200} onChange={event=>changed({[key]:event.target.value})}/></label>)}<p>変更は端末に自動保存します。Driveの元ファイルへの反映は右上の保存ボタンから行ってください。</p></section></aside></div>}
      {drawer && <div className="mobile-drawer-shade" onClick={()=>setDrawer(null)}><aside className={`mobile-drawer ${drawer}`} role="dialog" aria-modal="true" aria-label={drawer==='outline'?'目次':'執筆メモ'} onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape')setDrawer(null);}}><button className="mobile-drawer-close" aria-label="パネルを閉じる" onClick={()=>setDrawer(null)}><X size={20}/></button>{drawer==='outline'?<section className="mobile-panel"><h1>目次</h1>{headings.map(item=><button className="mobile-heading" key={item.id||item.index} style={{paddingLeft:16+item.depth*14}} onClick={()=>navigate(item)}>{item.text}</button>)}</section>:<WritingNotes value={doc.writingNotes||''} onChange={writingNotes=>changed({writingNotes})} width={320} onWidth={()=>{}}/>}</aside></div>}
      {tab==='flow'&&<section className="mobile-panel"><h1>フローチャート</h1><p>閲覧専用 · 横にスクロールして確認できます</p><div className="mobile-flow" dangerouslySetInnerHTML={{__html:flowSvg(doc.flow,headings,'mono')}}/>{doc.flow.nodes.filter(node=>node.data.headingId).map(node=><button className="mobile-heading" key={node.id} onClick={()=>navigate({id:node.data.headingId})}>{node.data.label} → 本文</button>)}</section>}
    </>}
    <input hidden type="file" accept=".json,.trpg.json" ref={input} onChange={event=>{const file=event.target.files[0];event.target.value='';if(file)run(async()=>{const doc=parseScenario(await file.text());const value={key:crypto.randomUUID(),doc};await draftStore('put',value);await open(value);});}}/>
  </div>;
}
