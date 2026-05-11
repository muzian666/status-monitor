import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import type { Monitor, MonitorCreate, Protocol } from '../../types/monitor';

interface Props {
  monitor: Monitor | null;
  onSave: () => void;
  onClose: () => void;
}

const protocols: Protocol[] = ['ping', 'http', 'https', 'tcp', 'dns'];

export default function MonitorForm({ monitor, onSave, onClose }: Props) {
  const { t } = useTranslation('monitor');
  const [form, setForm] = useState<MonitorCreate>({
    name: monitor?.name || '',
    protocol: monitor?.protocol || 'ping',
    target: monitor?.target || '',
    port: monitor?.port || null,
    interval_seconds: monitor?.interval_seconds || 30,
    timeout_seconds: monitor?.timeout_seconds || 5.0,
    is_active: monitor?.is_active ?? true,
    expected_status: monitor?.expected_status || null,
    dns_record_type: monitor?.dns_record_type || null,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (monitor) {
        await monitorsApi.update(monitor.id, form);
      } else {
        await monitorsApi.create(form);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  const showPort = form.protocol === 'tcp';
  const showHttpStatus = form.protocol === 'http' || form.protocol === 'https';
  const showDnsType = form.protocol === 'dns';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {monitor ? t('editMonitor') : t('addMonitor')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.name_label')}
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('form.name_placeholder')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.protocol_label')}
              </label>
              <select
                value={form.protocol}
                onChange={(e) => setForm({ ...form, protocol: e.target.value as Protocol })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {protocols.map((p) => (
                  <option key={p} value={p}>{t(`protocols.${p}`)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('form.target_label')}
              </label>
              <input
                type="text"
                value={form.target}
                onChange={(e) => setForm({ ...form, target: e.target.value })}
                placeholder={t('form.target_placeholder')}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            {showPort && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.port_label')}
                </label>
                <input
                  type="number"
                  value={form.port || ''}
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || null })}
                  placeholder={t('form.port_placeholder')}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            )}

            {showHttpStatus && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.expected_status_label')}
                </label>
                <input
                  type="number"
                  value={form.expected_status || ''}
                  onChange={(e) => setForm({ ...form, expected_status: parseInt(e.target.value) || null })}
                  placeholder="200"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            )}

            {showDnsType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.dns_record_type_label')}
                </label>
                <select
                  value={form.dns_record_type || 'A'}
                  onChange={(e) => setForm({ ...form, dns_record_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.interval_label')}
                </label>
                <input
                  type="number"
                  value={form.interval_seconds}
                  onChange={(e) => setForm({ ...form, interval_seconds: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  min={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('form.timeout_label')}
                </label>
                <input
                  type="number"
                  step={0.5}
                  value={form.timeout_seconds}
                  onChange={(e) => setForm({ ...form, timeout_seconds: parseFloat(e.target.value) || 5 })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label className="text-sm text-gray-700 dark:text-gray-300">{t('form.is_active_label')}</label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel', { ns: 'common' })}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? t('common.loading', { ns: 'common' }) : t('common.save', { ns: 'common' })}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
