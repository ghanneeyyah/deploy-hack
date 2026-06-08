// src/components/citizen/RecentSightingsFeed.jsx
import { Link } from 'react-router-dom';
import { MapPin, Clock, Eye } from 'lucide-react';
import { timeAgo, truncate, getStatusColor, formatLocation } from '../../utils/helpers';

export default function RecentSightingsFeed({ sightings }) {
  if (!sightings || sightings.length === 0) {
    return (
      <div className="card text-center py-10">
        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No sightings reported yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sightings.map((sighting) => (
        <Link
          key={sighting._id || sighting.id}
          to={`/citizen/sighting/${sighting._id || sighting.id}`}
          className="card flex items-start gap-4 hover:border-maroon-300 transition-all group"
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {sighting.image?.url ? (
              <img
                src={sighting.image.url}
                alt="Sighting"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Eye className="w-6 h-6" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge ${getStatusColor(sighting.status)}`}>
                {sighting.status || 'pending'}
              </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {truncate(sighting.description || 'No description provided', 120)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {truncate(formatLocation(sighting.location), 30)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo(sighting.createdAt)}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
