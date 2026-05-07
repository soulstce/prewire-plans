'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Eraser, Minus, Plus, Redo2, Undo2, Pencil, MoveRight, Square, Circle, Type, LineChart } from 'lucide-react';
import { useApp } from './providers';
import type { Annotation, Point, ToolKind } from '@/lib/types';
import type { PointerEvent } from 'react';

const tools: { kind: ToolKind; label: string; icon: any }[] = [
  { kind: 'pen', label: 'Pen', icon: Pencil },
  { kind: 'line', label: 'Line', icon: LineChart },
  { kind: 'arrow', label: 'Arrow', icon: MoveRight },
  { kind: 'rect', label: 'Rectangle', icon: Square },
  { kind: 'ellipse', label: 'Ellipse', icon: Circle },
  { kind: 'text', label: 'Text', icon: Type },
  { kind: 'eraser', label: 'Eraser', icon: Eraser }
];

function uid(prefix = 'anno') {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy || 1e-6;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function bounds(annotation: Annotation) {
  if (annotation.tool === 'pen') {
    const xs = annotation.points.map((p) => p.x);
    const ys = annotation.points.map((p) => p.y);
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
  if (annotation.tool === 'text') return { x1: annotation.point.x - 0.02, y1: annotation.point.y - 0.02, x2: annotation.point.x + 0.25, y2: annotation.point.y + 0.08 };
  return { x1: Math.min(annotation.from.x, annotation.to.x), y1: Math.min(annotation.from.y, annotation.to.y), x2: Math.max(annotation.from.x, annotation.to.x), y2: Math.max(annotation.from.y, annotation.to.y) };
}

export function PdfWorkspace() {
  const { state, addAnnotation, deleteAnnotation, undo, redo, setThickness, updateDocument, setActiveDocument } = useApp();
  const document = state.documents.find((doc) => doc.id === state.activeDocumentId) ?? state.documents[0];
  const annotations = state.annotationsByDocument[document?.id ?? ''] ?? [];
  const [tool, setTool] = useState<ToolKind>(state.settings.defaultTool);
  const [color, setColor] = useState(state.settings.accent);
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState({ width: 820, height: 1120 });
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<any>(null);
  const pageRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTool(state.settings.defaultTool);
    setColor(state.settings.accent);
  }, [state.settings.accent, state.settings.defaultTool]);

  useEffect(() => {
    if (!document?.source) return;
    let disposed = false;
    (async () => {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const bytes = document.source?.startsWith('data:') ? Uint8Array.from(atob(document.source.split(',')[1]), (c) => c.charCodeAt(0)) : await (await fetch(document.source!)).arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const pdf = await loadingTask.promise;
      if (disposed) return;
      pdfRef.current = pdf;
      setTotalPages(pdf.numPages);
      const resolvedPage = Math.min(page, pdf.numPages);
      setPage(resolvedPage);
      const pageProxy = await pdf.getPage(resolvedPage);
      pageRef.current = pageProxy;
      const viewport = pageProxy.getViewport({ scale: 1 });
      setPageSize({ width: viewport.width, height: viewport.height });
    })().catch(() => void 0);
    return () => { disposed = true; };
  }, [document?.source]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const pageProxy = await pdf.getPage(page);
      if (cancelled) return;
      pageRef.current = pageProxy;
      const viewport = pageProxy.getViewport({ scale: zoom });
      setPageSize({ width: viewport.width, height: viewport.height });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await pageProxy.render({ canvasContext: context, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [page, zoom, document?.id]);

  const normalizedPoint = (event: PointerEvent) => {
    const stage = stageRef.current?.getBoundingClientRect();
    if (!stage) return { x: 0, y: 0 };
    return {
      x: clamp((event.clientX - stage.left) / stage.width),
      y: clamp((event.clientY - stage.top) / stage.height)
    };
  };

  const buildAnnotation = (start: Point, end: Point, drawingTool: Exclude<ToolKind, 'eraser'>): Annotation => {
    const common = { id: uid(), color, size: state.settings.thickness, createdAt: Date.now(), user: state.settings.username };
    if (drawingTool === 'pen') return { ...common, tool: drawingTool, points: [start, end] };
    if (drawingTool === 'text') return { ...common, tool: drawingTool, point: start, text: selectedText || 'Add note', fontSize: 18 };
    if (drawingTool === 'arrow' || drawingTool === 'line') return { ...common, tool: drawingTool, from: start, to: end };
    return { ...common, tool: drawingTool, from: start, to: end };
  };

  const hitTest = (point: Point) => {
    return [...annotations].reverse().find((annotation) => {
      if (annotation.tool === 'pen') return annotation.points.some((p, index) => index > 0 && pointToSegmentDistance(point, annotation.points[index - 1], p) < 0.02);
      if (annotation.tool === 'text') return point.x >= annotation.point.x - 0.01 && point.x <= annotation.point.x + 0.3 && point.y >= annotation.point.y - 0.04 && point.y <= annotation.point.y + 0.08;
      const b = bounds(annotation);
      return point.x >= b.x1 - 0.015 && point.x <= b.x2 + 0.015 && point.y >= b.y1 - 0.015 && point.y <= b.y2 + 0.015;
    });
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!document?.id) return;
    const start = normalizedPoint(event);
    if (tool === 'eraser') {
      const target = hitTest(start);
      if (target) deleteAnnotation(document.id, target.id);
      return;
    }
    const drawingTool = tool as Exclude<ToolKind, 'eraser'>;
    if (drawingTool === 'text') {
      const text = window.prompt('Text label', 'New note')?.trim();
      if (!text) return;
      addAnnotation(document.id, { ...buildAnnotation(start, start, drawingTool), text } as Annotation);
      return;
    }
    const anno = buildAnnotation(start, start, drawingTool);
    setDraft(anno);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!draft) return;
    const current = normalizedPoint(event);
    if (draft.tool === 'pen') {
      setDraft({ ...draft, points: [...draft.points, current] });
      return;
    }
    if ('from' in draft && 'to' in draft) setDraft({ ...draft, to: current } as Annotation);
  };

  const onPointerUp = () => {
    if (!document?.id || !draft) return;
    if (draft.tool === 'pen' && draft.points.length < 2) {
      setDraft(null);
      return;
    }
    addAnnotation(document.id, draft);
    setDraft(null);
  };

  const renderedAnnotations = draft ? [...annotations, draft] : annotations;
  const pageLabel = document ? `${page} / ${Math.max(1, totalPages)}` : 'No PDF loaded';

  const canPrevious = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="viewer-layout">
      <section className="panel glass viewer-toolbar">
        <div className="toolbar-group">
          {tools.map((item) => {
            const Icon = item.icon;
            const active = tool === item.kind;
            return (
              <button key={item.kind} className={`tool-btn ${active ? 'active' : ''}`} onClick={() => setTool(item.kind)}>
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
        <div className="toolbar-group">
          <label className="picker">
            <span>Color</span>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="picker">
            <span>Thickness</span>
            <input type="range" min="1" max="12" value={state.settings.thickness} onChange={(e) => setThickness(Number(e.target.value))} />
          </label>
        </div>
        <div className="toolbar-group">
          <button className="tool-btn" onClick={() => undo(document.id)}><Undo2 size={16} /><span>Undo</span></button>
          <button className="tool-btn" onClick={() => redo(document.id)}><Redo2 size={16} /><span>Redo</span></button>
        </div>
        <div className="toolbar-group zoom-group">
          <button className="tool-btn" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}><Minus size={16} /><span>Zoom</span></button>
          <span className="pill">{Math.round(zoom * 100)}%</span>
          <button className="tool-btn" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)))}><Plus size={16} /></button>
        </div>
        <div className="toolbar-group">
          <button className="tool-btn" disabled={!canPrevious} onClick={() => setPage((p) => Math.max(1, p - 1))}><ArrowLeft size={16} /><span>Prev</span></button>
          <span className="pill">{pageLabel}</span>
          <button className="tool-btn" disabled={!canNext} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><span>Next</span><ArrowRight size={16} /></button>
        </div>
      </section>

      <section className="panel glass viewer-stage" ref={wrapperRef}>
        <div className="section-head">
          <div>
            <div className="eyebrow">PDF viewer</div>
            <h3>{document?.title ?? 'Upload a plan to begin'}</h3>
          </div>
          <select value={document?.id ?? ''} onChange={(e) => setActiveDocument(e.target.value)}>
            {state.documents.map((doc) => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
          </select>
        </div>
        <div className="viewer-surface" ref={stageRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
          {document?.source ? (
            <div className="page-stack" style={{ width: pageSize.width, height: pageSize.height }}>
              <canvas ref={canvasRef} className="pdf-canvas" />
              <svg className="markup-layer" viewBox={`0 0 ${pageSize.width} ${pageSize.height}`} preserveAspectRatio="none">
                <defs>
                  <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0 L7,3.5 L0,7 z" fill={color} />
                  </marker>
                </defs>
                {renderedAnnotations.map((annotation) => {
                  const key = annotation.id;
                  if (annotation.tool === 'pen') {
                    const points = annotation.points.map((p) => `${p.x * pageSize.width},${p.y * pageSize.height}`).join(' ');
                    return <polyline key={key} points={points} fill="none" stroke={annotation.color} strokeWidth={annotation.size} strokeLinecap="round" strokeLinejoin="round" />;
                  }
                  if (annotation.tool === 'text') {
                    return <text key={key} x={annotation.point.x * pageSize.width} y={annotation.point.y * pageSize.height} fill={annotation.color} fontSize={annotation.fontSize} fontWeight={600}>{annotation.text}</text>;
                  }
                  const x1 = annotation.tool === 'rect' || annotation.tool === 'ellipse' ? Math.min(annotation.from.x, annotation.to.x) * pageSize.width : annotation.from.x * pageSize.width;
                  const y1 = annotation.tool === 'rect' || annotation.tool === 'ellipse' ? Math.min(annotation.from.y, annotation.to.y) * pageSize.height : annotation.from.y * pageSize.height;
                  const x2 = annotation.tool === 'rect' || annotation.tool === 'ellipse' ? Math.max(annotation.from.x, annotation.to.x) * pageSize.width : annotation.to.x * pageSize.width;
                  const y2 = annotation.tool === 'rect' || annotation.tool === 'ellipse' ? Math.max(annotation.from.y, annotation.to.y) * pageSize.height : annotation.to.y * pageSize.height;
                  if (annotation.tool === 'rect') return <rect key={key} x={x1} y={y1} width={x2 - x1} height={y2 - y1} fill="rgba(0,0,0,0.05)" stroke={annotation.color} strokeWidth={annotation.size} rx="12" />;
                  if (annotation.tool === 'ellipse') return <ellipse key={key} cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} rx={(x2 - x1) / 2} ry={(y2 - y1) / 2} fill="rgba(0,0,0,0.03)" stroke={annotation.color} strokeWidth={annotation.size} />;
                  return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={annotation.color} strokeWidth={annotation.size} strokeLinecap="round" markerEnd={annotation.tool === 'arrow' ? 'url(#arrowhead)' : undefined} />;
                })}
              </svg>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No PDF selected</h3>
              <p>Upload a plan to start measuring, reviewing, and marking up in real time.</p>
            </div>
          )}
        </div>
      </section>

      <section className="panel glass activity-panel">
        <div className="section-head">
          <div>
            <div className="eyebrow">Markup stream</div>
            <h3>Recent annotations</h3>
          </div>
          <span className="badge">{annotations.length} live</span>
        </div>
        <div className="activity-list">
          {annotations.slice(0, 6).map((annotation) => (
            <button key={annotation.id} className="activity-item" onClick={() => deleteAnnotation(document.id, annotation.id)}>
              <strong>{annotation.tool}</strong>
              <span className="muted">{annotation.user}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
