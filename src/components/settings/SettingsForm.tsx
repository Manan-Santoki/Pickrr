'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, RefreshCw, Info, ChevronDown, ChevronRight } from 'lucide-react';

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail';

const SETTING_SECTIONS = [
  {
    section: 'Prowlarr',
    service: 'prowlarr' as const,
    description: 'Indexer aggregator — powers all torrent searches',
    fields: [
      { key: 'PROWLARR_URL', label: 'URL', type: 'url', placeholder: 'http://prowlarr:9696' },
      { key: 'PROWLARR_API_KEY', label: 'API Key', type: 'password', placeholder: 'Your Prowlarr API key' },
    ],
  },
  {
    section: 'qBittorrent',
    service: 'qbittorrent' as const,
    description: 'Download client — receives selected torrents',
    fields: [
      { key: 'QBIT_URL', label: 'URL', type: 'url', placeholder: 'http://qbittorrent:8080' },
      { key: 'QBIT_USERNAME', label: 'Username', type: 'text', placeholder: 'admin' },
      { key: 'QBIT_PASSWORD', label: 'Password', type: 'password', placeholder: 'Your qBittorrent password' },
    ],
  },
  {
    section: 'Radarr',
    service: 'radarr' as const,
    description: 'Movie manager — imports completed movie downloads',
    fields: [
      { key: 'RADARR_URL', label: 'URL', type: 'url', placeholder: 'http://radarr:7878' },
      { key: 'RADARR_API_KEY', label: 'API Key', type: 'password', placeholder: 'Your Radarr API key' },
    ],
  },
  {
    section: 'Sonarr',
    service: 'sonarr' as const,
    description: 'TV Show manager — imports completed episode downloads',
    fields: [
      { key: 'SONARR_URL', label: 'URL', type: 'url', placeholder: 'http://sonarr:8989' },
      { key: 'SONARR_API_KEY', label: 'API Key', type: 'password', placeholder: 'Your Sonarr API key' },
    ],
  },
  {
    section: 'Overseerr',
    service: 'overseerr' as const,
    description: 'Request manager — source of media requests',
    fields: [
      { key: 'OVERSEERR_URL', label: 'URL', type: 'url', placeholder: 'http://overseerr:5055' },
      { key: 'OVERSEERR_API_KEY', label: 'API Key', type: 'password', placeholder: 'Your Overseerr API key' },
    ],
  },
  {
    section: 'TMDB',
    service: undefined,
    description: 'Metadata — posters, ratings, overviews',
    fields: [
      { key: 'TMDB_API_KEY', label: 'API Key', type: 'password', placeholder: 'Get free key at themoviedb.org' },
    ],
  },
  {
    section: 'Download Paths',
    service: undefined,
    description: 'Where qBittorrent saves files (must be accessible to Radarr/Sonarr)',
    fields: [
      { key: 'MOVIES_SAVE_PATH', label: 'Movies Path', type: 'text', placeholder: '/downloads/movies' },
      { key: 'TV_SAVE_PATH', label: 'TV Shows Path', type: 'text', placeholder: '/downloads/tv' },
    ],
  },
  {
    section: 'Auto-Select',
    service: undefined,
    description: 'Automatically grab the top result after N hours if no one selects (0 = disabled)',
    fields: [
      { key: 'AUTO_SELECT_HOURS', label: 'Hours until auto-select', type: 'number', placeholder: '0' },
    ],
  },
  {
    section: 'Jellyfin',
    service: 'jellyfin' as const,
    description: 'Allow Jellyfin users to log in with their Jellyfin credentials',
    fields: [
      { key: 'JELLYFIN_URL', label: 'URL', type: 'url', placeholder: 'http://jellyfin:8096' },
      { key: 'JELLYFIN_API_KEY', label: 'API Key', type: 'password', placeholder: 'Your Jellyfin API key' },
    ],
  },
];

function TestButton({
  service,
  status,
  onTest,
}: {
  service: string;
  status: TestStatus;
  onTest: () => void;
}) {
  return (
    <button
      onClick={onTest}
      disabled={status === 'testing'}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors border
        bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 disabled:cursor-not-allowed"
    >
      {status === 'testing' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'ok' && <CheckCircle className="w-3 h-3 text-green-400" />}
      {status === 'fail' && <XCircle className="w-3 h-3 text-red-400" />}
      {status === 'idle' && <RefreshCw className="w-3 h-3" />}
      {status === 'testing' ? 'Testing...' : status === 'ok' ? 'Connected' : status === 'fail' ? 'Failed' : 'Test'}
    </button>
  );
}

function SetupGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-gray-200">
            How to configure Radarr & Sonarr for Pickrr
          </span>
        </div>
        {open ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 text-sm text-gray-400 space-y-4 border-t border-gray-800">
          <p className="pt-4 text-gray-300">
            Pickrr intercepts the auto-selection process. To prevent Radarr/Sonarr from
            auto-grabbing torrents while Pickrr handles selection, follow these steps:
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="text-gray-200 font-medium mb-1">1. Disable automatic search in Radarr</h4>
              <ul className="space-y-1 pl-4 list-disc text-gray-500">
                <li>Radarr → Settings → Indexers</li>
                <li>For each indexer: uncheck <span className="text-gray-300">Enable Automatic Search</span></li>
                <li>Uncheck <span className="text-gray-300">Enable RSS Sync</span> to stop auto-grabs</li>
                <li>OR: Radarr → Settings → General → uncheck <span className="text-gray-300">Automatically Search</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-200 font-medium mb-1">2. Disable automatic search in Sonarr</h4>
              <ul className="space-y-1 pl-4 list-disc text-gray-500">
                <li>Sonarr → Settings → Indexers</li>
                <li>For each indexer: uncheck <span className="text-gray-300">Enable Automatic Search</span></li>
                <li>Uncheck <span className="text-gray-300">Enable RSS Sync</span></li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-200 font-medium mb-1">3. Configure qBittorrent as download client</h4>
              <ul className="space-y-1 pl-4 list-disc text-gray-500">
                <li>Radarr → Settings → Download Clients → Add qBittorrent</li>
                <li>Set <span className="text-gray-300">Category</span> to <code className="bg-gray-800 px-1 rounded text-indigo-300">pickrr</code></li>
                <li>Radarr will auto-import completed downloads in the <span className="text-gray-300">pickrr</span> category</li>
                <li>Do the same in Sonarr</li>
              </ul>
            </div>

            <div>
              <h4 className="text-gray-200 font-medium mb-1">4. Configure Overseerr webhook</h4>
              <ul className="space-y-1 pl-4 list-disc text-gray-500">
                <li>Overseerr → Settings → Notifications → Webhook</li>
                <li>URL: <code className="bg-gray-800 px-1 rounded text-indigo-300">https://pickrr.yourdomain.com/api/webhook/overseerr</code></li>
                <li>Secret: same value as <code className="bg-gray-800 px-1 rounded text-indigo-300">WEBHOOK_SECRET</code> env var</li>
                <li>Enable: <span className="text-gray-300">MEDIA_APPROVED</span> and <span className="text-gray-300">MEDIA_AUTO_APPROVED</span></li>
              </ul>
            </div>

            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg p-3">
              <p className="text-indigo-300 text-xs">
                <strong>Flow after setup:</strong> User requests media on Overseerr →
                webhook fires to Pickrr → request appears in dashboard →
                admin selects torrent → sent to qBittorrent in &quot;pickrr&quot; category →
                Radarr/Sonarr sees completed download and imports it →
                Overseerr marks as available.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testStatuses, setTestStatuses] = useState<Record<string, TestStatus>>({});

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => setValues(data))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save');
      toast.success('Settings saved successfully');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (service: string) => {
    setTestStatuses((prev) => ({ ...prev, [service]: 'testing' }));
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service }),
      });
      const data = await res.json();
      const status: TestStatus = data.ok ? 'ok' : 'fail';
      setTestStatuses((prev) => ({ ...prev, [service]: status }));
      if (data.ok) {
        toast.success(`${service} connection successful`);
      } else {
        toast.error(`${service} connection failed — check URL and API key`);
      }
    } catch {
      setTestStatuses((prev) => ({ ...prev, [service]: 'fail' }));
      toast.error(`${service} test failed`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <SetupGuide />

      {SETTING_SECTIONS.map(({ section, service, description, fields }) => (
        <div key={section} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
              {section}
            </h3>
            {service && (
              <TestButton
                service={service}
                status={testStatuses[service] ?? 'idle'}
                onTest={() => handleTest(service)}
              />
            )}
          </div>
          {description && (
            <p className="text-xs text-gray-600 mb-4">{description}</p>
          )}
          <div className="space-y-3">
            {fields.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  value={values[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3 sticky bottom-0 bg-gray-950 py-4 -mx-1 px-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <p className="text-xs text-gray-600">
          Settings override environment variables without restarting the app.
        </p>
      </div>
    </div>
  );
}
