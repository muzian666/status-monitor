import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ open, name, onConfirm, onCancel }: Props) {
  const { t } = useTranslation('monitor');
  const { t: tc } = useTranslation('common');
  const [input, setInput] = useState('');
  const match = input === name;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('deleteConfirm')}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-red-600 dark:text-red-400">{name}</span>
              {' — '}
              {t('deleteHint')}
            </p>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={name}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />

            {input.length > 0 && !match && (
              <p className="text-xs text-red-500">{t('deleteMismatch')}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setInput(''); onCancel(); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {tc('cancel')}
              </button>
              <button
                onClick={() => { if (match) { setInput(''); onConfirm(); } }}
                disabled={!match}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {tc('confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
