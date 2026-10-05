import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, HeadingLevel, ImageRun, Packer,
  Paragraph, SectionType, ShadingType, Table, TableCell, TableOfContents, TableRow, TextRun,
  UnderlineType, VerticalAlign, WidthType
} from 'docx';
import { flowSvg } from './export.mjs';
import { normalizeDesign, getTheme } from './themes.mjs';
import { normalizeImageWidth } from './image-size.mjs';
import { outline } from './model.mjs';

const pageSizes = {
  A4: { width: 210, height: 297 }, A5: { width: 148, height: 210 },
  B5: { width: 182, height: 257 }, Letter: { width: 215.9, height: 279.4 }
};
const twips = millimeters => Math.round(millimeters * 1440 / 25.4);
const cleanColor = value => String(value || '#000000').replace('#', '').toUpperCase();
const wordFont = (value, fallback) => !value || value === 'system' || value === 'body' ? fallback : value;
const halfPoints = px => Math.max(10, Math.round(px * 1.5));
const noneBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noneBorder, bottom: noneBorder, left: noneBorder, right: noneBorder, insideHorizontal: noneBorder, insideVertical: noneBorder };
const dataBytes = source => Uint8Array.from(atob(source.slice(source.indexOf(',') + 1)), character => character.charCodeAt(0));

function typography(options) {
  const design = normalizeDesign(options), theme = getTheme(design.theme);
  const body = wordFont(design.fontFamily, 'Yu Gothic'), themeHeading = theme.serif ? 'Yu Mincho' : body;
  const choose = (value, fallback) => value === 'body' ? body : wordFont(value, fallback);
  return {
    design, theme, body,
    heading: design.fontAdvanced ? choose(design.headingFontFamily, themeHeading) : design.fontFamily === 'system' ? themeHeading : body,
    chapter: design.fontAdvanced ? choose(design.chapterFontFamily, themeHeading) : design.fontFamily === 'system' ? themeHeading : body,
    dialogue: design.fontAdvanced ? choose(design.dialogueFontFamily, body) : body
  };
}

function textChildren(nodes = [], style = {}) {
  return nodes.flatMap(node => {
    if (node.type === 'hardBreak') return [new TextRun({ break: 1 })];
    if (node.type !== 'text') return textChildren(node.content, style);
    const marks = node.marks || [], link = marks.find(mark => mark.type === 'link')?.attrs?.href;
    const run = new TextRun({
      text: node.text || '', font: style.font, size: style.size, color: style.color,
      scale: style.scale,
      bold: marks.some(mark => mark.type === 'bold') || style.bold,
      italics: marks.some(mark => mark.type === 'italic'),
      strike: marks.some(mark => mark.type === 'strike'),
      underline: marks.some(mark => mark.type === 'underline') ? { type: UnderlineType.SINGLE } : undefined,
      style: marks.some(mark => mark.type === 'code') ? 'CodeText' : undefined
    });
    return link && /^(https?:|mailto:)/i.test(link) ? [new ExternalHyperlink({ children: [run], link })] : [run];
  });
}

async function imageData(node, maxWidthPx) {
  const source = node.attrs?.src || '', match = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.exec(source);
  if (!match) return null;
  const image = new Image(); image.src = source; await image.decode();
  let type = match[1].toLowerCase().replace('jpeg', 'jpg'), bytes = dataBytes(source);
  if (type === 'webp') {
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0); bytes = dataBytes(canvas.toDataURL('image/png')); type = 'png';
  }
  const requested = maxWidthPx * normalizeImageWidth(node.attrs?.width) / 100, scale = Math.min(1, requested / image.naturalWidth);
  return { type, bytes, width: Math.max(1, Math.round(image.naturalWidth * scale)), height: Math.max(1, Math.round(image.naturalHeight * scale)), alt: node.attrs?.alt || 'シナリオ画像' };
}

async function svgPng(svg, maxWidthPx, maxHeightPx) {
  const values = /viewBox="[^"]*?([\d.]+)\s+([\d.]+)"/.exec(svg), ratio = values ? Number(values[2]) / Number(values[1]) : .65;
  const width = Math.min(1200, Math.max(480, Math.round(maxWidthPx * 1.7))), height = Math.min(1800, Math.max(240, Math.round(width * ratio)));
  const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); context.drawImage(image, 0, 0, width, height);
  const scale = Math.min(1, maxWidthPx / width, maxHeightPx / height);
  return { bytes: dataBytes(canvas.toDataURL('image/png')), width: Math.round(width * scale), height: Math.round(height * scale) };
}

function paragraph(node, style, extra = {}) {
  return new Paragraph({ children: textChildren(node.content, style), spacing: { line: 360, after: 0 }, ...extra });
}

function headingLevel(level, hasChapter) {
  const value = Math.min(6, Math.max(1, level + (hasChapter ? 1 : 0)));
  return [null, HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6][value];
}

