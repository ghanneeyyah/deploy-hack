// src/pages/citizen/CitizenDashboardPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Eye,
  MapPin,
  Users,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import missingPersonService from '../../services/missingPerson.service';
import sightingService from '../../services/sighting.service';
import { formatDate, timeAgo, truncate } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DashboardStats from '../../components/citizen/DashboardStats';
import RecentSightingsFeed from '../../components/citizen/RecentSightingsFeed';
import MissingPersonCard from '../../components/citizen/MissingPersonCard';

export default function CitizenDashboardPage() {
  const { user } = useAuth();
  const [recentMissing, setRecentMissing] = useState([]);
  const [recentSightings, setRecentSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [missingRes, sightingsRes] = await Promise.all([
        missingPersonService.getAll({ limit: 4, sortBy: 'createdAt', sortOrder: 'desc' }),
        sightingService.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      ]);

      setRecentMissing(missingRes.data || missingRes.missingPersons || []);
      setRecentSightings(sightingsRes.data || sightingsRes.sightings || []);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Stay updated on missing person cases and recent sightings.
        </p>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <DashboardStats />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <Link
              to="/citizen/report-missing"
              className="card-maroon flex items-center gap-4 hover:border-maroon-800 transition-colors group"
            >
              <div className="w-12 h-12 bg-maroon-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-maroon-700 transition-colors">
                <Search className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900">Report Missing Person</h3>
                <p className="text-sm text-gray-600">Submit a new missing person case</p>
              </div>
              <Plus className="w-5 h-5 text-maroon-800 flex-shrink-0" />
            </Link>

            <Link
              to="/citizen/report-sighting"
              className="card-maroon flex items-center gap-4 hover:border-maroon-800 transition-colors group"
            >
              <div className="w-12 h-12 bg-maroon-800 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-maroon-700 transition-colors">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold text-gray-900">Report Sighting</h3>
                <p className="text-sm text-gray-600">Submit a sighting of a missing person</p>
              </div>
              <Plus className="w-5 h-5 text-maroon-800 flex-shrink-0" />
            </Link>
          </div>

          {/* Recent Missing Persons */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Missing Persons</h2>
              <Link
                to="/citizen/my-reports"
                className="text-sm text-maroon-800 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {recentMissing.length === 0 ? (
              <div className="card text-center py-10">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No missing person reports yet.</p>
                <Link
                  to="/citizen/report-missing"
                  className="text-maroon-800 text-sm font-medium hover:underline mt-2 inline-block"
                >
                  Report a missing person
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentMissing.map((person) => (
                  <MissingPersonCard key={person._id || person.id} person={person} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Sightings Feed */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Sightings</h2>
            </div>
            <RecentSightingsFeed sightings={recentSightings} />
          </div>
        </>
      )}
    </div>
  );
}