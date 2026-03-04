'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Compass, Download, LogOut, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  userRole: string;
}

export function MobileNav({ userRole }: MobileNavProps) {
  const pathname = usePathname();
  const isSearchActive = pathname === '/' || pathname.startsWith('/movie/') || pathname.startsWith('/tv/');

  return (
    <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0f1117]/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/"
            className={cn(
              'rounded-md px-2.5 py-1.5',
              isSearchActive ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
            )}
          >
            <span className="inline-flex items-center gap-1"><Search className="h-3.5 w-3.5" />Search</span>
          </Link>
          <Link
            href="/downloads"
            className={cn(
              'rounded-md px-2.5 py-1.5',
              pathname.startsWith('/downloads') ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
            )}
          >
            <span className="inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" />Downloads</span>
          </Link>
          <Link
            href="/discover"
            className={cn(
              'rounded-md px-2.5 py-1.5',
              pathname.startsWith('/discover') ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
            )}
          >
            <span className="inline-flex items-center gap-1"><Compass className="h-3.5 w-3.5" />Discover</span>
          </Link>
          {userRole === 'admin' ? (
            <Link
              href="/settings"
              className={cn(
                'rounded-md px-2.5 py-1.5',
                pathname.startsWith('/settings') ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
              )}
            >
              <span className="inline-flex items-center gap-1"><Settings className="h-3.5 w-3.5" />Settings</span>
            </Link>
          ) : null}
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="rounded-md bg-gray-800 p-1.5 text-gray-300"
          title="Sign Out"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
