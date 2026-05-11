import { useTranslation } from 'react-i18next';

interface Props {
  targetHost: string;
  setTargetHost: (v: string) => void;
  tracing: boolean;
  onTrace: () => void;
}

export default function AutoTracePanel({ targetHost, setTargetHost, tracing, onTrace }: Props) {
  const { t } = useTranslation('topology');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <h3 className="font-semibold text-gray-900 dark:text-white">{t('autoMode')}</h3>
      <div>
        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">{t('targetHost')}</label>
        <input
          type="text"
          value={targetHost}
          onChange={(e) => setTargetHost(e.target.value)}
          placeholder="e.g., google.com"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          disabled={tracing}
        />
      </div>
      <button
        onClick={onTrace}
        disabled={tracing || !targetHost.trim()}
        className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium transition-colors"
      >
        {tracing ? t('tracing') : t('startTrace')}
      </button>
    </div>
  );
}
