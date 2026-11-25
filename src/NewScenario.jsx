import React, { useState } from 'react';

export default function NewScenario({ busy, onCreate, onCancel }) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState({ title: '', systemName: '', subtitle: '' });
  const fields = [
    ['title', 'タイトル', 'シナリオのタイトル', 200],
    ['systemName', 'システム名（任意）', '使用するTRPGシステム', 80],
    ['subtitle', '説明・舞台（任意）', '例：現代日本 / 海辺の町 / 2〜4人', 200]
  ];
  return <form className="new-scenario-form" onSubmit={async event => { event.preventDefault(); if (busy || !info.title.trim()) return; setError(''); try { await onCreate({ ...info, title: info.title.trim() }); } catch (error) { setError(`作成できませんでした：${error.message}`); } }}>
    <p className="modal-description">本文とフローチャートが空のシナリオを作成します。シナリオ情報はあとから変更できます。</p>
    {fields.map(([key, label, placeholder, maxLength]) => <label key={key}>{label}<input data-initial-focus={key === 'title' ? '' : undefined} aria-label={`新規シナリオの${key === 'title' ? 'タイトル' : key === 'systemName' ? 'システム名' : '説明'}`} required={key === 'title'} maxLength={maxLength} disabled={busy} value={info[key]} placeholder={placeholder} onChange={event => setInfo({ ...info, [key]: event.target.value })} onKeyDown={event => { if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault(); }}/></label>)}
    {error && <p className="delete-error" role="alert">{error}</p>}
    <div className="delete-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onCancel}>キャンセル</button><button type="submit" className="primary-button" disabled={busy || !info.title.trim()}>{busy ? '作成中…' : '作成する'}</button></div>
  </form>;
}
