import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';
import { normalizeImageWidth } from './image-size.mjs';
export const isEmbeddedImage = src => typeof src === 'string' && /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+$/i.test(src);
export const ScenarioImage = Image.extend({
  addAttributes() {
    return { ...this.parent?.(), width: { default: 100, parseHTML: element => normalizeImageWidth(element.getAttribute('data-image-width')), renderHTML: () => ({}) } };
  },
  parseHTML() { return [{ tag: 'img[src]', getAttrs: element => isEmbeddedImage(element.getAttribute('src')) ? null : false }]; },
  renderHTML({ node, HTMLAttributes }) {
    const { width: _rawWidth, ...attributes } = HTMLAttributes, width = normalizeImageWidth(node.attrs.width);
    return ['img', mergeAttributes(this.options.HTMLAttributes, attributes, { src: isEmbeddedImage(HTMLAttributes.src) ? HTMLAttributes.src : null, 'data-image-width': width, style: `width:${width}%` })];
  }
}).configure({ allowBase64: true });

export async function readImageFile(file) {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('画像は1枚5MB以内で選んでください。');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  let type;
  if (bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1,4)) === 'PNG') type = 'image/png';
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) type = 'image/jpeg';
  else if (String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/)) type = 'image/gif';
  else if (String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') type = 'image/webp';
  else throw new Error('PNG・JPEG・GIF・WebPの画像を選んでください。');
  const src = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('画像を読み込めませんでした。')); reader.readAsDataURL(new Blob([file], { type })); });
  await new Promise((resolve,reject) => { const image = new window.Image(); image.onload = () => image.naturalWidth * image.naturalHeight <= 24_000_000 ? resolve() : reject(new Error('画像が大きすぎます。2400万画素以下に縮小してください。')); image.onerror = () => reject(new Error('画像を開けませんでした。別のファイルを選んでください。')); image.src = src; });
  return { type: 'image', attrs: { src, alt: file.name.replace(/\.[^.]+$/, '') || '画像', width: 100 } };
}
