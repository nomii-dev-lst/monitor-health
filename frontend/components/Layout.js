import { useRouter } from "next/router";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import {
  FiHome,
  FiActivity,
  FiFileText,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

export default function Layout({ children }) {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: FiHome },
    { name: "Monitors", href: "/monitors", icon: FiActivity },
    { name: "Logs", href: "/logs", icon: FiFileText },
    { name: "Settings", href: "/settings", icon: FiSettings },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 bg-white border-r border-gray-200 flex flex-col items-center py-6 z-50">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/dashboard">
            <div className="w-10 h-10 relative rounded-full overflow-hidden cursor-pointer">
              <img
                src="/logos/linesquare_technologies_logo.jpg"
                alt="LineSquare"
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 w-full flex flex-col items-center space-y-4">
          {navItems.map((item) => {
            const isActive =
              router.pathname === item.href ||
              (item.href !== "/dashboard" &&
                router.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group relative p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon className="w-6 h-6" />

                {/* Tooltip */}
                <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {item.name}
                  {/* Arrow */}
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions Container */}
        <div className="flex flex-col items-center space-y-4 mt-auto">
          {/* User Profile */}
          {user && (
            <Link href="/profile" className="group relative p-1">
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold cursor-pointer ring-2 ring-transparent group-hover:ring-primary-200 transition-all">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {/* Tooltip */}
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                {user.username}
                <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            </Link>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="group relative p-3 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
          >
            <FiLogOut className="w-6 h-6" />
            {/* Tooltip */}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
              Logout
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
