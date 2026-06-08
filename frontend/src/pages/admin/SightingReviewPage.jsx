// src/pages/admin/SightingReviewPage.jsx
import { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Trash2, MapPin } from 'lucide-react';
import sightingService from '../../services/sighting.service';
import { formatDate, timeAgo, truncate, getStatusColor } from '../../utils/helpers';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';

export default function SightingReviewPage() {
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchSightings();
  }, [page, statusFilter]);

  const fetchSightings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await sightingService.getAll({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search || undefined,
      });

      setSightings(response.data || response.sightings || []);
      setTotalPages(response.pagination?.pages || response.totalPages || 1);
    } catch (err) {
      setError('Failed to load sightings.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(true);
    try {
      await sightingService.updateStatus(id, status);
      toast.success(`Sighting marked as ${status}`);
      setConfirmAction(null);
      fetchSightings();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await sightingService.delete(id);
      toast.success('Sighting deleted');
      setConfirmAction(null);
      fetchSightings();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Helper: human-readable label for each status value
  const statusLabel = (status) => {
    switch (status) {
      case 'reviewed':   return 'Reviewed';
      case 'dismissed':  return 'Dismissed';
      case 'matched':    return 'Matched';
      case 'pending':    return 'Pending';
      default:           return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Sighting Review</h1>
        <p className="text-gray-600 mt-1">Review and manage submitted sightings.</p>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search sightings..."
          className="flex-grow"
        />
        {/*
          FIX: Filter options now match the Sighting model enum exactly:
          pending | reviewed | matched | dismissed
          (removed 'verified' and 'under_review' which are not valid values)
        */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-48"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="matched">Matched</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <button onClick={fetchSightings} className="btn-secondary text-sm">Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sightings.map((sighting) => (
              <div
                key={sighting._id || sighting.id}
                className="card flex flex-col sm:flex-row items-start gap-4 hover:border-maroon-300 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {sighting.image?.url || sighting.photo ? (
                    <img
                      src={sighting.image?.url || sighting.photo}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Eye className="w-8 h-8" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                    {truncate(sighting.description || 'No description', 150)}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {/* FIX: location is an object { address, lat, lng }, not a string */}
                      {truncate(
                        sighting.location?.address ||
                        sighting.location?.placeName ||
                        sighting.location ||
                        'Unknown location',
                        30
                      )}
                    </span>
                    <span>{timeAgo(sighting.createdAt)}</span>
                  </div>
                  {sighting.reportedBy && (
                    <p className="text-xs text-gray-400 mt-1">
                      By: {sighting.reportedBy.name ||
                        `${sighting.reportedBy.firstName || ''} ${sighting.reportedBy.lastName || ''}`.trim()}
                    </p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge text-xs ${getStatusColor(sighting.status)}`}>
                    {statusLabel(sighting.status)}
                  </span>

                  {sighting.status === 'pending' && (
                    <>
                      {/*
                        FIX: was sending 'verified' which is not in the Sighting model enum.
                        Correct value is 'reviewed' — meaning the admin has reviewed it.
                      */}
                      <button
                        onClick={() =>
                          setConfirmAction({ type: 'review', id: sighting._id || sighting.id })
                        }
                        className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                        title="Mark as reviewed"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({ type: 'dismiss', id: sighting._id || sighting.id })
                        }
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Dismiss"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      setConfirmAction({ type: 'delete', id: sighting._id || sighting.id })
                    }
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {sightings.length === 0 && (
            <div className="card text-center py-12">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No sightings found.</p>
            </div>
          )}

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === 'review')
            // FIX: send 'reviewed' not 'verified'
            handleStatusUpdate(confirmAction.id, 'reviewed');
          else if (confirmAction?.type === 'dismiss')
            // FIX: send 'dismissed' not 'rejected'
            handleStatusUpdate(confirmAction.id, 'dismissed');
          else if (confirmAction?.type === 'delete')
            handleDelete(confirmAction.id);
        }}
        title={
          confirmAction?.type === 'review'  ? 'Mark as Reviewed' :
          confirmAction?.type === 'dismiss' ? 'Dismiss Sighting' :
          'Delete Sighting'
        }
        message={
          confirmAction?.type === 'review'
            ? 'Mark this sighting as reviewed? This confirms an admin has assessed it.'
            : confirmAction?.type === 'dismiss'
            ? 'Dismiss this sighting? This indicates it is not relevant or actionable.'
            : 'Are you sure you want to delete this sighting? This cannot be undone.'
        }
        confirmText={
          confirmAction?.type === 'review'  ? 'Mark Reviewed' :
          confirmAction?.type === 'dismiss' ? 'Dismiss' :
          'Delete'
        }
        variant={
          confirmAction?.type === 'delete' || confirmAction?.type === 'dismiss'
            ? 'danger'
            : 'info'
        }
        loading={actionLoading}
      />
    </div>
  );
}
