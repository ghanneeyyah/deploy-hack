// src/pages/citizen/SightingDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, Eye } from 'lucide-react';
import sightingService from '../../services/sighting.service';
import { formatDateTime, timeAgo, getStatusColor, formatLocation } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function SightingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sighting, setSighting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSighting();
  }, [id]);

  const fetchSighting = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await sightingService.getById(id);
      setSighting(response.data || response);
    } catch (err) {
      setError('Failed to load sighting details.');
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

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorAlert message={error} />
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  if (!sighting) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-maroon-800 transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Photo */}
        <div className="lg:col-span-1">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {sighting.photo ? (
              <img
                src={sighting.photo}
                alt="Sighting"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Eye className="w-20 h-20" />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center">
            <span className={`badge text-sm ${getStatusColor(sighting.status)}`}>
              {sighting.status || 'pending'}
            </span>
          </div>
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-4">Sighting Report</h1>

            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-maroon-800 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Location</p>
                  <p className="text-gray-600">{formatLocation(sighting.location)}</p>
                  {sighting.latitude && sighting.longitude && (
                    <p className="text-gray-400 text-xs mt-1">
                      {sighting.latitude}, {sighting.longitude}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-maroon-800 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-gray-700">Reported</p>
                  <p className="text-gray-600">{formatDateTime(sighting.createdAt)}</p>
                  <p className="text-gray-400 text-xs">{timeAgo(sighting.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>

          {sighting.description && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">{sighting.description}</p>
            </div>
          )}

          {sighting.missingPerson && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Related Missing Person</h3>
              <p className="text-gray-700">
                This sighting may be related to a missing person case. Administrators are reviewing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}