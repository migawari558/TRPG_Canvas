export const themes = [
  { id: 'forest', name: 'フォレスト', description: '森の緑、藍の見出し、琥珀のアクセント', colors: { bg: '#f3f5ed', paper: '#fffef9', panel: '#eef2e7', text: '#303c39', muted: '#63736a', heading: '#334d72', subheading: '#78602f', chapter: '#614c70', accent: '#4d713e', onAccent: '#ffffff', soft: '#e6eedc', border: '#ccd9c1', quote: '#edf3e5', note: '#e9eee0', branch: '#f6ead2', ending: '#ebe5f1' }, serif: true },
  { id: 'parchment', name: '羊皮紙', description: '古い手記のような温かさ', colors: { bg: '#ede3d2', paper: '#fff6e5', panel: '#f0e5d2', text: '#4b392b', muted: '#8a735d', heading: '#365c68', subheading: '#805044', chapter: '#644b71', accent: '#946039', onAccent: '#ffffff', soft: '#eaddc6', border: '#d6c2a5', quote: '#f2e7d2', note: '#eee0c6', branch: '#f0dcb5', ending: '#e8dce2' }, serif: true },
  { id: 'midnight', name: 'ミッドナイト', description: '夜のセッションに、静かな紺', colors: { bg: '#121b25', paper: '#1c2936', panel: '#192431', text: '#e0e9ef', muted: '#a5b6c7', heading: '#dcc4ed', subheading: '#edca90', chapter: '#96d6dd', accent: '#a4cfae', onAccent: '#14251c', soft: '#2d4050', border: '#43586b', quote: '#253949', note: '#2b3d4b', branch: '#514632', ending: '#40394f' }, serif: true },
  { id: 'mono', name: 'モノクロ', description: '文字を引き立てる、白と墨', colors: { bg: '#ededed', paper: '#ffffff', panel: '#f5f5f5', text: '#242424', muted: '#686868', heading: '#34455a', subheading: '#65545d', chapter: '#303d4b', accent: '#303030', onAccent: '#ffffff', soft: '#e5e5e5', border: '#cccccc', quote: '#f1f1f1', note: '#eaeaea', branch: '#e4e4e4', ending: '#e0e0e0' }, serif: false }
];
const customThemeKey = 'trpg-custom-themes-v1';
const validColor = /^#[\da-f]{6}$/i;
let customThemes = [];
const rgb = color => [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
const hex = values => `#${values.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, weight) => hex(rgb(a).map((value, index) => value * (1 - weight) + rgb(b)[index] * weight));
const luminance = color => rgb(color).map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => { const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (light + .05) / (dark + .05); };
function readable(color, background, minimum) {
  if (contrast(color, background) >= minimum) return color;
  const target = contrast('#ffffff', background) > contrast('#000000', background) ? '#ffffff' : '#000000';
  let low = 0, high = 1;
  for (let i = 0; i < 12; i++) {
    const middle = (low + high) / 2;
    if (contrast(mix(color, target, middle), background) >= minimum) high = middle;
    else low = middle;
  }
  return mix(color, target, high);
}
function normalizeCustomRecord(input) {
  if (!input || !themes.some(theme => theme.id === input.baseId) || !['background', 'accent', 'heading'].every(key => validColor.test(input[key]))) throw new Error('テーマの色または土台が不正です');
  const name = String(input.name || '').trim().slice(0, 30);
  if (!name) throw new Error('テーマ名を入力してください');
  return { id: input.id, name, baseId: input.baseId, background: input.background.toLowerCase(), accent: input.accent.toLowerCase(), heading: input.heading.toLowerCase() };
}
export function previewCustomTheme(input) {
  const record = normalizeCustomRecord(input);
  const base = themes.find(theme => theme.id === record.baseId), paper = record.background;
  const dark = luminance(paper) < .22;
  const accent = readable(record.accent, paper, 4.5), heading = readable(record.heading, paper, 4.5);
  const text = readable(base.colors.text, paper, 7);
  const colors = {
    bg: mix(paper, base.colors.bg, .2), paper,
    panel: mix(paper, base.colors.panel, .24), text,
    muted: readable(mix(text, paper, .42), paper, 4.5),
    heading,
    subheading: readable(mix(base.colors.subheading, heading, .55), paper, 4.5),
    chapter: readable(mix(base.colors.chapter, accent, .4), paper, 4.5),
    accent, onAccent: contrast('#ffffff', accent) > contrast('#000000', accent) ? '#ffffff' : '#000000',
    soft: mix(paper, accent, dark ? .2 : .12),
    border: mix(paper, text, dark ? .3 : .2),
    quote: mix(paper, base.colors.quote, .25),
    note: mix(paper, base.colors.note, .32),
    branch: mix(paper, base.colors.branch, .28),
    ending: mix(paper, base.colors.ending, .28)
  };
  return { ...record, description: `${base.name}をもとに作成`, colors, serif: base.serif, dark, custom: true };
}
export const getThemes = () => [...themes, ...customThemes];
export const getCustomTheme = id => customThemes.find(theme => theme.id === id);
export const getTheme = id => getThemes().find(theme => theme.id === id) || themes[0];
export const isDarkTheme = id => luminance(getTheme(id).colors.paper) < .22;
export function loadCustomThemes(storage = globalThis.localStorage) {
  let records = [];
  try { records = JSON.parse(storage?.getItem(customThemeKey) || '[]'); } catch {}
  const ids = new Set();
  customThemes = (Array.isArray(records) ? records : []).slice(0, 20).flatMap(record => {
    try {
      if (!/^custom-[\da-f-]{36}$/i.test(record.id) || ids.has(record.id)) return [];
      const theme = previewCustomTheme(record); ids.add(theme.id); return [theme];
    } catch { return []; }
  });
  return getThemes();
}
function persistCustomThemes(storage) {
  if (storage) storage.setItem(customThemeKey, JSON.stringify(customThemes.map(({ id, name, baseId, background, accent, heading }) => ({ id, name, baseId, background, accent, heading }))));
}
export function saveCustomTheme(input, storage = globalThis.localStorage) {
  const existing = getCustomTheme(input.id);
  if (!existing && customThemes.length >= 20) throw new Error('自作テーマは20個まで保存できます');
  const theme = previewCustomTheme({ ...input, id: existing?.id || `custom-${globalThis.crypto.randomUUID()}` });
  const next = existing ? customThemes.map(item => item.id === existing.id ? theme : item) : [...customThemes, theme];
  const previous = customThemes; customThemes = next;
  try { persistCustomThemes(storage); } catch { customThemes = previous; throw new Error('自作テーマを保存できませんでした'); }
  globalThis.window?.dispatchEvent(new Event('trpg-custom-themes-change'));
  return theme;
}
export function removeCustomTheme(id, storage = globalThis.localStorage) {
  const removed = getCustomTheme(id);
  const previous = customThemes;
  customThemes = customThemes.filter(theme => theme.id !== id);
  try { persistCustomThemes(storage); } catch { customThemes = previous; throw new Error('自作テーマを削除できませんでした'); }
  globalThis.window?.dispatchEvent(new CustomEvent('trpg-custom-themes-change', { detail: { removedId: id, baseId: removed?.baseId || 'forest' } }));
}
loadCustomThemes();
export const defaultAppearance = { theme: 'forest', fontSize: 17, uiScale: 100 };
export function normalizeDesign(value = {}) {
  return { theme: getTheme(value?.theme).id, fontSize: Math.max(7, Math.min(28, Math.round(Number(value?.fontSize) || 17))) };
}
export function normalizeAppearance(value = {}) {
  const design = normalizeDesign(value);
  return { ...design, fontSize: Math.max(12, design.fontSize), uiScale: Math.max(90, Math.min(125, Math.round(Number(value?.uiScale) || 100))) };
}
export function themeVariables(id) {
  const theme = getTheme(id);
  return { ...Object.fromEntries(Object.entries(theme.colors).map(([key, value]) => [`--theme-${key}`, value])), '--heading-font': theme.serif ? "'Yu Mincho','YuMincho',serif" : "'Yu Gothic UI','Meiryo',sans-serif" };
}
export function readPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
