import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { monitorsApi } from '../../api/monitors';
import { useStore } from '../../store';
import MonitorForm from './MonitorForm';
import type { Monitor } from '../../types/monitor';

export default function MonitorListPage() {
  const { t } = useTranslation('monitor');
  const { t: tc } = useTranslation('common');
  const setMonitors = useStore((s) => s.setMonitors);
  const monitors = useStore((s) => s.monitors);
  const latestResults = useStore((s) => s.latestResults);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Monitor | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const data = await monitorsApi.list();
    setMonitors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return;
    await monitorsApi.delete(id);
    await load();
  };

  const handleEdit = (monitor: Monitor) => {
    setEditing(monitor);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleFormSave = async () => {
    handleFormClose();
    await load();
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
        >
          + {t('addMonitor')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{tc('name')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{tc('protocol')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{tc('target')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{tc('status')}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{tc('latency')}</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{tc('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {monitors.map((m, i) => {
              const result = latestResults[m.id];
              return (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                      {t(`protocols.${m.protocol}`).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">{m.target}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${result?.is_success ? 'bg-green-500' : result ? 'bg-red-500' : 'bg-gray-400'}`} />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {result?.is_success ? tc('success') : result ? tc('failed') : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">
                    {result?.latency_ms != null ? `${result.latency_ms.toFixed(1)}ms` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => handleEdit(m)} className="text-xs px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors">
                      {tc('edit')}
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="text-xs px-3 py-1 rounded bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors">
                      {tc('delete')}
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <MonitorForm monitor={editing} onSave={handleFormSave} onClose={handleFormClose} />
      )}
    </div>
  );
}
