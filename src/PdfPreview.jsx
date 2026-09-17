import React, { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;
export default function PdfPreview({ html }) {
  const [pdf, setPdf] = useState(null), [page, setPage] = useState(1), [status, setStatus] = useState('PDFを生成中…'), [error, setError] = useState('');
  const canvas = useRef(), container = useRef();
  useEffect(() => {
    let canceled = false, task;
    setPdf(null); setError(''); setStatus('PDFを生成中…'); setPage(1);
    const timer = setTimeout(async () => {
      try {
        const encoded = await window.canvas.previewPdf(html);
        if (canceled) return;
        task = getDocument({ data: Uint8Array.from(atob(encoded), c => c.charCodeAt(0)), isEvalSupported: false });
        const loaded = await task.promise;
        if (!canceled) { setPdf(loaded); setStatus(''); }
      } catch (e) { if (!canceled) { setStatus(''); setError(`PDFを表示できませんでした: ${e.message}`); } }
    }, 450);
    return () => { canceled = true; clearTimeout(timer); task?.destroy(); };
  }, [html]);
  useEffect(() => {
    if (!pdf) return;
    let canceled = false, renderTask, sequence = Promise.resolve();
    const draw = () => {
      renderTask?.cancel();
      sequence = sequence.catch(() => {}).then(async () => {
        if (canceled) return;
        const item = await pdf.getPage(page);
        if (canceled) return;
        const width = Math.max(150, container.current.clientWidth - 32), ratio = window.devicePixelRatio || 1;
        const viewport = item.getViewport({ scale: width / item.getViewport({ scale: 1 }).width });
        const element = canvas.current; element.width = viewport.width * ratio; element.height = viewport.height * ratio;
        element.style.width = `${viewport.width}px`; element.style.height = `${viewport.height}px`;
        renderTask = item.render({ canvasContext: element.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
        await renderTask.promise;
      }).catch(e => { if (!canceled && e.name !== 'RenderingCancelledException') setError(e.message); });
    };
    const observer = new ResizeObserver(draw); observer.observe(container.current); draw();
    return () => { canceled = true; observer.disconnect(); renderTask?.cancel(); };
  }, [pdf, page]);
  return <div className="pdf-preview"><div className="pdf-navigation"><button disabled={!pdf || page <= 1} onClick={() => setPage(page - 1)}>前のページ</button><span>{pdf ? `${page} / ${pdf.numPages} ページ` : 'PDFプレビュー'}</span><button disabled={!pdf || page >= pdf.numPages} onClick={() => setPage(page + 1)}>次のページ</button></div><div className="pdf-pages" ref={container}>{status && <p role="status">{status}</p>}{error && <p role="alert">{error}</p>}<canvas ref={canvas} hidden={!pdf || !!error} aria-label={`PDF ${page}ページ目`}/></div></div>;
}
