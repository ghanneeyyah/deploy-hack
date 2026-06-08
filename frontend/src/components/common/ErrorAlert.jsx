// src/components/common/ErrorAlert.jsx
import { AlertCircle, X } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function ErrorAlert({ message, onDismiss, className }) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg',
        className
      )}
      role="alert"
    >
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-700 flex-grow">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 flex-shrink-0"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}