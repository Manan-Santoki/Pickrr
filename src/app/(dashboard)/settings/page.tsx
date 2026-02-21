import { auth } from '@/lib/auth';
import { SettingsForm } from '@/components/settings/SettingsForm';

export default async function SettingsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <p className="text-lg font-medium">Admin access required</p>
        <p className="text-sm mt-1">Only admins can view and modify settings</p>
      </div>
    );
  }

  return (
    <div>
      <SettingsForm />
    </div>
  );
}
