// src/pages/citizen/MyReportsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Eye, Plus } from 'lucide-react';
import missingPersonService from '../../services/missingPerson.service';
import sightingService from '../../services/sighting.service';
import { formatDate, getStatusColor, truncate } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function MyReportsPage() {
  const [missingPersons, setMissingPersons] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [activeTab, setActiveTab] = useState('missing');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    setError('');

    try {
      const [missingRes, sightingsRes] = await Promise.all([
        missingPersonService.getAll({ sortBy: 'createdAt', sortOrder: 'desc' }),
        sightingService.getAll({ sortBy: 'createdAt', sortOrder: 'desc' }),
      ]);

      setMissingPersons(missingRes.data || missingRes.missingPersons || []);
      setSightings(sightingsRes.data || sightingsRes.sightings || []);
    } catch (err) {
      setError('Failed to load reports.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'missing', label: 'Missing Persons', icon: FileText, count: missingPersons.length },
    { key: 'sightings', label: 'Sightings', icon: Eye, count: sightings.length },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Reports</h1>
        <div className="flex gap-2">
          <Link to="/citizen/report-missing" className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Report Missing
          </Link>
          <Link to="/citizen/report-sighting" className="btn-secondary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Report Sighting
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-maroon-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="ml-auto bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {/* Missing Persons Tab */}
          {activeTab === 'missing' && (
            <div className="space-y-3">
              {missingPersons.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">You haven't reported any missing persons yet.</p>
                  <Link to="/citizen/report-missing" className="text-maroon-800 text-sm font-medium hover:underline mt-2 inline-block">
                    Report a missing person
                  </Link>
                </div>
              ) : (
                missingPersons.map((person) => (
                  <Link
                    key={person._id || person.id}
                    to={`/citizen/missing/${person._id || person.id}`}
                    className="card flex items-center gap-4 hover:border-maroon-300 transition-all group"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {person.photos?.[0] ? (
                        <img src={person.photos[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {person.firstName} {person.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {person.age} yrs • {truncate(person.lastKnownLocation, 30)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`badge ${getStatusColor(person.status)}`}>
                        {person.status || 'active'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(person.createdAt)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* Sightings Tab */}
          {activeTab === 'sightings' && (
            <div className="space-y-3">
              {sightings.length === 0 ? (
                <div className="card text-center py-12">
                  <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">You haven't submitted any sightings yet.</p>
                  <Link to="/citizen/report-sighting" className="text-maroon-800 text-sm font-medium hover:underline mt-2 inline-block">
                    Report a sighting
                  </Link>
                </div>
              ) : (
                sightings.map((sighting) => (
                  <Link
                    key={sighting._id || sighting.id}
                    to={`/citizen/sighting/${sighting._id || sighting.id}`}
                    className="card flex items-center gap-4 hover:border-maroon-300 transition-all group"
                  >
                    <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {sighting.photo ? (
                        <img src={sighting.photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Eye className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {truncate(sighting.description || 'No description', 100)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{truncate(sighting.location, 30)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`badge ${getStatusColor(sighting.status)}`}>
                        {sighting.status || 'pending'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{formatDate(sighting.createdAt)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}