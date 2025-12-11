import { useState } from "react";
import { collectionsAPI } from "../lib/api";
import { useDashboard } from "../contexts/DashboardContext";
import { IoPlayOutline } from "react-icons/io5";
import { FiTrash } from "react-icons/fi";
import MonitorListTable from "./MonitorListTable";

export default function CollectionSection({ collection, monitors, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const { loadMonitors, loadCollections } = useDashboard();

  const handleCheckAll = async () => {
    try {
      setIsCheckingAll(true);

      const response = await collectionsAPI.checkAll(collection.id);
      if (response.success) {
        // Reload immediately - backend runs checks synchronously
        await loadMonitors();
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Failed to check all monitors:", error);
      alert("Failed to trigger checks for all monitors");
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${collection.name}"? This will also delete all ${monitors.length} monitor(s) in this collection.`
      )
    ) {
      return;
    }

    try {
      const response = await collectionsAPI.delete(collection.id);
      if (response.success) {
        // Reload monitors and collections
        await Promise.all([loadMonitors(), loadCollections()]);
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error("Failed to delete collection:", error);
      alert("Failed to delete collection");
    }
  };

  const stats = collection.stats || {};
  const uptimePercentage = stats.uptimePercentage || 0;
  const avgLatency = stats.avgLatency || 0;
  const upMonitors = stats.upMonitors || 0;
  const downMonitors = stats.downMonitors || 0;
  const totalMonitors = monitors.length;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Collection Header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Color Indicator */}
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: collection.color || "#3B82F6" }}
            />

            {/* Collection Name & Description */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  {collection.name}
                </h3>
                <span className="text-sm text-gray-500">
                  ({totalMonitors} monitor{totalMonitors !== 1 ? "s" : ""})
                </span>
              </div>
              {collection.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {collection.description}
                </p>
              )}
            </div>

            {/* Stats Summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {uptimePercentage.toFixed(1)}%
                </div>
                <div className="text-gray-500 text-xs">Uptime</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">
                  {avgLatency}ms
                </div>
                <div className="text-gray-500 text-xs">Avg Latency</div>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {upMonitors} up
                </span>
                {downMonitors > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {downMonitors} down
                  </span>
                )}
              </div>
            </div>

            {/* Expand/Collapse Icon */}
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
            {/* Action Buttons */}
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleCheckAll}
                disabled={isCheckingAll || totalMonitors === 0}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isCheckingAll ? (
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
                  <IoPlayOutline />
                )}
              </button>
              <button
                onClick={handleDeleteCollection}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                <FiTrash />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Monitors List */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {monitors.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50">
              No monitors in this collection yet.
            </div>
          ) : (
            <MonitorListTable monitors={monitors} onUpdate={onUpdate} />
          )}
        </div>
      )}
    </div>
  );
}
