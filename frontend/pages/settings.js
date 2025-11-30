import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Loading from "../components/Loading";
import { settingsAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const [defaultAlertEmail, setDefaultAlertEmail] = useState("");
  const [sendRecoveryAlerts, setSendRecoveryAlerts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Wait for authentication to complete before loading settings
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadSettings();
    }
  }, [authLoading, isAuthenticated]);

  const loadSettings = async () => {
    try {
      // Load default alert email
      const alertResponse = await settingsAPI.get("defaultAlertEmail");
      if (alertResponse.success && alertResponse.setting?.value) {
        setDefaultAlertEmail(alertResponse.setting.value);
      }

      // Load recovery alerts setting
      const recoveryResponse = await settingsAPI.get("sendRecoveryAlerts");
      if (
        recoveryResponse.success &&
        recoveryResponse.setting?.value !== undefined
      ) {
        setSendRecoveryAlerts(recoveryResponse.setting.value);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      setMessage({ type: "error", text: "Failed to load settings" });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Save default alert email
      if (defaultAlertEmail) {
        await settingsAPI.update(
          "defaultAlertEmail",
          defaultAlertEmail,
          "Default email for alert notifications"
        );
      }

      // Save recovery alerts setting
      await settingsAPI.update(
        "sendRecoveryAlerts",
        sendRecoveryAlerts,
        "Send recovery alert emails"
      );

      setMessage({
        type: "success",
        text: "Alert settings saved successfully!",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to save settings",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while authenticating
  if (authLoading) {
    return <Loading message="Loading settings..." fullScreen />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure email alert preferences. SMTP is configured via backend
            .env file.
          </p>
        </div>

        {message.text && (
          <div
            className={`rounded-md p-4 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div
              className={`text-sm ${
                message.type === "success" ? "text-green-800" : "text-red-800"
              }`}
            >
              {message.text}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Alert Settings */}
          <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Alert Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Alert Email
                </label>
                <input
                  type="email"
                  value={defaultAlertEmail}
                  onChange={(e) => setDefaultAlertEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="alerts@example.com"
                />
                <p className="mt-1 text-sm text-gray-500">
                  This email will receive alerts from all monitors (unless
                  individual monitors specify different recipients)
                </p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={sendRecoveryAlerts}
                    onChange={(e) => setSendRecoveryAlerts(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Send recovery alerts when monitors come back online
                  </span>
                </label>
                <p className="mt-1 ml-6 text-xs text-gray-500">
                  If disabled, you'll only receive alerts when monitors fail
                  (recommended to reduce email noise)
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Saving..." : "Save Alert Settings"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
