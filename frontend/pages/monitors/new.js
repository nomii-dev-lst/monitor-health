import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import MonitorForm from '../../components/MonitorForm';
import { monitorsAPI } from '../../lib/api';

export default function NewMonitor() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await monitorsAPI.create(data);
      
      if (response.success) {
        router.push('/monitors');
      } else {
        setError(response.message || 'Failed to create monitor');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create monitor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/monitors');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Add New Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure a new API endpoint to monitor
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <MonitorForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </Layout>
  );
}
