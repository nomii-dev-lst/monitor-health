import { useState } from 'react';
import { formatDate } from '../lib/utils';
import CheckDetailModal from './CheckDetailModal';
import StatusBadge from './StatusBadge';

export default function HistoryTable({ checks }) {
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // all, success, failure

  // Filter checks based on status
  const filteredChecks = checks.filter(check => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'success') return check.status === 'success';
    if (statusFilter === 'failure') return check.status === 'failure';
    return true;
  });

  if (!checks || checks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No check history available yet
      </div>
    );
  }

  return (
    <>
      {/* Status Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({checks.length})
            </button>
            <button
              onClick={() => setStatusFilter('success')}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'success'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
              Success ({checks.filter(c => c.status === 'success').length})
            </button>
            <button
              onClick={() => setStatusFilter('failure')}
              className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === 'failure'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5"></span>
              Failure ({checks.filter(c => c.status === 'failure').length})
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
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
                Error
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredChecks.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  No checks match the selected filter
                </td>
              </tr>
            ) : (
              filteredChecks.map((check) => (
              <tr key={check.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(check.checkedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={check.status} size="md" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {check.httpStatus || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {check.latency}ms
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                  {check.errorMessage || '-'}
                  {check.validationErrors && check.validationErrors.length > 0 && (
                    <span className="text-red-600">
                      {check.validationErrors.join(', ')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setSelectedCheck(check)}
                    className="text-primary-600 hover:text-primary-900 font-medium"
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

      {/* Check Detail Modal */}
      {selectedCheck && (
        <CheckDetailModal
          check={selectedCheck}
          onClose={() => setSelectedCheck(null)}
        />
      )}
    </>
  );
}
