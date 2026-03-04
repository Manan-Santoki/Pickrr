'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

const SECTION_CONFIG = [
  {
    title: 'Prowlarr',
    service: 'prowlarr' as const,
    fields: [
      { key: 'PROWLARR_URL', label: 'URL', type: 'url', placeholder: 'http://prowlarr:9696' },
      { key: 'PROWLARR_API_KEY', label: 'API Key', type: 'password', placeholder: 'Prowlarr API key' },
    ],
  },
  {
    title: 'qBittorrent',
    service: 'qbittorrent' as const,
    fields: [
      { key: 'QBIT_URL', label: 'URL', type: 'url', placeholder: 'http://gluetun:8080' },
      { key: 'QBIT_USERNAME', label: 'Username', type: 'text', placeholder: 'admin' },
      { key: 'QBIT_PASSWORD', label: 'Password', type: 'password', placeholder: 'qBittorrent password' },
    ],
  },
  {
    title: 'TMDB',
    service: 'tmdb' as const,
    fields: [
      { key: 'TMDB_API_KEY', label: 'API Key', type: 'password', placeholder: 'TMDB API key' },
    ],
  },
  {
    title: 'Jellyfin',
    service: 'jellyfin' as const,
    fields: [
      { key: 'JELLYFIN_URL', label: 'URL', type: 'url', placeholder: 'http://jellyfin:8096' },
    ],
  },
  {
    title: 'Save Paths',
    service: null,
    fields: [
      { key: 'MOVIES_SAVE_PATH', label: 'Movies Path', type: 'text', placeholder: '/downloads/movies' },
      { key: 'TV_SAVE_PATH', label: 'TV Path', type: 'text', placeholder: '/downloads/tv' },
    ],
  },
] as const;

type SettingsState = {
  PROWLARR_URL: string;
  PROWLARR_API_KEY: string;
  QBIT_URL: string;
  QBIT_USERNAME: string;
  QBIT_PASSWORD: string;
  TMDB_API_KEY: string;
  JELLYFIN_URL: string;
  MOVIES_SAVE_PATH: string;
  TV_SAVE_PATH: string;
};

const DEFAULT_SETTINGS: SettingsState = {
  PROWLARR_URL: '',
  PROWLARR_API_KEY: '',
  QBIT_URL: '',
  QBIT_USERNAME: '',
  QBIT_PASSWORD: '',
  TMDB_API_KEY: '',
  JELLYFIN_URL: '',
  MOVIES_SAVE_PATH: '',
  TV_SAVE_PATH: '',
};

function TestButton({
  service,
  status,
  onTest,
}: {
  service: 'prowlarr' | 'qbittorrent' | 'tmdb' | 'jellyfin';
  status: TestStatus;
  onTest: () => void;
}) {
  return (
    <button
      onClick={onTest}
      disabled={status === 'testing'}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed"
    >
      {status === 'testing' ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {status === 'ok' ? <CheckCircle className="h-3 w-3 text-green-400" /> : null}
      {status === 'fail' ? <XCircle className="h-3 w-3 text-red-400" /> : null}
      {status === 'idle' ? <RefreshCw className="h-3 w-3" /> : null}
      {status === 'testing' ? 'Testing...' : status === 'ok' ? 'Connected' : status === 'fail' ? 'Failed' : `Test ${service}`}
    </button>
  );
}

export function SettingsForm() {
  const [values, setValues] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, TestStatus>>({});

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = (await res.json()) as Partial<SettingsState> & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? 'Failed to load settings');
        }

        setValues({ ...DEFAULT_SETTINGS, ...data });
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  const onChange = (key: keyof SettingsState, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to save settings');
      }

      toast.success('Settings saved');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (service: 'prowlarr' | 'qbittorrent' | 'tmdb' | 'jellyfin') => {
    setTestStatus((prev) => ({ ...prev, [service]: 'testing' }));

    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });

      const data = (await res.json()) as { ok?: boolean; error?: string };
      const nextStatus: TestStatus = data.ok ? 'ok' : 'fail';
      setTestStatus((prev) => ({ ...prev, [service]: nextStatus }));

      if (data.ok) {
        toast.success(`${service} connection successful`);
      } else {
        toast.error(data.error ?? `${service} connection failed`);
      }
    } catch (error: unknown) {
      setTestStatus((prev) => ({ ...prev, [service]: 'fail' }));
      toast.error(error instanceof Error ? error.message : `${service} test failed`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl border border-gray-800 bg-gray-900" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {SECTION_CONFIG.map((section) => (
        <section key={section.title} className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200">{section.title}</h2>
            {section.service ? (
              <TestButton
                service={section.service}
                status={testStatus[section.service] ?? 'idle'}
                onTest={() => handleTest(section.service)}
              />
            ) : null}
          </div>

          <div className="space-y-3">
            {section.fields.map((field) => (
              <label key={field.key} className="block">
                <span className="mb-1 block text-xs text-gray-400">{field.label}</span>
                <input
                  type={field.type}
                  value={values[field.key]}
                  onChange={(event) => onChange(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 bg-gray-950 px-1 py-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-800"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <p className="text-xs text-gray-600">Environment variables override saved values.</p>
      </div>
    </div>
  );
}
