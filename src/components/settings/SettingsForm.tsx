'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const SETTING_FIELDS = [
  { section: 'Prowlarr', fields: [
    { key: 'PROWLARR_URL', label: 'URL', type: 'url' },
    { key: 'PROWLARR_API_KEY', label: 'API Key', type: 'password' },
  ]},
  { section: 'qBittorrent', fields: [
    { key: 'QBIT_URL', label: 'URL', type: 'url' },
    { key: 'QBIT_USERNAME', label: 'Username', type: 'text' },
    { key: 'QBIT_PASSWORD', label: 'Password', type: 'password' },
  ]},
  { section: 'Radarr', fields: [
    { key: 'RADARR_URL', label: 'URL', type: 'url' },
    { key: 'RADARR_API_KEY', label: 'API Key', type: 'password' },
  ]},
  { section: 'Sonarr', fields: [
    { key: 'SONARR_URL', label: 'URL', type: 'url' },
    { key: 'SONARR_API_KEY', label: 'API Key', type: 'password' },
  ]},
  { section: 'Overseerr', fields: [
    { key: 'OVERSEERR_URL', label: 'URL', type: 'url' },
    { key: 'OVERSEERR_API_KEY', label: 'API Key', type: 'password' },
  ]},
  { section: 'TMDB', fields: [
    { key: 'TMDB_API_KEY', label: 'API Key', type: 'password' },
  ]},
  { section: 'Download Paths', fields: [
    { key: 'MOVIES_SAVE_PATH', label: 'Movies Save Path', type: 'text' },
    { key: 'TV_SAVE_PATH', label: 'TV Save Path', type: 'text' },
  ]},
  { section: 'Auto-Select', fields: [
    { key: 'AUTO_SELECT_HOURS', label: 'Auto-select after X hours (0 = disabled)', type: 'number' },
  ]},
];

export function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {SETTING_FIELDS.map(({ section, fields }) => (
        <div key={section} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
            {section}
          </h3>
          <div className="space-y-3">
            {fields.map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  value={values[key] ?? ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder={`Enter ${label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
