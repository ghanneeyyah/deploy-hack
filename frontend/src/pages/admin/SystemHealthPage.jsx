// src/pages/admin/SystemHealthPage.jsx
import { useState, useEffect } from 'react';
import { Server, Database, Brain, Activity, HardDrive, Cpu, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import adminService from '../../services/admin.service';
import aiService from '../../services/ai.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function SystemHealthPage() {
  const [systemHealth, setSystemHealth] = useState(null);
  const [aiInfo, setAiInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAllHealth();
  }, []);

  const fetchAllHealth = async () => {
    setLoading(true);
    setError('');

    try {
      const [healthRes, aiRes] = await Promise.allSettled([
        adminService.getSystemHealth(),
        aiService.getConfig(),
      ]);

      if (healthRes.status === 'fulfilled') {
        setSystemHealth(healthRes.value.data || healthRes.value);
      }
      if (aiRes.status === 'fulfilled') {
        setAiInfo(aiRes.value);
      }
    } catch (err) {
      setError('Failed to fetch system health data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAllHealth();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const services = [
    {
      name: 'Node.js API Server',
      icon: Server,
      status: systemHealth?.status === 'healthy' || systemHealth?.api === 'up',
      details: systemHealth?.apiDetails || 'Main application server',
    },
    {
      name: 'Database Connection',
      icon: Database,
      status: systemHealth?.database === 'connected' || systemHealth?.db === 'up',
      details: systemHealth?.dbDetails || 'MongoDB connection',
    },
    {
      name: 'FastAPI AI Service',
      icon: Brain,
      status: aiInfo?.status === 'ok' || aiInfo?.status === 'healthy',
      details: `Port 8000 • ${aiInfo?.version || 'v1.0'}`,
    },
    {
      name: 'Face Recognition Model',
      icon: Activity,
      status: aiInfo?.face_recognition === 'available' || aiInfo?.models_loaded === true,
      details: aiInfo?.model_name || 'Face recognition engine',
    },
  ];

  const metrics = [
    {
      name: 'Uptime',
      icon: Cpu,
      value: systemHealth?.uptime
        ? `${Math.floor(systemHealth.uptime / 3600)}h ${Math.floor((systemHealth.uptime % 3600) / 60)}m`
        : 'N/A',
      color: 'text-green-600',
    },
    {
      name: 'Memory Usage',
      icon: HardDrive,
      value: systemHealth?.memory
        ? `${systemHealth.memory.used}/${systemHealth.memory.total} MB`
        : 'N/A',
      color: 'text-blue-600',
    },
    {
      name: 'Active Connections',
      icon: Activity,
      value: systemHealth?.connections || 'N/A',
      color: 'text-maroon-800',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600 mt-1">Monitor the health and performance of all services.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Services Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {services.map((service) => (
          <div key={service.name} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-maroon-50 rounded-xl flex items-center justify-center">
                  <service.icon className="w-5 h-5 text-maroon-800" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{service.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{service.details}</p>
                </div>
              </div>
              {service.status ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="card p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {metrics.map((metric) => (
            <div key={metric.name} className="text-center p-4 bg-gray-50 rounded-xl">
              <metric.icon className={`w-6 h-6 ${metric.color} mx-auto mb-2`} />
              <p className={`text-xl font-bold ${metric.color}`}>{metric.value}</p>
              <p className="text-xs text-gray-500 mt-1">{metric.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Service Details */}
      {aiInfo && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Service Configuration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {Object.entries(aiInfo).map(([key, value]) => (
              <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-900">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}