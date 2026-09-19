import React, { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { themes, getThemes, getTheme, getCustomTheme, previewCustomTheme, saveCustomTheme, removeCustomTheme, themeVariables, defaultAppearance } from './themes.mjs';

export function ThemePicker({ value, onChange, label = 'テーマ' }) {
  const [draft, setDraft] = useState(null), [error, setError] = useState('');
  const selectedCustom = getCustomTheme(value);
  const preview = draft ? previewCustomTheme({ ...draft, name: draft.name || 'プレビュー' }) : null;
  function startEditing() {
    const selected = getTheme(value), base = selectedCustom ? getTheme(selectedCustom.baseId) : selected;
    setDraft({ id: selectedCustom?.id, name: selectedCustom?.name || `${base.name}カスタム`, baseId: base.id, background: selectedCustom?.background || base.colors.paper, accent: selectedCustom?.accent || base.colors.accent, heading: selectedCustom?.heading || base.colors.heading });
    setError('');
  }
  function selectBase(baseId) {
    const base = getTheme(baseId);
    setDraft(current => ({ ...current, baseId, name: current.id ? current.name : `${base.name}カスタム`, background: base.colors.paper, accent: base.colors.accent, heading: base.colors.heading }));
  }
  function save() {
    try { const theme = saveCustomTheme(draft); onChange(theme.id); setDraft(null); setError(''); }
    catch (reason) { setError(reason.message); }
  }
  function remove() {
    try { removeCustomTheme(selectedCustom.id); onChange(selectedCustom.baseId); setDraft(null); setError(''); }
    catch (reason) { setError(reason.message); }
  }
  return <fieldset className="theme-picker"><legend>{label}</legend><div className="theme-grid">{getThemes().map(theme => <button key={theme.id} type="button" className={`theme-choice ${value === theme.id ? 'chosen' : ''}`} aria-label={`${label}：${theme.name}`} aria-pressed={value === theme.id} onClick={() => onChange(theme.id)}>
    <span className="theme-swatch" style={themeVariables(theme.id)}><span>Aa</span><i/><i/>{value === theme.id && <Check size={15}/>}</span><strong>{theme.name}</strong><small>{theme.description}</small>
  </button>)}</div><button type="button" className="secondary-button theme-create" onClick={startEditing}>{selectedCustom ? 'このテーマを編集' : 'このテーマをもとに作る'}</button>
    {draft && <div className="theme-studio"><label>テーマ名<input aria-label="自作テーマ名" type="text" maxLength="30" value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
      <label>土台のテーマ<select aria-label="土台のテーマ" value={draft.baseId} onChange={event => selectBase(event.target.value)}>{themes.map(theme => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select></label>
      <div className="theme-color-controls">{[['background', '背景（本文）'], ['accent', 'アクセント'], ['heading', '見出し文字']].map(([key, name]) => <label key={key}>{name}<input type="color" aria-label={name} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}/></label>)}</div>
      <div className="theme-live-preview" style={{ background: preview.colors.paper, color: preview.colors.text, borderColor: preview.colors.border }}><strong style={{ color: preview.colors.heading }}>見出しのサンプル</strong><p>物語の本文をここで確認できます。</p><span style={{ background: preview.colors.soft, color: preview.colors.accent }}>アクセントとメモ枠</span></div>
      <p>本文色と補助色は自動で決まります。見出しとアクセントは読みやすい明暗に調整します。</p>
      {error && <p role="alert" className="theme-studio-error">{error}</p>}
      <div className="theme-studio-actions"><button type="button" onClick={save}>テーマを保存</button><button type="button" onClick={() => setDraft(null)}>キャンセル</button>{selectedCustom && <button type="button" onClick={remove}>このテーマを削除</button>}</div>
    </div>}
  </fieldset>;
}
export function FontSizeControl({ value, onChange, label = '本文の文字サイズ', min = 12, max = 28, unit = 'px' }) {
  return <label className="size-control"><span>{label}<output>{value}{unit}</output></span><input type="range" min={min} max={max} step="1" value={value} aria-label={label} onChange={event => onChange(Number(event.target.value))}/><span className="range-labels"><small>{min}{unit}</small><small>{max}{unit}</small></span></label>;
}
export default function Appearance({ value, onChange }) {
  return <div className="appearance-settings"><p className="modal-description">変更はすぐに画面へ反映し、この端末に保存します。</p>
    <ThemePicker value={value.theme} onChange={theme => onChange({ ...value, theme })}/>
    <FontSizeControl value={value.fontSize} onChange={fontSize => onChange({ ...value, fontSize })}/>
    <FontSizeControl label="メニュー・目次の文字サイズ" value={value.uiScale} min={90} max={125} unit="%" onChange={uiScale => onChange({ ...value, uiScale })}/>
    <div className="appearance-sample" style={{ fontSize: `${value.fontSize}px` }}><strong>霧の向こうに、物語がある。</strong><p>探索者たちは、一通の手紙を手がかりに灯台へ向かう。</p><aside>GM MEMO<br/>ここに、進行のためのメモを。</aside></div>
    <button className="reset-appearance" onClick={() => onChange(defaultAppearance)}><RotateCcw size={15}/>標準設定に戻す</button>
  </div>;
}
