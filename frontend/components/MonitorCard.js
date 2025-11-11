import { useState } from "react";
import Link from "next/link";
import { formatRelativeTime, truncate } from "../lib/utils";
import { monitorsAPI } from "../lib/api";
import { StatusIndicator } from "./StatusBadge";
import { useDashboard } from "../contexts/DashboardContext";

export default function MonitorCard({ monitor, onCheckComplete }) {
  const [isChecking, setIsChecking] = useState(false);
  const { loadDashboard } = useDashboard();

  const handleRunCheck = async (e) => {
    e.preventDefault();
    setIsChecking(true);
    try {
      await monitorsAPI.triggerCheck(monitor.id);
      // Wait a bit for the check to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Use context's loadDashboard if available, otherwise use callback
      if (loadDashboard) {
        await loadDashboard();
      } else if (onCheckComplete) {
        onCheckComplete();
      }
    } catch (error) {
      console.error("Check failed:", error);
      // Show error in console, but don't alert
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span>
                <StatusIndicator status={monitor.status} size="lg" />
              </span>
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                {monitor.name}
              </h3>
              {!monitor.enabled && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded border border-gray-200">
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
            <p className="mt-1 text-sm text-gray-500 break-all line-clamp-1">
              {truncate(monitor.url, 60)}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Uptime</p>
            <p className="text-lg font-semibold text-gray-900">
              {monitor.uptimePercentage || 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Latency</p>
            <p className="text-lg font-semibold text-gray-900">
              {monitor.lastLatency ? `${monitor.lastLatency}ms` : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Interval</p>
            <p className="text-lg font-semibold text-gray-900">
              {monitor.checkInterval}m
            </p>
          </div>
        </div>

        {/* Last Check */}
        <div className="text-sm text-gray-600 mb-4">
          Last check: {formatRelativeTime(monitor.lastCheckTime)}
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Link
            href={`/monitors/${monitor.id}/history`}
            className="flex-1 px-4 py-2 text-sm font-medium text-center text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
          >
            View Details
          </Link>
          <button
            onClick={handleRunCheck}
            disabled={isChecking}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Run check now"
          >
            {isChecking ? (
              <svg
                className="animate-spin h-4 w-4"
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
            ) : (
              <svg
                className="h-4 w-4"
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
            )}
          </button>
          <Link
            href={`/monitors/${monitor.id}/edit`}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            title="Edit monitor"
          >
            <svg
              className="h-4 w-4"
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
          </Link>
        </div>
      </div>
    </div>
  );
}