async function blocks(nodes, context, depth = 0) {
  const result = [];
  for (const node of nodes || []) {
    if (node.type === 'paragraph') result.push(paragraph(node, { font: context.fonts.body, size: context.bodySize, color: context.colors.text }));
    else if (node.type === 'heading') {
      const isChapter = node.attrs?.level === 0, level = isChapter ? HeadingLevel.HEADING_1 : headingLevel(node.attrs?.level || 1, context.hasChapter);
      const font = isChapter ? context.fonts.chapter : context.fonts.heading;
      const headingSizes = context.columns === 2 ? { 1: 1.35, 2: 1.18, 3: 1.08 } : { 1: 1.75, 2: 1.4, 3: 1.18 };
      const size = isChapter ? Math.round(context.bodySize * (context.columns === 2 ? 1.65 : 2.1)) : Math.round(context.bodySize * (headingSizes[node.attrs?.level] || 1.05));
      result.push(paragraph(node, { font, size, scale: context.columns === 2 ? 82 : undefined, color: isChapter ? context.colors.chapter : node.attrs?.level === 1 ? context.colors.heading : context.colors.subheading, bold: true }, { heading: level, alignment: isChapter ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { before: 360, after: 140 }, keepNext: true }));
    } else if (node.type === 'blockquote') {
      for (const child of node.content || []) result.push(paragraph(child, { font: context.fonts.body, size: context.bodySize, color: context.colors.text }, { indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, color: context.colors.accent, size: 18, space: 10 } }, shading: { type: ShadingType.CLEAR, fill: context.colors.quote, color: 'auto' }, spacing: { before: 140, after: 140 } }));
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      let index = Number(node.attrs?.start) || 1;
      for (const item of node.content || []) {
        const [first, ...rest] = item.content || [], prefix = node.type === 'orderedList' ? `${index++}. ` : '';
        if (first?.type === 'paragraph') result.push(new Paragraph({ children: [new TextRun({ text: prefix, font: context.fonts.body, size: context.bodySize }), ...textChildren(first.content, { font: context.fonts.body, size: context.bodySize, color: context.colors.text })], bullet: node.type === 'bulletList' ? { level: Math.min(8, depth) } : undefined, indent: node.type === 'orderedList' ? { left: 360 * (depth + 1), hanging: 240 } : undefined, spacing: { line: 340, after: 0 } }));
        result.push(...await blocks(rest, context, depth + 1));
      }
    } else if (node.type === 'taskList') {
      for (const item of node.content || []) {
        const [first, ...rest] = item.content || [], marker = item.attrs?.checked ? '☒ ' : '☐ ';
        if (first?.type === 'paragraph') result.push(new Paragraph({ children: [new TextRun({ text: marker, font: 'Segoe UI Symbol', size: context.bodySize }), ...textChildren(first.content, { font: context.fonts.body, size: context.bodySize, color: context.colors.text })], indent: { left: 360 * (depth + 1), hanging: 240 }, spacing: { line: 340, after: 0 } }));
        result.push(...await blocks(rest, context, depth + 1));
      }
    } else if (node.type === 'gmNote') {
      const children = [new Paragraph({ children: [new TextRun({ text: 'GM MEMO', bold: true, font: context.fonts.body, size: Math.max(14, context.bodySize - 5), color: context.colors.accent })], spacing: { after: 100 } }), ...await blocks(node.content, context)];
      result.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { ...noBorders, left: { style: BorderStyle.SINGLE, color: context.colors.accent, size: 20 } }, rows: [new TableRow({ cantSplit: true, children: [new TableCell({ children, shading: { type: ShadingType.CLEAR, fill: context.colors.note, color: 'auto' }, margins: { top: 160, bottom: 160, left: 220, right: 220 }, verticalAlign: VerticalAlign.CENTER })] })] }));
      result.push(new Paragraph({ spacing: { after: 80 } }));
    } else if (node.type === 'dialogue') {
      const rows = (node.content || []).map(child => new TableRow({ children: [
        new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: noBorders, margins: { right: 180 }, children: [new Paragraph({ children: [new TextRun({ text: node.attrs?.speaker || '話者', bold: true, font: context.fonts.dialogue, size: context.bodySize })], keepNext: true })] }),
        new TableCell({ width: { size: 76, type: WidthType.PERCENTAGE }, borders: noBorders, children: [child.type === 'paragraph' ? paragraph(child, { font: context.fonts.body, size: context.bodySize, color: context.colors.text }) : new Paragraph({ children: textChildren(child.content, { font: context.fonts.body, size: context.bodySize, color: context.colors.text }) })] })
      ] }));
      if (rows.length) result.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows }));
      result.push(new Paragraph({ spacing: { after: 80 } }));
    } else if (node.type === 'image') {
      const image = await imageData(node, context.columnWidthPx);
      if (image) result.push(new Paragraph({ children: [new ImageRun({ type: image.type, data: image.bytes, transformation: { width: image.width, height: image.height }, altText: { title: image.alt, description: image.alt, name: image.alt } })], alignment: AlignmentType.CENTER, spacing: { before: 120, after: 120 } }));
    } else if (node.type === 'horizontalRule') result.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, color: context.colors.border, size: 6 } }, spacing: { before: 180, after: 180 } }));
    else if (node.type === 'codeBlock') result.push(paragraph(node, { font: 'Consolas', size: Math.max(12, context.bodySize - 2), color: context.colors.text }, { shading: { type: ShadingType.CLEAR, fill: context.colors.soft, color: 'auto' }, indent: { left: 180, right: 180 }, spacing: { before: 100, after: 100 } }));
    else result.push(...await blocks(node.content, context, depth));
  }
  return result;
}

