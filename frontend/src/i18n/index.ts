import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common_en from './locales/en/common.json';
import common_zh from './locales/zh/common.json';
import monitor_en from './locales/en/monitor.json';
import monitor_zh from './locales/zh/monitor.json';
import topology_en from './locales/en/topology.json';
import topology_zh from './locales/zh/topology.json';
import dashboard_en from './locales/en/dashboard.json';
import dashboard_zh from './locales/zh/dashboard.json';

const savedLang = localStorage.getItem('language') || navigator.language.startsWith('zh') ? 'zh' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: common_en,
      monitor: monitor_en,
      topology: topology_en,
      dashboard: dashboard_en,
    },
    zh: {
      common: common_zh,
      monitor: monitor_zh,
      topology: topology_zh,
      dashboard: dashboard_zh,
    },
  },
  defaultNS: 'common',
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
