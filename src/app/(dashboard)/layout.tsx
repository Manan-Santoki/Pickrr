import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect('/login');

  const user = session.user as { name?: string | null; role?: string };
  const userRole = user?.role ?? 'viewer';
  const userName = user?.name ?? 'User';

  return (
    <div className="flex h-screen overflow-hidden bg-[#080a0f]">
      <Sidebar userRole={userRole} userName={userName} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
