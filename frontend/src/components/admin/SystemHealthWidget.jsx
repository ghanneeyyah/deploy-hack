// src/components/admin/SystemHealthWidget.jsx
import { useState, useEffect } from 'react';
import { Activity, Server, Database, Brain, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import adminService from '../../services/admin.service';
import aiService from '../../services/ai.service';

export default function SystemHealthWidget() {
  const [health, setHealth] = useState(null);
  const [aiHealth, setAiHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const [systemHealth, aiHealthRes] = await Promise.allSettled([
        adminService.getSystemHealth(),
        aiService.getHealth(),
      ]);

      if (systemHealth.status === 'fulfilled') {
        setHealth(systemHealth.value.data || systemHealth.value);
      }
      if (aiHealthRes.status === 'fulfilled') {
        setAiHealth(aiHealthRes.value);
      }
    } catch (error) {
      console.error('Failed to fetch health status:', error);
    } finally {
      setLoading(false);
    }
  };

  const services = [
    {
      name: 'API Server',
      icon: Server,
      status: health?.status === 'healthy' || health?.api === 'up',
    },
    {
      name: 'Database',
      icon: Database,
      status: health?.database === 'connected' || health?.db === 'up',
    },
    {
      name: 'AI Service',
      icon: Brain,
      status: aiHealth?.status === 'ok' || aiHealth?.status === 'healthy',
    },
    {
      name: 'Face Recognition',
      icon: Activity,
      status: aiHealth?.face_recognition === 'available' || aiHealth?.models_loaded === true,
    },
  ];

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        <button
          onClick={fetchHealth}
          className="p-1.5 rounded-lg hover:bg-maroon-50 text-gray-400 hover:text-maroon-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <service.icon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{service.name}</span>
              </div>
              {service.status ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      )}

      {health?.uptime && (
        <p className="mt-4 text-xs text-gray-500 text-center">
          Uptime: {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
        </p>
      )}
    </div>
  );
}