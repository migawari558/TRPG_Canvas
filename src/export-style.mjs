import { normalizeDesign, resolvedFonts } from './themes.mjs';
import { documentTheme } from './desktop-themes.mjs';

export function exportStyle(options) {
  const design = normalizeDesign(options);
  const { fontSize } = design;
  const c = documentTheme(design.theme).colors;
  const fonts = resolvedFonts(design);
  const pageSize = ['A4', 'A5', 'B5', 'Letter'].includes(options.pdfPageSize) ? options.pdfPageSize : 'A4';
  const paperHeight = { A4: 297, A5: 210, B5: 257, Letter: 279.4 }[pageSize];
  const printPageSize = pageSize === 'B5' ? '182mm 257mm' : pageSize;
  const columns = options.columns === 2 ? `
    .scenario-body{column-count:2;column-gap:8mm;column-fill:balance}
    .scenario-body :is(h1,h2,h3,h4){break-after:avoid}
    .scenario-body p{orphans:2;widows:2}
    .scenario-body :is(blockquote,pre,.gm-note,.copy-block){break-inside:avoid}
    .scenario-body :is(blockquote,pre,.gm-note){padding-left:14px;padding-right:14px}
    .dialogue{column-gap:2em}
  ` : '';
  const pagination = `.scenario-body > h1 ~ h1{break-before:${options.columns === 2 ? 'column' : 'page'}}
    .scenario-body .gm-note,.scenario-body blockquote,.scenario-body .copy-block{break-inside:avoid}`;
  const pageLayout = `
    .export-shell,.export-shell.has-navigation{display:block}
    .export-navigation,.copy-button{display:none}
    body{background:${c.paper};font-size:${fontSize}px}
    main{width:100%;max-width:none;margin:0;padding:0;border:0;border-radius:0;box-shadow:none}
    header{padding-bottom:20px;margin-bottom:24px}
    .copy-block blockquote,.copy-block pre{padding-top:16px}
    h1,h2,h3{break-after:avoid}
    blockquote,pre,svg{break-inside:avoid}
    a{color:inherit;text-decoration:none}
    .flow-section{break-before:page}
    ${columns}${pagination}
  `;
  return `
    *{box-sizing:border-box;print-color-adjust:exact;-webkit-print-color-adjust:exact}
    html{scroll-padding-top:24px}
    body{margin:0;background:${c.bg};color:${c.text};font-family:${fonts.body};font-size:${fontSize}px;line-height:1.95}
    a{color:${c.accent}}
    button,summary{font-family:'Yu Gothic UI','Meiryo',sans-serif}
    button:focus-visible,summary:focus-visible,a:focus-visible{outline:2px solid ${c.accent};outline-offset:3px}
    .export-shell.has-navigation{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:start}
    main{width:calc(100% - 64px);max-width:880px;margin:32px auto;padding:48px 56px;background:${c.paper};border:1px solid ${c.border};border-radius:4px;overflow-wrap:anywhere}
    header{padding-bottom:28px;margin-bottom:32px;border-bottom:1px solid ${c.border}}
    header small{font:500 .8em/1.6 'Yu Gothic UI','Meiryo',sans-serif;color:${c.accent}}
    header h1{font-size:2em;font-weight:500;line-height:1.5;margin:8px 0 12px;letter-spacing:.02em;color:${c.heading}}
    header p{margin:0;color:${c.muted};font-size:.88em}
    h1,h2,h3{font-family:${fonts.heading}}
    .scenario-body{font-synthesis:style}
    .scenario-body :is(h1,h2,h3,h4,h5,h6){margin:2em 0 .6em;padding-bottom:0;line-height:1.5;font-weight:500;break-after:avoid;break-inside:avoid}
    .scenario-body h1{font-size:1.8em;color:${c.heading}}
    .scenario-body :is(h2,h3,h4,h5,h6){color:${c.subheading}}
    .scenario-body h2{font-size:1.47em;border-bottom:1px solid ${c.border};padding-bottom:.4em}
    .scenario-body h3{font-size:1.18em}
    .scenario-body h4{font-size:1.06em}
    .scenario-body h5{font-size:1em}
    .scenario-body h6{font-size:.95em}
    .scenario-body .chapter-heading{font-family:${fonts.chapter};color:${c.chapter};font-size:2.2em;text-align:center;margin:2.5em 0 .7em;letter-spacing:.08em;border:0}
    .scenario-body > :first-child{margin-top:0}
    .scenario-body p{margin:0}
    .blank-line{min-height:1.95em}
    hr{border:0;border-top:1px solid ${c.border};margin:24px 0}
    blockquote{margin:24px 0;padding:16px 20px;border-left:2px solid ${c.accent};border-radius:0 4px 4px 0;background:${c.quote}}
    blockquote p:first-child{margin-top:0}blockquote p:last-child{margin-bottom:0}
    pre{margin:24px 0;padding:20px;background:${c.soft};border:1px solid ${c.border};border-radius:4px;white-space:pre-wrap;overflow-wrap:anywhere}
    code{font-family:Consolas,monospace;background:${c.soft};padding:2px 4px;border-radius:2px}
    .gm-note{position:relative;margin:24px 0;padding:36px 20px 16px;border:1px solid ${c.border};border-radius:4px;background-color:${c.note};color:${c.text}}
    .gm-note:before{content:'GMメモ';position:absolute;left:20px;top:12px;font:11px/1.5 'Yu Gothic UI','Meiryo',sans-serif;color:${c.muted}}
    .gm-note > :first-child{margin-top:0}.gm-note > :last-child{margin-bottom:0}
    .copy-block{position:relative}.copy-block blockquote,.copy-block pre{padding-top:44px}
    .copy-button{position:absolute;top:8px;right:8px;padding:6px 12px;border:1px solid ${c.border};border-radius:4px;background:${c.paper};color:${c.accent};font-size:12px;cursor:pointer}
    ul[data-type="taskList"]{list-style:none;padding-left:0}
    li[data-type="taskItem"]{display:flex;align-items:flex-start;gap:8px}
    li[data-type="taskItem"] > label{flex:none;display:flex;align-items:center;min-height:1.95em}
    li[data-type="taskItem"] > label input{width:14px;height:14px;accent-color:${c.accent};margin:0}
    li[data-type="taskItem"] > div{flex:1;min-width:0}
    li[data-type="taskItem"] ul{margin:0 0 0 14px}
    .scenario-body img{display:block;max-width:100%;height:auto;max-height:${Math.min(220, paperHeight - 25.4)}mm;object-fit:contain;margin:12px 0;break-inside:avoid}
    .dialogue{display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:3em;margin:1.35em 0;padding:.1em 0}
    .dialogue-speaker{font-family:${fonts.dialogue};max-width:14em;overflow-wrap:anywhere;font-weight:800;color:${c.text};line-height:1.95}
    .dialogue-body{min-width:0}.dialogue-body p{margin:0}
    .dialogue-segment{break-inside:avoid;page-break-inside:avoid}.dialogue-segment+.dialogue-segment{margin-top:0}
    svg{width:100%;height:auto;max-height:900px}
    .flow-section{margin-top:48px;padding-top:24px;border-top:1px solid ${c.border}}
    .flow-section h2{font-family:${fonts.heading};font-size:1.4em;font-weight:500;color:${c.heading};margin:0 0 24px}
    .export-navigation{position:sticky;top:0;width:248px;height:100dvh;align-self:start;background:${c.paper};border-right:1px solid ${c.border};font-family:'Yu Gothic UI','Meiryo',sans-serif;font-size:13px;z-index:10}
    .export-navigation:not([open]){width:0;border:0}
    .export-navigation > summary{position:absolute;left:16px;top:16px;z-index:1;display:flex;align-items:center;gap:8px;width:216px;min-height:40px;padding:8px 12px;border:1px solid ${c.border};border-radius:6px;background:${c.paper};color:${c.text};cursor:pointer;list-style:none;font-size:13px}
    .export-navigation > summary::-webkit-details-marker{display:none}
    .export-navigation > summary svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.5}
    .export-navigation .toc-open-label{display:none}
    .export-navigation .toc-close-icon{margin-left:auto;color:${c.muted}}
    .export-navigation:not([open]) > summary{position:fixed;width:auto;box-shadow:0 2px 8px #00000012}
    .export-navigation:not([open]) .toc-open-label{display:inline}
    .export-navigation:not([open]) :is(.toc-close-label,.toc-close-icon){display:none}
    .export-toc{position:absolute;top:72px;bottom:0;left:0;right:0;padding:0 16px 24px;overflow-y:auto;overscroll-behavior-y:contain;scrollbar-gutter:stable}
    .toc-links a{display:flex;gap:8px;align-items:baseline;min-height:36px;padding:8px 12px;border-left:2px solid transparent;border-radius:0 4px 4px 0;color:${c.muted};text-decoration:none;line-height:1.6;overflow-wrap:anywhere}
    .toc-links a:hover,.toc-links a:focus-visible{background:${c.soft};border-left-color:${c.accent};color:${c.text}}
    .toc-links .level-0{margin-top:12px;color:${c.chapter};font-weight:500}
    .toc-links .level-1{color:${c.heading};font-weight:500}
    .toc-group > summary{display:flex;align-items:center;list-style:none;cursor:pointer;border-radius:4px}
    .toc-group > summary::-webkit-details-marker{display:none}
    .toc-group > summary:hover{background:${c.soft}}
    .toc-group > summary a{flex:1;min-width:0}
    .toc-children{padding-left:12px}
    .toc-chevron{display:grid;place-items:center;flex:none;width:32px;min-height:36px;color:${c.muted}}
    .toc-chevron svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5}
    .toc-group[open] > summary .toc-chevron svg{transform:rotate(90deg)}
    .toc-links .toc-flow{margin-top:20px;border-top:1px solid ${c.border};padding-top:16px}
    @media(max-width:900px){
      .export-shell.has-navigation{display:block}
      .export-navigation{position:fixed;left:0;top:0;max-width:85vw;box-shadow:8px 0 24px #00000018}
      .export-navigation:not([open]){background:none;box-shadow:none}
      main{margin:24px auto;padding:48px 32px}
    }
    @media(max-width:600px){main{width:100%;margin:0;padding:72px 24px 32px;border:0;border-radius:0}header h1{font-size:1.8em}}
    @media print{${pageLayout}}
    ${options.printPreview ? `@page{size:${printPageSize};margin:12.7mm}${pageLayout}` : ''}
  `;
}
