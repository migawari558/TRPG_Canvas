const test = require('node:test');
const assert = require('node:assert/strict');

const luminance = color => [1, 3, 5]
  .map(index => parseInt(color.slice(index, index + 2), 16) / 255)
  .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('desktop themes keep manuscript, outline, mode and rail text readable', async () => {
  const { themes } = await import('../src/themes.mjs');
  const { documentTheme, desktopThemeVariables } = await import('../src/desktop-themes.mjs');
  for (const theme of themes) {
    const c = documentTheme(theme.id).colors;
    const vars = desktopThemeVariables(theme.id);
    for (const [foreground, background] of [
      [c.text, c.paper], [c.muted, c.panel], [c.muted, c.bg],
      [c.accent, c.soft], [c.onAccent, c.accent],
      [vars['--theme-onRail'], vars['--theme-rail']],
      [vars['--theme-railMuted'], vars['--theme-rail']]
    ]) assert.ok(contrast(foreground, background) >= 4.5, `${theme.id}: ${foreground} on ${background}`);
  }
});
