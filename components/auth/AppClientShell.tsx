'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

import ActivityTracker from '@/components/auth/ActivityTracker';
import { isPublicPath } from '@/lib/auth/routes';

const Chatbot = dynamic(() => import('@/components/Chatbot'), {
  ssr: false,
});

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
