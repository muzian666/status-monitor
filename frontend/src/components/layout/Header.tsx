import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../store';
import { useWebSocket } from '../../hooks/useWebSocket';

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function LatencyBar({ ms }: { ms: number }) {
  const pct = Math.min(ms / 200, 1) * 100;
  const color = ms < 30 ? 'bg-green-500' : ms < 80 ? 'bg-yellow-500' : ms < 150 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono w-14 text-right">{ms.toFixed(0)}ms</span>
    </div>
  );
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const { isConnected, latencyMs, connectedAt } = useWebSocket();
  const setLanguage = useStore((s) => s.setLanguage);
  const [showTooltip, setShowTooltip] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'zh' : 'en';
    i18n.changeLanguage(newLang);
    setLanguage(newLang as 'en' | 'zh');
  };

  const backendUrl = `${window.location.host}/api/v1`;

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex items-center gap-2 cursor-default">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isConnected ? t('common.connected') : t('common.disconnected')}
          </span>
        </div>

        {showTooltip && (
          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 space-y-3">
            {/* Backend address */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">
                {t('header.backendUrl')}
              </p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md select-all">
                {backendUrl}
              </p>
            </div>

            {/* Connection status */}
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">
                {t('header.connectionStatus')}
              </p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isConnected ? t('common.connected') : t('common.disconnected')}
                </span>
                {connectedAt && isConnected && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    · {formatDuration(Date.now() - connectedAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Latency */}
            {isConnected && latencyMs !== null && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">
                  {t('header.wsLatency')}
                </p>
                <LatencyBar ms={latencyMs} />
              </div>
            )}

            {/* Troubleshooting tips (shown when disconnected) */}
            {!isConnected && (
              <div>
                <p className="text-[11px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold mb-1">
                  {t('header.troubleshooting')}
                </p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-disc list-inside">
                  <li>{t('header.tip1')}</li>
                  <li>{t('header.tip2')}</li>
                  <li>{t('header.tip3')}</li>
                  <li>{t('header.tip4')}</li>
                </ul>
              </div>
            )}
          </div>
        )}
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