export async function exportDocx(doc, options = {}) {
  const { design, theme, body, heading, chapter, dialogue } = typography(options), page = pageSizes[options.pdfPageSize] || pageSizes.A4;
  const columns = options.columns === 2 ? 2 : 1, margin = 12.7, gap = 8, usableWidth = page.width - margin * 2;
  const bodySize = halfPoints(design.fontSize), hasChapter = (doc.content?.content || []).some(node => node.type === 'heading' && node.attrs?.level === 0);
  const colors = Object.fromEntries(Object.entries(theme.colors).map(([key, value]) => [key, cleanColor(value)]));
  const context = { fonts: { body, heading, chapter, dialogue }, colors, bodySize, hasChapter, columns, columnWidthPx: ((usableWidth - (columns - 1) * gap) / columns) * 96 / 25.4 };
  const bodyChildren = await blocks(doc.content?.content || [], context);
  const systemName = String(doc.systemName || '').trim();
  const titleChildren = [
    new Paragraph({ children: [new TextRun({ text: `${systemName ? `${systemName} / ` : ''}SCENARIO`, font: body, size: Math.max(14, bodySize - 6), color: colors.accent, allCaps: true })], spacing: { after: 100 } }),
    new Paragraph({ text: doc.title || '無題のシナリオ', style: 'Title' }),
    ...(doc.subtitle ? [new Paragraph({ children: [new TextRun({ text: doc.subtitle, font: body, size: bodySize, color: colors.muted })], spacing: { after: 260 } })] : []),
    new Paragraph({ text: '目次', heading: HeadingLevel.HEADING_1, keepNext: true }),
    new TableOfContents('', { hyperlink: true, headingStyleRange: '1-6' }),
    new Paragraph({ spacing: { after: 180 } })
  ];
  const baseProperties = { page: { size: { width: twips(page.width), height: twips(page.height) }, margin: { top: twips(margin), right: twips(margin), bottom: twips(margin), left: twips(margin) } } };
  const sections = columns === 2
    ? [{ properties: baseProperties, children: titleChildren }, { properties: { ...baseProperties, type: SectionType.CONTINUOUS, column: { count: 2, space: twips(gap), equalWidth: true } }, children: bodyChildren }]
    : [{ properties: baseProperties, children: [...titleChildren, ...bodyChildren] }];
  if (options.includeFlow !== false && doc.flow?.nodes?.length && typeof document !== 'undefined') {
    const flow = await svgPng(flowSvg(doc.flow, outline(doc.content), design.theme), usableWidth * 96 / 25.4, (page.height - margin * 2) * 96 / 25.4);
    sections.push({ properties: { ...baseProperties, type: SectionType.NEXT_PAGE }, children: [
      new Paragraph({ text: 'シナリオフロー', heading: HeadingLevel.HEADING_1, keepNext: true }),
      new Paragraph({ children: [new ImageRun({ type: 'png', data: flow.bytes, transformation: { width: flow.width, height: flow.height }, altText: { title: 'シナリオフロー', description: 'シナリオのフローチャート', name: 'シナリオフロー' } })], alignment: AlignmentType.CENTER })
    ] });
  }
  const file = new Document({
    title: doc.title || '無題のシナリオ', subject: 'TRPGシナリオ', creator: '', lastModifiedBy: '', features: { updateFields: true },
    styles: { default: {
      document: { run: { font: body, size: bodySize, color: colors.text }, paragraph: { spacing: { line: 360, after: 0 } } },
      title: { run: { font: heading, size: Math.round(bodySize * 2.25), bold: true, color: colors.heading }, paragraph: { spacing: { before: 0, after: 140 } } },
      heading1: { run: { font: heading, size: Math.round(bodySize * 1.75), bold: true, color: colors.heading }, paragraph: { spacing: { before: 360, after: 140 }, keepNext: true } },
      heading2: { run: { font: heading, size: Math.round(bodySize * 1.4), bold: true, color: colors.subheading }, paragraph: { spacing: { before: 300, after: 120 }, keepNext: true } },
      heading3: { run: { font: heading, size: Math.round(bodySize * 1.18), bold: true, color: colors.subheading }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true } }
    }, characterStyles: [{ id: 'CodeText', name: 'Code Text', run: { font: 'Consolas', shading: { type: ShadingType.CLEAR, fill: colors.soft, color: 'auto' } } }] },
    sections
  });
  const blob = await Packer.toBlob(file);
  return new Uint8Array(await blob.arrayBuffer());
}
