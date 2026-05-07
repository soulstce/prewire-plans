import type { AppState } from './types';

const now = Date.now();

export const seedState = (): AppState => ({
  projects: [
    { id: 'proj-alpha', name: 'North Tower Lobby', client: 'Aster Group', status: 'In review', updatedAt: now - 3600_000 },
    { id: 'proj-beta', name: 'Lake House Renovation', client: 'Morrow Studio', status: 'Draft', updatedAt: now - 86_400_000 }
  ],
  documents: [
    { id: 'doc-alpha', projectId: 'proj-alpha', title: 'Lobby Electrical Markups.pdf', source: null, pageCount: 0, updatedAt: now - 3600_000 },
    { id: 'doc-beta', projectId: 'proj-beta', title: 'Kitchen Expansion.pdf', source: null, pageCount: 0, updatedAt: now - 86_400_000 }
  ],
  activeProjectId: 'proj-alpha',
  activeDocumentId: 'doc-alpha',
  annotationsByDocument: {
    'doc-alpha': [
      {
        id: 'a1',
        tool: 'rect',
        from: { x: 0.18, y: 0.22 },
        to: { x: 0.48, y: 0.36 },
        color: '#b56cff',
        size: 3,
        createdAt: now - 1800_000,
        user: 'James'
      },
      {
        id: 'a2',
        tool: 'text',
        point: { x: 0.2, y: 0.18 },
        text: 'Shift this fixture 12"',
        color: '#f5f7ff',
        size: 2,
        fontSize: 18,
        createdAt: now - 1700_000,
        user: 'Mia'
      }
    ],
    'doc-beta': []
  },
  settings: {
    accent: '#a855f7',
    theme: 'dark',
    username: 'James',
    collaborationRoom: 'north-tower-review',
    defaultTool: 'pen',
    thickness: 3
  },
  lastSyncAt: now
});
