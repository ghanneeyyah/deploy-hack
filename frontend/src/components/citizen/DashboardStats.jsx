// src/components/citizen/DashboardStats.jsx
import { useState, useEffect } from 'react';
import { Users, Eye, CheckCircle, Clock } from 'lucide-react';
import missingPersonService from '../../services/missingPerson.service';
import sightingService from '../../services/sighting.service';
import { formatCount } from '../../utils/formatters';

export default function DashboardStats() {
  const [stats, setStats] = useState({
    totalMissing: 0,
    totalSightings: 0,
    resolvedCases: 0,
    pendingSightings: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [missingRes, sightingsRes] = await Promise.all([
        missingPersonService.getAll({ limit: 1 }),
        sightingService.getAll({ limit: 1 }),
      ]);

      // FIX: Backend returns { success, data, pagination: { total, pages, ... } }
      // total is nested under pagination, NOT at the top level
      const totalMissing =
        missingRes.pagination?.total ??
        missingRes.total ??
        missingRes.count ??
        0;

      const totalSightings =
        sightingsRes.pagination?.total ??
        sightingsRes.total ??
        sightingsRes.count ??
        0;

      // For resolved/pending, we need separate filtered calls
      // because the main listing doesn't return status breakdown
      const [resolvedRes, pendingRes] = await Promise.all([
        missingPersonService.getAll({ limit: 1, status: 'found' }),
        sightingService.getAll({ limit: 1, status: 'pending' }),
      ]);

      setStats({
        totalMissing,
        totalSightings,
        resolvedCases: resolvedRes.pagination?.total ?? resolvedRes.total ?? 0,
        pendingSightings: pendingRes.pagination?.total ?? pendingRes.total ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const statCards = [
    {
      label: 'Active Cases',
      value: stats.totalMissing,
      icon: Users,
      color: 'bg-maroon-50 text-maroon-800',
    },
    {
      label: 'Sightings',
      value: stats.totalSightings,
      icon: Eye,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Resolved',
      value: stats.resolvedCases,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Pending Review',
      value: stats.pendingSightings,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat) => (
        <div key={stat.label} className="card">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {formatCount(stat.value)}
              </p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
