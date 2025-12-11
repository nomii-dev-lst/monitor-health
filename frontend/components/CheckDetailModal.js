import { formatDate } from "../lib/utils";

export default function CheckDetailModal({ check, onClose }) {
  if (!check) return null;

  const formatResponseData = (data) => {
    if (!data) return "No response data";
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" onClick={onClose}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"></div>

        {/* Modal panel */}
        <div
          className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Check Result Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      check.status === "success"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">
                  HTTP Status
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {check.httpStatus || "N/A"}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">Latency</div>
                <div className="mt-1 text-sm font-semibold text-gray-900">
                  {check.latency}ms
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-500">
                  Checked At
                </div>
                <div className="mt-1 text-sm text-gray-900">
                  {formatDate(check.checkedAt)}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {check.errorMessage && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Error Message
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">{check.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Validation Errors */}
            {check.validationErrors && check.validationErrors.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-700 mb-2">
                  Validation Errors
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <ul className="list-disc list-inside space-y-1">
                    {check.validationErrors.map((error, idx) => (
                      <li key={idx} className="text-sm text-yellow-800">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Response Data */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Response Data
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 overflow-x-auto">
                <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap break-words">
                  {formatResponseData(check.responseData)}
                </pre>
              </div>
              {check.responseData && check.responseData.length >= 2000 && (
                <p className="text-xs text-gray-500 mt-1">
                  * Response truncated to 2000 characters
                </p>
              )}
            </div>

            {/* Metadata */}
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">
                Metadata
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Check ID:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {check.id}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Monitor ID:</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {check.monitorId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
