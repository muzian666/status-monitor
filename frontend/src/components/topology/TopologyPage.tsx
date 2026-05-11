import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TopologyCanvas from './TopologyCanvas';

type Mode = 'auto' | 'manual';

export default function TopologyPage() {
  const { t } = useTranslation('topology');
  const [mode, setMode] = useState<Mode>('auto');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setMode('auto')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'auto'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t('autoMode')}
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              mode === 'manual'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t('manualMode')}
          </button>
        </div>
      </div>
      <TopologyCanvas mode={mode} />
    </div>
  );
}
