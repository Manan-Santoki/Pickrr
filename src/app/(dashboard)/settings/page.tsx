import { auth } from '@/lib/auth';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { Lock } from 'lucide-react';

export default async function SettingsPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Lock className="w-10 h-10 mb-4 opacity-30" />
        <p className="text-lg font-medium">Admin access required</p>
        <p className="text-sm mt-1">Only admins can view and modify settings</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure API connections and download paths.</p>
      </div>
      <SettingsForm />
    </div>
  );
}
