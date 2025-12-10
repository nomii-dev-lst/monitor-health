import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { monitorsAPI, dashboardAPI, logsAPI, collectionsAPI } from "../lib/api";
import { useAuth } from "./AuthContext";

const DashboardContext = createContext();

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}

export function DashboardProvider({ children }) {
  const [monitors, setMonitors] = useState([]);
  const [collections, setCollections] = useState([]);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsStats, setLogsStats] = useState(null);
  const [logsPagination, setLogsPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Clear monitors and summary when user logs out
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setMonitors([]);
      setCollections([]);
      setSummary(null);
      return;
    }
  }, [authLoading, isAuthenticated]);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const [monitorsRes, collectionsRes, summaryRes] = await Promise.all([
        monitorsAPI.getAll(),
        collectionsAPI.getAll(),
        dashboardAPI.getSummary(),
      ]);

      if (monitorsRes.success) {
        setMonitors(monitorsRes.monitors);
      }

      if (collectionsRes.success) {
        setCollections(collectionsRes.data);
      }

      if (summaryRes.success) {
        setSummary(summaryRes.summary);
      }
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadLogs = useCallback(
    async (limit = 50, offset = 0) => {
      if (!isAuthenticated) {
        return;
      }
      try {
        const response = await logsAPI.getAll(limit, offset);
        if (response.success) {
          setLogs(response.logs);
          setLogsPagination(response.pagination);
        }
      } catch (error) {
        console.error("Failed to load logs:", error);
      }
    },
    [isAuthenticated]
  );

  const loadLogsStats = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const response = await logsAPI.getStats(24);
      if (response.success) {
        setLogsStats(response.stats);
      }
    } catch (error) {
      console.error("Failed to load logs stats:", error);
    }
  }, [isAuthenticated]);

  const loadMonitors = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const response = await monitorsAPI.getAll();
      if (response.success) {
        setMonitors(response.monitors);
      }
    } catch (error) {
      console.error("Failed to load monitors:", error);
    }
  }, [isAuthenticated]);

  const loadCollections = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const response = await collectionsAPI.getAll();
      if (response.success) {
        setCollections(response.data);
      }
    } catch (error) {
      console.error("Failed to load collections:", error);
    }
  }, [isAuthenticated]);

  const value = {
    monitors,
    collections,
    summary,
    logs,
    logsStats,
    logsPagination,
    isLoading,
    loadDashboard,
    loadMonitors,
    loadCollections,
    loadLogs,
    loadLogsStats,
    setMonitors,
    setCollections,
    setSummary,
    setLogs,
    setLogsStats,
    setLogsPagination,
    setIsLoading,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
