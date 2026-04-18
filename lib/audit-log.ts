import { db } from '@/lib/db';

export const AUDIT_ACTIONS = [
  'USER_REGISTERED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'PAGE_VIEW',
  'AUDIO_FILE_UPLOADED',
  'AUDIO_ANALYSIS_REQUESTED',
  'AUDIO_FILE_DELETED',
  'AUDIO_FILES_BULK_DELETED',
  'CUSTOMER_PROFILE_UPDATED',
  'WARRANTY_CREATED',
  'WARRANTY_UPDATED',
  'WARRANTY_DELETED',
  'WARRANTY_SYNC_TRIGGERED',
  'USER_ROLE_UPDATED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const isAuditAction = (value: string): value is AuditAction =>
  (AUDIT_ACTIONS as readonly string[]).includes(value);

interface CreateAuditLogInput {
  userId?: string | null;
  action: AuditAction;
  headers: Headers;
  target?: string | null;
  routePath?: string | null;
  metadata?: Record<string, unknown>;
}

const getIpAddress = (headers: Headers): string | null => {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return headers.get('x-real-ip');
};

const serializeMetadata = (metadata: Record<string, unknown> | undefined): string | null => {
  if (!metadata) return null;

  try {
    return JSON.stringify(metadata);
  } catch {
    return JSON.stringify({ note: 'metadata_serialization_failed' });
  }
};

export const createAuditLog = async ({
  userId,
  action,
  headers,
  target,
  routePath,
  metadata,
}: CreateAuditLogInput) => {
  const derivedRoutePath = routePath ?? headers.get('x-pathname') ?? null;

  return db.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      target: target ?? null,
      routePath: derivedRoutePath,
      ipAddress: getIpAddress(headers),
      userAgent: headers.get('user-agent'),
      metadata: serializeMetadata(metadata),
    },
  });
};
