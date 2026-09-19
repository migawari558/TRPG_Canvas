export const themes = [
  { id: 'forest', name: 'フォレスト', description: '森の緑、藍の見出し、琥珀のアクセント', colors: { bg: '#f3f5ed', paper: '#fffef9', panel: '#eef2e7', text: '#303c39', muted: '#63736a', heading: '#334d72', subheading: '#78602f', chapter: '#614c70', accent: '#4d713e', onAccent: '#ffffff', soft: '#e6eedc', border: '#ccd9c1', quote: '#edf3e5', note: '#e9eee0', branch: '#f6ead2', ending: '#ebe5f1' }, serif: true },
  { id: 'parchment', name: '羊皮紙', description: '古い手記のような温かさ', colors: { bg: '#ede3d2', paper: '#fff6e5', panel: '#f0e5d2', text: '#4b392b', muted: '#8a735d', heading: '#365c68', subheading: '#805044', chapter: '#644b71', accent: '#946039', onAccent: '#ffffff', soft: '#eaddc6', border: '#d6c2a5', quote: '#f2e7d2', note: '#eee0c6', branch: '#f0dcb5', ending: '#e8dce2' }, serif: true },
  { id: 'midnight', name: 'ミッドナイト', description: '夜のセッションに、静かな紺', colors: { bg: '#121b25', paper: '#1c2936', panel: '#192431', text: '#e0e9ef', muted: '#a5b6c7', heading: '#dcc4ed', subheading: '#edca90', chapter: '#96d6dd', accent: '#a4cfae', onAccent: '#14251c', soft: '#2d4050', border: '#43586b', quote: '#253949', note: '#2b3d4b', branch: '#514632', ending: '#40394f' }, serif: true },
  { id: 'mono', name: 'モノクロ', description: '文字を引き立てる、白と墨', colors: { bg: '#ededed', paper: '#ffffff', panel: '#f5f5f5', text: '#242424', muted: '#686868', heading: '#34455a', subheading: '#65545d', chapter: '#303d4b', accent: '#303030', onAccent: '#ffffff', soft: '#e5e5e5', border: '#cccccc', quote: '#f1f1f1', note: '#eaeaea', branch: '#e4e4e4', ending: '#e0e0e0' }, serif: false }
];
export const getTheme = id => themes.find(theme => theme.id === id) || themes[0];
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
