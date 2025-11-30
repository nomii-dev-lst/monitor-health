import { useEffect } from "react";
import Layout from "../components/Layout";
import MonitorCard from "../components/MonitorCard";
import Loading from "../components/Loading";
import { useDashboard } from "../contexts/DashboardContext";
import { useAuth } from "../contexts/AuthContext";
import Link from "next/link";

export default function Dashboard() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const {
    monitors,
    summary,
    isLoading,
    loadDashboard,
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
          <Link
            href="/monitors/new"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            + Add Monitor
          </Link>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">
                Total Monitors
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {summary.totalMonitors}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">Up</div>
              <div className="mt-2 text-3xl font-bold text-green-600">
                {summary.upMonitors}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">Down</div>
              <div className="mt-2 text-3xl font-bold text-red-600">
                {summary.downMonitors}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">
                24h Uptime
              </div>
              <div className="mt-2 text-3xl font-bold text-primary-600">
                {summary.last24Hours?.uptimePercentage || 0}%
              </div>
            </div>
          </div>
        )}

        {/* Monitors Grid */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Your Monitors
          </h2>

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
                <MonitorCard
                  key={monitor.id}
                  monitor={monitor}
                  onCheckComplete={loadDashboard}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
