import Appearance from './Appearance.jsx';
import { writeFlowScene } from './flow-model.mjs';
import ExportDialog from './ExportDialog.jsx';
import { defaultAppearance, normalizeAppearance, normalizeDesign, readPreference, themeVariables, isDarkTheme } from './themes.mjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, Search, FileText, Network, Download, Settings2, ChevronDown, ChevronUp, ArrowUp, ArrowDown, CircleHelp, X, Check, FolderOpen, Upload, RefreshCw, Cloud, HardDrive, Copy, Quote, Feather, PanelLeftClose, PanelLeftOpen, LoaderCircle, AlertCircle } from 'lucide-react';
import ScenarioEditor from './Editor.jsx';
import Flow from './Flow.jsx';
import Outline from './Outline.jsx';
import Dashboard from './Dashboard.jsx';
import { api, isDesktop } from './api.js';
import { newDocument, sampleDocument, outline, moveSection } from './model.mjs';
import { exportHtml } from './export.mjs';
function Modal({ title, eyebrow, onClose, children, className = '' }) {
  const ref = useRef();
  useEffect(() => { const previous = document.activeElement; ref.current?.focus(); return () => previous?.focus(); }, []);
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const items = [...ref.current.querySelectorAll('button:not(:disabled),input,select,a[href]')]; const first = items[0], last = items.at(-1); if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }}><button className="modal-close icon-button" aria-label="閉じる" onClick={onClose}><X size={20}/></button><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{children}</div></div>;
}
export default function App() {
  const [doc, setDoc] = useState(null), [documents, setDocuments] = useState([]), [workspace, setWorkspace] = useState('');
  const [screen, setScreen] = useState('document');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [view, setView] = useState('editor'), [modal, setModal] = useState(null), [query, setQuery] = useState(''), [sidebar, setSidebar] = useState(true), [notesOpen, setNotesOpen] = useState(true);
  const [saveState, setSaveState] = useState('saved'), [toast, setToast] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState(null), [editorContent, setEditorContent] = useState(null), [activeHeading, setActiveHeading] = useState(0), [loadGeneration, setLoadGeneration] = useState(0);
  const [appearance, setAppearance] = useState(() => normalizeAppearance(readPreference('trpg-appearance', defaultAppearance)));
  const [exportDesign, setExportDesign] = useState(() => { const stored = readPreference('trpg-export-design', null); return stored ? normalizeDesign(stored) : null; });
  useEffect(() => {
    const refresh = event => {
      const replace = current => current?.theme === event.detail?.removedId ? { ...current, theme: event.detail.baseId } : current;
      setAppearance(current => normalizeAppearance(replace(current)));
      setExportDesign(current => current ? normalizeDesign(replace(current)) : null);
    };
    window.addEventListener('trpg-custom-themes-change', refresh);
    return () => window.removeEventListener('trpg-custom-themes-change', refresh);
  }, []);
  useEffect(() => { try { localStorage.setItem('trpg-appearance', JSON.stringify(appearance)); } catch { setError('表示設定を保存できませんでした'); } }, [appearance]);
  useEffect(() => { if (exportDesign) try { localStorage.setItem('trpg-export-design', JSON.stringify(exportDesign)); } catch { setError('書き出し設定を保存できませんでした'); } }, [exportDesign]);
  const docRef = useRef(null), revisions = useRef({}), saved = useRef(''), queue = useRef(Promise.resolve()), fileInput = useRef(null);
  const notify = text => setToast(text);
  const refreshList = useCallback(async () => { const result = await api.list(); setDocuments(result.documents); if (result.errors.length) setError(`読み込めないファイル: ${result.errors.join('、')}。元ファイルは保持しています。`); return result.documents; }, []);
  const install = useCallback(result => { docRef.current = result.doc; revisions.current[result.doc.id] = result.revision; saved.current = JSON.stringify(result.doc); setDoc(result.doc); setEditorContent(result.doc.content || null); setLoadGeneration(value => value + 1); setSaveState('saved'); }, []);
  const updateDoc = useCallback(patch => { if (!docRef.current) return; const next = { ...docRef.current, ...patch, updatedAt: new Date().toISOString() }; docRef.current = next; setDoc(next); setSaveState('dirty'); if (patch.content) setEditorContent(patch.content); }, []);
  const persist = useCallback(() => {
    const next = queue.current.catch(() => {}).then(async () => {
      const snapshot = docRef.current;
      if (!snapshot || JSON.stringify(snapshot) === saved.current) return;
      setSaveState('saving');
      try {
        const result = await api.save(snapshot, revisions.current[snapshot.id]);
        revisions.current[result.doc.id] = result.revision;
        if (result.conflict) {
          const current = { ...docRef.current, id: result.doc.id, title: result.doc.title };
          docRef.current = current; setDoc(current); setError('別の変更を検知しました。編集内容は「競合コピー」として保存しました。元のシナリオと比較してください。');
        }
        saved.current = JSON.stringify(result.doc);
        setSaveState(JSON.stringify(docRef.current) === saved.current ? 'saved' : 'dirty');
        await refreshList();
      } catch (e) { setSaveState('error'); setError(`保存できませんでした: ${e.message}`); throw e; }
    });
    queue.current = next; return next;
  }, [refreshList]);
  useEffect(() => { (async () => { try { setWorkspace((await api.info()).folder); const list = await refreshList(); if (list.length) install(await api.load(list[0].id)); else if (!localStorage.getItem('trpg-library-initialized')) { const first = sampleDocument(); install(await api.save(first, null)); await refreshList(); } else setScreen('dashboard'); localStorage.setItem('trpg-library-initialized', 'true'); } catch (e) { setError(e.message); } })(); }, []);
  useEffect(() => { if (!doc) return; const timer = setTimeout(() => persist().catch(() => {}), 650); return () => clearTimeout(timer); }, [doc, persist]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 3500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { const listener = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); persist().then(() => notify('保存しました')).catch(() => {}); } }; window.addEventListener('keydown', listener); const beforeUnload = e => { if (JSON.stringify(docRef.current) !== saved.current && docRef.current) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', beforeUnload); const remove = window.canvas?.onClose(async () => { try { await persist(); window.canvas.finishClose(); } catch {} }); return () => { window.removeEventListener('keydown', listener); window.removeEventListener('beforeunload', beforeUnload); remove?.(); }; }, [persist]);
  async function run(action) { setBusy(true); try { await action(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function openDocument(id) { await persist(); install(await api.load(id)); setActiveHeading(0); setScreen('document'); }
  async function createDocument(title, body) { await persist(); const created = newDocument(title, body); install(await api.save(created, null)); await refreshList(); setView('editor'); setScreen('document'); }
  async function showDashboard() { await persist(); await refreshList(); setScreen('dashboard'); }
  async function importFile() { if (!isDesktop) { fileInput.current.click(); return; } const imported = await api.importMarkdown(); if (imported) await createDocument(imported.title, imported.markdown); }
  async function chooseFolder() { await persist(); const result = await api.chooseFolder(); if (!result) return; setWorkspace(result.folder); const list = await refreshList(); if (list.length) install(await api.load(list[0].id)); else { const copy = { ...(docRef.current || newDocument()), id: newDocument().id }; install(await api.save(copy, null)); await refreshList(); } notify('保存先を変更しました'); }
  async function prepareDelete(id) {
    await persist();
    const target = await api.load(id);
    setDeleteError(''); setDeleteTarget({ id, title: target.doc.title, revision: target.revision }); setModal('delete');
  }
  async function deleteScenario() {
    if (!deleteTarget) return;
    await persist();
    await api.remove(deleteTarget.id, deleteTarget.revision);
    if (docRef.current?.id === deleteTarget.id) {
      docRef.current = null; saved.current = ''; setDoc(null); setEditorContent(null); setEditor(null); setSaveState('saved');
    }
    delete revisions.current[deleteTarget.id];
    setScreen('dashboard'); setModal(null); setDeleteTarget(null);
    await refreshList(); notify(isDesktop ? 'シナリオをゴミ箱へ移しました' : 'シナリオを削除しました');
  }
  async function exportFile(exportFormat, options) { await persist(); const latest = docRef.current; const content = exportFormat === 'md' ? latest.markdown : exportHtml(latest, { ...options, printPreview: exportFormat === 'pdf' && !window.canvas }); const path = await api.export(exportFormat, latest.title, content, exportFormat === 'pdf' ? options.pdfPageSize : undefined); if (path) { setModal(null); notify(`${exportFormat.toUpperCase()}を書き出しました`); } }
  function onReady(instance) { setEditor(instance); if (instance) setEditorContent(instance.getJSON()); }
  const headings = outline(editorContent || doc?.content);
  const wordCount = (doc?.markdown || '').replace(/!\[[^\]]*\]\(data:image\/(?:png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+\)/gi, '').replace(/[\s#*>`_\-]/g, '').length;
  const quoteCount = (doc?.markdown.match(/^> /gm) || []).length;
  function navigateHeading(item) {
    if (!editor || editor.isDestroyed) return;
    const current = outline(editor.getJSON()).find(heading => item.id ? heading.id === item.id : heading.index === item.index);
    if (!current) { notify('対応する見出しが見つかりません'); return; }
    setView('editor'); setActiveHeading(current.id);
    requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      editor.chain().focus().setTextSelection(current.pos + 1).run();
      const element = editor.view.dom.children[current.index];
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      element?.animate([{ backgroundColor: '#dfeccf' }, { backgroundColor: 'transparent' }], { duration: 1400 });
    });
  }
  function reorder(item, direction) {
    if (!editor) return;
    const current = editor.getJSON(), next = moveSection(current, item.index, direction);
    if (next !== current) { editor.chain().focus().setContent(next, true).run(); setActiveHeading(item.id); }
  }
  function writeScene(nodeId) {
    if (!editor || editor.isDestroyed) return;
    const result = writeFlowScene(editor.getJSON(), docRef.current.flow, nodeId);
    if (!result) return;
    if (result.created) {
      editor.commands.setContent(result.content, true);
      updateDoc({ flow: result.flow });
    }
    const heading = outline(editor.getJSON()).find(item => item.id === result.headingId);
    navigateHeading(heading);
    if (result.created) requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.chain().focus().setTextSelection(heading.pos + editor.state.doc.child(heading.index).nodeSize + 1).run();
    });
  }
  return <div className={`app ${sidebar ? '' : 'sidebar-hidden'}`} data-theme={appearance.theme} style={{ ...themeVariables(appearance.theme), colorScheme: isDarkTheme(appearance.theme) ? 'dark' : 'light', '--editor-font-size': `${appearance.fontSize}px`, '--ui-scale': appearance.uiScale / 100 }}>
    <aside className="sidebar"><button className="brand" aria-label="ダッシュボードへ" title="シナリオ一覧を開く" disabled={busy} onClick={() => run(showDashboard)}><div className="brand-mark"><BookOpen size={22}/></div><div>TRPG<span>CANVAS</span></div><span className="brand-dot">β</span></button><div className="workspace-label">YOUR CREATIVE SPACE</div><button className="sidebar-action" onClick={() => run(showDashboard)}><BookOpen size={16}/>シナリオ一覧へ</button>{screen === 'document' && doc && <Outline key={doc.id} headings={headings} content={editorContent} activeHeading={activeHeading} onNavigate={navigateHeading} onReorder={reorder} flow={doc.flow} onShowFlow={() => setView('flow')}/>} <button className="sidebar-action" disabled={busy} onClick={() => run(importFile)}><Upload size={15}/>Markdownを読み込む</button><div className="sidebar-bottom"><div className="local-badge"><span className="status-dot"/><span>{isDesktop ? 'ローカルワークスペース' : 'ブラウザプレビュー'}<small>{isDesktop ? 'あなたの物語は、あなたの手元に。' : 'このブラウザ内にデータを保存'}</small></span><HardDrive size={16}/></div><div className="sidebar-footer"><button onClick={() => setModal('settings')}><Settings2 size={16}/>保存・同期</button><button onClick={() => setModal('help')} aria-label="使い方"><CircleHelp size={17}/></button></div></div></aside>
    <main className="main"><header className="topbar"><div className="breadcrumb"><button className="icon-button" title="サイドバーを切り替え" aria-label="サイドバーを切り替え" aria-expanded={sidebar} onClick={() => setSidebar(!sidebar)}>{sidebar ? <PanelLeftClose size={18}/> : <PanelLeftOpen size={18}/>}</button><button className="breadcrumb-home" disabled={busy} onClick={() => run(showDashboard)}>マイシナリオ</button><span className="crumb-slash">/</span><strong>{screen === 'dashboard' ? 'ダッシュボード' : doc?.title || '読み込み中…'}</strong></div><div className="topbar-actions"><button className="appearance-button" onClick={() => setModal('appearance')}><Settings2 size={16}/>表示設定</button><span className={`save-state ${saveState}`}>{saveState === 'saving' ? <LoaderCircle size={13} className="spin"/> : saveState === 'error' ? <AlertCircle size={13}/> : <span className="status-dot"/>}{({ saved: '保存済み', saving: '保存中…', dirty: '未保存', error: '保存エラー' })[saveState]}</span>{screen !== 'dashboard' && <button className="export-button" disabled={!doc || busy} onClick={() => setModal('export')}><Download size={15}/>書き出す<ChevronDown size={13}/></button>}</div></header>
    {error && <div className="error-banner" role="alert"><AlertCircle size={17}/><span>{error}</span><button className="icon-button" aria-label="エラーを閉じる" onClick={() => setError('')}><X size={16}/></button></div>}
    {screen === 'dashboard' ? <Dashboard onDelete={id => run(() => prepareDelete(id))} documents={documents} workspace={workspace} busy={busy} onOpen={id => run(() => openDocument(id))} onCreate={() => run(() => createDocument())} onImport={() => run(importFile)} onRefresh={() => run(showDashboard)}/> : !doc ? <div className="loading"><Feather size={32}/><p>{error ? '読み込みに失敗しました。保存先やファイルを確認してください。' : '創作の準備をしています…'}</p>{error && <button onClick={() => location.reload()}>再試行</button>}</div> : <><section className="document-header"><div className="document-kicker"><span className="scenario-pill">SCENARIO</span><span>ひとつの物語、無数の選択。</span></div><input className="title-input" aria-label="シナリオタイトル" value={doc.title} placeholder="無題のシナリオ" onChange={e => updateDoc({ title: e.target.value })}/><div className="document-subline"><input aria-label="シナリオの説明" value={doc.subtitle || ''} placeholder="ジャンルや舞台を追加…" onChange={e => updateDoc({ subtitle: e.target.value })}/><span>{wordCount.toLocaleString()} 文字</span><span>·</span><span>{headings.length} 見出し</span></div></section><nav className="view-tabs" aria-label="編集モード"><button className={view === 'editor' ? 'active' : ''} onClick={() => setView('editor')}><FileText size={16}/>シナリオ編集</button><button className={view === 'flow' ? 'active' : ''} onClick={() => setView('flow')}><Network size={17}/>フローチャート<span>{doc.flow.nodes.length}</span></button><button className="notes-toggle" aria-pressed={notesOpen} onClick={() => setNotesOpen(!notesOpen)}>執筆メモ</button><div className="view-tabs-right"><span className="status-dot"/> {view === 'editor' ? 'LIVE MARKDOWN' : 'STORY FLOW'}</div></nav><div className="work-area"><div className={`editor-area ${view !== 'editor' ? 'hidden' : ''}`}><ScenarioEditor key={`${doc.id}-${loadGeneration}`} doc={doc} onChange={updateDoc} onReady={onReady}/></div>{view === 'flow' && <Flow key={doc.id} onWrite={writeScene} flow={doc.flow} headings={headings} onNavigate={navigateHeading} onChange={flow => updateDoc({ flow })}/>}{notesOpen && view === 'editor' && <aside className="writing-notes"><label htmlFor="writing-notes">執筆メモ</label><p>構想・TODOなど。書き出しには含まれません。</p><textarea id="writing-notes" aria-label="執筆メモ" value={doc.writingNotes || ''} onChange={event => updateDoc({ writingNotes: event.target.value })} placeholder="次に書きたいこと、確認したいこと…"/></aside>}</div><footer className="statusbar"><span><span className="status-dot"/> {isDesktop ? 'LOCAL' : 'PREVIEW'}</span><span>UTF-8 <span className="footer-separator">/</span> Markdown</span><span className="statusbar-right">{view === 'editor' ? 'Ctrl + S で保存' : `${doc.flow.nodes.length} シーン · ${doc.flow.edges.length} つながり`}<span className="footer-separator">|</span>TRPG Canvas</span></footer></>}
    </main>
    {modal === 'delete' && deleteTarget && <Modal title="シナリオを削除しますか？" eyebrow="DELETE SCENARIO" onClose={() => !busy && setModal(null)}><p className="delete-title">「{deleteTarget.title}」</p><p className="modal-description">{isDesktop ? '本文・フローチャートを含むシナリオファイルをWindowsのゴミ箱へ移します。' : '本文・フローチャートをこのブラウザから削除します。この操作は元に戻せません。'}</p>{isDesktop && <p className="hint-box">同期フォルダを利用している場合、削除も他の端末に同期されます。</p>}{deleteError && <p className="delete-error" role="alert">{deleteError}</p>}<div className="delete-actions"><button className="secondary-button" disabled={busy} onClick={() => setModal(null)}>キャンセル</button><button className="delete-confirm" disabled={busy} onClick={() => run(async () => { try { await deleteScenario(); } catch (error) { setDeleteError(error.message); } })}>{busy ? '削除中…' : isDesktop ? 'ゴミ箱へ移す' : '削除する'}</button></div></Modal>}
    {modal === 'appearance' && <Modal title="書きやすい見た目に" eyebrow="APPEARANCE" onClose={() => setModal(null)}><Appearance value={appearance} onChange={setAppearance}/></Modal>}
    {modal === 'export' && <Modal className="export-modal" title="物語を、持ち出そう。" eyebrow="EXPORT SCENARIO" onClose={() => !busy && setModal(null)}><ExportDialog doc={doc} appearance={appearance} design={exportDesign || appearance} onDesign={setExportDesign} busy={busy} onExport={(format, options) => run(() => exportFile(format, options))}/></Modal>}
    {modal === 'settings' && <Modal title="あなたの物語の保存先" eyebrow="WORKSPACE & SYNC" onClose={() => !busy && setModal(null)}><div className="folder-card"><FolderOpen size={25}/><div><strong>現在の保存先</strong><p>{workspace}</p></div></div><p className="modal-description">Google DriveやDropboxの同期フォルダを選ぶと、サービス側のデスクトップアプリを通じて複数端末にデータを同期できます。</p><div className="sync-steps"><div><span>1</span>各端末でDrive／Dropboxの同期を設定</div><div><span>2</span>同じ共有フォルダを、このアプリの保存先に指定</div><div><span>3</span>同期完了後、ライブラリの再読込ボタンで反映</div></div><div className="hint-box">同じシナリオの同時編集は避けてください。保存時に外部の変更を検知すると競合コピーを作成します。クラウド側で生成される競合ファイルは別途確認が必要です。</div><p className="muted small">空のフォルダを選んだ場合は、現在のシナリオをコピーします。元のフォルダのファイルはそのまま残ります。</p><button className="primary-button full-width" disabled={busy || !isDesktop} onClick={() => run(chooseFolder)}><FolderOpen size={17}/>保存先フォルダを選ぶ</button>{!isDesktop && <p className="muted small">フォルダ保存・同期はデスクトップ版で利用できます。</p>}</Modal>}
    {modal === 'help' && <Modal title="書くことに、集中しよう。" eyebrow="QUICK GUIDE" onClose={() => setModal(null)}><p className="modal-description">Markdown記法が、入力したその場で整います。見出し・引用・リストは記号のあとにスペースを入力してください。</p><div className="shortcut-list">{[['#! + Space', '章（中央揃え・最上位）'], ['# + Space', 'H1見出し'], ['## + Space', 'H2見出し'], ['Ctrl + U', '下線'], ['Ctrl + F / H', '本文の検索と置換'], ['### + Space', '小見出し'], ['> + Space', '共有情報・読み上げ文'], ['- + Space', '箇条書き'], ['**テキスト**', '太字'], ['!!! + Space', 'GMメモを開始（付箋ボタンでも可）'], ['Ctrl + Enter', 'GMメモの外へ移動'], ['Ctrl + Z', '元に戻す'], ['Ctrl + S', 'すぐに保存']].map(([key, value]) => <div key={key}><code>{key}</code><span>{value}</span></div>)}</div><p className="hint-box">目次の矢印は、小見出しと本文もまとめて移動します。フローの鉛筆ボタンで「対応する目次」を選ぶと、シーンのクリックで本文へ移動できます。まずフローでシーンやグループを作り、「本文を書く」で見出しと執筆欄を作成できます。所属グループはシーンの鉛筆ボタンから変更できます。既存の本文から作る場合は「既存の本文から」を開いてください。シーン下側の点から、次のシーン上側の点へドラッグして接続できます。</p></Modal>}
    <input type="file" accept=".md,.markdown,.txt" ref={fileInput} className="hidden" onChange={e => { const file = e.target.files[0]; if (file) run(async () => createDocument(file.name.replace(/\.[^.]+$/, ''), await file.text())); e.target.value = ''; }}/>
    {toast && <div className="toast" role="status"><Check size={17}/>{toast}</div>}
  </div>;
}
