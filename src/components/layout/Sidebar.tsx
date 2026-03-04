'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Download, LogOut, Search, Settings, ChevronRight, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  userRole: string;
  userName: string;
}

const navItems = [
  { href: '/', label: 'Search', icon: Search },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/downloads', label: 'Downloads', icon: Download },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-56 flex-shrink-0 flex-col border-r border-white/5 bg-[#0f1117] md:flex">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Pickrr" width={28} height={28} className="rounded-lg" />
          <div>
            <h1 className="text-sm font-bold leading-none text-white tracking-tight">Pickrr</h1>
            <p className="mt-0.5 text-[10px] text-gray-600">TMDB + Prowlarr + qBittorrent</p>
          </div>
        </div>
      </div>

      <div className="mb-1 px-3">
        <div className="h-px bg-white/5" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="mb-1.5 mt-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
          Navigation
        </p>

        {navItems.map(({ href, label, icon: Icon }) => {
          const isSearchDetail = href === '/' && (pathname.startsWith('/movie/') || pathname.startsWith('/tv/'));
          const isActive = pathname === href || isSearchDetail || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'border-indigo-500/20 bg-indigo-600/20 text-indigo-300'
                  : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-200'
              )}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-indigo-400' : '')} />
              <span className="flex-1">{label}</span>
              {isActive ? <ChevronRight className="h-3 w-3 text-indigo-500/60" /> : null}
            </Link>
          );
        })}

        {userRole === 'admin' ? (
          <Link
            href="/settings"
            className={cn(
              'mt-4 flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-sm font-medium transition-all',
              pathname.startsWith('/settings')
                ? 'border-indigo-500/20 bg-indigo-600/20 text-indigo-300'
                : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-200'
            )}
          >
            <Settings className={cn('h-4 w-4 flex-shrink-0', pathname.startsWith('/settings') ? 'text-indigo-400' : '')} />
            <span className="flex-1">Settings</span>
            {pathname.startsWith('/settings') ? <ChevronRight className="h-3 w-3 text-indigo-500/60" /> : null}
          </Link>
        ) : null}
      </nav>

      <div className="space-y-2 border-t border-white/5 px-3 pb-4 pt-3">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800">
            <span className="text-xs font-semibold uppercase text-gray-300">{userName.charAt(0)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-gray-300">{userName}</p>
            <p className="text-[10px] uppercase text-gray-500">{userRole}</p>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-300"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
