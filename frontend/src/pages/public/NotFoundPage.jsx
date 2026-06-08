// src/pages/public/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function NotFoundPage() {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        {/* 404 Visual */}
        <div className="text-8xl font-extrabold text-maroon-800 mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-8 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. 
          Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          {isAuthenticated ? (
            <Link
              to={isAdmin ? '/admin/dashboard' : '/citizen/dashboard'}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/"
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
          )}
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-gray-500">
          If you think this is a mistake, please{' '}
          <a href="mailto:support@reuniteai.com" className="text-maroon-800 hover:underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}