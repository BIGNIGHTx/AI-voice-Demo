import type { AuditAction } from '@/lib/audit-log';

interface LogClientActivityInput {
  action: AuditAction;
  target?: string | null;
  routePath?: string | null;
  metadata?: Record<string, unknown>;
}

export const logClientActivity = async ({
  action,
  target,
  routePath,
  metadata,
}: LogClientActivityInput): Promise<void> => {
  try {
    await fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        target,
        routePath,
        metadata,
      }),
      keepalive: true,
    });
  } catch {
    // Ignore logging failures so the main user flow is not interrupted.
  }
};
