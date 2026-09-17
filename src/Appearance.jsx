import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { themes, themeVariables, defaultAppearance } from './themes.mjs';

export function ThemePicker({ value, onChange, label = 'テーマ' }) {
  return <fieldset className="theme-picker"><legend>{label}</legend><div className="theme-grid">{themes.map(theme => <button key={theme.id} type="button" className={`theme-choice ${value === theme.id ? 'chosen' : ''}`} aria-label={`${label}：${theme.name}`} aria-pressed={value === theme.id} onClick={() => onChange(theme.id)}>
    <span className="theme-swatch" style={themeVariables(theme.id)}><span>Aa</span><i/><i/>{value === theme.id && <Check size={15}/>}</span><strong>{theme.name}</strong><small>{theme.description}</small>
  </button>)}</div></fieldset>;
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
