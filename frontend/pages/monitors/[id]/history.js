import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import HistoryTable from '../../../components/HistoryTable';
import LatencyChart from '../../../components/LatencyChart';
import UptimeChart from '../../../components/UptimeChart';
import { monitorsAPI, checksAPI } from '../../../lib/api';
import { formatRelativeTime } from '../../../lib/utils';
import { StatusIndicator } from '../../../components/StatusBadge';
import { useAuth } from '../../../contexts/AuthContext';
import Loading from '../../../components/Loading';

export default function MonitorHistory() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [monitor, setMonitor] = useState(null);
  const [checks, setChecks] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState(null);
  const [timeRange, setTimeRange] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckRunning, setIsCheckRunning] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && id) {
      loadData();
    }
  }, [authLoading, isAuthenticated, id, timeRange]);

  const loadData = async () => {
    try {
      const [monitorRes, checksRes, chartRes, statsRes] = await Promise.all([
        monitorsAPI.getById(id),
        checksAPI.getHistory(id, 50),
        checksAPI.getChartData(id, timeRange),
        checksAPI.getStats(id, timeRange)
      ]);

      if (monitorRes.success) setMonitor(monitorRes.monitor);
      if (checksRes.success) setChecks(checksRes.checks);
      if (chartRes.success) setChartData(chartRes.data);
      if (statsRes.success) setStats(statsRes.stats);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCheck = async () => {
    setIsCheckRunning(true);
    try {
      await monitorsAPI.triggerCheck(id);
      // Reload data after check completes
      await loadData();
    } catch (error) {
      alert('Failed to trigger check: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsCheckRunning(false);
    }
  };

  if (authLoading || isLoading) {
    return <Loading message="Loading monitor history..." />;
  }

  if (!monitor) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-600">Monitor not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-3">
              <StatusIndicator status={monitor.status} size="lg" />
              <h1 className="text-3xl font-bold text-gray-900">{monitor.name}</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 break-all">{monitor.url}</p>
            <p className="mt-1 text-sm text-gray-600">
              Last check: {formatRelativeTime(monitor.lastCheckTime)}
            </p>
          </div>
          <button
            onClick={handleRunCheck}
            disabled={isCheckRunning}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isCheckRunning ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Running Check...</span>
              </>
            ) : (
              <span>Run Check Now</span>
            )}
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex space-x-2">
          {[6, 12, 24, 48, 168].map((hours) => (
            <button
              key={hours}
              onClick={() => setTimeRange(hours)}
              className={`px-3 py-1 text-sm font-medium rounded-md ${
                timeRange === hours
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {hours < 24 ? `${hours}h` : `${hours / 24}d`}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Uptime</div>
              <div className="mt-2 text-2xl font-bold text-primary-600">
                {stats.uptimePercentage}%
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Avg Latency</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {stats.avgLatency}ms
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Min Latency</div>
              <div className="mt-2 text-2xl font-bold text-green-600">
                {stats.minLatency}ms
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Max Latency</div>
              <div className="mt-2 text-2xl font-bold text-red-600">
                {stats.maxLatency}ms
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Total Checks</div>
              <div className="mt-2 text-2xl font-bold text-gray-900">
                {stats.totalChecks}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Response Time</h2>
            <LatencyChart data={chartData} />
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Uptime by Hour</h2>
            <UptimeChart data={chartData} />
          </div>
        </div>

        {/* Check History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Checks</h2>
          </div>
          <HistoryTable checks={checks} />
        </div>
      </div>
    </Layout>
  );
}
