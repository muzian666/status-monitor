import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { settingsApi } from '../../api/settings';
import type { Setting } from '../../types/settings';

export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    settingsApi
      .list()
      .then((rows) => {
        setSettings(rows);
        setValues(Object.fromEntries(rows.map((r) => [r.key, r.value])));
      })
      .catch(() => setMessage({ kind: 'err', text: 'Failed to load settings' }))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => {
    return settings.some((s) => values[s.key] !== s.value);
  }, [settings, values]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await settingsApi.update(values);
      setSettings(updated);
      setValues(Object.fromEntries(updated.map((r) => [r.key, r.value])));
      setMessage({ kind: 'ok', text: t('saved') });
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message;
      setMessage({ kind: 'err', text: t('error', { message: detail }) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">{t('subtitle')}</p>
      </motion.div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6 max-w-2xl">
        {settings.map((s) => (
          <div key={s.key}>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t(`fields.${s.key}.label`)}
              </label>
              {s.overridden && (
                <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400">
                  {t('overridden')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2">
              {t(`fields.${s.key}.desc`)}
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={s.min}
                max={s.max}
                value={values[s.key] ?? s.value}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [s.key]: parseInt(e.target.value, 10) }))
                }
                className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-400">{t(`unit.${s.unit}`)}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {t('default', { value: s.default })}
              </span>
            </div>
          </div>
        ))}

        {message && (
          <p className={`text-sm ${message.kind === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
