'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  LayoutDashboard,
  ListFilter,
  Search,
  Download,
  History,
  Settings,
  LogOut,
  Users,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/requests',  label: 'Requests',  icon: ListFilter },
  { href: '/search',    label: 'Search',    icon: Search },
  { href: '/discover',  label: 'Discover',  icon: Compass },
  { href: '/downloads', label: 'Downloads', icon: Download },
  { href: '/history',   label: 'History',   icon: History },
];

const adminItems: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
  { href: '/users',    label: 'Users',    icon: Users,    roles: ['admin'] },
];

interface SidebarProps {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const roleColor =
    userRole === 'admin'
      ? 'bg-indigo-500/20 text-indigo-400'
      : userRole === 'selector'
      ? 'bg-blue-500/20 text-blue-400'
      : 'bg-gray-700 text-gray-400';

  return (
    <div className="w-56 flex-shrink-0 bg-[#0f1117] border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Image
            src="/logo.svg"
            alt="Pickrr"
            width={28}
            height={28}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">Pickrr</h1>
            <p className="text-[10px] text-gray-600 mt-0.5">Torrent selector</p>
          </div>
        </div>
      </div>

      <div className="px-3 mb-1">
        <div className="h-px bg-white/5" />
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-1.5 mt-1">
          Navigation
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all group',
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                  : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-indigo-400' : '')} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-indigo-500/60" />}
            </Link>
          );
        })}

        {userRole === 'admin' && (
          <>
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-1.5 mt-4">
              Admin
            </p>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all',
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                      : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-indigo-400' : '')} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-indigo-500/60" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User info + sign out */}
      <div className="px-3 pb-4 pt-3 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-300 uppercase">
              {userName.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-300 truncate">{userName}</p>
            <span className={cn('text-[10px] px-1 py-0.5 rounded font-medium', roleColor)}>
              {userRole}
            </span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2.5 px-2.5 py-2 w-full rounded-md text-sm font-medium text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
