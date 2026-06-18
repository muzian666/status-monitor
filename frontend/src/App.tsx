import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './components/dashboard/DashboardPage';
import MonitorListPage from './components/monitor/MonitorListPage';
import MonitorDetailPage from './components/monitor/MonitorDetailPage';
import TopologyPage from './components/topology/TopologyPage';
import SettingsPage from './components/settings/SettingsPage';
import ApiKeyPrompt from './components/auth/ApiKeyPrompt';
import { useWebSocket } from './hooks/useWebSocket';
import { getApiKey, isAuthRequired } from './auth';

function AuthenticatedApp() {
  useWebSocket();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/monitors" element={<MonitorListPage />} />
        <Route path="/monitors/:id" element={<MonitorDetailPage />} />
        <Route path="/topology" element={<TopologyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    isAuthRequired()
      .then((required) => setAuthed(!required || !!getApiKey()))
      .catch(() => setAuthed(true)) // fail open
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!authed) {
    return <ApiKeyPrompt onUnlocked={() => setAuthed(true)} />;
  }

  return <AuthenticatedApp />;
}
