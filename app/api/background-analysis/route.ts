import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BACKGROUND_ANALYSIS_START_DELAY_MS = 2000;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const fileId = typeof payload?.fileId === 'string' ? payload.fileId.trim() : '';

  if (!fileId) {
    return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
  }

  setTimeout(() => {
    void fetch(`${API_BASE}/api/v1/ai/analyze/${encodeURIComponent(fileId)}`, {
      method: 'POST',
    }).catch((error: unknown) => {
      console.error('[background-analysis] Failed to start analysis:', error);
    });
  }, BACKGROUND_ANALYSIS_START_DELAY_MS);

  return NextResponse.json({ accepted: true, fileId }, { status: 202 });
}
