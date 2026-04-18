'use client';

import { usePathname } from 'next/navigation';

import Chatbot from '@/components/Chatbot';
import ActivityTracker from '@/components/auth/ActivityTracker';
import { isPublicPath } from '@/lib/auth/routes';

export default function AppClientShell() {
  const pathname = usePathname();
  const shouldHideChatbot = pathname ? isPublicPath(pathname) : false;

  return (
    <>
      <ActivityTracker />
      {shouldHideChatbot ? null : <Chatbot />}
    </>
  );
}
