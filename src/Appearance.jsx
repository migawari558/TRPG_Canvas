import React, { useEffect, useState } from 'react';
import { Check, RefreshCw, RotateCcw } from 'lucide-react';
import { themes, getThemes, getTheme, getCustomTheme, normalizeFontFamily, previewCustomTheme, saveCustomTheme, removeCustomTheme, themeVariables, defaultAppearance } from './themes.mjs';

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
let fontCache = null, fontRequest = null;
async function localFonts(refresh = false) {
  if (fontCache && !refresh) return fontCache;
  if (fontRequest && !refresh) return fontRequest;
  fontRequest = (async () => {
    if (typeof globalThis.queryLocalFonts !== 'function') throw new Error('unsupported');
    const entries = await globalThis.queryLocalFonts();
    return [...new Set(entries.map(font => String(font.family || '').trim()).filter(font => font && normalizeFontFamily(font) === font))].sort((a, b) => a.localeCompare(b, 'ja'));
  })();
  try { fontCache = await fontRequest; return fontCache; } finally { fontRequest = null; }
}
export function FontFamilyControl({ value = 'system', onChange, label = '本文と見出しのフォント', bodyOption = false, compact = false }) {
  const [fonts, setFonts] = useState([]), [state, setState] = useState('loading');
  async function load(refresh = false) {
    setState('loading');
    try {
      const families = await localFonts(refresh);
      setFonts(families); setState(families.length ? 'ready' : 'empty');
    } catch { setFonts([]); setState('unavailable'); }
  }
  useEffect(() => { load(); }, []);
  const options = value !== 'system' && value !== 'body' && !fonts.includes(value) ? [value, ...fonts] : fonts;
  return <div className={`font-family-control ${compact ? 'compact' : ''}`}><label>{label}<select aria-label={label} value={value} onChange={event => onChange(event.target.value)}>{bodyOption && <option value="body">本文と同じ</option>}<option value="system">テーマ標準</option>{options.map(font => <option key={font} value={font}>{font}</option>)}</select></label>{!compact && <div><small>{state === 'loading' ? 'インストール済みフォントを確認中…' : state === 'ready' ? `${fonts.length}種類のフォントを利用できます` : 'フォント一覧を取得できません。テーマ標準を利用できます。'}</small><button type="button" className="icon-button" title="フォント一覧を再読み込み" aria-label="フォント一覧を再読み込み" onClick={() => load(true)}><RefreshCw size={14}/></button></div>}</div>;
}
export function TypographyControls({ value, onChange, label = '本文と見出しのフォント' }) {
  return <div className="typography-controls"><FontFamilyControl value={value.fontFamily} onChange={fontFamily => onChange({ ...value, fontFamily })} label={label}/><label className="font-details-toggle"><span><strong>要素ごとに設定</strong><small>見出し・章・セリフの話者名を個別に選びます</small></span><input type="checkbox" role="switch" aria-label="フォントの詳細設定" checked={value.fontAdvanced === true} onChange={event => onChange({ ...value, fontAdvanced: event.target.checked })}/></label>{value.fontAdvanced && <div className="font-details"><FontFamilyControl compact bodyOption label="見出し（H1〜H6）" value={value.headingFontFamily} onChange={headingFontFamily => onChange({ ...value, headingFontFamily })}/><FontFamilyControl compact bodyOption label="章" value={value.chapterFontFamily} onChange={chapterFontFamily => onChange({ ...value, chapterFontFamily })}/><FontFamilyControl compact bodyOption label="セリフの話者名" value={value.dialogueFontFamily} onChange={dialogueFontFamily => onChange({ ...value, dialogueFontFamily })}/></div>}</div>;
}
export default function Appearance({ value, onChange }) {
  return <div className="appearance-settings"><p className="modal-description">変更はすぐに画面へ反映し、この端末に保存します。</p>
    <ThemePicker value={value.theme} onChange={theme => onChange({ ...value, theme })}/>
    <TypographyControls value={value} onChange={onChange}/>
    <FontSizeControl value={value.fontSize} onChange={fontSize => onChange({ ...value, fontSize })}/>
    <FontSizeControl label="メニュー・目次の文字サイズ" value={value.uiScale} min={70} max={125} unit="%" onChange={uiScale => onChange({ ...value, uiScale })}/>
    <div className="appearance-sample" style={{ fontSize: `${value.fontSize}px` }}><strong className="sample-heading">霧の向こうに、物語がある。</strong><span className="sample-chapter">第一章　灯台へ</span><p>探索者たちは、一通の手紙を手がかりに灯台へ向かう。</p><div className="sample-dialogue"><b>コレット</b><span>ダーリン、こちらの方々を見て。</span></div><aside>GM MEMO<br/>ここに、進行のためのメモを。</aside></div>
    <button className="reset-appearance" onClick={() => onChange(defaultAppearance)}><RotateCcw size={15}/>標準設定に戻す</button>
  </div>;
}
