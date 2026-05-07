'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoomChannel } from '@/lib/collab';
import { loadState, saveState } from '@/lib/storage';
import { seedState } from '@/lib/sample-data';
import type { Annotation, AppState, DocumentRecord, ProjectRecord, ToolKind, ImportablePdf } from '@/lib/types';

type AppContextType = {
  state: AppState;
  setAccent: (accent: string) => void;
  setUsername: (name: string) => void;
  setDefaultTool: (tool: Exclude<ToolKind, 'eraser'>) => void;
  setThickness: (thickness: number) => void;
  setRoom: (room: string) => void;
  setActiveProject: (projectId: string) => void;
  setActiveDocument: (documentId: string) => void;
  addProject: (input: { name: string; client: string }) => void;
  addDocument: (input: { projectId: string; title: string; source: string; pageCount: number }) => void;
  updateDocument: (documentId: string, patch: Partial<DocumentRecord>) => void;
  addAnnotation: (documentId: string, annotation: Annotation) => void;
  replaceAnnotations: (documentId: string, annotations: Annotation[]) => void;
  undo: (documentId: string) => void;
  redo: (documentId: string) => void;
  deleteAnnotation: (documentId: string, annotationId: string) => void;
  importPdf: (payload: ImportablePdf, projectId?: string) => void;
};

const AppContext = createContext<AppContextType | null>(null);

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => seedState());
  const previousRoom = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const shouldSkipBroadcast = useRef(false);
  const historyRef = useRef<Record<string, { past: Annotation[][]; future: Annotation[][] }>>({});

  useEffect(() => {
    const loaded = loadState();
    if (loaded) setState(loaded);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (previousRoom.current === state.settings.collaborationRoom) return;
    channelRef.current?.close();
    channelRef.current = createRoomChannel(state.settings.collaborationRoom);
    previousRoom.current = state.settings.collaborationRoom;
    if (!channelRef.current) return;
    channelRef.current.onmessage = (event) => {
      const incoming = event.data as { state?: AppState; source?: string };
      if (incoming?.state) {
        shouldSkipBroadcast.current = true;
        setState(incoming.state);
      }
    };
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [state.settings.collaborationRoom]);

  useEffect(() => {
    if (shouldSkipBroadcast.current) {
      shouldSkipBroadcast.current = false;
      return;
    }
    if (!channelRef.current) return;
    channelRef.current.postMessage({ state, source: 'local' });
  }, [state]);

  const mutate = (updater: (current: AppState) => AppState) => {
    setState((current) => ({ ...updater(current), lastSyncAt: Date.now() }));
  };

  const activeDocumentId = state.activeDocumentId;

  const pushHistory = (documentId: string, nextAnnotations: Annotation[]) => {
    const store = historyRef.current[documentId] ?? { past: [], future: [] };
    const current = state.annotationsByDocument[documentId] ?? [];
    store.past = [...store.past, current];
    store.future = [];
    historyRef.current[documentId] = store;
    return nextAnnotations;
  };

  const value: AppContextType = useMemo(() => ({
    state,
    setAccent: (accent) => mutate((current) => ({ ...current, settings: { ...current.settings, accent } })),
    setUsername: (name) => mutate((current) => ({ ...current, settings: { ...current.settings, username: name } })),
    setDefaultTool: (tool) => mutate((current) => ({ ...current, settings: { ...current.settings, defaultTool: tool } })),
    setThickness: (thickness) => mutate((current) => ({ ...current, settings: { ...current.settings, thickness } })),
    setRoom: (room) => mutate((current) => ({ ...current, settings: { ...current.settings, collaborationRoom: room } })),
    setActiveProject: (projectId) => mutate((current) => ({ ...current, activeProjectId: projectId, activeDocumentId: current.documents.find((doc) => doc.projectId === projectId)?.id ?? current.activeDocumentId })),
    setActiveDocument: (documentId) => mutate((current) => ({ ...current, activeDocumentId: documentId })),
    addProject: ({ name, client }) => mutate((current) => {
      const project: ProjectRecord = { id: makeId('proj'), name, client, status: 'Draft', updatedAt: Date.now() };
      const documentId = makeId('doc');
      const document: DocumentRecord = { id: documentId, projectId: project.id, title: `${name}.pdf`, source: null, pageCount: 0, updatedAt: Date.now() };
      return {
        ...current,
        projects: [project, ...current.projects],
        documents: [document, ...current.documents],
        annotationsByDocument: { ...current.annotationsByDocument, [documentId]: [] },
        activeProjectId: project.id,
        activeDocumentId: documentId
      };
    }),
    addDocument: ({ projectId, title, source, pageCount }) => mutate((current) => {
      const document: DocumentRecord = { id: makeId('doc'), projectId, title, source, pageCount, updatedAt: Date.now() };
      return {
        ...current,
        documents: [document, ...current.documents],
        annotationsByDocument: { ...current.annotationsByDocument, [document.id]: [] },
        activeProjectId: projectId,
        activeDocumentId: document.id
      };
    }),
    updateDocument: (documentId, patch) => mutate((current) => ({
      ...current,
      documents: current.documents.map((doc) => (doc.id === documentId ? { ...doc, ...patch, updatedAt: Date.now() } : doc))
    })),
    addAnnotation: (documentId, annotation) => mutate((current) => {
      const next = pushHistory(documentId, [...(current.annotationsByDocument[documentId] ?? []), annotation]);
      return { ...current, annotationsByDocument: { ...current.annotationsByDocument, [documentId]: next } };
    }),
    replaceAnnotations: (documentId, annotations) => mutate((current) => ({
      ...current,
      annotationsByDocument: { ...current.annotationsByDocument, [documentId]: annotations }
    })),
    undo: (documentId) => mutate((current) => {
      const store = historyRef.current[documentId];
      const currentAnnotations = current.annotationsByDocument[documentId] ?? [];
      if (!currentAnnotations.length) return current;
      const nextPast = store?.past ?? [];
      const prev = nextPast.at(-1) ?? [];
      const future = store?.future ?? [];
      historyRef.current[documentId] = {
        past: nextPast.slice(0, -1),
        future: [currentAnnotations, ...future]
      };
      return { ...current, annotationsByDocument: { ...current.annotationsByDocument, [documentId]: prev } };
    }),
    redo: (documentId) => mutate((current) => {
      const store = historyRef.current[documentId];
      const future = store?.future ?? [];
      if (!future.length) return current;
      const next = future[0];
      historyRef.current[documentId] = {
        past: [...(store?.past ?? []), current.annotationsByDocument[documentId] ?? []],
        future: future.slice(1)
      };
      return { ...current, annotationsByDocument: { ...current.annotationsByDocument, [documentId]: next } };
    }),
    deleteAnnotation: (documentId, annotationId) => mutate((current) => {
      const next = (current.annotationsByDocument[documentId] ?? []).filter((annotation) => annotation.id !== annotationId);
      return { ...current, annotationsByDocument: { ...current.annotationsByDocument, [documentId]: next } };
    }),
    importPdf: (payload, projectId) => {
      mutate((current) => {
        const selectedProjectId = projectId ?? current.activeProjectId;
        const documentId = makeId('doc');
        const document: DocumentRecord = { id: documentId, projectId: selectedProjectId, title: payload.name, source: payload.dataUrl, pageCount: 0, updatedAt: Date.now() };
        return {
          ...current,
          documents: [document, ...current.documents],
          annotationsByDocument: { ...current.annotationsByDocument, [document.id]: [] },
          activeDocumentId: document.id,
          activeProjectId: selectedProjectId
        };
      });
    }
  }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProviders');
  return ctx;
}
