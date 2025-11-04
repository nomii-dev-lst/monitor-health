import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';
import { monitorsAPI } from '../../lib/api';
import { formatRelativeTime, getStatusBadgeColor } from '../../lib/utils';

export default function MonitorsList() {
  const [monitors, setMonitors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMonitors();
  }, []);

  const loadMonitors = async () => {
    try {
      const response = await monitorsAPI.getAll();
      if (response.success) {
        setMonitors(response.monitors);
      }
    } catch (error) {
      console.error('Failed to load monitors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete monitor "${name}"?`)) {
      return;
    }

    try {
      await monitorsAPI.delete(id);
      setMonitors(monitors.filter(m => m._id !== id));
    } catch (error) {
      alert('Failed to delete monitor');
    }
  };

  const handleRunCheck = async (id) => {
    try {
      await monitorsAPI.triggerCheck(id);
      alert('Check triggered successfully! Refresh the page to see results.');
    } catch (error) {
      alert('Failed to trigger check: ' + (error.response?.data?.message || error.message));
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading monitors...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitors</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your monitoring targets
            </p>
          </div>
          <Link
            href="/monitors/new"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            + Add Monitor
          </Link>
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
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Monitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Uptime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Latency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Last Check
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monitors.map((monitor) => (
                  <tr key={monitor._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-3 ${getStatusBadgeColor(monitor.status)}`}></span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{monitor.name}</div>
                          <div className="text-sm text-gray-500 break-all max-w-md">{monitor.url}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        monitor.status === 'up' ? 'bg-green-100 text-green-800' :
                        monitor.status === 'down' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {monitor.status}
                      </span>
                      {!monitor.enabled && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {monitor.uptimePercentage || 0}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {monitor.lastLatency ? `${monitor.lastLatency}ms` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatRelativeTime(monitor.lastCheckTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleRunCheck(monitor._id)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Run
                      </button>
                      <Link
                        href={`/monitors/${monitor._id}/history`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        History
                      </Link>
                      <Link
                        href={`/monitors/${monitor._id}/edit`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(monitor._id, monitor.name)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
