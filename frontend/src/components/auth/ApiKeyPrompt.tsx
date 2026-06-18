import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { setApiKey } from '../../auth';
import { monitorsApi } from '../../api/monitors';

interface Props {
  onUnlocked: () => void;
}

export default function ApiKeyPrompt({ onUnlocked }: Props) {
  const { t } = useTranslation('common');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setChecking(true);
    setError(null);
    // Store the key tentatively, then verify with a real API call.
    setApiKey(value.trim());
    try {
      await monitorsApi.list();
      onUnlocked();
    } catch {
      setError(t('auth.invalid'));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm"
      >
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          {t('auth.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('auth.description')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('auth.placeholder')}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
            autoFocus
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={checking}
            className="w-full px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {checking ? t('loading') : t('auth.save')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
