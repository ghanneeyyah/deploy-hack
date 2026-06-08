// src/components/admin/MatchDetailModal.jsx
import { X, User, MapPin, Calendar, CheckCircle, XCircle, Search } from 'lucide-react';
import { formatMatchPercentage, formatConfidenceLevel } from '../../utils/formatters';
import { formatDateTime } from '../../utils/helpers';

export default function MatchDetailModal({ match, onClose, onVerify, onReject }) {
  if (!match) return null;

  const confidence = match.confidence || match.matchPercentage || 0;
  const confidenceInfo = formatConfidenceLevel(confidence);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Match Details</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Confidence */}
          <div className="text-center p-4 bg-maroon-50 rounded-xl">
            <div className="text-3xl font-bold text-maroon-800">
              {formatMatchPercentage(confidence)}
            </div>
            <p className={`text-sm font-medium mt-1 ${confidenceInfo.color}`}>
              {confidenceInfo.label} Confidence
            </p>
          </div>

          {/* Missing Person */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-maroon-800" />
              Missing Person
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="text-gray-900 font-medium">
                   {match.missingPerson?.name || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Age:</span>
                <p className="text-gray-900">{match.missingPerson?.age || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">Last Known Location:</span>
                <p className="text-gray-900">{match.missingPerson?.lastKnownLocation || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Sighting */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-maroon-800" />
              Sighting
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{match.sighting?.location || match.location || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDateTime(match.sighting?.createdAt || match.createdAt)}</span>
              </div>
              {match.sighting?.description && (
                <p className="text-gray-600">{match.sighting.description}</p>
              )}
            </div>
          </div>

          {/* Photos side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-2">Missing Person Photo</p>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {match.missingPerson?.photos?.[0] ? (
                  <img
                    src={match.missingPerson.photos[0]}
                    alt="Missing person"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User className="w-10 h-10" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-2">Sighting Photo</p>
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                {match.sighting?.photo ? (
                  <img
                    src={match.sighting.photo}
                    alt="Sighting"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Search className="w-10 h-10" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {match.notes?.length > 0 && (
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Investigation Notes</h3>
              {match.notes.map((note, i) => (
                <p key={i} className="text-sm text-gray-600 border-l-2 border-maroon-200 pl-3 py-1">
                  {note}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {match.status === 'pending' && (
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <button
              onClick={() => onReject(match._id || match.id)}
              className="btn-danger flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
            <button
              onClick={() => onVerify(match._id || match.id)}
              className="btn-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Verify Match
            </button>
          </div>
        )}
      </div>
    </div>
  );
}