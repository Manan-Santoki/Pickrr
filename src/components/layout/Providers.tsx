'use client';

import { SessionProvider } from 'next-auth/react';
import { SWRConfig } from 'swr';
import { Toaster } from 'sonner';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SWRConfig value={{ fetcher }}>
        {children}
        <Toaster richColors position="top-right" />
      </SWRConfig>
    </SessionProvider>
  );
}
