import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { authAPI } from '../lib/api';

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.user);
    } catch (error) {
      console.error('Failed to load user');
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      router.push('/');
    } catch (error) {
      console.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="flex items-center">
                <span className="text-2xl font-bold text-primary-600">MonitorHealth</span>
              </Link>
              
              <div className="hidden md:flex space-x-4">
                <Link
                  href="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname === '/dashboard'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/monitors"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname.startsWith('/monitors')
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Monitors
                </Link>
                <Link
                  href="/settings"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    router.pathname === '/settings'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Settings
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm text-gray-600">
                  Welcome, <span className="font-medium">{user.username}</span>
                </span>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            MonitorHealth - Self-hosted API Monitoring System
          </p>
        </div>
      </footer>
    </div>
  );
}
