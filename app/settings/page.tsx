'use client';

import { useApp } from '@/components/providers';

export default function Page() {
  const { state, setAccent, setDefaultTool, setRoom, setThickness, setUsername } = useApp();

  return (
    <div className="stack-lg">
      <section className="panel glass stack-lg">
        <div>
          <div className="eyebrow">Settings</div>
          <h3>Workspace preferences</h3>
        </div>
        <div className="grid-3">
          <label className="stack-sm">
            <span className="muted">Display name</span>
            <input value={state.settings.username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="stack-sm">
            <span className="muted">Collaboration room</span>
            <input value={state.settings.collaborationRoom} onChange={(e) => setRoom(e.target.value)} />
          </label>
          <label className="stack-sm">
            <span className="muted">Accent</span>
            <input type="color" value={state.settings.accent} onChange={(e) => setAccent(e.target.value)} />
          </label>
        </div>
        <div className="grid-3">
          <label className="stack-sm">
            <span className="muted">Default tool</span>
            <select value={state.settings.defaultTool} onChange={(e) => setDefaultTool(e.target.value as any)}>
              <option value="pen">Pen</option>
              <option value="line">Line</option>
              <option value="arrow">Arrow</option>
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="text">Text</option>
            </select>
          </label>
          <label className="stack-sm">
            <span className="muted">Thickness</span>
            <input type="range" min="1" max="12" value={state.settings.thickness} onChange={(e) => setThickness(Number(e.target.value))} />
          </label>
          <div className="stack-sm">
            <span className="muted">Sync status</span>
            <span className="badge">shared room active</span>
          </div>
        </div>
      </section>
      <section className="panel glass">
        <div className="eyebrow">About</div>
        <p className="muted">Prewire Plans is designed for fast, quiet, Apple-style markups during field planning and review.</p>
      </section>
    </div>
  );
}
