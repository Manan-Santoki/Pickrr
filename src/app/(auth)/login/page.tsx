'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type AuthProvider = 'local' | 'jellyfin';

export default function LoginPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<AuthProvider>('local');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const providerId = provider === 'local' ? 'credentials' : 'jellyfin';
      const result = await signIn(providerId, {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          provider === 'jellyfin'
            ? 'Invalid Jellyfin credentials or Jellyfin URL not configured'
            : 'Invalid username or password'
        );
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">Pickrr</h1>
          <p className="text-gray-400 mt-2 text-sm">Torrent selection for the arr ecosystem</p>
        </div>

        {/* Provider tabs */}
        <div className="flex bg-gray-800 rounded-lg p-0.5 mb-6">
          <button
            type="button"
            onClick={() => setProvider('local')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              provider === 'local'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Local Account
          </button>
          <button
            type="button"
            onClick={() => setProvider('jellyfin')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
              provider === 'jellyfin'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Jellyfin Account
          </button>
        </div>

        {provider === 'jellyfin' && (
          <p className="text-xs text-gray-500 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2 mb-4">
            Requires Jellyfin URL configured in Settings. New users are created with Viewer role.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={provider === 'jellyfin' ? 'Jellyfin username' : 'admin'}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
