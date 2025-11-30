import { useState } from "react";

export default function MonitorForm({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading,
}) {
  const [formData, setFormData] = useState({
    name: initialData.name || "",
    url: initialData.url || "",
    authType: initialData.authType || "none",
    authConfig: initialData.authConfig || {},
    validationRules: initialData.validationRules || {
      statusCode: 200,
      requiredKeys: [],
    },
    checkInterval: initialData.checkInterval || 30,
    alertEmails: initialData.alertEmails?.join(", ") || "",
    enabled: initialData.enabled !== undefined ? initialData.enabled : true,
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAuthConfigChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      authConfig: { ...prev.authConfig, [field]: value },
    }));
  };

  const handleValidationChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      validationRules: { ...prev.validationRules, [field]: value },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      alertEmails: formData.alertEmails
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e),
      validationRules: {
        ...formData.validationRules,
        requiredKeys:
          typeof formData.validationRules.requiredKeys === "string"
            ? formData.validationRules.requiredKeys
                .split(",")
                .map((k) => k.trim())
                .filter((k) => k)
            : formData.validationRules.requiredKeys,
      },
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Basic Information
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monitor Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="My API Monitor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL *
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => handleChange("url", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="https://api.example.com/health"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check Interval (minutes) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.checkInterval}
                onChange={(e) =>
                  handleChange("checkInterval", parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.enabled}
                onChange={(e) =>
                  handleChange("enabled", e.target.value === "true")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Authentication */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Authentication
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth Type
            </label>
            <select
              value={formData.authType}
              onChange={(e) => handleChange("authType", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="none">None</option>
              <option value="basic">Basic Auth</option>
              <option value="token">Bearer Token</option>
              <option value="login">Login Auth</option>
            </select>
          </div>

          {formData.authType === "basic" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={formData.authConfig.username || ""}
                  onChange={(e) =>
                    handleAuthConfigChange("username", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.authConfig.password || ""}
                  onChange={(e) =>
                    handleAuthConfigChange("password", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}

          {formData.authType === "token" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bearer Token
              </label>
              <textarea
                value={formData.authConfig.staticToken || ""}
                onChange={(e) =>
                  handleAuthConfigChange("staticToken", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={3}
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your Bearer token. The monitor will send: Authorization:
                Bearer &lt;your-token&gt;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Validation */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Validation Rules
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected HTTP Status Code
            </label>
            <input
              type="number"
              value={formData.validationRules.statusCode || 200}
              onChange={(e) =>
                handleValidationChange("statusCode", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required JSON Keys (comma-separated)
            </label>
            <input
              type="text"
              value={
                Array.isArray(formData.validationRules.requiredKeys)
                  ? formData.validationRules.requiredKeys.join(", ")
                  : formData.validationRules.requiredKeys || ""
              }
              onChange={(e) =>
                handleValidationChange("requiredKeys", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="data, status, users"
            />
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Alert Configuration
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Email Addresses (comma-separated)
          </label>
          <input
            type="text"
            value={formData.alertEmails}
            onChange={(e) => handleChange("alertEmails", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="admin@example.com, ops@example.com"
          />
          <p className="mt-1 text-sm text-gray-500">
            Emails will be sent when monitor status changes (up → down or down →
            up). Leave blank to use the default alert email from Settings.
          </p>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
        >
          {isLoading ? "Saving..." : "Save Monitor"}
        </button>
      </div>
    </form>
  );
}
