import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './components/dashboard/DashboardPage';
import MonitorListPage from './components/monitor/MonitorListPage';
import MonitorDetailPage from './components/monitor/MonitorDetailPage';
import TopologyPage from './components/topology/TopologyPage';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  useWebSocket();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/monitors" element={<MonitorListPage />} />
        <Route path="/monitors/:id" element={<MonitorDetailPage />} />
        <Route path="/topology" element={<TopologyPage />} />
      </Route>
    </Routes>
  );
}

export default App;
