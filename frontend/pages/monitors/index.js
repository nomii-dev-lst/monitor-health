import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import Loading from "../../components/Loading";
import Link from "next/link";
import { collectionsAPI } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useDashboard } from "../../contexts/DashboardContext";
import CollectionSection from "../../components/CollectionSection";
import MonitorListTable from "../../components/MonitorListTable";

export default function MonitorsList() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { monitors, collections, loadMonitors, loadCollections, setMonitors } =
    useDashboard();
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoadingMonitors, setIsLoadingMonitors] = useState(true);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionData, setNewCollectionData] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      Promise.all([loadMonitors(), loadCollections()]).finally(() =>
        setIsLoadingMonitors(false)
      );
    }
  }, [authLoading, isAuthenticated, loadMonitors, loadCollections]);

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    try {
      const response = await collectionsAPI.create(newCollectionData);
      if (response.success) {
        await loadCollections();
        setShowCreateCollection(false);
        setNewCollectionData({ name: "", description: "", color: "#3B82F6" });
      }
    } catch (error) {
      console.error("Failed to create collection:", error);
      alert("Failed to create collection");
    }
  };

  const handleUpdate = async () => {
    await Promise.all([loadMonitors(), loadCollections()]);
  };

  // Group monitors by collection
  const uncollectedMonitors = monitors.filter((m) => !m.collectionId);
  const collectionMonitorsMap = {};

  collections.forEach((collection) => {
    collectionMonitorsMap[collection.id] = monitors.filter(
      (m) => m.collectionId === collection.id
    );
  });

  // Filter monitors based on status
  const filteredMonitors = monitors.filter((monitor) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "up") return monitor.status === "up";
    if (statusFilter === "down") return monitor.status === "down";
    if (statusFilter === "pending") return monitor.status === "pending";
    return true;
  });

  if (authLoading || isLoadingMonitors) {
    return <Loading message="Loading monitors..." />;
  }

  return (
    <Layout>
      <div className="min-h-screen space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Monitors</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your monitoring targets
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/monitors/new"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              + Add Monitor
            </Link>
            <button
              onClick={() => setShowCreateCollection(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            >
              + New Collection
            </button>
          </div>
        </div>

        {/* Create Collection Modal */}
        {showCreateCollection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Collection
              </h3>
              <form onSubmit={handleCreateCollection} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCollectionData.name}
                    onChange={(e) =>
                      setNewCollectionData({
                        ...newCollectionData,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Production APIs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCollectionData.description}
                    onChange={(e) =>
                      setNewCollectionData({
                        ...newCollectionData,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Optional description"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newCollectionData.color}
                    onChange={(e) =>
                      setNewCollectionData({
                        ...newCollectionData,
                        color: e.target.value,
                      })
                    }
                    className="w-full h-10 px-1 py-1 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCollection(false);
                      setNewCollectionData({
                        name: "",
                        description: "",
                        color: "#3B82F6",
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                  >
                    Create Collection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            Filter by status:
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "all"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({monitors.length})
            </button>
            <button
              onClick={() => setStatusFilter("up")}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "up"
                  ? "bg-green-600 text-white"
                  : "bg-green-50 text-green-700 hover:bg-green-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
              Up ({monitors.filter((m) => m.status === "up").length})
            </button>
            <button
              onClick={() => setStatusFilter("down")}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "down"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
              Down ({monitors.filter((m) => m.status === "down").length})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === "pending"
                  ? "bg-yellow-600 text-white"
                  : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5"></span>
              Pending ({monitors.filter((m) => m.status === "pending").length})
            </button>
          </div>
        </div>

        {filteredMonitors.length === 0 && monitors.length === 0 ? (
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
          <div className="space-y-6">
            {/* Collections */}
            {collections.map((collection) => {
              const collectionMonitors =
                collectionMonitorsMap[collection.id] || [];
              const filteredCollectionMonitors = collectionMonitors.filter(
                (monitor) => {
                  if (statusFilter === "all") return true;
                  return monitor.status === statusFilter;
                }
              );

              // Only show collection if it has monitors matching the filter (or show all if filter is "all")
              if (
                statusFilter === "all" ||
                filteredCollectionMonitors.length > 0
              ) {
                return (
                  <CollectionSection
                    key={collection.id}
                    collection={collection}
                    monitors={
                      statusFilter === "all"
                        ? collectionMonitors
                        : filteredCollectionMonitors
                    }
                    onUpdate={handleUpdate}
                  />
                );
              }
              return null;
            })}

            {/* Uncollected Monitors */}
            {uncollectedMonitors.length > 0 && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Uncollected Monitors ({uncollectedMonitors.length})
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Monitors not assigned to any collection
                  </p>
                </div>
                <MonitorListTable
                  monitors={uncollectedMonitors.filter((monitor) => {
                    if (statusFilter === "all") return true;
                    return monitor.status === statusFilter;
                  })}
                  onUpdate={handleUpdate}
                />
              </div>
            )}

            {/* Show message if no monitors match filter */}
            {filteredMonitors.length === 0 && monitors.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500">
                  No monitors match the selected filter
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
