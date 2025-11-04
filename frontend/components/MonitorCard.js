import Link from 'next/link';
import { formatRelativeTime, getStatusBadgeColor, truncate } from '../lib/utils';

export default function MonitorCard({ monitor }) {
  const statusColor = getStatusBadgeColor(monitor.status);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <span className={`w-3 h-3 rounded-full ${statusColor}`}></span>
              <h3 className="text-lg font-semibold text-gray-900">
                {monitor.name}
              </h3>
              {!monitor.enabled && (
                <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded">
                  Disabled
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 break-all">
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
              {monitor.lastLatency ? `${monitor.lastLatency}ms` : 'N/A'}
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
            href={`/monitors/${monitor._id}/history`}
            className="flex-1 px-4 py-2 text-sm font-medium text-center text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
          >
            View Details
          </Link>
          <Link
            href={`/monitors/${monitor._id}/edit`}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
