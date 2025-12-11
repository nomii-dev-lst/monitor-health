import { useState } from "react";
import Link from "next/link";
import { monitorsAPI } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";
import StatusBadge, { StatusIndicator } from "./StatusBadge";
import { useDashboard } from "../contexts/DashboardContext";

export default function MonitorListTable({ monitors, onUpdate }) {
  const [checkingMonitors, setCheckingMonitors] = useState(new Set());
  const { loadMonitors, loadCollections } = useDashboard();

  const handleRunCheck = async (id) => {
    setCheckingMonitors((prev) => new Set(prev).add(id));
    try {
      await monitorsAPI.triggerCheck(id);
      // Reload immediately - no artificial delay needed
      await loadMonitors();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to trigger check:", error);
    } finally {
      setCheckingMonitors((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDeleteMonitor = async (id, name) => {
    if (!confirm(`Are you sure you want to delete monitor "${name}"?`)) {
      return;
    }

    try {
      await monitorsAPI.delete(id);
      await Promise.all([loadMonitors(), loadCollections()]);
      if (onUpdate) onUpdate();
    } catch (error) {
      alert("Failed to delete monitor");
    }
  };

  if (!monitors || monitors.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50">
        No monitors to display.
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
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
            <tr key={monitor.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <StatusIndicator status={monitor.status} size="md" />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">
                      {monitor.name}
                    </div>
                    <div className="text-sm text-gray-500 break-all max-w-md">
                      {monitor.url}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <StatusBadge status={monitor.status} size="md" />
                  {!monitor.enabled && (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                      <svg
                        className="w-3 h-3 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      Disabled
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {monitor.uptimePercentage || 0}%
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {monitor.lastLatency ? `${monitor.lastLatency}ms` : "N/A"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatRelativeTime(monitor.lastCheckTime)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end space-x-2">
                  {/* Run Check Button */}
                  <button
                    onClick={() => handleRunCheck(monitor.id)}
                    disabled={checkingMonitors.has(monitor.id)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Run check now"
                  >
                    {checkingMonitors.has(monitor.id) ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3 mr-1.5"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Running
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3 w-3 mr-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Run
                      </>
                    )}
                  </button>

                  {/* History Button */}
                  <Link
                    href={`/monitors/${monitor.id}/history`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="View check history"
                  >
                    <svg
                      className="h-3 w-3 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    History
                  </Link>

                  {/* Edit Button */}
                  <Link
                    href={`/monitors/${monitor.id}/edit`}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                    title="Edit monitor"
                  >
                    <svg
                      className="h-3 w-3 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </Link>

                  {/* Delete Button */}
                  <button
                    onClick={() =>
                      handleDeleteMonitor(monitor.id, monitor.name)
                    }
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                    title="Delete monitor"
                  >
                    <svg
                      className="h-3 w-3 mr-1.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
