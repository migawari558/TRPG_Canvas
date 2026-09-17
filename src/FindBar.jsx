import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { searchKey, setSearch, showSearchMatch, replaceMatches } from './SearchReplace.js';

export default function FindBar({ editor, onClose, request }) {
  const [query, setQuery] = useState(''), [replacement, setReplacement] = useState(''), [caseSensitive, setCaseSensitive] = useState(false);
  const [search, setState] = useState(searchKey.getState(editor.state)), [notice, setNotice] = useState('');
  const input = useRef();
  useEffect(() => { input.current?.focus(); input.current?.select(); }, [request]);
  useEffect(() => {
    const update = () => setState(searchKey.getState(editor.state)); editor.on('transaction', update);
    return () => { editor.off('transaction', update); if (!editor.isDestroyed) setSearch(editor, { query: '' }); };
  }, [editor]);
  function change(nextQuery, sensitive = caseSensitive) {
    setQuery(nextQuery); setCaseSensitive(sensitive); setNotice('');
    setSearch(editor, { query: nextQuery, caseSensitive: sensitive, active: 0 }); showSearchMatch(editor);
  }
  function move(direction) {
    const current = searchKey.getState(editor.state);
    if (!current.matches.length) return;
    setSearch(editor, { active: (current.active + direction + current.matches.length) % current.matches.length }); showSearchMatch(editor);
  }
  function replace(all) {
    const count = replaceMatches(editor, replacement, all); setNotice(`${count}件置換しました`); showSearchMatch(editor);
  }
  return <section className="find-bar" aria-label="本文の検索と置換" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); editor.commands.focus(); }
  }}><div className="find-row"><input ref={input} aria-label="検索する文字" placeholder="本文を検索" value={query} onChange={event => change(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); move(event.shiftKey ? -1 : 1); } }}/><span className="find-count" role="status">{search.matches.length ? `${search.active + 1} / ${search.matches.length} 件` : query ? '見つかりません' : '本文・見出しを検索'}</span><button aria-label="前の検索結果" disabled={!search.matches.length} onClick={() => move(-1)}><ChevronUp size={17}/></button><button aria-label="次の検索結果" disabled={!search.matches.length} onClick={() => move(1)}><ChevronDown size={17}/></button><button aria-label="検索を閉じる" onClick={() => { onClose(); editor.commands.focus(); }}><X size={17}/></button></div><div className="find-row"><input aria-label="置換後の文字" placeholder="置換後の文字（空欄で削除）" value={replacement} onChange={event => setReplacement(event.target.value)}/><button disabled={!search.matches.length || !editor.isEditable} onClick={() => replace(false)}>1件置換</button><button disabled={!search.matches.length || !editor.isEditable} onClick={() => replace(true)}>すべて置換</button><label><input type="checkbox" checked={caseSensitive} onChange={event => change(query, event.target.checked)}/>大文字・小文字を区別</label></div>{notice && <p role="status">{notice} · Ctrl＋Zで元に戻せます</p>}</section>;
}
