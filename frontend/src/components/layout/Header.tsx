import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function Header() {
  const { t, i18n } = useTranslation();
  const { isConnected } = useWebSocket();
  const setLanguage = useStore((s) => s.setLanguage);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    setLanguage(newLang as 'en' | 'zh');
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {isConnected ? t('common.connected') : t('common.disconnected')}
        </span>
      </div>
      <button
        onClick={toggleLanguage}
        className="px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
      >
        {i18n.language === 'en' ? '中文' : 'English'}
      </button>
    </header>
  );
}
