/**
 * StatusBadge Component
 * Displays a consistent status indicator with icon and text
 */

export default function StatusBadge({ status, showText = true, size = 'md' }) {
  const getStatusConfig = (status) => {
    const normalizedStatus = status?.toLowerCase();
    
    switch (normalizedStatus) {
      case 'up':
      case 'success':
        return {
          dotColor: 'bg-green-500',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-200',
          label: 'Up'
        };
      case 'down':
      case 'failure':
        return {
          dotColor: 'bg-red-500',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-200',
          label: 'Down'
        };
      case 'pending':
        return {
          dotColor: 'bg-yellow-500',
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-200',
          label: 'Pending'
        };
      case 'unknown':
      default:
        return {
          dotColor: 'bg-gray-400',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-200',
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);
  
  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'px-2 py-0.5 text-xs',
      dot: 'w-1.5 h-1.5',
      icon: 'w-2.5 h-2.5',
      gap: 'gap-1'
    },
    md: {
      container: 'px-2.5 py-1 text-xs',
      dot: 'w-2 h-2',
      icon: 'w-3 h-3',
      gap: 'gap-1.5'
    },
    lg: {
      container: 'px-3 py-1.5 text-sm',
      dot: 'w-2.5 h-2.5',
      icon: 'w-4 h-4',
      gap: 'gap-2'
    }
  };

  const sizeConfig = sizeClasses[size] || sizeClasses.md;

  if (!showText) {
    // Just show the dot indicator
    return (
      <span 
        className={`inline-block ${sizeConfig.dot} rounded-full ${config.dotColor}`}
        title={config.label}
      />
    );
  }

  return (
    <span 
      className={`inline-flex items-center ${sizeConfig.gap} ${sizeConfig.container} font-medium rounded-full ${config.bgColor} ${config.textColor} border ${config.borderColor}`}
    >
      <span className={`${sizeConfig.dot} rounded-full ${config.dotColor}`} />
      <span>{config.label}</span>
    </span>
  );
}

/**
 * StatusIndicator - Simple dot with optional text
 */
export function StatusIndicator({ status, showLabel = false, size = 'md' }) {
  const getStatusConfig = (status) => {
    const normalizedStatus = status?.toLowerCase();
    
    switch (normalizedStatus) {
      case 'up':
      case 'success':
        return {
          color: 'bg-green-500',
          label: 'Up',
          textColor: 'text-green-700'
        };
      case 'down':
      case 'failure':
        return {
          color: 'bg-red-500',
          label: 'Down',
          textColor: 'text-red-700'
        };
      case 'pending':
        return {
          color: 'bg-yellow-500',
          label: 'Pending',
          textColor: 'text-yellow-700'
        };
      case 'unknown':
      default:
        return {
          color: 'bg-gray-400',
          label: 'Unknown',
          textColor: 'text-gray-700'
        };
    }
  };

  const config = getStatusConfig(status);
  
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5'
  };

  const dotSize = dotSizes[size] || dotSizes.md;

  if (!showLabel) {
    return (
      <span 
        className={`inline-block ${dotSize} rounded-full ${config.color}`}
        title={config.label}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${dotSize} rounded-full ${config.color}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </span>
  );
}
