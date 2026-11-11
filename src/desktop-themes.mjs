import { getTheme, themeVariables } from './themes.mjs';

// Desktop surfaces stay quiet so the manuscript carries the theme's character.
const palettes = {
  forest: {
    bg: '#eceee9', paper: '#fcfcf8', panel: '#f3f4ef', text: '#29332e',
    muted: '#68736b', border: '#d6dcd3', soft: '#e5ebe2',
    accent: '#3d6550', onAccent: '#ffffff', heading: '#315b46',
    subheading: '#455b4b', chapter: '#315b46', quote: '#eef2e9', note: '#f1eee2'
  },
  'tahoe-light': {
    bg: '#eceef0', paper: '#ffffff', panel: '#f4f5f6', text: '#29313a',
    muted: '#66717c', border: '#d7dde2', soft: '#e7edf4',
    accent: '#315f91', onAccent: '#ffffff', heading: '#315f91',
    subheading: '#465b71', chapter: '#315f91', quote: '#edf1f5', note: '#f0f2ef'
  },
  'tahoe-dark': {
    bg: '#171b20', paper: '#20252b', panel: '#1c2026', text: '#e5e9ee',
    muted: '#a0aab6', border: '#353c46', soft: '#2c3540',
    accent: '#9abfe5', onAccent: '#16232e', heading: '#adc7e2',
    subheading: '#bbc7d4', chapter: '#adc7e2', quote: '#293039', note: '#30312d'
  },
  parchment: {
    bg: '#eae7e0', paper: '#fbf8f0', panel: '#f2efe8', text: '#38332c',
    muted: '#746b5e', border: '#ddd6c8', soft: '#eee7dc',
    accent: '#835536', onAccent: '#ffffff', heading: '#765035',
    subheading: '#6d5b48', chapter: '#765035', quote: '#f1ede2', note: '#f1e9d6'
  },
  midnight: {
    bg: '#171b1e', paper: '#23282b', panel: '#1d2225', text: '#e5e8e4',
    muted: '#a4ada8', border: '#3b4441', soft: '#303c36',
    accent: '#b3c9b8', onAccent: '#1c2c22', heading: '#b3c9b8',
    subheading: '#c0c9c1', chapter: '#c9d4cb', quote: '#2b3530', note: '#34362e'
  },
  mono: {
    bg: '#ebebea', paper: '#ffffff', panel: '#f4f4f3', text: '#292929',
    muted: '#6b6b68', border: '#d9d9d6', soft: '#e9e9e6',
    accent: '#353733', onAccent: '#ffffff', heading: '#343631',
    subheading: '#4d5048', chapter: '#343631', quote: '#f2f2ef', note: '#eeeee8'
  }
};

export function documentTheme(id) {
  const theme = getTheme(id);
  return { ...theme, colors: { ...theme.colors, ...palettes[theme.id] } };
}

export function desktopThemeVariables(id, settings) {
  const palette = documentTheme(id).colors;
  return {
    ...themeVariables(id, settings),
    ...Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--theme-${key}`, value]))
  };
}
