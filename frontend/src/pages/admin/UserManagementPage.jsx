// src/pages/admin/UserManagementPage.jsx
import { useState, useEffect } from 'react';
import { Shield, UserX, UserCheck, Trash2, Search } from 'lucide-react';
import adminService from '../../services/admin.service';
import { formatDate, timeAgo, getInitials } from '../../utils/helpers';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import ConfirmModal from '../../components/common/ConfirmModal';
import toast from 'react-hot-toast';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminService.getUsers({
        page,
        limit: 10,
        role: roleFilter || undefined,
        search: search || undefined,
      });

      setUsers(response.data || response.users || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      await adminService.updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      setConfirmAction(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyUser = async (userId) => {
    setActionLoading(true);
    try {
      await adminService.verifyUser(userId);
      toast.success('User verified successfully');
      setConfirmAction(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    setActionLoading(true);
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted');
      setConfirmAction(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage user accounts, roles, and verification status.</p>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search users..."
          className="flex-grow"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="input-field w-full sm:w-40"
        >
          <option value="">All Roles</option>
          <option value="citizen">Citizen</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={fetchUsers} className="btn-secondary text-sm">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Joined</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id || user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-maroon-800 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs capitalize ${
                        user.role === 'admin' ? 'badge-maroon' : 'badge-yellow'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge text-xs ${
                        user.isVerified ? 'badge-green' : 'badge-red'
                      }`}>
                        {user.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1">
                        {!user.isVerified && (
                          <button
                            onClick={() => setConfirmAction({ type: 'verify', userId: user._id || user.id })}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"
                            title="Verify user"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmAction({
                            type: 'role',
                            userId: user._id || user.id,
                            currentRole: user.role,
                          })}
                          className="p-1.5 rounded-lg hover:bg-maroon-50 text-gray-400 hover:text-maroon-800"
                          title="Change role"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmAction({ type: 'delete', userId: user._id || user.id, userName: `${user.firstName} ${user.lastName}` })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="card text-center py-12">
              <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users found.</p>
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (confirmAction?.type === 'verify') handleVerifyUser(confirmAction.userId);
          else if (confirmAction?.type === 'role') {
            const newRole = confirmAction.currentRole === 'admin' ? 'citizen' : 'admin';
            handleRoleChange(confirmAction.userId, newRole);
          } else if (confirmAction?.type === 'delete') handleDeleteUser(confirmAction.userId);
        }}
        title={
          confirmAction?.type === 'verify' ? 'Verify User' :
          confirmAction?.type === 'role' ? `Change Role to ${confirmAction.currentRole === 'admin' ? 'Citizen' : 'Admin'}` :
          'Delete User'
        }
        message={
          confirmAction?.type === 'verify'
            ? 'Are you sure you want to verify this user?'
            : confirmAction?.type === 'role'
            ? `Change this user's role to ${confirmAction.currentRole === 'admin' ? 'citizen' : 'admin'}?`
            : `Are you sure you want to delete ${confirmAction?.userName}? This action cannot be undone.`
        }
        confirmText={
          confirmAction?.type === 'verify' ? 'Verify' :
          confirmAction?.type === 'role' ? 'Change Role' :
          'Delete'
        }
        variant={confirmAction?.type === 'delete' ? 'danger' : 'info'}
        loading={actionLoading}
      />
    </div>
  );
}