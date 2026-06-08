// src/pages/admin/MatchReviewPage.jsx
import { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Eye, Clock, AlertTriangle } from 'lucide-react';
import matchService from '../../services/match.service';
import { formatMatchPercentage, formatConfidenceLevel } from '../../utils/formatters';
import { formatDate, timeAgo, truncate } from '../../utils/helpers';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ConfirmModal from '../../components/common/ConfirmModal';
import MatchDetailModal from '../../components/admin/MatchDetailModal';
import toast from 'react-hot-toast';

export default function MatchReviewPage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'verify'|'reject', matchId }
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchMatches();
  }, [page, statusFilter]);

  const fetchMatches = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await matchService.getAll({
        page,
        limit: 10,
        status: statusFilter || undefined,
      });

      setMatches(response.data || response.matches || []);
      setTotalPages(response.totalPages || Math.ceil((response.total || 0) / 10) || 1);
    } catch (err) {
      setError('Failed to load matches.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (matchId) => {
    setActionLoading(true);
    try {
      await matchService.verify(matchId);
      toast.success('Match verified successfully!');
      setConfirmAction(null);
      fetchMatches();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (matchId, reason) => {
    setActionLoading(true);
    try {
      await matchService.reject(matchId, reason || 'No reason provided');
      toast.success('Match rejected.');
      setConfirmAction(null);
      fetchMatches();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = async (match) => {
    setSelectedMatch(match);
    setShowDetailModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Match Review</h1>
        <p className="text-gray-600 mt-1">Review AI-generated matches and verify or reject them.</p>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search matches..."
          className="flex-grow"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-48"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="investigating">Investigating</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : matches.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No matches found.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match._id || match.id}
                className="card flex flex-col sm:flex-row sm:items-center gap-4 hover:border-maroon-300 transition-all"
              >
                {/* Confidence Score */}
                <div className="flex-shrink-0 flex items-center gap-2 sm:w-20">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    (match.confidence || match.matchPercentage) >= 80
                      ? 'bg-green-50 text-green-600'
                      : (match.confidence || match.matchPercentage) >= 50
                      ? 'bg-yellow-50 text-yellow-600'
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {Math.round(match.confidence || match.matchPercentage || 0)}%
                  </div>
                </div>

                {/* Match Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {match.missingPerson?.name || 'Unknown'}
                    </span>
                    <span className="text-gray-400">↔</span>
                    <span className="text-gray-600 truncate">
                      Sighting #{match.sighting?.id || match.sightingId || 'N/A'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Reported {timeAgo(match.createdAt)} • {match.location || 'Unknown location'}
                  </p>
                </div>

                {/* Status & Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`badge text-xs ${
                    match.status === 'verified' ? 'badge-green' :
                    match.status === 'rejected' ? 'badge-red' :
                    match.status === 'investigating' ? 'badge-maroon' :
                    'badge-yellow'
                  }`}>
                    {match.status || 'pending'}
                  </span>

                  <button
                    onClick={() => handleViewDetail(match)}
                    className="p-2 rounded-lg hover:bg-maroon-50 text-gray-600 hover:text-maroon-800 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {match.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setConfirmAction({ type: 'verify', matchId: match._id || match.id })}
                        className="p-2 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 transition-colors"
                        title="Verify match"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmAction({ type: 'reject', matchId: match._id || match.id })}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                        title="Reject match"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-6"
          />
        </>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === 'verify') handleVerify(confirmAction.matchId);
          else if (confirmAction?.type === 'reject') handleReject(confirmAction.matchId);
        }}
        title={confirmAction?.type === 'verify' ? 'Verify Match' : 'Reject Match'}
        message={
          confirmAction?.type === 'verify'
            ? 'Are you sure you want to verify this match? This confirms the sighting matches the missing person.'
            : 'Are you sure you want to reject this match? This indicates the sighting does not match.'
        }
        confirmText={confirmAction?.type === 'verify' ? 'Verify' : 'Reject'}
        variant={confirmAction?.type === 'verify' ? 'info' : 'danger'}
        loading={actionLoading}
      />

      {/* Detail Modal */}
      {showDetailModal && selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => { setShowDetailModal(false); setSelectedMatch(null); }}
          onVerify={(id) => {
            setShowDetailModal(false);
            setConfirmAction({ type: 'verify', matchId: id });
          }}
          onReject={(id) => {
            setShowDetailModal(false);
            setConfirmAction({ type: 'reject', matchId: id });
          }}
        />
      )}
    </div>
  );
}