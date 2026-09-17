import React, { useState } from 'react';
import { Search, Plus, Upload, FileText, Network, ArrowUpRight, RefreshCw, Feather, FolderOpen, Trash2 } from 'lucide-react';

export default function Dashboard({ documents, workspace, busy, onOpen, onCreate, onImport, onRefresh, onDelete }) {
  const [query, setQuery] = useState(''), [sort, setSort] = useState('updated');
  const filtered = documents.filter(doc => `${doc.title} ${doc.subtitle || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'ja') : (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  const totalCharacters = documents.reduce((total, doc) => total + (doc.characterCount || 0), 0);
  return <section className="dashboard" aria-label="シナリオダッシュボード">
    <div className="dashboard-heading"><div><div className="eyebrow">YOUR STORY LIBRARY</div><h1>物語のつづきは、ここから。</h1><p>書きかけの冒険も、完成した一冊も。</p></div><Feather className="dashboard-feather" size={52}/></div>
    <div className="dashboard-summary"><span><strong>{documents.length}</strong> シナリオ</span><span><strong>{totalCharacters.toLocaleString()}</strong> 文字の物語</span><div className="dashboard-actions"><button disabled={busy} onClick={onImport}><Upload size={16}/>読み込む</button><button className="primary-button" disabled={busy} onClick={onCreate}><Plus size={17}/>新しいシナリオ</button></div></div>
    <div className="dashboard-tools"><div className="search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="タイトル・説明で検索" aria-label="ダッシュボードのシナリオ検索"/></div><select aria-label="一覧の並び順" value={sort} onChange={event => setSort(event.target.value)}><option value="updated">更新が新しい順</option><option value="title">タイトル順</option></select><button className="icon-button" aria-label="ダッシュボードの一覧を更新" title="保存先から一覧を再取得" disabled={busy} onClick={onRefresh}><RefreshCw size={18}/></button></div>
    <div className="scenario-grid">{filtered.map(doc => <div className="scenario-card-wrap" key={doc.id}><button className="scenario-card" disabled={busy} onClick={() => onOpen(doc.id)}>
      <div className="card-top"><span><FileText size={19}/> SCENARIO</span><ArrowUpRight size={18}/></div><h2>{doc.title || '無題のシナリオ'}</h2><p>{doc.subtitle || 'まだ説明がありません'}</p><div className="card-stats"><span>{(doc.characterCount || 0).toLocaleString()} 文字</span><span><Network size={14}/>{doc.sceneCount || 0} シーン</span></div><div className="card-date">{doc.updatedAt ? new Date(doc.updatedAt).toLocaleString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '日時不明'} 更新</div>
    </button><button className="scenario-delete icon-button" aria-label={`${doc.title}を削除`} title="シナリオを削除" disabled={busy} onClick={() => onDelete(doc.id)}><Trash2 size={17}/></button></div>)}</div>
    {!filtered.length && <div className="dashboard-empty"><FileText size={32}/><h2>{query ? '一致するシナリオがありません' : '最初の物語をつくりましょう'}</h2><p>{query ? '検索する言葉を変えてみてください。' : '新規作成、またはMarkdownの読み込みから始められます。'}</p></div>}
    <div className="dashboard-folder"><FolderOpen size={16}/><span>{workspace}</span></div>
  </section>;
}
