import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const navItems = [
  { path: '/', icon: '📊', key: 'nav.dashboard' },
  { path: '/monitors', icon: '📡', key: 'nav.monitors' },
  { path: '/topology', icon: '🌐', key: 'nav.topology' },
  { path: '/settings', icon: '⚙️', key: 'nav.settings' },
];

export default function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t('app.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('app.subtitle')}
        </p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {t(item.key)}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
