import { getTheme, themeVariables } from './themes.mjs';

// Paper and navigation have separate roles: the manuscript stays readable,
// while the shell carries each theme's identity.
const palettes = {
  forest: {
    bg: '#e6ebe6', paper: '#fcfdfb', panel: '#f0f4ef', text: '#243c33',
    muted: '#526b5d', border: '#cbd7cd', soft: '#dae8dc',
    accent: '#2d664e', onAccent: '#ffffff', heading: '#28543f',
    subheading: '#3d6050', chapter: '#28543f', quote: '#eaf1e9', note: '#f1efdf'
  },
  'tahoe-light': {
    bg: '#e6ecf2', paper: '#ffffff', panel: '#f0f4f8', text: '#263a50',
    muted: '#566b80', border: '#cbd7e2', soft: '#dce8f4',
    accent: '#315e8f', onAccent: '#ffffff', heading: '#2c517c',
    subheading: '#4b6380', chapter: '#2c517c', quote: '#edf3f9', note: '#eef1e9'
  },
  'tahoe-dark': {
    bg: '#131d2a', paper: '#1d2b3b', panel: '#172536', text: '#e5ecf4',
    muted: '#a4b7cc', border: '#354b62', soft: '#2e4460',
    accent: '#9ac4f5', onAccent: '#102b47', heading: '#bbd5f4',
    subheading: '#b1c7df', chapter: '#bbd5f4', quote: '#26394e', note: '#343b3c'
  },
  parchment: {
    bg: '#e8e0d3', paper: '#fbf8f0', panel: '#f1eadf', text: '#493b31',
    muted: '#705946', border: '#d8cbb8', soft: '#eaddc7',
    accent: '#805433', onAccent: '#ffffff', heading: '#744c30',
    subheading: '#6b5843', chapter: '#744c30', quote: '#f1eada', note: '#f0e5cb'
  },
  midnight: {
    bg: '#211e29', paper: '#2c2835', panel: '#26222f', text: '#ece6ef',
    muted: '#c1b1c8', border: '#51455c', soft: '#44364f',
    accent: '#d4b5d6', onAccent: '#302038', heading: '#dfc5df',
    subheading: '#cfbed4', chapter: '#dfc5df', quote: '#382e43', note: '#403735'
  },
  mono: {
    bg: '#e8e9e9', paper: '#ffffff', panel: '#f2f3f3', text: '#292c2d',
    muted: '#606667', border: '#d0d4d4', soft: '#e0e4e4',
    accent: '#303738', onAccent: '#ffffff', heading: '#292e2f',
    subheading: '#4d5556', chapter: '#292e2f', quote: '#f0f2f2', note: '#ecefee'
  }
};

const chrome = {
  forest: { rail: '#244b3c', onRail: '#f2f8f2', railMuted: '#b8cdbb', railActive: '#3c6651' },
  'tahoe-light': { rail: '#294762', onRail: '#f1f7ff', railMuted: '#bed0e1', railActive: '#426583' },
  'tahoe-dark': { rail: '#101a28', onRail: '#e5f0ff', railMuted: '#a4b9d1', railActive: '#2a4360' },
  parchment: { rail: '#624a36', onRail: '#fff7ea', railMuted: '#e0cbb3', railActive: '#826248' },
  midnight: { rail: '#1b1523', onRail: '#f3e7f6', railMuted: '#c6afcf', railActive: '#4b3656' },
  mono: { rail: '#303738', onRail: '#ffffff', railMuted: '#c1caca', railActive: '#505d5e' }
};

export function documentTheme(id) {
  const theme = getTheme(id);
  return { ...theme, colors: { ...theme.colors, ...palettes[theme.id] } };
}

export function desktopThemeVariables(id, settings) {
  const palette = documentTheme(id).colors;
  const navigation = chrome[id] || { rail: palette.panel, onRail: palette.text, railMuted: palette.muted, railActive: palette.soft };
  return {
    ...themeVariables(id, settings),
    ...Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--theme-${key}`, value])),
    ...Object.fromEntries(Object.entries(navigation).map(([key, value]) => [`--theme-${key}`, value]))
  };
}
