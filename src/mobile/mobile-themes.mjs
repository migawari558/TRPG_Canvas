import { getTheme, themeVariables, isDarkTheme } from '../themes.mjs';

// Mobile owns its colors so desktop work can ship independently.
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


export function mobileTheme(id) {
  const theme = getTheme(id);
  return { ...theme, colors: { ...theme.colors, ...palettes[theme.id] } };
}
export function mobileThemeVariables(id) {
  const c = mobileTheme(id).colors;
  const dark = isDarkTheme(id);
  return {
    ...themeVariables(id),
    ...Object.fromEntries(Object.entries(c).map(([key,value]) => [`--theme-${key}`,value])),
    '--mobile-error': dark ? '#ffb4ab' : '#a7352b',
    '--mobile-error-bg': '#a7352b',
    '--mobile-on-error': '#ffffff'
  };
}
