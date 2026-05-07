'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useApp } from './providers';

export function Dashboard() {
  const { state } = useApp();
  const stats = useMemo(() => {
    const docs = state.documents.length;
    const projects = state.projects.length;
    const annotations = Object.values(state.annotationsByDocument).reduce((sum, items) => sum + items.length, 0);
    return { docs, projects, annotations };
  }, [state]);

  return (
    <div className="stack-lg">
      <section className="hero glass">
        <div>
          <div className="eyebrow">Dashboard</div>
          <h2>Review plans with a calm, high-contrast workspace.</h2>
          <p>
            Upload a PDF, mark it up with precision, and keep collaborators in sync while you stay in the flow.
          </p>
          <div className="hero-actions">
            <Link href="/viewer" className="btn btn-primary">Open viewer</Link>
            <Link href="/projects" className="btn btn-secondary">Browse projects</Link>
          </div>
        </div>
        <div className="hero-panel">
          <div className="stat-card"><span>Projects</span><strong>{stats.projects}</strong></div>
          <div className="stat-card"><span>Documents</span><strong>{stats.docs}</strong></div>
          <div className="stat-card"><span>Markups</span><strong>{stats.annotations}</strong></div>
        </div>
      </section>
      <section className="grid-3">
        <article className="panel glass">
          <h3>Live collaboration</h3>
          <p>Annotation updates sync instantly across tabs using a shared room broadcast layer.</p>
        </article>
        <article className="panel glass">
          <h3>PDF tooling</h3>
          <p>Zoom, pan, page navigation, and a drawing layer with pen, line, arrow, shapes, text, and eraser.</p>
        </article>
        <article className="panel glass">
          <h3>Device ready</h3>
          <p>The layout collapses cleanly for mobile, tablet, and desktop review sessions.</p>
        </article>
      </section>
      <section className="panel glass">
        <div className="section-head">
          <div>
            <div className="eyebrow">Recent projects</div>
            <h3>Fast access to active reviews</h3>
          </div>
          <Link href="/projects" className="link">See all</Link>
        </div>
        <div className="list">
          {state.projects.slice(0, 3).map((project) => (
            <div className="list-row" key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <div className="muted">{project.client}</div>
              </div>
              <span className="pill">{project.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
