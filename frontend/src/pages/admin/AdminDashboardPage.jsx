// src/pages/admin/AdminDashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Eye,
  CheckCircle,
  ArrowRight,
  Clock,
} from 'lucide-react';
import adminService from '../../services/admin.service';
import matchService from '../../services/match.service';
import { formatCount, formatMatchPercentage } from '../../utils/formatters';
import { timeAgo } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import StatisticsCharts from '../../components/admin/StatisticsCharts';
import SystemHealthWidget from '../../components/admin/SystemHealthWidget';
import ActivityLogs from '../../components/admin/ActivityLogs';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [highConfidenceMatches, setHighConfidenceMatches] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [statsRes, matchesRes, activityRes] = await Promise.all([
        adminService.getDashboardStats(),
        matchService.getHighConfidence(),
        adminService.getActivityLogs({ limit: 5 }),
      ]);

      // FIX: Backend returns { success, data: { overview: { totalMissing, totalSightings, ... }, trends, recent } }
      // The original code read statsRes.data which is the whole nested object, not the overview.
      const overview = statsRes?.data?.overview ?? statsRes?.overview ?? statsRes?.data ?? statsRes ?? {};
      setStats(overview);

      setHighConfidenceMatches(matchesRes?.data || matchesRes?.matches || []);
      setRecentActivity(activityRes?.data || activityRes?.logs || []);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Missing',
      value: stats?.totalMissing ?? 0,
      icon: Users,
      color: 'bg-maroon-50 text-maroon-800',
      // FIX: was incorrectly '/admin/matches' — missing persons have their own page
      link: '/admin/missing-persons',
    },
    {
      label: 'Total Sightings',
      value: stats?.totalSightings ?? 0,
      icon: Eye,
      color: 'bg-blue-50 text-blue-600',
      link: '/admin/sightings',
    },
    {
      label: 'Total Matches',
      // FIX: backend returns totalMatches, not verifiedMatches
      value: stats?.totalMatches ?? 0,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
      link: '/admin/matches',
    },
    {
      label: 'Pending Review',
      value: stats?.pendingMatches ?? 0,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
      link: '/admin/matches',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor and manage the Reunite AI platform.</p>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="card hover:border-maroon-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCount(stat.value)}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatisticsCharts stats={stats} />
        </div>
        <div>
          <SystemHealthWidget />
        </div>
      </div>

      {/* High Confidence Matches */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">High Confidence Pending Matches</h2>
          <Link
            to="/admin/matches"
            className="text-sm text-maroon-800 hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {highConfidenceMatches.length === 0 ? (
          <div className="card text-center py-8">
            <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No high confidence matches pending review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {highConfidenceMatches.slice(0, 5).map((match) => (
              <Link
                key={match._id || match.id}
                to="/admin/matches"
                className="card flex items-center gap-4 hover:border-maroon-300 transition-all"
              >
                <div className="w-12 h-12 bg-maroon-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-maroon-800 font-bold text-lg">
                    {Math.round(match.confidence || match.matchPercentage || 0)}%
                  </span>
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {match.missingPerson?.firstName} {match.missingPerson?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    Match confidence:{' '}
                    {formatMatchPercentage(match.confidence || match.matchPercentage)}
                  </p>
                </div>
                <span className="badge-maroon text-xs flex-shrink-0">Pending</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <ActivityLogs logs={recentActivity} compact />
      </div>
    </div>
  );
}
