import { useEffect } from 'react';
import Layout from '../components/Layout';
import MonitorCard from '../components/MonitorCard';
import Loading from '../components/Loading';
import { useDashboard } from '../contexts/DashboardContext';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';

export default function Dashboard() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const {
    monitors,
    summary,
    isLoading,
    isRunningAll,
    runAllProgress,
    loadDashboard,
    handleRunAllChecks
  } = useDashboard();

  useEffect(() => {
    // Only load dashboard after authentication is complete
    if (!authLoading && isAuthenticated) {
      loadDashboard();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(loadDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [authLoading, isAuthenticated, loadDashboard]);

  if (authLoading || isLoading) {
    return <Loading message="Loading dashboard..." />;
  }

  return (
    <Layout>
      <div className="min-h-screen space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your APIs and services
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {monitors.length > 0 && (
              <button
                onClick={handleRunAllChecks}
                disabled={isRunningAll}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-md hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isRunningAll ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Running {runAllProgress.current}/{runAllProgress.total}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Run All Checks</span>
                  </>
                )}
              </button>
            )}
            <Link
              href="/monitors/new"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              + Add Monitor
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">Total Monitors</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{summary.totalMonitors}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">Up</div>
              <div className="mt-2 text-3xl font-bold text-green-600">{summary.upMonitors}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">Down</div>
              <div className="mt-2 text-3xl font-bold text-red-600">{summary.downMonitors}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">24h Uptime</div>
              <div className="mt-2 text-3xl font-bold text-primary-600">
                {summary.last24Hours?.uptimePercentage || 0}%
              </div>
            </div>
          </div>
        )}

        {/* Monitors Grid */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Monitors</h2>
            {monitors.length > 0 && (
              <div className="text-sm text-gray-500">
                {isRunningAll && (
                  <span className="text-primary-600 font-medium">
                    Running checks: {runAllProgress.current} of {runAllProgress.total}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {monitors.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500 mb-4">No monitors configured yet</p>
              <Link
                href="/monitors/new"
                className="inline-block px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Create Your First Monitor
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {monitors.map((monitor) => (
                <MonitorCard key={monitor.id} monitor={monitor} onCheckComplete={loadDashboard} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
