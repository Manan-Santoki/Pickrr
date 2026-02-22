import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserManagement } from '@/components/users/UserManagement';
import { Lock } from 'lucide-react';

export default async function UsersPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Lock className="w-10 h-10 mb-4 opacity-30" />
        <p className="text-base font-medium text-gray-400">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">User Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create and manage accounts. Roles control what each user can do.
        </p>
      </div>
      <UserManagement />
    </div>
  );
}
