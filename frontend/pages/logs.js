import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { logsAPI, tokenManager } from "../lib/api";
import { formatRelativeTime } from "../lib/utils";
import StatusBadge from "../components/StatusBadge";
import { useDashboard } from "../contexts/DashboardContext";
import { useAuth } from "../contexts/AuthContext";

export default function LogHistory() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const {
    logs,
    logsStats,
    logsPagination,
    loadLogs,
    loadLogsStats,
    setLogs,
    setLogsStats,
    setLogsPagination,
  } = useDashboard();
  const [selectedLog, setSelectedLog] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newLogIds, setNewLogIds] = useState(new Set());
  const [isSSEConnected, setIsSSEConnected] = useState(false);
  const previousLogIdsRef = useRef(new Set());
  const eventSourceRef = useRef(null);

  // Initial load and pagination
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const fetchData = async () => {
        try {
          setIsRefreshing(true);
          await Promise.all([
            loadLogs(logsPagination.limit, logsPagination.offset),
            loadLogsStats(),
          ]);
        } finally {
          setIsRefreshing(false);
        }
      };
      fetchData();
    }
  }, [
    authLoading,
    isAuthenticated,
    logsPagination.offset,
    loadLogs,
    loadLogsStats,
    logsPagination.limit,
  ]);

  // Setup SSE connection for real-time updates
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Create SSE connection
      const backendUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = tokenManager.getAccessToken();

      if (!token) {
        console.error("No access token available for SSE connection");
        return;
      }

      const eventSource = new EventSource(
        `${backendUrl}/api/sse/events?token=${encodeURIComponent(token)}`
      );
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (process.env.NODE_ENV === "development") {
          console.log("SSE connection opened");
        }
        setIsSSEConnected(true);
      };

      eventSource.onerror = (error) => {
        if (process.env.NODE_ENV === "development") {
          console.error("SSE connection error:", error);
        }
        setIsSSEConnected(false);
      };

      // Handle connected event
      eventSource.addEventListener("connected", (event) => {
        if (process.env.NODE_ENV === "development") {
          console.log("SSE connected:", JSON.parse(event.data));
        }
      });

      // Handle new log events
      eventSource.addEventListener("log", (event) => {
        const newLog = JSON.parse(event.data);
        if (process.env.NODE_ENV === "development") {
          console.log("New log received via SSE:", newLog);
        }

        // Add new log to the top of the list if we're on the first page
        if (logsPagination.offset === 0) {
          setLogs((prevLogs) => {
            // Avoid duplicates
            if (prevLogs.some((log) => log.id === newLog.id)) {
              return prevLogs;
            }
            // Add to top and limit to current page size
            const updated = [newLog, ...prevLogs].slice(
              0,
              logsPagination.limit
            );
            return updated;
          });

          // Highlight new log
          setNewLogIds((prev) => new Set([...prev, newLog.id]));
          setTimeout(() => {
            setNewLogIds((prev) => {
              const updated = new Set(prev);
              updated.delete(newLog.id);
              return updated;
            });
          }, 3000);
        }
      });

      // Handle stats updates
      eventSource.addEventListener("stats", (event) => {
        const statsData = JSON.parse(event.data);
        if (process.env.NODE_ENV === "development") {
          console.log("Stats update received via SSE:", statsData);
        }
        setLogsStats(statsData);
      });

      // Handle heartbeat
      eventSource.addEventListener("heartbeat", (event) => {
        if (process.env.NODE_ENV === "development") {
          console.log("SSE heartbeat:", JSON.parse(event.data));
        }
      });

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        setIsSSEConnected(false);
      };
    }
  }, [
    authLoading,
    isAuthenticated,
    logsPagination.offset,
    logsPagination.limit,
    setLogs,
    setLogsStats,
  ]);

  const handleNextPage = () => {
    if (logsPagination.hasMore) {
      setLogsPagination((prev) => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  const handlePrevPage = () => {
    if (logsPagination.offset > 0) {
      setLogsPagination((prev) => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  };

  // No filtering; show all logs
  const filteredLogs = logs;

  if (authLoading || (!logs.length && !logsStats && isAuthenticated)) {
    return <Loading message="Loading logs..." />;
  }

  return (
    <Layout>
      <div className="min-h-screen space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Log History</h1>
            <p className="mt-1 text-sm text-gray-500">
              Recent check results across all monitors
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {isSSEConnected && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-green-700">
                  Real-time updates active
                </span>
              </div>
            )}
            {isRefreshing && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
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
                <span>Refreshing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {logsStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">
                Total Checks (24h)
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {logsStats.totalChecks}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">
                Successful
              </div>
              <div className="mt-2 text-3xl font-bold text-green-600">
                {logsStats.successfulChecks}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">Failed</div>
              <div className="mt-2 text-3xl font-bold text-red-600">
                {logsStats.failedChecks}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-500">
                Success Rate
              </div>
              <div className="mt-2 text-3xl font-bold text-primary-600">
                {logsStats.successRate}%
              </div>
            </div>
          </div>
        )}

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HTTP Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      {logs.length === 0
                        ? "No logs found"
                        : "No logs match the selected filter"}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50 transition-colors duration-300 ${
                        newLogIds.has(log.id)
                          ? "bg-primary-50 animate-pulse"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatRelativeTime(log.checkedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">
                          {log.monitorName || "Unknown"}
                        </div>
                        <div className="text-gray-500 text-xs truncate max-w-xs">
                          {log.monitorUrl}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={log.status} size="md" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.httpStatus || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.latency ? `${log.latency}ms` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {logsPagination.offset + 1} to{" "}
                {Math.min(
                  logsPagination.offset + logsPagination.limit,
                  logsPagination.total
                )}{" "}
                of {logsPagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handlePrevPage}
                  disabled={logsPagination.offset === 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!logsPagination.hasMore}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Check Details
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Monitor
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedLog.monitorName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedLog.monitorUrl}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <p className="mt-1">
                      <StatusBadge status={selectedLog.status} size="md" />
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      HTTP Status
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.httpStatus || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Latency
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.latency ? `${selectedLog.latency}ms` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Checked At
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedLog.checkedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {selectedLog.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Error Message
                    </label>
                    <p className="mt-1 text-sm text-red-600 bg-red-50 p-3 rounded">
                      {selectedLog.errorMessage}
                    </p>
                  </div>
                )}

                {selectedLog.validationErrors &&
                  selectedLog.validationErrors.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Validation Errors
                      </label>
                      <ul className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded space-y-1">
                        {selectedLog.validationErrors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {selectedLog.responseData && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Response Data
                    </label>
                    <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-3 rounded overflow-x-auto">
                      {selectedLog.responseData}
                    </pre>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
