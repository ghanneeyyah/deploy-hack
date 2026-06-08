// src/pages/citizen/ProfilePage.jsx
import ProfileForm from '../../components/auth/ProfileForm';
import ChangePasswordForm from '../../components/auth/ChangePasswordForm';

export default function ProfilePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="space-y-6">
        <div className="card p-6">
          <ProfileForm />
        </div>

        <div className="card p-6">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}