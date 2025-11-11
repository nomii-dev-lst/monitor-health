import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { monitorsAPI, dashboardAPI, logsAPI } from '../lib/api';
import { useAuth } from './AuthContext';

const DashboardContext = createContext();

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

export function DashboardProvider({ children }) {
  const [monitors, setMonitors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsStats, setLogsStats] = useState(null);
  const [logsPagination, setLogsPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllProgress, setRunAllProgress] = useState({ current: 0, total: 0 });
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Load persisted state from localStorage on mount
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setMonitors([]);
      setSummary(null);
      setIsRunningAll(false);
      setRunAllProgress({ current: 0, total: 0 });
      return;
    }

    const persistedState = localStorage.getItem('dashboardRunState');
    if (persistedState) {
      try {
        const { isRunningAll: running, progress, timestamp } = JSON.parse(persistedState);
        // Only resume if the state is less than 5 minutes old
        const isStale = Date.now() - timestamp > 5 * 60 * 1000;
        
        if (running && !isStale) {
          setIsRunningAll(running);
          setRunAllProgress(progress);
          // Resume the check process if it was interrupted
          resumeRunAllChecks(progress);
        } else if (isStale) {
          // Clear stale state
          localStorage.removeItem('dashboardRunState');
        }
      } catch (error) {
        console.error('Failed to parse persisted dashboard state:', error);
        localStorage.removeItem('dashboardRunState');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (isRunningAll) {
      localStorage.setItem('dashboardRunState', JSON.stringify({
        isRunningAll,
        progress: runAllProgress,
        timestamp: Date.now()
      }));
    } else {
      localStorage.removeItem('dashboardRunState');
    }
  }, [isRunningAll, runAllProgress]);

  const loadDashboard = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    try {
      const [monitorsRes, summaryRes] = await Promise.all([
        monitorsAPI.getAll(),
        dashboardAPI.getSummary()
      ]);

      if (monitorsRes.success) {
        setMonitors(monitorsRes.monitors);
      }

      if (summaryRes.success) {
        setSummary(summaryRes.summary);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadLogs = useCallback(async (limit = 50, offset = 0) => {
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
      console.error('Failed to load logs:', error);
    }
  }, [isAuthenticated]);

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
      console.error('Failed to load logs stats:', error);
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
      console.error('Failed to load monitors:', error);
    }
  }, [isAuthenticated]);

  const resumeRunAllChecks = useCallback(async (progress) => {
    if (!isAuthenticated) {
      setIsRunningAll(false);
      setRunAllProgress({ current: 0, total: 0 });
      return;
    }
    // Load monitors first
    const monitorsRes = await monitorsAPI.getAll();
    if (!monitorsRes.success) {
      setIsRunningAll(false);
      setRunAllProgress({ current: 0, total: 0 });
      return;
    }

    const monitorsList = monitorsRes.monitors;
    const startIndex = progress.current;

    // Continue from where we left off
    for (let i = startIndex; i < monitorsList.length; i++) {
      const monitor = monitorsList[i];
      setRunAllProgress({ current: i + 1, total: monitorsList.length });

      try {
        await monitorsAPI.triggerCheck(monitor.id);
      } catch (error) {
        console.error(`Failed to check monitor ${monitor.name}:`, error);
      }

      if (i < monitorsList.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Reload dashboard after all checks complete
    try {
      const [monitorsRes, summaryRes] = await Promise.all([
        monitorsAPI.getAll(),
        dashboardAPI.getSummary()
      ]);

      if (monitorsRes.success) {
        setMonitors(monitorsRes.monitors);
      }

      if (summaryRes.success) {
        setSummary(summaryRes.summary);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
    
    setIsRunningAll(false);
    setRunAllProgress({ current: 0, total: 0 });
  }, [isAuthenticated]);

  const handleRunAllChecks = async () => {
    if (!isAuthenticated) {
      return;
    }
    if (monitors.length === 0) return;

    setIsRunningAll(true);
    setRunAllProgress({ current: 0, total: monitors.length });

    try {
      // Run checks sequentially to avoid overwhelming the server
      for (let i = 0; i < monitors.length; i++) {
        const monitor = monitors[i];
        setRunAllProgress({ current: i + 1, total: monitors.length });

        try {
          await monitorsAPI.triggerCheck(monitor.id);
        } catch (error) {
          console.error(`Failed to check monitor ${monitor.name}:`, error);
          // Continue with next monitor even if one fails
        }

        // Small delay between checks to prevent rate limiting
        if (i < monitors.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Reload dashboard after all checks complete
      await loadDashboard();
    } catch (error) {
      console.error('Failed to run all checks:', error);
    } finally {
      setIsRunningAll(false);
      setRunAllProgress({ current: 0, total: 0 });
    }
  };

  const value = {
    monitors,
    summary,
    logs,
    logsStats,
    logsPagination,
    isLoading,
    isRunningAll,
    runAllProgress,
    loadDashboard,
    loadMonitors,
    loadLogs,
    loadLogsStats,
    handleRunAllChecks,
    setMonitors,
    setSummary,
    setLogs,
    setLogsStats,
    setLogsPagination,
    setIsLoading
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
