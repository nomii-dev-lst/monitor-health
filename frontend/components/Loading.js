import Layout from './Layout';

/**
 * Reusable Loading Component
 * Can be used with or without Layout wrapper
 */
export default function Loading({ message = 'Loading...', withLayout = true, fullScreen = false }) {
  const content = (
    <div className={`min-h-[80vh] flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'py-12'}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  ); 

  if (withLayout) {
    return <Layout>{content}</Layout>;
  }

  return content;
}

/**
 * Small inline loading spinner
 */
export function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]} ${className}`}></div>
  );
}

/**
 * Loading overlay for buttons
 */
export function ButtonLoading({ text = 'Loading...' }) {
  return (
    <span className="flex items-center">
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {text}
    </span>
  );
}
