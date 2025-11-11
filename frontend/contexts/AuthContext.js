import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { useRouter } from 'next/router';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Initialize auth state on mount
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // Try to refresh token and get user info
      const response = await authAPI.refresh();
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        // Refresh failed, but this is expected for non-authenticated users
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Expected error: No active session or session expired
      // Don't log this as it's normal behavior for first-time visitors
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await authAPI.signup(username, email, password);
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { 
        success: false, 
        message: response.message,
        errors: response.errors 
      };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Signup failed',
        errors: error.response?.data?.errors || {}
      };
    }
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      router.push('/');
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    signup,
    login,
    logout,
    initAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
