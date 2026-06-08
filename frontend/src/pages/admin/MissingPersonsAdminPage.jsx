// src/pages/admin/MissingPersonsAdminPage.jsx
import { useState, useEffect } from 'react';
import { Users, MapPin, Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import missingPersonService from '../../services/missingPerson.service';
import { formatDate, timeAgo, truncate, getStatusColor } from '../../utils/helpers';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ConfirmModal from '../../components/common/ConfirmModal';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function MissingPersonsAdminPage() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPersons();
  }, [page, statusFilter]);

  const fetchPersons = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await missingPersonService.getAll({
        page,
        limit: 10,
        status: statusFilter || undefined,
        search: search || undefined,
      });

      // Backend: { success, data: [...], pagination: { total, pages } }
      setPersons(response.data || []);
      setTotal(response.pagination?.total ?? 0);
      setTotalPages(response.pagination?.pages ?? 1);
    } catch (err) {
      setError('Failed to load missing persons.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(true);
    try {
      await missingPersonService.updateStatus(id, status);
      toast.success(`Status updated to ${status}`);
      setConfirmAction(null);
      fetchPersons();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Missing Persons</h1>
        <p className="text-gray-600 mt-1">
          {total > 0 ? `${total} total reports` : 'Manage all missing person reports.'}
        </p>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          onSearch={fetchPersons}
          placeholder="Search by name or location..."
          className="flex-grow"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-48"
        >
          <option value="">All Status</option>
          <option value="missing">Missing</option>
          <option value="found">Found</option>
          <option value="archived">Archived</option>
        </select>
        <button onClick={fetchPersons} className="btn-secondary text-sm">Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {persons.map((person) => {
              const name = person.fullName || person.name || 'Unknown';
              const photo = person.photos?.[0]?.url || person.photo || null;

              return (
                <div
                  key={person._id || person.id}
                  className="card flex flex-col sm:flex-row items-start gap-4 hover:border-maroon-300 transition-all"
                >
                  {/* Photo */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {photo ? (
                      <img src={photo} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Users className="w-7 h-7" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-grow min-w-0">
                    <p className="font-semibold text-gray-900">{name}</p>
                    <p className="text-sm text-gray-500">
                      Age: {person.age ?? 'Unknown'} • Gender: {person.gender ?? 'Unknown'}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">
                        {truncate(person.lastSeenLocation || 'Location unknown', 50)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Reported {timeAgo(person.createdAt)}</span>
                      {person.createdBy?.name && (
                        <span className="ml-2">by {person.createdBy.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge text-xs ${getStatusColor(person.status)}`}>
                      {person.status || 'missing'}
                    </span>

                    <Link
                      to={`/citizen/missing/${person._id || person.id}`}
                      className="p-1.5 rounded-lg hover:bg-maroon-50 text-gray-400 hover:text-maroon-800"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>

                    {person.status === 'missing' && (
                      <button
                        onClick={() =>
                          setConfirmAction({ type: 'found', id: person._id || person.id, name })
                        }
                        className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                        title="Mark as found"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}

                    {person.status !== 'archived' && (
                      <button
                        onClick={() =>
                          setConfirmAction({ type: 'archive', id: person._id || person.id, name })
                        }
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        title="Archive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {persons.length === 0 && (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No missing person reports found.</p>
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
          if (confirmAction?.type === 'found') handleStatusUpdate(confirmAction.id, 'found');
          else if (confirmAction?.type === 'archive') handleStatusUpdate(confirmAction.id, 'archived');
        }}
        title={confirmAction?.type === 'found' ? 'Mark as Found' : 'Archive Report'}
        message={
          confirmAction?.type === 'found'
            ? `Mark ${confirmAction?.name} as found? This will close the active missing person report.`
            : `Archive the report for ${confirmAction?.name}? It will no longer appear in active listings.`
        }
        confirmText={confirmAction?.type === 'found' ? 'Mark Found' : 'Archive'}
        variant={confirmAction?.type === 'archive' ? 'danger' : 'info'}
        loading={actionLoading}
      />
    </div>
  );
}
