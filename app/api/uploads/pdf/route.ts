import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY?.trim();
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET?.trim();
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER?.trim() ?? 'prewire-plans/pdfs';

function createSignature(params: Record<string, string>) {
  const base = Object.entries(params)
    .filter(([, value]) => value.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('sha1').update(`${base}${CLOUDINARY_API_SECRET}`).digest('hex');
}

export async function POST(request: NextRequest) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return NextResponse.json({ error: 'Cloudinary is not configured.' }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
  }

  if (file.type && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signedParams = {
    folder: CLOUDINARY_FOLDER,
    timestamp,
    unique_filename: 'true',
    use_filename: 'true'
  };
  const signature = createSignature(signedParams);

  const uploadForm = new FormData();
  uploadForm.append('file', file, file.name);
  uploadForm.append('api_key', CLOUDINARY_API_KEY);
  uploadForm.append('timestamp', timestamp);
  uploadForm.append('signature', signature);
  uploadForm.append('folder', CLOUDINARY_FOLDER);
  uploadForm.append('unique_filename', 'true');
  uploadForm.append('use_filename', 'true');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`, {
    method: 'POST',
    body: uploadForm
  });

  const payload = await response.json() as {
    secure_url?: string;
    public_id?: string;
    original_filename?: string;
    bytes?: number;
    error?: { message?: string };
  };

  if (!response.ok || payload.error || !payload.secure_url) {
    return NextResponse.json(
      { error: payload.error?.message ?? 'Cloudinary upload failed.' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    secureUrl: payload.secure_url,
    publicId: payload.public_id ?? null,
    originalFilename: payload.original_filename ?? file.name,
    bytes: payload.bytes ?? file.size
  });
}
