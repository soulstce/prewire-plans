'use client';

import { useApp } from '@/components/providers';
import { useState } from 'react';

export default function Page() {
  const { state, importPdf } = useApp();
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  return (
    <section className="panel glass stack-lg">
      <div>
        <div className="eyebrow">Upload</div>
        <h3>Add a PDF to the current project</h3>
        <p className="muted">PDFs are uploaded to Cloudinary and the hosted URL is synced with the workspace.</p>
      </div>
      <label className="upload-zone">
        <div className="file-input">
          <strong>Drop a PDF or click to choose</strong>
          <input
            type="file"
            accept="application/pdf"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setUploading(true);
              setStatus('Uploading to Cloudinary…');
              try {
                const form = new FormData();
                form.append('file', file);
                const response = await fetch('/api/uploads/pdf', {
                  method: 'POST',
                  body: form
                });
                const payload = await response.json() as {
                  secureUrl?: string;
                  originalFilename?: string;
                  error?: string;
                };
                if (!response.ok || !payload.secureUrl) {
                  throw new Error(payload.error ?? 'Upload failed');
                }
                importPdf(
                  { name: payload.originalFilename ?? file.name, sourceUrl: payload.secureUrl, provider: 'cloudinary' },
                  state.activeProjectId
                );
                setStatus(`${payload.originalFilename ?? file.name} added from Cloudinary to ${state.projects.find((project) => project.id === state.activeProjectId)?.name ?? 'project'}.`);
              } catch (error) {
                console.error('PDF upload failed', error);
                setStatus(`Could not upload ${file.name}. Check Cloudinary configuration and try again.`);
              } finally {
                setUploading(false);
                event.currentTarget.value = '';
              }
            }}
          />
          <span className="muted">Hosted in Cloudinary; markup and room state stay synced through Supabase.</span>
          {status ? <span className="badge">{status}</span> : null}
        </div>
      </label>
    </section>
  );
}
