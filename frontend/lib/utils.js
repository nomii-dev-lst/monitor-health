/**
 * Utility functions
 */

export function formatDate(date) {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString();
}

export function formatRelativeTime(date) {
  if (!date) return 'Never';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${diffDay}d ago`;
}

export function getStatusColor(status) {
  switch (status) {
    case 'up':
    case 'success':
      return 'text-green-600 bg-green-50';
    case 'down':
    case 'failure':
      return 'text-red-600 bg-red-50';
    case 'pending':
    case 'unknown':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getStatusBadgeColor(status) {
  switch (status) {
    case 'up':
    case 'success':
      return 'bg-green-500';
    case 'down':
    case 'failure':
      return 'bg-red-500';
    case 'pending':
    case 'unknown':
      return 'bg-gray-400';
    default:
      return 'bg-gray-400';
  }
}

export function truncate(str, length = 50) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}
