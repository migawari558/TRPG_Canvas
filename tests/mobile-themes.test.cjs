const test = require('node:test');
const assert = require('node:assert/strict');

test('Android uses the shared new palettes and chooses readable destructive text for dark themes', async () => {
  const { getTheme, isDarkTheme } = await import('../src/themes.mjs');
  const { mobileTheme, mobileThemeVariables } = await import('../src/mobile/mobile-themes.mjs');
  const luminance = color => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);
  for (const id of ['obsidian-gold', 'sakura', 'ocean']) {
    const c = mobileTheme(id).colors, vars = mobileThemeVariables(id);
    assert.deepEqual(c, getTheme(id).colors);
    assert.equal(vars['--theme-paper'], c.paper);
    assert.equal(vars['--theme-accent'], c.accent);
    const a = luminance(vars['--mobile-error']), b = luminance(c.paper);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5, id);
    assert.equal(isDarkTheme(id), id !== 'sakura');
  }
});
