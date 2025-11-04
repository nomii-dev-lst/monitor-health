import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { settingsAPI } from '../lib/api';

export default function Settings() {
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' },
    from: ''
  });
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsAPI.getSMTP();
      if (response.success && response.smtp) {
        setSmtpSettings(response.smtp);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await settingsAPI.update('smtp', smtpSettings, 'SMTP email configuration');
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();
    
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    setIsTesting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await settingsAPI.testEmail(testEmail);
      
      if (response.success) {
        setMessage({ type: 'success', text: 'Test email sent successfully! Check your inbox.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || error.response?.data?.error || 'Failed to send test email' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure email notifications and system settings
          </p>
        </div>

        {message.text && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className={`text-sm ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </div>
          </div>
        )}

        {/* SMTP Configuration */}
        <form onSubmit={handleSave} className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">SMTP Configuration</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host *
                </label>
                <input
                  type="text"
                  required
                  value={smtpSettings.host}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port *
                </label>
                <input
                  type="number"
                  required
                  value={smtpSettings.port}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={smtpSettings.secure}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, secure: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Use SSL/TLS (port 465)</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={smtpSettings.auth?.user || ''}
                onChange={(e) => setSmtpSettings({ 
                  ...smtpSettings, 
                  auth: { ...smtpSettings.auth, user: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="your-email@gmail.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={smtpSettings.auth?.pass || ''}
                onChange={(e) => setSmtpSettings({ 
                  ...smtpSettings, 
                  auth: { ...smtpSettings.auth, pass: e.target.value } 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="App password or SMTP password"
              />
              <p className="mt-1 text-sm text-gray-500">
                For Gmail, use an App Password: https://support.google.com/accounts/answer/185833
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Address *
              </label>
              <input
                type="email"
                required
                value={smtpSettings.from || ''}
                onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="noreply@monitorhealth.com"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save SMTP Settings'}
              </button>
            </div>
          </div>
        </form>

        {/* Test Email */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Email</h2>
          
          <form onSubmit={handleTestEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send test email to:
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="test@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={isTesting}
              className="px-6 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-800 disabled:opacity-50"
            >
              {isTesting ? 'Sending...' : 'Send Test Email'}
            </button>
          </form>
        </div>

        {/* System Info */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Backend API:</span>
              <span className="font-medium">{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
