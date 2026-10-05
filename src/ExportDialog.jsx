import { getTheme, normalizeDesign, readPreference } from './themes.mjs';
import React, { lazy, Suspense, useMemo, useState, useEffect } from 'react';
import { ThemePicker, TypographyControls, FontSizeControl } from './Appearance.jsx';
import { exportHtml } from './export.mjs';
const PdfPreview = lazy(() => import('./PdfPreview.jsx'));

export default function ExportDialog({ doc, design, onDesign, appearance, busy, onExport }) {
  const [format, setFormat] = useState('html'), [copyButtons, setCopyButtons] = useState(true), [includeFlow, setIncludeFlow] = useState(true);
  const [columns, setColumns] = useState(() => readPreference('trpg-pdf-columns', 1) === 2 ? 2 : 1);
  const [pageSize, setPageSize] = useState(() => ['A4', 'A5', 'B5', 'Letter'].includes(readPreference('trpg-pdf-page-size', 'A4')) ? readPreference('trpg-pdf-page-size', 'A4') : 'A4');
  useEffect(() => { try { localStorage.setItem('trpg-pdf-columns', JSON.stringify(columns)); } catch {} }, [columns]);
  useEffect(() => { try { localStorage.setItem('trpg-pdf-page-size', JSON.stringify(pageSize)); } catch {} }, [pageSize]);
  const paged = format === 'pdf' || format === 'docx';
  const options = { ...design, columns: paged ? columns : 1, pdfPageSize: pageSize, copyButtons: format === 'html' && copyButtons, includeFlow };
  const selectedTheme = getTheme(design.theme);
  const html = useMemo(() => exportHtml(doc, { ...design, columns: paged ? columns : 1, pdfPageSize: pageSize, copyButtons: format === 'html' && copyButtons, includeFlow, interactive: false, printPreview: format === 'docx' || (format === 'pdf' && !window.canvas) }), [doc, selectedTheme, design.fontSize, design.fontFamily, design.fontAdvanced, design.headingFontFamily, design.chapterFontFamily, design.dialogueFontFamily, format, copyButtons, includeFlow, columns, pageSize]);
  return <div className="export-layout"><div className="export-settings">
    <div className="format-options">{[['html', 'HTML'], ['pdf', 'PDF'], ['docx', 'Word'], ['md', 'Markdown']].map(([id, label]) => <button key={id} className={format === id ? 'chosen' : ''} aria-pressed={format === id} onClick={() => setFormat(id)}>{label}</button>)}</div>
    {format !== 'md' ? <><ThemePicker value={design.theme} onChange={theme => onDesign({ ...design, theme })} label="書き出しテーマ"/><TypographyControls value={design} onChange={onDesign} label="書き出しの本文フォント"/><FontSizeControl value={design.fontSize} onChange={fontSize => onDesign({ ...design, fontSize })} label="書き出しの文字サイズ" min={7}/><button className="secondary-button" onClick={() => onDesign(normalizeDesign(appearance))}>画面と同じ設定</button>
      {paged && <><fieldset className="pdf-page-sizes"><legend>用紙サイズ</legend><div>{[['A4', 'A4'], ['A5', 'A5'], ['B5', 'B5（JIS）'], ['Letter', 'レター']].map(([value, label]) => <button key={value} aria-pressed={pageSize === value} onClick={() => setPageSize(value)}>{label}</button>)}</div></fieldset><fieldset className="pdf-columns"><legend>本文の段組み</legend><div>{[1, 2].map(value => <button key={value} aria-pressed={columns === value} onClick={() => setColumns(value)}>{value}段組み</button>)}</div><p>タイトルとフローチャートはページ幅いっぱいに表示します。</p></fieldset></>}
      {format === 'html' && <label className="checkbox-line"><input type="checkbox" checked={copyButtons} onChange={event => setCopyButtons(event.target.checked)}/>コピーボタンを付ける</label>}
      <label className="checkbox-line"><input type="checkbox" checked={includeFlow} onChange={event => setIncludeFlow(event.target.checked)}/>フローチャートを含める</label>
    </> : <p className="hint-box">Markdownは本文のみのテキスト形式です。テーマ・文字サイズ・フローチャートは含まれません。</p>}
    <p className="export-note">GMメモも含まれます。配布前に内容を確認してください。</p>
    <button className="primary-button full-width" disabled={busy} onClick={() => onExport(format, options)}>{busy ? '書き出し中…' : `${format.toUpperCase()}を書き出す`}</button>
  </div><section className="export-preview" aria-label="書き出しプレビュー"><div className="preview-heading">プレビュー <small>{format === 'pdf' && window.canvas ? `${pageSize}・実際の改ページを表示` : format === 'docx' ? `WORD・${pageSize}・${columns}段組みの参考表示` : format.toUpperCase()}</small></div>
    {format === 'md' ? <pre className="markdown-preview">{doc.markdown}</pre> : format === 'pdf' && window.canvas ? <Suspense fallback={<p>PDFプレビューを準備中…</p>}><PdfPreview html={html} pageSize={pageSize}/></Suspense> : <>{format === 'pdf' && <p className="preview-notice">改ページを含むPDFプレビューはデスクトップ版で利用できます。</p>}{format === 'docx' && <p className="preview-notice">Wordで開いたときの参考表示です。改ページはWord側で確定します。</p>}<iframe title="書き出しの仕上がり" sandbox="allow-same-origin" srcDoc={html}/></>}
  </section></div>;
}
