import { useEffect, useState } from 'react';
import { fetchSettings, type Settings } from '../lib/api';

export function useSettings(): { settings: Settings | null; loading: boolean; refresh: () => void } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const s = await fetchSettings();
      setSettings(s);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[settings] load failed', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return { settings, loading, refresh: load };
}
