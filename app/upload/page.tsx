'use client';

import { useApp } from '@/components/providers';
import { useState } from 'react';

export default function Page() {
  const { state, importPdf } = useApp();
  const [status, setStatus] = useState('');

  return (
    <section className="panel glass stack-lg">
      <div>
        <div className="eyebrow">Upload</div>
        <h3>Add a PDF to the current project</h3>
        <p className="muted">Choose a plan file and it becomes available in the viewer immediately.</p>
      </div>
      <label className="upload-zone">
        <div className="file-input">
          <strong>Drop a PDF or click to choose</strong>
          <input
            type="file"
            accept="application/pdf"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(reader.error);
                reader.readAsDataURL(file);
              });
              importPdf({ name: file.name, dataUrl }, state.activeProjectId);
              setStatus(`${file.name} added to ${state.projects.find((project) => project.id === state.activeProjectId)?.name ?? 'project'}.`);
            }}
          />
          <span className="muted">Files stay in browser storage for this workspace.</span>
          {status ? <span className="badge">{status}</span> : null}
        </div>
      </label>
    </section>
  );
}
