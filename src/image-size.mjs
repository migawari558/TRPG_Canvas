export const imageWidths = [25, 50, 75, 100];

export function normalizeImageWidth(value) {
  const width = Math.round(Number(value));
  return imageWidths.includes(width) ? width : 100;
}

export function imageSizePlugin(md) {
  const fallback = md.renderer.rules.image || ((tokens, index, options, _env, renderer) => renderer.renderToken(tokens, index, options));
  md.renderer.rules.image = (tokens, index, options, env, renderer) => {
    const token = tokens[index], match = /^width=(25|50|75|100)$/.exec(token.attrGet('title') || '');
    if (match) {
      const titleIndex = token.attrIndex('title');
      if (titleIndex >= 0) token.attrs.splice(titleIndex, 1);
      token.attrSet('data-image-width', match[1]);
      token.attrSet('style', `width:${match[1]}%`);
    }
    return fallback(tokens, index, options, env, renderer);
  };
}
