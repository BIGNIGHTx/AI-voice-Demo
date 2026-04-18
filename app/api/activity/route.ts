import { NextRequest, NextResponse } from 'next/server';

import { createAuditLog } from '@/lib/audit-log';
import { getRequestSessionUser } from '@/lib/auth/request';
import { isAuditAction, type AuditAction } from '@/lib/audit-log';

const asRecord = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toMetadata = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

interface ParsedActivityPayload {
  action: AuditAction;
  target?: string | null;
  routePath?: string | null;
  metadata?: Record<string, unknown>;
}

const parseActivityPayload = (payload: unknown): ParsedActivityPayload | null => {
  const body = asRecord(payload);
  if (!body) return null;

  const action = toText(body.action).toUpperCase();
  const path = toText(body.path);
  const target = toText(body.target);
  const routePath = toText(body.routePath);
  const metadata = toMetadata(body.metadata);

  if (path) {
    if (!path.startsWith('/')) return null;

    return {
      action: 'PAGE_VIEW',
      target: path,
      routePath: path,
      metadata,
    };
  }

  if (!action || !isAuditAction(action)) {
    return null;
  }

  if (action === 'PAGE_VIEW') {
    const pagePath = routePath || target;
    if (!pagePath || !pagePath.startsWith('/')) return null;

    return {
      action,
      target: target || pagePath,
      routePath: pagePath,
      metadata,
    };
  }

  return {
    action,
    target: target || null,
    routePath: routePath || null,
    metadata,
  };
};

export async function POST(request: NextRequest) {
  const sessionUser = await getRequestSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const activity = parseActivityPayload(payload);

  if (!activity) {
    return NextResponse.json({ message: 'Invalid activity payload' }, { status: 400 });
  }

  await createAuditLog({
    userId: sessionUser.id,
    action: activity.action,
    headers: request.headers,
    target: activity.target,
    routePath: activity.routePath,
    metadata: activity.metadata,
  });

  return NextResponse.json({ success: true });
}
