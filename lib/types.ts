export type ToolKind = 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'eraser';

export type Point = {
  x: number;
  y: number;
};

export type AnnotationBase = {
  id: string;
  tool: Exclude<ToolKind, 'eraser'>;
  color: string;
  size: number;
  createdAt: number;
  user: string;
};

export type PenAnnotation = AnnotationBase & {
  tool: 'pen';
  points: Point[];
};

export type LineAnnotation = AnnotationBase & {
  tool: 'line' | 'arrow';
  from: Point;
  to: Point;
};

export type ShapeAnnotation = AnnotationBase & {
  tool: 'rect' | 'ellipse';
  from: Point;
  to: Point;
};

export type TextAnnotation = AnnotationBase & {
  tool: 'text';
  point: Point;
  text: string;
  fontSize: number;
};

export type Annotation = PenAnnotation | LineAnnotation | ShapeAnnotation | TextAnnotation;

export type DocumentRecord = {
  id: string;
  projectId: string;
  title: string;
  source: string | null;
  pageCount: number;
  updatedAt: number;
};

export type ProjectRecord = {
  id: string;
  name: string;
  client: string;
  status: 'Draft' | 'In review' | 'Approved';
  updatedAt: number;
};

export type SettingsRecord = {
  accent: string;
  theme: 'dark';
  username: string;
  collaborationRoom: string;
  defaultTool: Exclude<ToolKind, 'eraser'>;
  thickness: number;
};

export type AppState = {
  projects: ProjectRecord[];
  documents: DocumentRecord[];
  activeProjectId: string;
  activeDocumentId: string;
  annotationsByDocument: Record<string, Annotation[]>;
  settings: SettingsRecord;
  lastSyncAt: number;
};

export type ImportablePdf = {
  name: string;
  dataUrl: string;
};
