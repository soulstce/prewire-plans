'use client';

import { useMemo, useState } from 'react';
import { useApp } from './providers';

export function ProjectBrowser() {
  const { state, addProject, setActiveProject, setActiveDocument } = useApp();
  const [name, setName] = useState('');
  const [client, setClient] = useState('');

  const docsByProject = useMemo(() => {
    return Object.fromEntries(state.projects.map((project) => [project.id, state.documents.filter((doc) => doc.projectId === project.id)]));
  }, [state]);

  return (
    <div className="stack-lg">
      <section className="panel glass">
        <div className="section-head">
          <div>
            <div className="eyebrow">Projects</div>
            <h3>Your plan sets</h3>
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) return;
              addProject({ name, client: client || 'New client' });
              setName('');
              setClient('');
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New project" />
            <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Client" />
            <button className="btn btn-primary" type="submit">Create</button>
          </form>
        </div>
        <div className="list">
          {state.projects.map((project) => (
            <button key={project.id} className="list-row buttonish" onClick={() => {
              setActiveProject(project.id);
              const first = docsByProject[project.id]?.[0];
              if (first) setActiveDocument(first.id);
            }}>
              <div>
                <strong>{project.name}</strong>
                <div className="muted">{project.client}</div>
              </div>
              <div className="row-gap">
                <span className="pill">{docsByProject[project.id]?.length ?? 0} docs</span>
                <span className="pill dim">{project.status}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
