'use client';

import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';

const pageTitles: Record<string, string> = {
  '/': 'Pending Requests',
  '/search': 'Search',
  '/downloads': 'Active Downloads',
  '/history': 'Download History',
  '/settings': 'Settings',
};

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Pickrr';

  return (
    <header className="h-14 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <User className="w-4 h-4" />
        <span>{user?.name ?? 'User'}</span>
      </div>
    </header>
  );
}
