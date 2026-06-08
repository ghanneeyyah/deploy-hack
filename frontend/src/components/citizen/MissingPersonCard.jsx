// src/components/citizen/MissingPersonCard.jsx
import { Link } from 'react-router-dom';
import { MapPin, Clock } from 'lucide-react';
import { formatDate, timeAgo, getStatusColor } from '../../utils/helpers';

export default function MissingPersonCard({ person }) {
  const fullName = person.name || 'Unknown';
  const photoUrl = person.photos?.[0] || person.photo || null;

  return (
    <Link
      to={`/citizen/missing/${person._id || person.id}`}
      className="card-maroon block overflow-hidden hover:border-maroon-800 transition-all group"
    >
      {/* Photo */}
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={fullName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <MapPin className="w-10 h-10" />
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-gray-900 truncate">{fullName}</h3>
      <p className="text-sm text-gray-500">{person.age} years old</p>

      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
        <MapPin className="w-3 h-3" />
        <span className="truncate">{person.lastKnownLocation || 'Unknown'}</span>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className={`badge ${getStatusColor(person.status)}`}>
          {person.status || 'active'}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {timeAgo(person.createdAt)}
        </span>
      </div>
    </Link>
  );
}