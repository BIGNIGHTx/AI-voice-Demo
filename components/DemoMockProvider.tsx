'use client';

import { installDemoFetchMock } from '@/lib/demo-fetch';

installDemoFetchMock();

export default function DemoMockProvider({ children }: { children: React.ReactNode }) {
  installDemoFetchMock();
  return <>{children}</>;
}
