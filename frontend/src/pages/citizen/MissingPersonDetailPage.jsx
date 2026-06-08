// src/pages/citizen/MissingPersonDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, User, AlertCircle, Edit } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import missingPersonService from '../../services/missingPerson.service';
import { formatDate, getFullName, getStatusColor } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

export default function MissingPersonDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    fetchPerson();
  }, [id]);

  const fetchPerson = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await missingPersonService.getById(id);
      const data = response.data || response;
      setPerson(data);
      if (data.photos?.length > 0) {
        setSelectedPhoto(data.photos[0]);
      }
    } catch (err) {
      setError('Failed to load missing person details.');
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

  if (!person) return null;

  const fullName = person.name || 'Unknown';
  const isCreator = person.createdBy === user?._id || person.createdBy === user?.id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-maroon-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        {isCreator && (
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Edit className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Photos */}
        <div className="lg:col-span-1 space-y-4">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {selectedPhoto ? (
              <img
                src={selectedPhoto}
                alt={fullName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <User className="w-20 h-20" />
              </div>
            )}
          </div>

          {person.photos?.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {person.photos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedPhoto(photo)}
                  className={`aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 transition-colors ${
                    selectedPhoto === photo ? 'border-maroon-800' : 'border-transparent'
                  }`}
                >
                  <img src={photo} alt={`${fullName} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
                  <span>{person.age} years old</span>
                  {person.gender && <span className="capitalize">{person.gender}</span>}
                </div>
              </div>
              <span className={`badge text-sm ${getStatusColor(person.status)}`}>
                {person.status || 'active'}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-maroon-800" />
                <span>Last seen: {person.lastKnownLocation || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 text-maroon-800" />
                <span>Reported: {formatDate(person.createdAt)}</span>
              </div>
              {person.urgency && (
                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 ${
                    person.urgency === 'critical' || person.urgency === 'high'
                      ? 'text-red-600'
                      : 'text-yellow-600'
                  }`} />
                  <span className={`capitalize ${
                    person.urgency === 'critical' || person.urgency === 'high'
                      ? 'text-red-600 font-medium'
                      : 'text-yellow-600'
                  }`}>
                    {person.urgency} urgency
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {person.description && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
              <p className="text-gray-700 leading-relaxed">{person.description}</p>
            </div>
          )}

          {/* Matches (if any) */}
          {person.matches?.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Potential Matches</h3>
              <p className="text-sm text-gray-500">
                {person.matches.length} potential match(es) found. Administrators are reviewing.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              to={`/citizen/report-sighting?missingPersonId=${id}`}
              className="btn-primary flex items-center gap-2"
            >
              Report Sighting
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}