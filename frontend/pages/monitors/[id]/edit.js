import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/Layout';
import MonitorForm from '../../../components/MonitorForm';
import { monitorsAPI } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import Loading from '../../../components/Loading';

export default function EditMonitor() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [monitor, setMonitor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated && id) {
      loadMonitor();
    }
  }, [authLoading, isAuthenticated, id]);

  const loadMonitor = async () => {
    try {
      const response = await monitorsAPI.getById(id);
      if (response.success) {
        setMonitor(response.monitor);
      }
    } catch (err) {
      setError('Failed to load monitor');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await monitorsAPI.update(id, data);
      
      if (response.success) {
        router.push('/monitors');
      } else {
        setError(response.message || 'Failed to update monitor');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update monitor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/monitors');
  };

  if (authLoading || isFetching) {
    return <Loading message="Loading monitor..." />;
  }

  if (!monitor) {
    return (
      <Layout>
        <div className="text-center py-12 text-red-600">Monitor not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Monitor</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update monitor configuration
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <MonitorForm
          initialData={monitor}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </div>
    </Layout>
  );
}
